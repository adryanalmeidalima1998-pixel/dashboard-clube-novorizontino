'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';
import HeatmapComponent from '@/app/components/HeatmapComponent';

const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false, 
  loading: () => <div className="h-48 flex items-center justify-center text-slate-500 font-bold italic animate-pulse">CARREGANDO...</div> 
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
  const [serieB, setSerieB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

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
        const urlSerieB = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQbSUvDghD3MPKBNEYz1cxeLgCmftwt5AoqkVmai6xCrA7W8fIy77Y2RlTmqR5w1A6a-MRPlV67pVYA/pub?output=csv';

        const [res1, res2, res3] = await Promise.all([fetch(urlAba1), fetch(urlAba2), fetch(urlSerieB)]);
        const [csv1, csv2, csv3] = await Promise.all([res1.text(), res2.text(), res3.text()]);

        Papa.parse(csv1, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const dados = processarDados(cleanData(results.data), 'LISTA PREFERENCIAL');
            setListaPreferencial(dados);
            const p = dados.find(d => d.ID_ATLETA === id || d.Jogador === decodeURIComponent(id));
            if (p) setPlayer(p);
          }
        });

        Papa.parse(csv2, {
          header: true, skipEmptyLines: true,
          complete: (results) => setGremioNovorizontino(processarDados(cleanData(results.data), 'GRÊMIO NOVORIZONTINO'))
        });

        Papa.parse(csv3, {
          header: true, skipEmptyLines: true,
          complete: (results) => setSerieB(cleanData(results.data))
        });

        setLoading(false);
      } catch (error) {
        console.error('Erro:', error);
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const getValorMetrica = (jogador, metrica) => {
    if (!jogador) return 0;
    if (metrica.type === 'per90') {
      if (jogador.aba === undefined) return safeParseFloat(jogador[metrica.key]);
      return safeParseFloat(jogador[`${metrica.key}_per90`]);
    }
    return safeParseFloat(jogador[metrica.key]);
  };

  const escalasMetricas = useMemo(() => {
    const todos = [...listaPreferencial, ...gremioNovorizontino, ...serieB];
    const escalas = {};
    METRICAS_RADAR.forEach(m => {
      const valores = todos.map(j => getValorMetrica(j, m)).filter(v => v >= 0);
      escalas[m.label] = { max: Math.max(...valores, 0.1) };
    });
    return escalas;
  }, [listaPreferencial, gremioNovorizontino, serieB]);

  const getRadarData = (type) => {
    if (!player) return [];
    const labels = [...METRICAS_RADAR.map(m => m.label), METRICAS_RADAR[0].label];
    const playerVals = [...METRICAS_RADAR.map(m => (getValorMetrica(player, m) / (escalasMetricas[m.label]?.max || 1)) * 100), (getValorMetrica(player, METRICAS_RADAR[0]) / (escalasMetricas[METRICAS_RADAR[0].label]?.max || 1)) * 100];

    const data = [{
      type: 'scatterpolar', r: playerVals, theta: labels, fill: 'toself', name: player.Jogador,
      line: { color: isPrinting ? '#000' : '#fbbf24', width: 3 }, 
      fillcolor: isPrinting ? 'rgba(0, 0, 0, 0.2)' : 'rgba(251, 191, 36, 0.4)', mode: 'lines'
    }];

    if (type === 'media') {
      const mediaVals = [...METRICAS_RADAR.map(m => {
        const valores = listaPreferencial.map(j => getValorMetrica(j, m));
        return ((valores.reduce((a, b) => a + b, 0) / (valores.length || 1)) / (escalasMetricas[m.label]?.max || 1)) * 100;
      }), 0];
      mediaVals[mediaVals.length-1] = mediaVals[0];
      data.push({ type: 'scatterpolar', r: mediaVals, theta: labels, fill: 'toself', name: 'Média Lista', line: { color: '#ef4444', dash: 'dot', width: 2 }, fillcolor: 'rgba(239, 68, 68, 0.15)', mode: 'lines' });
    } else if (type === 'serieb') {
      const mediaVals = [...METRICAS_RADAR.map(m => {
        const valores = serieB.map(j => safeParseFloat(j[m.key]));
        return ((valores.reduce((a, b) => a + b, 0) / (valores.length || 1)) / (escalasMetricas[m.label]?.max || 1)) * 100;
      }), 0];
      mediaVals[mediaVals.length-1] = mediaVals[0];
      data.push({ type: 'scatterpolar', r: mediaVals, theta: labels, fill: 'toself', name: 'Média Série B', line: { color: '#3b82f6', dash: 'dot', width: 2 }, fillcolor: 'rgba(59, 130, 246, 0.15)', mode: 'lines' });
    } else {
      const cores = ['#3b82f6', '#10b981', '#8b5cf6'];
      gremioNovorizontino.slice(0, 3).forEach((p, i) => {
        const gVals = [...METRICAS_RADAR.map(m => (getValorMetrica(p, m) / (escalasMetricas[m.label]?.max || 1)) * 100), (getValorMetrica(p, METRICAS_RADAR[0]) / (escalasMetricas[METRICAS_RADAR[0].label]?.max || 1)) * 100];
        data.push({ type: 'scatterpolar', r: gVals, theta: labels, name: p.Jogador, line: { color: cores[i], width: 1.5 }, mode: 'lines' });
      });
    }
    return data;
  };

  const radarLayout = {
    polar: {
      radialaxis: { visible: true, range: [0, 100], gridcolor: isPrinting ? '#ccc' : 'rgba(255,255,255,0.1)', showticklabels: false },
      angularaxis: { tickfont: { size: 8, color: isPrinting ? '#000' : '#fff', weight: 'bold' }, gridcolor: isPrinting ? '#ccc' : 'rgba(255,255,255,0.1)', rotation: 90, direction: 'clockwise' },
      bgcolor: 'rgba(0,0,0,0)'
    },
    showlegend: true, 
    legend: { orientation: 'h', x: 0.5, y: -0.2, font: { size: 9, color: isPrinting ? '#000' : '#fff' }, xanchor: 'center' },
    margin: { l: 60, r: 60, t: 30, b: 30 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', autosize: true
  };

  if (loading) return <div className="min-h-screen bg-[#08101e] flex items-center justify-center text-amber-500 font-black italic animate-pulse">CARREGANDO...</div>;
  if (!player) return <div className="min-h-screen bg-[#08101e] flex items-center justify-center text-white">Atleta não encontrado.</div>;

  const getPlayerPhoto = (name) => {
    if (!name) return '/images/players/default.png';
    const cleanName = name.trim();
    if (cleanName === 'Kayke') return '/images/players/Kayke_Ferrari.png';
    if (cleanName === 'Rodrigo Farofa') return '/images/players/rodrigo_rodrigues.png';
    if (cleanName === 'Allison Patrick') return '/images/players/Allison.png';
    return `/images/players/${cleanName.replace(/\s+/g, '_')}.png`;
  };

  return (
    <div className="min-h-screen bg-[#08101e] text-white p-4 font-sans print:bg-white print:text-black print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.2cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0.2cm !important; transform: scale(0.98); transform-origin: top left; }
          .bg-slate-900, .bg-slate-900\/50 { background: white !important; border: 2px solid #000 !important; color: black !important; }
          .text-amber-500, .text-amber-400 { color: black !important; font-weight: 900 !important; }
          .text-slate-300, .text-slate-400, .text-slate-500 { color: black !important; font-weight: bold !important; }
          .js-plotly-plot .main-svg { background: transparent !important; }
          .gridlayer path { stroke: #000 !important; stroke-width: 0.5px !important; }
          .divide-slate-700, .divide-slate-800, .border-slate-700, .border-slate-800 { border-color: #000 !important; }
        }
      `}</style>

      <div className="max-w-[1550px] mx-auto print-container flex flex-col gap-4">
        <header className="flex justify-between items-center border-b-2 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-amber-500 uppercase leading-none print:text-black">Grêmio Novorizontino</h1>
              <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-amber-500 text-black px-4 py-1 font-black text-xl uppercase italic">Relatório de Prospecção</div>
            <div className="text-slate-400 font-mono text-xs">DATA: {new Date().toLocaleDateString('pt-BR')} | ID: {player.ID_ATLETA}</div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
              <div className="relative h-56 bg-gradient-to-b from-amber-500/20 to-slate-900">
                <img src={getPlayerPhoto(player.Jogador)} alt={player.Jogador} className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full object-contain" onError={(e) => { e.target.src = '/images/players/default.png'; }} />
              </div>
              <div className="p-5">
                <h2 className="text-3xl font-black text-amber-500 uppercase mb-2 leading-none print:text-black">{player.Jogador}</h2>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Equipe</p><p className="text-sm font-black truncate print:text-black">{player.TIME || player.Equipa}</p></div>
                  <div><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Pé</p><p className="text-sm font-black print:text-black">{player.Pé === 'R' ? 'Direito' : 'Esquerdo'}</p></div>
                  <div><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Idade</p><p className="text-sm font-black print:text-black">{player.Idade} anos</p></div>
                  <div><p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Minutos</p><p className="text-sm font-black print:text-black">{player['Minutos jogados']}'</p></div>
                </div>
              </div>
            </div>
            <HeatmapComponent player={player} />
          </div>

          <div className="col-span-9 grid grid-cols-3 gap-4">
            {['media', 'gremio', 'serieb'].map((type, i) => (
              <div key={type} className="bg-slate-900/50 border border-slate-700 rounded-3xl p-5 flex flex-col items-center shadow-xl">
                <h3 className="text-amber-500 font-black text-xs uppercase tracking-widest mb-3 print:text-black">
                  {type === 'media' ? 'Vs Média Lista' : type === 'serieb' ? 'Vs Série B' : 'Vs Elenco GN'}
                </h3>
                <div className="w-full h-[380px] radar-chart">
                  <Plot data={getRadarData(type)} layout={radarLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
          <div className="bg-amber-500 text-black font-black text-center py-3 text-sm uppercase tracking-widest">Métricas por 90'</div>
          <div className="grid grid-cols-2 divide-x divide-slate-700 print:divide-black">
            {[0, 5].map(start => (
              <table key={start} className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-800 print:divide-black">
                  {METRICAS_RADAR.slice(start, start + 5).map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50">
                      <td className="px-6 py-3 text-slate-300 font-black print:text-black">{m.label}</td>
                      <td className="px-6 py-3 text-right font-black text-amber-400 print:text-black">{getValorMetrica(player, m).toFixed(2)}{m.label.includes('%') ? '%' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </div>

        <footer className="flex justify-between items-center border-t border-slate-800 pt-4 print:border-black no-print">
          <div className="flex gap-4">
            <button onClick={() => window.print()} className="bg-amber-500 hover:bg-amber-600 text-black font-black px-8 py-3 rounded-2xl text-sm shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>
              EXPORTAR RELATÓRIO PDF
            </button>
            <button onClick={() => router.back()} className="text-slate-500 hover:text-white text-sm font-black uppercase tracking-widest px-4">Voltar</button>
          </div>
          <p className="text-xs text-slate-500 font-black italic">Scouting System GN - Dados automatizados e normalizados.</p>
        </footer>
      </div>
    </div>
  );
}

export default function PlayerProfile() {
  return <Suspense fallback={<div>Carregando...</div>}><PlayerProfileContent /></Suspense>;
}
