'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';

const METRICAS_RADAR = [
  { label: 'Passes Chave',         key: 'Passes chave',                                   type: 'per90' },
  { label: 'Passes Progr. %',      key: 'Passes progressivos precisos,%',                 type: 'raw'   },
  { label: 'Passes Área %',        key: 'Passes dentro da área / precisos, %',            type: 'raw'   },
  { label: 'Dribles Certos/90',    key: 'Dribles bem sucedidos',                          type: 'per90' },
  { label: 'Dribles 1/3 Final/90', key: 'Dribles no último terço do campo com sucesso',   type: 'per90' },
  { label: 'Entradas 1/3 Final',   key: 'Entradas no terço final carregando a bola',      type: 'per90' },
  { label: 'Recup. Campo Adv',     key: 'Bolas recuperadas no campo do adversário',       type: 'per90' },
  { label: 'xA',                   key: 'xA',                                             type: 'per90' },
  { label: 'xG',                   key: 'Xg',                                             type: 'per90' },
  { label: 'Ações Área Adv/90',    key: 'Ações na área adversária bem-sucedidas',         type: 'per90' },
];

function getValorMetrica(jogador, metrica) {
  if (!jogador) return 0;
  if (metrica.type === 'per90') {
    const val = safeParseFloat(jogador[`${metrica.key}_per90`]);
    return isNaN(val) ? 0 : val;
  }
  const val = safeParseFloat(jogador[metrica.key]);
  return isNaN(val) ? 0 : val;
}

function processarDados(dados, aba) {
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
}

// Série B: valores já vêm por/90 — mapeia direto, sem transformar
function processarDadosSB(dados) {
  return dados.map(jogador => {
    const processado = { ...jogador, aba: 'SERIEB' };
    METRICAS_RADAR.forEach(m => {
      if (m.type === 'per90') processado[`${m.key}_per90`] = safeParseFloat(jogador[m.key]);
    });
    return processado;
  });
}

function calcularScore(jogador, maxes) {
  let total = 0;
  METRICAS_RADAR.forEach(m => {
    const val = getValorMetrica(jogador, m);
    const max = maxes[m.label] || 1;
    total += (val / max) * 100;
  });
  return total / METRICAS_RADAR.length;
}

function PonderacaoContent() {
  const router = useRouter();
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [serieB, setSerieB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortMetrica, setSortMetrica] = useState('_score');
  const [sortDir, setSortDir] = useState('desc');
  const [busca, setBusca] = useState('');
  const [filtroTime, setFiltroTime] = useState('todos');

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlAba1 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=0';
        const urlSerieB = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQbSUvDghD3MPKBNEYz1cxeLgCmftwt5AoqkVmai6xCrA7W8fIy77Y2RlTmqR5w1A6a-MRPlV67pVYA/pub?output=csv';
        const [res1, res2] = await Promise.all([fetch(urlAba1), fetch(urlSerieB)]);
        const [csv1, csv2] = await Promise.all([res1.text(), res2.text()]);
        Papa.parse(csv1, {
          header: true, skipEmptyLines: true,
          complete: (results) => setListaPreferencial(processarDados(cleanData(results.data), 'LISTA PREFERENCIAL'))
        });
        Papa.parse(csv2, {
          header: true, skipEmptyLines: true,
          complete: (results) => setSerieB(processarDadosSB(cleanData(results.data)))
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const { maxes } = useMemo(() => {
    const base = [...listaPreferencial, ...serieB];
    const maxes = {};
    METRICAS_RADAR.forEach(m => {
      const vals = base.map(j => getValorMetrica(j, m)).filter(v => v >= 0);
      maxes[m.label] = Math.max(...vals, 0.01);
    });
    return { maxes };
  }, [listaPreferencial, serieB]);

  const jogadoresComScore = useMemo(() => {
    if (!listaPreferencial.length || !Object.keys(maxes).length) return [];
    const base = [...listaPreferencial, ...serieB];
    return listaPreferencial.map(j => {
      const score = calcularScore(j, maxes);
      const percentis = {};
      METRICAS_RADAR.forEach(m => {
        const val = getValorMetrica(j, m);
        const vals = base.map(x => getValorMetrica(x, m)).filter(v => v >= 0);
        percentis[m.label] = Math.round((vals.filter(v => v <= val).length / vals.length) * 100);
      });
      const timeKey = Object.keys(j).find(k => k.toLowerCase() === 'time') || 'TIME';
      return {
        ...j,
        _score: score,
        _percentis: percentis,
        TIME_FIXED: j[timeKey] || j['Equipa'] || j['Equipe'] || '-',
      };
    });
  }, [listaPreferencial, serieB, maxes]);

  const times = useMemo(() => {
    const t = new Set(jogadoresComScore.map(j => j.TIME_FIXED).filter(Boolean));
    return ['todos', ...Array.from(t).sort()];
  }, [jogadoresComScore]);

  const jogadoresFiltrados = useMemo(() => {
    return jogadoresComScore
      .filter(j => {
        const matchBusca = !busca || j.Jogador?.toLowerCase().includes(busca.toLowerCase());
        const matchTime = filtroTime === 'todos' || j.TIME_FIXED === filtroTime;
        return matchBusca && matchTime;
      })
      .sort((a, b) => {
        const va = sortMetrica === '_score' ? a._score : getValorMetrica(a, METRICAS_RADAR.find(m => m.label === sortMetrica));
        const vb = sortMetrica === '_score' ? b._score : getValorMetrica(b, METRICAS_RADAR.find(m => m.label === sortMetrica));
        return sortDir === 'desc' ? vb - va : va - vb;
      });
  }, [jogadoresComScore, busca, filtroTime, sortMetrica, sortDir]);

  const handleSort = (col) => {
    if (sortMetrica === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortMetrica(col); setSortDir('desc'); }
  };

  function getScoreColor(score) {
    if (score >= 70) return '#10b981';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#f97316';
    return '#ef4444';
  }
  function getScoreTextClass(score) {
    if (score >= 70) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-500';
    if (score >= 30) return 'text-orange-500';
    return 'text-red-500';
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
      Carregando Ponderação...
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans print:p-0 overflow-x-hidden">
      <style jsx global>{`
        @media print {
          @page { size: A3 landscape; margin: 0.5cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .table-scroll-wrapper { overflow: visible !important; }
          table { font-size: 8px !important; width: 100% !important; table-layout: auto; }
          th, td { padding: 3px 5px !important; word-break: break-word; white-space: nowrap; }
          thead tr { background-color: #0f172a !important; }
          thead th { color: white !important; }
          thead th.bg-amber-500, thead th[class*="bg-amber"] { background-color: #f59e0b !important; color: black !important; }
          .score-bar { display: none !important; }
          .avatar-initial { display: none !important; }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto print-container flex flex-col gap-4">

        {/* HEADER — idêntico ao relatório individual */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button
              onClick={() => router.push('/central-scouting/lista-preferencial')}
              className="no-print bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              ← VOLTAR
            </button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Ponderação por Métrica
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              DATA: {new Date().toLocaleDateString('pt-BR')} · {jogadoresFiltrados.length} ATLETAS
            </div>
          </div>
        </header>

        {/* FILTROS — só na tela */}
        <div className="no-print flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="BUSCAR ATLETA..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="border-2 border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-amber-500 w-48"
          />
          <select
            value={filtroTime}
            onChange={e => setFiltroTime(e.target.value)}
            className="border-2 border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-amber-500"
          >
            {times.map(t => <option key={t} value={t}>{t === 'todos' ? 'TODOS OS TIMES' : t.toUpperCase()}</option>)}
          </select>
          <div className="flex items-center gap-3 ml-2">
            <span className="text-[9px] font-black text-slate-400 uppercase">Legenda:</span>
            <span className="text-[9px] font-black text-emerald-600">■ Top 15%</span>
            <span className="text-[9px] font-black text-amber-500">■ Top 35%</span>
          </div>
          <span className="ml-auto text-[8px] font-black text-slate-400 uppercase tracking-widest">Clique no cabeçalho para ordenar</span>
        </div>

        {/* TABELA */}
        <div className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
            Ponderação por Métrica · Score = média normalizada das 10 métricas do radar (0–100) · Base: Lista Preferencial + Série B
          </div>
          <div className="overflow-x-auto table-scroll-wrapper">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-900">
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 w-8">#</th>
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[160px]">Atleta</th>
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[90px]">Time</th>
                  <th
                    onClick={() => handleSort('_score')}
                    className={`px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest cursor-pointer min-w-[80px] transition-colors ${sortMetrica === '_score' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:bg-slate-700'}`}
                  >
                    Score {sortMetrica === '_score' ? (sortDir === 'desc' ? '↓' : '↑') : '+'}
                  </th>
                  {METRICAS_RADAR.map(m => (
                    <th
                      key={m.label}
                      onClick={() => handleSort(m.label)}
                      className={`px-2 py-3 text-center text-[8px] font-black uppercase tracking-widest cursor-pointer min-w-[90px] transition-colors ${sortMetrica === m.label ? 'bg-amber-500 text-black' : 'text-slate-300 hover:bg-slate-700'}`}
                    >
                      {m.label} {sortMetrica === m.label ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jogadoresFiltrados.map((j, idx) => {
                  const scoreColor = getScoreColor(j._score);
                  const scoreClass = getScoreTextClass(j._score);
                  return (
                    <tr
                      key={j.ID_ATLETA || idx}
                      onClick={() => router.push(`/central-scouting/lista-preferencial/${j.ID_ATLETA}`)}
                      className="hover:bg-amber-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="px-3 py-2.5 text-[9px] font-black text-slate-400">#{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="no-print avatar-initial w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                            {j.Jogador?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black uppercase italic tracking-tight text-[10px] group-hover:text-amber-600 transition-colors">{j.Jogador}</div>
                            <div className="text-[8px] text-slate-400 font-bold">{j.Idade} anos</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[9px] font-black uppercase text-slate-600">{j.TIME_FIXED}</td>
                      {/* Score */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-black tabular-nums ${scoreClass}`}>{j._score.toFixed(1)}</span>
                          <div className="score-bar w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(j._score, 100)}%`, backgroundColor: scoreColor }} />
                          </div>
                        </div>
                      </td>
                      {/* Métricas */}
                      {METRICAS_RADAR.map(m => {
                        const val = getValorMetrica(j, m);
                        const percentil = j._percentis?.[m.label] ?? 0;
                        const isTop15 = percentil >= 85;
                        const isTop35 = percentil >= 65 && percentil < 85;
                        return (
                          <td key={m.label} className="px-2 py-2.5 text-center">
                            <div className={`tabular-nums text-[10px] ${isTop15 ? 'text-emerald-600 font-black' : isTop35 ? 'text-amber-500 font-black' : 'text-slate-500 font-bold'}`}>
                              {val.toFixed(2)}{m.label.includes('%') ? '%' : ''}
                            </div>
                            {(isTop15 || isTop35) && (
                              <div className={`text-[7px] font-black ${isTop15 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                Top {100 - percentil}%
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* LEGENDA RODAPÉ */}
        <div className="flex flex-wrap gap-6 text-[8px] font-black text-slate-400 uppercase tracking-widest border-t-2 border-slate-900 pt-2">
          <span>Score = média normalizada (0–100) das 10 métricas do radar</span>
          <span className="text-emerald-600">■ Verde = Top 15% da base</span>
          <span className="text-amber-500">■ Amarelo = Top 35% da base</span>
          <span>Base: Lista Preferencial + Série B</span>
        </div>

        {/* FOOTER AÇÕES */}
        <footer className="no-print flex justify-between items-center border-t-2 border-slate-900 pt-3">
          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-black text-white font-black px-8 py-3 rounded-2xl text-sm shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              EXPORTAR PDF
            </button>
            <button
              onClick={() => router.push('/central-scouting/lista-preferencial')}
              className="text-slate-500 hover:text-black text-sm font-black uppercase tracking-widest px-4 transition-colors"
            >
              Voltar
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

      </div>


    </div>
  );
}

export default function PonderacaoPorMetrica() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse uppercase text-2xl">
        Carregando...
      </div>
    }>
      <PonderacaoContent />
    </Suspense>
  );
}
