'use client';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import HeatmapComponent from '@/app/components/HeatmapComponent';

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

// Componente de Radar usando Canvas (mais confiável que Plotly dinâmico)
function RadarChart({ data, layout, title }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2.5;

    // Limpar canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    // Desenhar grades
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const r = (radius / 5) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Desenhar eixos
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const angles = data[0].theta.map((_, i) => (i / data[0].theta.length) * Math.PI * 2 - Math.PI / 2);
    angles.forEach(angle => {
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    // Desenhar rótulos
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    data[0].theta.forEach((label, i) => {
      const angle = (i / data[0].theta.length) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + (radius + 30) * Math.cos(angle);
      const y = centerY + (radius + 30) * Math.sin(angle);
      ctx.fillText(label, x, y);
    });

    // Desenhar dados (polígonos)
    const cores = ['#fbbf24', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6'];
    data.forEach((dataset, dataIdx) => {
      ctx.fillStyle = cores[dataIdx % cores.length].replace(')', ', 0.3)').replace('rgb', 'rgba');
      ctx.strokeStyle = cores[dataIdx % cores.length];
      ctx.lineWidth = 3;
      ctx.beginPath();
      dataset.r.forEach((value, i) => {
        const angle = (i / dataset.r.length) * Math.PI * 2 - Math.PI / 2;
        const normalizedValue = (value / 100) * radius;
        const x = centerX + normalizedValue * Math.cos(angle);
        const y = centerY + normalizedValue * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Desenhar legenda
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    data.forEach((dataset, idx) => {
      ctx.fillStyle = cores[idx % cores.length];
      ctx.fillRect(20, height - 40 + idx * 20, 15, 15);
      ctx.fillStyle = '#000';
      ctx.fillText(dataset.name, 40, height - 30 + idx * 20);
    });
  }, [data]);

  return <canvas ref={canvasRef} width={500} height={500} className="w-full h-full" />;
}

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
            if (p) {
              console.log('Jogador encontrado:', p.Jogador, 'TIME:', p.TIME);
              setPlayer(p);
            }
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
      r: playerVals, theta: labels, name: player.Jogador
    }];

    if (type === 'media') {
      const mediaVals = [...METRICAS_RADAR.map(m => {
        const valores = listaPreferencial.map(j => getValorMetrica(j, m));
        return ((valores.reduce((a, b) => a + b, 0) / (valores.length || 1)) / (escalasMetricas[m.label]?.max || 1)) * 100;
      }), 0];
      mediaVals[mediaVals.length-1] = mediaVals[0];
      data.push({ r: mediaVals, theta: labels, name: 'Média Lista' });
    } else if (type === 'serieb') {
      const mediaVals = [...METRICAS_RADAR.map(m => {
        const valores = serieB.map(j => safeParseFloat(j[m.key]));
        return ((valores.reduce((a, b) => a + b, 0) / (valores.length || 1)) / (escalasMetricas[m.label]?.max || 1)) * 100;
      }), 0];
      mediaVals[mediaVals.length-1] = mediaVals[0];
      data.push({ r: mediaVals, theta: labels, name: 'Média Série B' });
    } else {
      gremioNovorizontino.slice(0, 3).forEach((p, i) => {
        const gVals = [...METRICAS_RADAR.map(m => (getValorMetrica(p, m) / (escalasMetricas[m.label]?.max || 1)) * 100), (getValorMetrica(p, METRICAS_RADAR[0]) / (escalasMetricas[METRICAS_RADAR[0].label]?.max || 1)) * 100];
        data.push({ r: gVals, theta: labels, name: p.Jogador });
      });
    }
    return data;
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
    <div className="min-h-screen bg-white text-black p-4 font-sans print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.1cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0.2cm !important; background: white !important; }
        }
      `}</style>

      <div className="max-w-[1600px] mx-auto print-container flex flex-col gap-4">
        <header className="flex justify-between items-center border-b-8 border-amber-500 pb-3">
          <div className="flex items-center gap-6">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-20 w-auto" />
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-xl font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-amber-500 text-black px-8 py-2 font-black text-2xl uppercase italic shadow-lg">Relatório de Prospecção</div>
            <div className="text-slate-600 font-black text-sm mt-1 tracking-wider uppercase">DATA: {new Date().toLocaleDateString('pt-BR')} | ID: {player.ID_ATLETA}</div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3 flex flex-col gap-4">
            <div className="bg-white border-4 border-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="relative h-64 bg-slate-50 border-b-4 border-slate-900">
                <img src={getPlayerPhoto(player.Jogador)} alt={player.Jogador} className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full object-contain" onError={(e) => { e.target.src = '/images/players/default.png'; }} />
              </div>
              <div className="p-6">
                <h2 className="text-4xl font-black text-black uppercase mb-4 leading-none">{player.Jogador}</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div><p className="text-[11px] text-slate-500 uppercase font-black tracking-widest">Equipe</p><p className="text-base font-black truncate">{player['TIME'] || player.TIME || player.Equipa || '-'}</p></div>
                  <div><p className="text-[11px] text-slate-500 uppercase font-black tracking-widest">Pé</p><p className="text-base font-black">{player.Pé === 'R' ? 'Direito' : 'Esquerdo'}</p></div>
                  <div><p className="text-[11px] text-slate-500 uppercase font-black tracking-widest">Idade</p><p className="text-base font-black">{player.Idade} anos</p></div>
                  <div><p className="text-[11px] text-slate-500 uppercase font-black tracking-widest">Minutos</p><p className="text-base font-black">{player['Minutos jogados']}'</p></div>
                </div>
              </div>
            </div>
            <HeatmapComponent player={player} />
          </div>

          <div className="col-span-9 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border-4 border-slate-900 rounded-[2.5rem] p-6 flex flex-col items-center shadow-2xl">
                <h3 className="text-black font-black text-sm uppercase tracking-widest mb-4 border-b-4 border-amber-500 px-6 pb-1">Vs Média Lista</h3>
                <div className="w-full h-[400px]">
                  <RadarChart data={getRadarData('media')} title="Vs Média Lista" />
                </div>
              </div>
              <div className="bg-white border-4 border-slate-900 rounded-[2.5rem] p-6 flex flex-col items-center shadow-2xl">
                <h3 className="text-black font-black text-sm uppercase tracking-widest mb-4 border-b-4 border-amber-500 px-6 pb-1">Vs Elenco GN</h3>
                <div className="w-full h-[400px]">
                  <RadarChart data={getRadarData('gremio')} title="Vs Elenco GN" />
                </div>
              </div>
            </div>
            <div className="bg-white border-4 border-slate-900 rounded-[2.5rem] p-6 flex flex-col items-center shadow-2xl">
              <h3 className="text-black font-black text-sm uppercase tracking-widest mb-4 border-b-4 border-amber-500 px-6 pb-1">Vs Série B</h3>
              <div className="w-full h-[400px]">
                <RadarChart data={getRadarData('serieb')} title="Vs Série B" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl mt-2">
          <div className="bg-slate-900 text-white font-black text-center py-4 text-base uppercase tracking-widest">Métricas Detalhadas por 90 Minutos</div>
          <div className="grid grid-cols-2 divide-x-4 divide-slate-900">
            {[0, 5].map(start => (
              <table key={start} className="w-full text-left text-sm">
                <tbody className="divide-y-2 divide-slate-100">
                  {METRICAS_RADAR.slice(start, start + 5).map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 text-slate-700 font-black uppercase tracking-tight">{m.label}</td>
                      <td className="px-8 py-4 text-right font-black text-black text-xl">{getValorMetrica(player, m).toFixed(2)}{m.label.includes('%') ? '%' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </div>

        <footer className="flex justify-between items-center border-t-8 border-slate-900 pt-6 mt-4 no-print">
          <div className="flex gap-6">
            <button onClick={() => window.print()} className="bg-slate-900 hover:bg-black text-white font-black px-12 py-5 rounded-3xl text-xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              EXPORTAR RELATÓRIO PDF
            </button>
            <button onClick={() => router.back()} className="text-slate-500 hover:text-black text-xl font-black uppercase tracking-widest px-8 transition-colors">Voltar</button>
          </div>
          <p className="text-base text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN - Dados automatizados</p>
        </footer>
      </div>
    </div>
  );
}

export default function PlayerProfile() {
  return <Suspense fallback={<div>Carregando...</div>}><PlayerProfileContent /></Suspense>;
}
