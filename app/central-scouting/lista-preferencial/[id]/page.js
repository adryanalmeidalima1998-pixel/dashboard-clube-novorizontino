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
  { label: 'Passes Progressivos %', key: 'Passes progressivos precisos\n%', type: 'raw' },
  { label: 'Passes na Área %', key: 'Passes dentro da área / precisos\n%', type: 'raw' },
  { label: 'Dribles Certos/90', key: 'dribles_certos_90', type: 'custom' },
  { label: 'Dribles 1/3 Final Certos/90', key: 'dribles_13_certos_90', type: 'custom' },
  { label: 'Entradas 1/3 Final (C)', key: 'Entradas no terço final carregando a bola\n% do total', type: 'raw' },
  { label: 'Recuperações Campo Adv', key: 'Bolas recuperadas no campo do adversário', type: 'per90' },
  { label: 'xA', key: 'xA', type: 'per90' },
  { label: 'xG', key: 'Xg', type: 'per90' },
  { label: 'Ações Área Adv Certas/90', key: 'Ações na caixa adversária bem-sucedidas', type: 'per90' }
];

function PlayerProfileContent() {
  const { id } = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState(null);
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioNovorizontino, setGremioNovorizontino] = useState([]);
  const [loading, setLoading] = useState(true);

  const calcularMetricasCustomizadas = (jogador) => {
    const minutos = safeParseFloat(jogador['Minutos jogados']);
    if (minutos <= 0) return jogador;

    const dribles = safeParseFloat(jogador['Dribles bem sucedidos']);
    jogador.dribles_certos_90 = (dribles / minutos) * 90;

    const dribles13 = safeParseFloat(jogador['Dribles no último terço do campo com sucesso']);
    jogador.dribles_13_certos_90 = (dribles13 / minutos) * 90;

    const acoesCertasAbs = safeParseFloat(jogador['Ações na área adversária bem-sucedidas']);
    jogador.acoes_area_adv_certas_90 = (acoesCertasAbs / minutos) * 90;

    const desafiosVencidos = safeParseFloat(jogador['Desafios vencidos']);
    jogador.desafios_ganhos_90 = (desafiosVencidos / minutos) * 90;

    const disputasAtaqueGanhos = safeParseFloat(jogador['Disputas de bola no ataque / com sucesso']);
    jogador.disputas_ataque_ganhas_90 = (disputasAtaqueGanhos / minutos) * 90;

    return jogador;
  };

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
      return calcularMetricasCustomizadas(processado);
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
    if (metrica.type === 'custom') return safeParseFloat(jogador[metrica.key]);
    return safeParseFloat(jogador[metrica.key]);
  };

  const escalasMetricas = useMemo(() => {
    const todos = [...listaPreferencial, ...gremioNovorizontino];
    const escalas = {};
    
    METRICAS_RADAR.forEach(m => {
      const valores = todos.map(j => getValorMetrica(j, m)).filter(v => v >= 0);
      const max = Math.max(...valores, 1);
      
      let tickvals = [];
      let ticktext = [];
      
      if (max <= 1) {
        for (let i = 0; i <= 4; i++) {
          const val = (i / 4) * max;
          tickvals.push(val);
          ticktext.push(val.toFixed(2));
        }
      } else if (max <= 10) {
        const step = max / 4;
        for (let i = 0; i <= 4; i++) {
          const val = i * step;
          tickvals.push(val);
          ticktext.push(val.toFixed(1));
        }
      } else {
        const step = max / 4;
        for (let i = 0; i <= 4; i++) {
          const val = i * step;
          tickvals.push(val);
          ticktext.push(val.toFixed(0));
        }
      }
      
      escalas[m.label] = { max, tickvals, ticktext };
    });
    
    return escalas;
  }, [listaPreferencial, gremioNovorizontino]);

  const getRadarData = (type) => {
    if (!player) return [];
    const data = [];

    const playerNormalizedValues = METRICAS_RADAR.map(m => {
      const val = getValorMetrica(player, m);
      const escala = escalasMetricas[m.label];
      return (val / escala.max) * 2;
    });
    const playerRealValues = METRICAS_RADAR.map(m => getValorMetrica(player, m));

    data.push({
      type: 'scatterpolar',
      r: playerNormalizedValues,
      theta: METRICAS_RADAR.map(m => m.label),
      customdata: playerRealValues,
      hovertemplate: '<b>%{theta}</b><br>Valor: %{customdata:.2f}<extra></extra>',
      fill: 'toself',
      name: player.Jogador,
      line: { color: '#fbbf24', width: 3 },
      fillcolor: 'rgba(251, 191, 36, 0.25)',
      mode: 'lines+markers',
      marker: { size: 6, color: '#fbbf24', line: { color: '#ffffff', width: 1 } }
    });

    if (type === 'media') {
      const mediaListaNormalizedValues = METRICAS_RADAR.map(m => {
        const valores = listaPreferencial.map(j => getValorMetrica(j, m));
        const avg = valores.reduce((a, b) => a + b, 0) / (valores.length || 1);
        const escala = escalasMetricas[m.label];
        return (avg / escala.max) * 2;
      });
      const mediaListaRealValues = METRICAS_RADAR.map(m => {
        const valores = listaPreferencial.map(j => getValorMetrica(j, m));
        return valores.reduce((a, b) => a + b, 0) / (valores.length || 1);
      });
      data.push({
        type: 'scatterpolar',
        r: mediaListaNormalizedValues,
        theta: METRICAS_RADAR.map(m => m.label),
        customdata: mediaListaRealValues,
        hovertemplate: '<b>%{theta}</b><br>Media: %{customdata:.2f}<extra></extra>',
        fill: 'toself',
        name: 'Media Lista Preferencial',
        line: { color: '#ef4444', dash: 'dot', width: 2 },
        fillcolor: 'rgba(239, 68, 68, 0.08)',
        mode: 'lines+markers',
        marker: { size: 5, color: '#ef4444', line: { color: '#ffffff', width: 1 } }
      });
    } else {
      const coresGremio = ['#3b82f6', '#10b981', '#8b5cf6'];
      gremioNovorizontino.slice(0, 3).forEach((p, i) => {
        const gremioNormalizedValues = METRICAS_RADAR.map(m => {
          const val = getValorMetrica(p, m);
          const escala = escalasMetricas[m.label];
          return (val / escala.max) * 2;
        });
        const gremioRealValues = METRICAS_RADAR.map(m => getValorMetrica(p, m));
        data.push({
          type: 'scatterpolar',
          r: gremioNormalizedValues,
          theta: METRICAS_RADAR.map(m => m.label),
          customdata: gremioRealValues,
          hovertemplate: '<b>%{theta}</b><br>' + p.Jogador + ': %{customdata:.2f}<extra></extra>',
          fill: 'none',
          name: `GN: ${p.Jogador}`,
          line: { color: coresGremio[i], width: 2 },
          mode: 'lines+markers',
          marker: { size: 5, color: coresGremio[i], line: { color: '#ffffff', width: 1 } }
        });
      });
    }
    return data;
  };

  const radarLayout = {
    polar: {
      radialaxis: { 
        visible: true,
        gridcolor: 'rgba(255,255,255,0.2)',
        tickfont: { size: 6, color: '#ffffff' },
        showticklabels: true,
        ticks: 'outside',
        linecolor: '#ffffff',
        linewidth: 1,
        range: [0, 2],
        tickvals: [0, 0.5, 1, 1.5, 2],
        ticktext: ['0', '0.5', '1', '1.5', '2']
      },
      angularaxis: { 
        tickfont: { size: 8, color: '#ffffff' },
        gridcolor: 'rgba(255,255,255,0.25)',
        rotation: 90,
        direction: 'clockwise',
        linecolor: '#ffffff',
        linewidth: 1
      },
      bgcolor: 'rgba(255, 255, 255, 0.01)'
    },
    showlegend: true,
    legend: { 
      orientation: 'h', 
      x: 0.5, 
      y: -0.2, 
      font: { size: 8, color: '#ffffff' },
      xanchor: 'center',
      yanchor: 'top'
    },
    margin: { l: 40, r: 40, t: 20, b: 40 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: true
  };

  if (loading) return (
    <div className="min-h-screen bg-[#08101e] flex items-center justify-center">
      <div className="text-amber-500 text-2xl font-bold animate-pulse">CARREGANDO SCOUT...</div>
    </div>
  );

  if (!player) return (
    <div className="min-h-screen bg-[#08101e] flex items-center justify-center">
      <div className="text-white text-xl">Atleta não encontrado.</div>
    </div>
  );

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
          .radar-chart svg { filter: invert(1) hue-rotate(180deg) !important; }
          .metric-card { border: 1px solid #ccc !important; color: black !important; }
          .text-amber-500, .text-amber-400 { color: #b45309 !important; }
          .bg-slate-800 { background: #f8fafc !important; }
          .border-slate-700 { border-color: #e2e8f0 !important; }
          .legend-container { margin-top: 10px !important; }
          .bg-slate-900 { background: white !important; border: 1px solid #ddd !important; }
          .bg-slate-900\/50 { background: white !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto print-container">
        {/* HEADER */}
        <header className="flex justify-between items-center mb-6 border-b-2 border-amber-500 pb-4">
          <div className="flex items-center gap-6">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-20 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-amber-500 uppercase leading-none print:text-black">
                Grêmio Novorizontino
              </h1>
              <p className="text-lg font-bold tracking-widest text-slate-400 uppercase">
                Departamento de Scouting
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-amber-500 text-black px-4 py-1 font-black text-xl mb-1 uppercase italic">
              Relatório de Prospecção
            </div>
            <div className="text-slate-400 font-mono text-sm">
              DATA: {new Date().toLocaleDateString('pt-BR')} | ID: {player.ID_ATLETA}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* COL 1: PLAYER INFO & HEATMAP */}
          <div className="col-span-4 flex flex-col gap-6">
            {/* Player Bio Card */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
              <div className="relative h-64 bg-gradient-to-b from-amber-500/20 to-slate-900">
                <img 
                  src={getPlayerPhoto(player.Jogador)} 
                  alt={player.Jogador}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full object-contain"
                  onError={(e) => { 
                    const alternateSrc = getPlayerPhoto(player.Jogador.toUpperCase());
                    if (e.target.src !== alternateSrc) {
                      e.target.src = alternateSrc;
                    } else {
                      e.target.src = '/images/players/default.png';
                    }
                  }}
                />
              </div>
              <div className="p-6">
                <h2 className="text-3xl font-black text-amber-500 uppercase mb-2 leading-none print:text-black">{player.Jogador}</h2>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Equipe Atual</p>
                    <p className="text-sm font-bold truncate print:text-black">{player.Equipa}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Pé Preferencial</p>
                    <p className="text-sm font-bold print:text-black">{player.Pé === 'R' ? 'Direito' : 'Esquerdo'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Idade</p>
                    <p className="text-sm font-bold print:text-black">{player.Idade} anos</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Minutos</p>
                    <p className="text-sm font-bold print:text-black">{player['Minutos jogados']}'</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap Section */}
            <HeatmapComponent player={player} />
          </div>

          {/* COL 2: RADAR CHARTS */}
          <div className="col-span-5 grid grid-rows-2 gap-6">
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center shadow-xl">
              <h3 className="text-amber-500 font-black text-sm uppercase tracking-widest mb-2 print:text-black">Vs Média Lista Preferencial</h3>
              <div className="w-full h-full radar-chart">
                <Plot
                  data={getRadarData('media')}
                  layout={radarLayout}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center shadow-xl">
              <h3 className="text-amber-500 font-black text-sm uppercase tracking-widest mb-2 print:text-black">Vs Elenco Novorizontino</h3>
              <div className="w-full h-full radar-chart">
                <Plot
                  data={getRadarData('gremio')}
                  layout={radarLayout}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* COL 3: METRICS TABLE */}
          <div className="col-span-3">
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
              <div className="bg-amber-500 text-black font-black text-center py-2 text-sm uppercase tracking-widest">
                Métricas por 90 Minutos
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-400 uppercase print:bg-slate-100 print:text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-bold">Indicador</th>
                      <th className="px-3 py-2 font-bold text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                    {METRICAS_RADAR.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-slate-300 font-medium print:text-slate-800">{m.label}</td>
                        <td className="px-3 py-2 text-right font-bold text-amber-400 print:text-black">
                          {getValorMetrica(player, m).toFixed(2)}
                          {m.key.includes('%') ? '%' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-800/50 mt-auto border-t border-slate-700 no-print">
                <button 
                  onClick={() => window.print()}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>EXPORTAR PDF</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  </svg>
                </button>
                <button 
                  onClick={() => router.back()}
                  className="w-full mt-2 text-slate-400 hover:text-white text-xs font-bold py-2 uppercase tracking-widest"
                >
                  VOLTAR PARA LISTA
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER / NOTES */}
        <footer className="mt-6 flex justify-between items-end border-t border-slate-800 pt-4 print:border-slate-200">
          <div className="text-[10px] text-slate-500 max-w-2xl italic">
            * Todas as métricas são normalizadas para 90 minutos de jogo. Os dados do radar são comparativos dentro do universo da Lista Preferencial e do elenco atual do Grêmio Novorizontino. Mapa de calor gerado por algoritmo de densidade posicional baseado em ações técnicas do atleta.
          </div>
          <div className="flex items-center gap-2 opacity-50">
            <span className="text-[10px] font-bold text-slate-400">SCOUTING SYSTEM</span>
            <img src="/club/escudonovorizontino.png" alt="Logo" className="h-6 grayscale" />
          </div>
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
