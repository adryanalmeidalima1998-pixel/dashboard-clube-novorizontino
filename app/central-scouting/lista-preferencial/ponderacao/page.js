'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';

const METRICAS_RADAR = [
  { label: 'Passes Chave',               key: 'Passes chave',                                        type: 'per90' },
  { label: 'Passes Progr. %',            key: 'Passes progressivos precisos,%',                      type: 'raw'   },
  { label: 'Passes Área %',              key: 'Passes dentro da área / precisos, %',                 type: 'raw'   },
  { label: 'Dribles Certos/90',          key: 'Dribles bem sucedidos',                               type: 'per90' },
  { label: 'Dribles 1/3 Final/90',       key: 'Dribles no último terço do campo com sucesso',        type: 'per90' },
  { label: 'Entradas 1/3 Final',         key: 'Entradas no terço final carregando a bola',           type: 'per90' },
  { label: 'Recup. Campo Adv',           key: 'Bolas recuperadas no campo do adversário',            type: 'per90' },
  { label: 'xA',                         key: 'xA',                                                  type: 'per90' },
  { label: 'xG',                         key: 'Xg',                                                  type: 'per90' },
  { label: 'Ações Área Adv/90',          key: 'Ações na área adversária bem-sucedidas',              type: 'per90' },
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

// Calcula o score composto normalizado 0-100 para cada atleta
function calcularScore(jogador, medias, maxes) {
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
          complete: (results) => {
            const dados = processarDados(cleanData(results.data), 'LISTA PREFERENCIAL');
            setListaPreferencial(dados);
          }
        });

        Papa.parse(csv2, {
          header: true, skipEmptyLines: true,
          complete: (results) => setSerieB(cleanData(results.data))
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Máximos e médias da base combinada (lista + série B) para percentil/destaque
  const { maxes, medias } = useMemo(() => {
    const base = [...listaPreferencial, ...serieB];
    const maxes = {}, medias = {};
    METRICAS_RADAR.forEach(m => {
      const vals = base.map(j => getValorMetrica(j, m)).filter(v => v >= 0);
      maxes[m.label] = Math.max(...vals, 0.01);
      medias[m.label] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    });
    return { maxes, medias };
  }, [listaPreferencial, serieB]);

  // Máximos apenas da lista preferencial (para destacar top performers da lista)
  const maxesList = useMemo(() => {
    const m = {};
    METRICAS_RADAR.forEach(met => {
      const vals = listaPreferencial.map(j => getValorMetrica(j, met)).filter(v => v >= 0);
      m[met.label] = Math.max(...vals, 0.01);
    });
    return m;
  }, [listaPreferencial]);

  // Adiciona score e percentil a cada jogador da lista
  const jogadoresComScore = useMemo(() => {
    if (!listaPreferencial.length || !Object.keys(maxes).length) return [];
    const base = [...listaPreferencial, ...serieB];

    return listaPreferencial.map(j => {
      const score = calcularScore(j, medias, maxes);

      // Percentis por métrica (vs base combinada)
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
  }, [listaPreferencial, serieB, maxes, medias]);

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
    if (sortMetrica === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortMetrica(col);
      setSortDir('desc');
    }
  };

  // Cor de destaque baseada no percentil do valor vs lista preferencial
  function getDestaque(jogador, metrica) {
    const val = getValorMetrica(jogador, metrica);
    const max = maxesList[metrica.label] || 1;
    const pct = val / max;
    if (pct >= 0.85) return 'text-emerald-600 font-black';
    if (pct >= 0.65) return 'text-amber-500 font-black';
    return 'text-slate-700 font-bold';
  }

  function getScoreColor(score) {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-400';
    if (score >= 30) return 'bg-orange-400';
    return 'bg-red-400';
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin" />
        <p className="text-brand-yellow font-black tracking-widest uppercase text-xs italic animate-pulse">Carregando Ponderação...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-6 mb-10">
          <button
            onClick={() => router.push('/central-scouting/lista-preferencial')}
            className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group"
          >
            <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
              Ponderação <span className="text-brand-yellow">por Métrica</span>
            </h1>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mt-1">
              {jogadoresFiltrados.length} atletas · Score calculado pelas métricas do radar · Base: Lista + Série B
            </p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="BUSCAR ATLETA..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:border-brand-yellow/50 w-56"
          />
          <select
            value={filtroTime}
            onChange={e => setFiltroTime(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:border-brand-yellow/50"
          >
            {times.map(t => <option key={t} value={t}>{t === 'todos' ? 'TODOS OS TIMES' : t.toUpperCase()}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Legenda:</span>
            <span className="text-[9px] font-black text-emerald-500">■ Top 15%</span>
            <span className="text-[9px] font-black text-amber-400">■ Top 35%</span>
            <span className="text-[9px] font-black text-slate-400">■ Demais</span>
          </div>
        </div>

        {/* TABELA */}
        <div className="bg-slate-900/20 rounded-[2rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 sticky left-0 bg-slate-900/90 z-10 w-8">#</th>
                  <th className="px-4 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 sticky left-8 bg-slate-900/90 z-10 min-w-[180px]">Atleta</th>
                  <th className="px-3 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 min-w-[100px]">Time</th>

                  {/* Score geral */}
                  <th
                    onClick={() => handleSort('_score')}
                    className={`px-4 py-4 text-center text-[9px] font-black uppercase tracking-widest cursor-pointer select-none transition-colors min-w-[90px] ${sortMetrica === '_score' ? 'text-brand-yellow' : 'text-slate-500 hover:text-white'}`}
                  >
                    Score {sortMetrica === '_score' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </th>

                  {/* Uma coluna por métrica do radar */}
                  {METRICAS_RADAR.map(m => (
                    <th
                      key={m.label}
                      onClick={() => handleSort(m.label)}
                      className={`px-3 py-4 text-center text-[9px] font-black uppercase tracking-widest cursor-pointer select-none transition-colors min-w-[100px] ${sortMetrica === m.label ? 'text-brand-yellow' : 'text-slate-500 hover:text-white'}`}
                    >
                      {m.label} {sortMetrica === m.label ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {jogadoresFiltrados.map((j, idx) => (
                  <tr
                    key={j.ID_ATLETA || idx}
                    onClick={() => router.push(`/central-scouting/lista-preferencial/${j.ID_ATLETA}`)}
                    className="group hover:bg-brand-yellow/[0.03] transition-colors cursor-pointer"
                  >
                    {/* Ranking */}
                    <td className="px-4 py-3 sticky left-0 bg-[#0a0c10] group-hover:bg-[#0f1116] z-10">
                      <span className="text-[10px] font-black text-slate-600">#{idx + 1}</span>
                    </td>

                    {/* Atleta */}
                    <td className="px-4 py-3 sticky left-8 bg-[#0a0c10] group-hover:bg-[#0f1116] z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-500 border border-slate-700 group-hover:border-brand-yellow/40 transition-all flex-shrink-0">
                          {j.Jogador?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black uppercase italic tracking-tight text-[11px] group-hover:text-brand-yellow transition-colors leading-tight">{j.Jogador}</div>
                          <div className="text-[9px] text-slate-500 font-bold">{j.Idade} anos · {j.Posição || '-'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-3 py-3">
                      <span className="text-[9px] font-black uppercase tracking-wide text-slate-400">{j.TIME_FIXED}</span>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-black tabular-nums ${j._score >= 70 ? 'text-emerald-400' : j._score >= 50 ? 'text-amber-400' : j._score >= 30 ? 'text-orange-400' : 'text-slate-400'}`}>
                          {j._score.toFixed(1)}
                        </span>
                        <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getScoreColor(j._score)}`}
                            style={{ width: `${Math.min(j._score, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Métricas do radar */}
                    {METRICAS_RADAR.map(m => {
                      const val = getValorMetrica(j, m);
                      const percentil = j._percentis?.[m.label] ?? 0;
                      const isTop15 = percentil >= 85;
                      const isTop35 = percentil >= 65 && percentil < 85;
                      return (
                        <td key={m.label} className="px-3 py-3 text-center">
                          <div className={`tabular-nums text-[11px] ${isTop15 ? 'text-emerald-400 font-black' : isTop35 ? 'text-amber-400 font-black' : 'text-slate-400 font-bold'}`}>
                            {val.toFixed(2)}{m.label.includes('%') ? '%' : ''}
                          </div>
                          {(isTop15 || isTop35) && (
                            <div className={`text-[8px] font-black mt-0.5 ${isTop15 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              Top {100 - percentil}%
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RODAPÉ INFO */}
        <div className="mt-6 flex flex-wrap gap-6 text-[9px] font-black text-slate-600 uppercase tracking-widest">
          <span>Score = média normalizada das 10 métricas do radar (0–100)</span>
          <span>Destaques comparados vs. Lista Preferencial + Série B</span>
          <span>Clique em qualquer atleta para abrir o relatório individual</span>
          <span>Clique no cabeçalho para ordenar por coluna</span>
        </div>

      </div>
    </div>
  );
}

export default function PonderacaoPorMetrica() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-brand-yellow font-black italic animate-pulse uppercase">
        Carregando...
      </div>
    }>
      <PonderacaoContent />
    </Suspense>
  );
}
