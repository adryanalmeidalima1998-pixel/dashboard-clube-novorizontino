'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';
import HeatmapComponent from '@/app/components/HeatmapComponent';

const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false, 
  loading: () => <div className="h-48 flex items-center justify-center text-slate-500 font-bold italic animate-pulse text-2xl">CARREGANDO GRÁFICOS...</div> 
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
            const cleaned = cleanData(results.data);
            const dados = processarDados(cleaned, 'LISTA PREFERENCIAL');
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
      line: { color: '#fbbf24', width: 3 }, fillcolor: 'rgba(251, 191, 36, 0.4)', mode: 'lines'
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
        data.push({ type: 'scatterpolar', r: gVals, theta: labels, name: p.Jogador, line: { color: cores[i], width: 2 }, mode: 'lines' });
      });
    }
    return data;
  };

  const radarLayout = {
    polar: {
      radialaxis: { visible: true, range: [0, 100], gridcolor: '#ddd', showticklabels: false },
      angularaxis: { tickfont: { size: 9, color: '#000', weight: 'bold' }, gridcolor: '#ddd', rotation: 90, direction: 'clockwise' },
      bgcolor: '#fff'
    },
    showlegend: true, 
    legend: { orientation: 'h', x: 0.5, y: -0.1, font: { size: 10, color: '#000' }, xanchor: 'center' },
    margin: { l: 50, r: 50, t: 30, b: 30 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', autosize: true
  };

  const getPlayerPhoto = (name) => {
    if (!name) return '/images/players/default.png';
    const cleanName = name.trim();
    if (cleanName === 'Kayke') return '/images/players/Kayke_Ferrari.png';
    if (cleanName === 'Rodrigo Farofa') return '/images/players/rodrigo_rodrigues.png';
    if (cleanName === 'Allison Patrick') return '/images/players/Allison.png';
    return `/images/players/${cleanName.replace(/\s+/g, '_')}.png`;
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">Carregando Relatório...</div>;
  if (!player) return <div className="min-h-screen bg-white flex items-center justify-center text-black font-black uppercase text-2xl">Atleta não encontrado.</div>;

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans print:p-0 overflow-x-hidden">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.2cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0.1cm !important; transform: scale(0.96); transform-origin: top left; }
          .radar-chart { height: 320px !important; }
        }
      `}</style>

      <div className="max-w-[1600px] mx-auto print-container flex flex-col gap-3">
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">Relatório de Prospecção</div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">DATA: {new Date().toLocaleDateString('pt-BR')} | ID: {player.ID_ATLETA}</div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3 flex flex-col gap-3">
            <div className="bg-white border-2 border-slate-900 rounded-[2rem] overflow-hidden shadow-lg">
              <div className="relative h-48 bg-slate-50 border-b-2 border-slate-900">
                <img src={getPlayerPhoto(player.Jogador)} alt={player.Jogador} className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full object-contain" onError={(e) => { e.target.src = '/images/players/default.png'; }} />
              </div>
              <div className="p-4">
                <h2 className="text-2xl font-black text-black uppercase mb-2 leading-none">{player.Jogador}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">TIME</p><p className="text-sm font-black truncate">{player['TIME'] || player.TIME || player.Equipa || '-'}</p></div>
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Pé</p><p className="text-sm font-black">{player.Pé === 'R' ? 'Direito' : 'Esquerdo'}</p></div>
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Idade</p><p className="text-sm font-black">{player.Idade} anos</p></div>
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Minutos</p><p className="text-sm font-black">{player['Minutos jogados']}'</p></div>
                </div>
              </div>
            </div>
            <div className="scale-95 origin-top-left">
              <HeatmapComponent player={player} />
            </div>
          </div>

          <div className="col-span-9 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-4 flex flex-col items-center shadow-lg">
                <h3 className="text-black font-black text-[10px] uppercase tracking-widest mb-2 border-b-2 border-amber-500 px-4 pb-0.5">Vs Média Lista</h3>
                <div className="w-full h-[320px] radar-chart">
                  <Plot data={getRadarData('media')} layout={radarLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
                </div>
              </div>
              <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-4 flex flex-col items-center shadow-lg">
                <h3 className="text-black font-black text-[10px] uppercase tracking-widest mb-2 border-b-2 border-amber-500 px-4 pb-0.5">Vs Elenco GN</h3>
                <div className="w-full h-[320px] radar-chart">
                  <Plot data={getRadarData('gremio')} layout={radarLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
                </div>
              </div>
            </div>
            <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-4 flex flex-col items-center shadow-lg">
              <h3 className="text-black font-black text-[10px] uppercase tracking-widest mb-2 border-b-2 border-amber-500 px-4 pb-0.5">Vs Série B</h3>
              <div className="w-full h-[320px] radar-chart">
                <Plot data={getRadarData('serieb')} layout={radarLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-900 rounded-[1.5rem] overflow-hidden shadow-lg">
          <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">Métricas Detalhadas por 90 Minutos</div>
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900">
            {[0, 5].map(start => (
              <table key={start} className="w-full text-left text-[10px]">
                <tbody className="divide-y divide-slate-100">
                  {METRICAS_RADAR.slice(start, start + 5).map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-2 text-slate-700 font-black uppercase tracking-tight">{m.label}</td>
                      <td className="px-6 py-2 text-right font-black text-black text-xs">{getValorMetrica(player, m).toFixed(2)}{m.label.includes('%') ? '%' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </div>

        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3 no-print">
          <div className="flex gap-4">
            <button onClick={() => window.print()} className="bg-slate-900 hover:bg-black text-white font-black px-8 py-3 rounded-2xl text-sm shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              EXPORTAR PDF
            </button>
            <button onClick={() => router.back()} className="text-slate-500 hover:text-black text-sm font-black uppercase tracking-widest px-4 transition-colors">Voltar</button>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>
      </div>
    </div>
  );
}

export default function PlayerProfile() {
  return <Suspense fallback={<div>Carregando...</div>}><PlayerProfileContent /></Suspense>;
}
