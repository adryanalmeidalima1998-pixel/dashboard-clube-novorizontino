'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';
import HeatmapComponent from '@/app/components/HeatmapComponent';

const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false, 
  loading: () => <div className="h-64 flex items-center justify-center text-slate-500 font-bold">Carregando gráfico...</div> 
});

const METRICAS_RADAR = [
  { label: 'Passes Chave', key: 'Passes chave', type: 'per90' },
  { label: 'Passes Progressivos %', key: 'Passes progressivos precisos,%', type: 'raw' },
  { label: 'Passes na Área %', key: 'Passes dentro da área / precisos, %', type: 'raw' },
  { label: 'Dribles Certos/90', key: 'Dribles bem sucedidos', type: 'per90' },
  { label: 'Dribles 1/3 Final Certos/90', key: 'Dribles no último terço do campo com sucesso', type: 'per90' },
  { label: 'Entradas 1/3 Final (C)', key: 'Entradas no terço final carregando a bola', type: 'per90' },
  { label: 'Recuperações Campo Adv', key: 'Bolas recuperadas no campo do adversário', type: 'per90' },
  { label: 'xA', key: 'xA', type: 'per90' },
  { label: 'xG', key: 'Xg', type: 'per90' },
  { label: 'Ações Área Adv Certas/90', key: 'Ações na área adversária bem-sucedidas', type: 'per90' }
];

function PlayerProfileContent() {
  const { id } = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState(null);
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioNovorizontino, setGremioNovorizontino] = useState([]);
  const [loading, setLoading] = useState(true);

  const processarDados = (dados, aba) => {
    return dados.map(jogador => {
      const minutos = safeParseFloat(jogador['Minutos jogados']);
      const processado = { ...jogador, aba };
      METRICAS_RADAR.forEach(m => {
        if (m.type === 'per90') {
          const val = safeParseFloat(jogador[m.key]);
          processado[`${m.key}_per90`] = minutos > 0 ? (val / minutos) * 90 : 0;
        }
      });
      return processado;
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlAba1 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=0';
        const urlAba2 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=1236859817';

        const [res1, res2] = await Promise.all([fetch(urlAba1), fetch(urlAba2)]);
        const [csv1, csv2] = await Promise.all([res1.text(), res2.text()]);

        Papa.parse(csv1, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = processarDados(cleanData(results.data), 'LISTA PREFERENCIAL');
            setListaPreferencial(dados);
            const p = dados.find(d => d.ID_ATLETA === id || d.Jogador === decodeURIComponent(id));
            if (p) setPlayer(p);
          }
        });

        Papa.parse(csv2, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = processarDados(cleanData(results.data), 'GRÊMIO NOVORIZONTINO');
            setGremioNovorizontino(dados);
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const getValorMetrica = (jogador, metrica) => {
    if (!jogador) return 0;
    if (metrica.type === 'per90') return safeParseFloat(jogador[`${metrica.key}_per90`]);
    return safeParseFloat(jogador[metrica.key]);
  };

  const escalasMetricas = useMemo(() => {
    const todos = [...listaPreferencial, ...gremioNovorizontino];
    const escalas = {};
    
    METRICAS_RADAR.forEach(m => {
      const valores = todos.map(j => getValorMetrica(j, m)).filter(v => v >= 0);
      const max = Math.max(...valores, 0.1);
      escalas[m.label] = { max };
    });
    
    return escalas;
  }, [listaPreferencial, gremioNovorizontino]);

  const getRadarData = (type) => {
    if (!player) return [];
    const data = [];

    const playerNormalizedValues = METRICAS_RADAR.map(m => {
      const val = getValorMetrica(player, m);
      const escala = escalasMetricas[m.label];
      return (val / (escala?.max || 1)) * 100;
    });

    data.push({
      type: 'scatterpolar',
      r: playerNormalizedValues,
      theta: METRICAS_RADAR.map(m => m.label),
      fill: 'toself',
      name: player.Jogador,
      line: { color: '#fbbf24', width: 2 },
      fillcolor: 'rgba(251, 191, 36, 0.4)',
      mode: 'lines',
      marker: { size: 4 }
    });

    if (type === 'media') {
      const mediaListaNormalizedValues = METRICAS_RADAR.map(m => {
        const valores = listaPreferencial.map(j => getValorMetrica(j, m));
        const avg = valores.reduce((a, b) => a + b, 0) / (valores.length || 1);
        const escala = escalasMetricas[m.label];
        return (avg / (escala?.max || 1)) * 100;
      });
      data.push({
        type: 'scatterpolar',
        r: mediaListaNormalizedValues,
        theta: METRICAS_RADAR.map(m => m.label),
        fill: 'toself',
        name: 'Média Lista',
        line: { color: '#ef4444', dash: 'dot', width: 2 },
        fillcolor: 'rgba(239, 68, 68, 0.2)',
        mode: 'lines'
      });
    } else {
      const coresGremio = ['#3b82f6', '#10b981', '#8b5cf6'];
      gremioNovorizontino.slice(0, 3).forEach((p, i) => {
        const gremioNormalizedValues = METRICAS_RADAR.map(m => {
          const val = getValorMetrica(p, m);
          const escala = escalasMetricas[m.label];
          return (val / (escala?.max || 1)) * 100;
        });
        data.push({
          type: 'scatterpolar',
          r: gremioNormalizedValues,
          theta: METRICAS_RADAR.map(m => m.label),
          name: p.Jogador,
          line: { color: coresGremio[i], width: 1.5 },
          mode: 'lines'
        });
      });
    }
    return data;
  };

  const radarLayout = {
    polar: {
      radialaxis: { 
        visible: true, 
        range: [0, 100], 
        gridcolor: 'rgba(255,255,255,0.1)',
        tickfont: { size: 8, color: '#666' },
        showticklabels: false
      },
      angularaxis: { 
        tickfont: { size: 7, color: '#fff' },
        gridcolor: 'rgba(255,255,255,0.1)',
        rotation: 90,
        direction: 'clockwise'
      },
      bgcolor: 'rgba(0,0,0,0)'
    },
    showlegend: true,
    legend: { 
      orientation: 'h', 
      x: 0.5, 
      y: -0.15, 
      font: { size: 8, color: '#fff' },
      xanchor: 'center'
    },
    margin: { l: 40, r: 40, t: 30, b: 30 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: true
  };

  if (loading) return <div className="min-h-screen bg-[#08101e] flex items-center justify-center text-amber-500 font-bold">CARREGANDO...</div>;
  if (!player) return <div className="min-h-screen bg-[#08101e] flex items-center justify-center text-white">Atleta não encontrado.</div>;

  const getPlayerPhoto = (name) => {
    if (!name) return '/images/players/default.png';
    const formattedName = name.trim().replace(/\s+/g, '_');
    return `/images/players/${formattedName}.png`;
  };

  return (
    <div className="min-h-screen bg-[#08101e] text-white p-4 font-sans print:bg-white print:text-black print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .bg-slate-900, .bg-slate-900\/50 { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
          .text-white { color: black !important; }
          .text-slate-400, .text-slate-500 { color: #64748b !important; }
          .border-slate-700, .border-slate-800 { border-color: #e2e8f0 !important; }
          /* Forçar visibilidade do Plotly */
          .js-plotly-plot .main-svg { background: transparent !important; }
          .radar-chart svg { filter: none !important; }
          /* Ajuste de escala para caber na folha */
          .print-container { transform: scale(0.98); transform-origin: top left; }
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto print-container">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-4 border-b-2 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-14 w-auto" />
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-amber-500 uppercase leading-none print:text-black">
                Grêmio Novorizontino
              </h1>
              <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">
                Departamento de Scouting
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-amber-500 text-black px-3 py-1 font-black text-lg mb-1 uppercase italic">
              Relatório de Prospecção
            </div>
            <div className="text-slate-400 font-mono text-xs">
              DATA: {new Date().toLocaleDateString('pt-BR')} | ID: {player.ID_ATLETA}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* COL 1: PLAYER INFO & HEATMAP */}
          <div className="col-span-3 flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
              <div className="relative h-48 bg-gradient-to-b from-amber-500/20 to-slate-900">
                <img 
                  src={getPlayerPhoto(player.Jogador)} 
                  alt={player.Jogador}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full object-contain"
                  onError={(e) => { 
                    const alt = getPlayerPhoto(player.Jogador.toUpperCase());
                    if (e.target.src !== alt) e.target.src = alt;
                    else e.target.src = '/images/players/default.png';
                  }}
                />
              </div>
              <div className="p-4">
                <h2 className="text-xl font-black text-amber-500 uppercase mb-1 leading-none print:text-black">{player.Jogador}</h2>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Equipe</p>
                    <p className="text-xs font-bold truncate print:text-black">{player.Equipa}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Pé</p>
                    <p className="text-xs font-bold print:text-black">{player.Pé === 'R' ? 'Direito' : 'Esquerdo'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Idade</p>
                    <p className="text-xs font-bold print:text-black">{player.Idade} anos</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Minutos</p>
                    <p className="text-xs font-bold print:text-black">{player['Minutos jogados']}'</p>
                  </div>
                </div>
              </div>
            </div>
            <HeatmapComponent player={player} />
          </div>

          {/* COL 2: RADAR CHARTS */}
          <div className="col-span-6 grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-3 flex flex-col items-center shadow-md">
              <h3 className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1 print:text-black">Vs Média Lista</h3>
              <div className="w-full h-64 radar-chart">
                <Plot
                  data={getRadarData('media')}
                  layout={radarLayout}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-3 flex flex-col items-center shadow-md">
              <h3 className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1 print:text-black">Vs Elenco GN</h3>
              <div className="w-full h-64 radar-chart">
                <Plot
                  data={getRadarData('gremio')}
                  layout={radarLayout}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
            <div className="col-span-2 bg-slate-900/30 border border-slate-800 rounded-xl p-2 italic text-[9px] text-slate-500 text-center">
              * Gráficos normalizados (0-100) com base no universo da Lista Preferencial.
            </div>
          </div>

          {/* COL 3: METRICS TABLE */}
          <div className="col-span-3">
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-md h-full flex flex-col">
              <div className="bg-amber-500 text-black font-black text-center py-1.5 text-[10px] uppercase tracking-widest">
                Métricas por 90'
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-800 text-slate-400 uppercase print:bg-slate-100 print:text-slate-700">
                    <tr>
                      <th className="px-2 py-1.5 font-bold">Indicador</th>
                      <th className="px-2 py-1.5 font-bold text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                    {METRICAS_RADAR.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50">
                        <td className="px-2 py-1.5 text-slate-300 font-medium print:text-slate-800">{m.label}</td>
                        <td className="px-2 py-1.5 text-right font-bold text-amber-400 print:text-black">
                          {getValorMetrica(player, m).toFixed(2)}{m.label.includes('%') ? '%' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-800/50 mt-auto border-t border-slate-700 no-print">
                <button onClick={() => window.print()} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black py-2 rounded-lg text-xs shadow-lg">EXPORTAR PDF</button>
                <button onClick={() => router.back()} className="w-full mt-2 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest">Voltar</button>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <footer className="mt-4 flex justify-between items-end border-t border-slate-800 pt-2 print:border-slate-200">
          <div className="text-[8px] text-slate-500 italic">
            Mapa de calor e radares gerados automaticamente via Scouting System GN.
          </div>
          <img src="/club/escudonovorizontino.png" alt="Logo" className="h-5 grayscale opacity-30" />
        </footer>
      </div>
    </div>
  );
}

export default function PlayerProfile() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PlayerProfileContent />
    </Suspense>
  );
}
