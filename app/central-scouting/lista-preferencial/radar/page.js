'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { findPlayersByIds } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { sheetUrl } from '@/app/datasources';
import { getMetricsByPosicao, normalizePosicao, POSITION_METRICS, calcPercentil } from '@/app/utils/positionMetrics';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center text-slate-400 italic">Carregando gráfico...</div>
});

const CORES_JOGADORES = ['#fbbf24', '#10b981', '#3b82f6', '#f97316', '#8b5cf6'];

function processarDados(dados) {
  return dados.map(jogador => {
    const minutos = safeParseFloat(jogador['Minutos jogados']);
    const proc = { ...jogador };
    Object.keys(jogador).forEach(key => {
      const v = safeParseFloat(jogador[key]);
      if (!isNaN(v)) proc[`${key}_per90`] = minutos > 0 ? (v / minutos) * 90 : 0;
    });
    return proc;
  });
}

function getValorMetrica(jogador, metrica) {
  if (!jogador) return 0;
  if (metrica.type === 'per90') return safeParseFloat(jogador[`${metrica.key}_per90`]) || 0;
  return safeParseFloat(jogador[metrica.key]) || 0;
}

function RadarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playersParam = searchParams.get('players');

  const [players, setPlayers]     = useState([]);
  const [todaLista, setTodaLista] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [radarMode, setRadarMode] = useState('media');

  useEffect(() => {
    const load = async () => {
      if (!playersParam) { router.push('/central-scouting/lista-preferencial'); return; }
      const playerIds = playersParam.split(',');
      try {
        const res     = await fetch(sheetUrl('LISTA_PREFERENCIAL'));
        const csvText = await res.text();
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const cleaned      = cleanData(results.data);
            const todos        = processarDados(cleaned);
            const selecionados = findPlayersByIds(cleaned, playerIds).map(p => {
              const match = todos.find(t =>
                (t['Jogador'] || t['Nome'] || t['Atleta'] || '') === (p['Jogador'] || p['Nome'] || p['Atleta'] || '')
              );
              return match ? { ...match, name: p.name, id: p.id } : { ...p, name: p.name, id: p.id };
            });
            setPlayers(selecionados);
            setTodaLista(todos);
            setLoading(false);
          }
        });
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    load();
  }, [playersParam]);

  const posicaoDetectada = useMemo(() => players[0]?.Posição || null, [players]);

  const metricas = useMemo(() => {
    const config = getMetricsByPosicao(posicaoDetectada);
    return config ? config.radarMetrics : null;
  }, [posicaoDetectada]);

  const mesmaPosicao = useMemo(() => {
    if (!posicaoDetectada || todaLista.length === 0) return todaLista;
    const posKey  = normalizePosicao(posicaoDetectada);
    const filtrado = todaLista.filter(j => normalizePosicao(j.Posição) === posKey);
    return filtrado.length >= 3 ? filtrado : todaLista;
  }, [todaLista, posicaoDetectada]);

  const escalas = useMemo(() => {
    if (!metricas) return {};
    const esc = {};
    metricas.forEach(m => {
      const vals = mesmaPosicao.map(j => getValorMetrica(j, m)).filter(v => v >= 0);
      esc[m.label] = Math.max(...vals, 0.01);
    });
    return esc;
  }, [metricas, mesmaPosicao]);

  const radarData = useMemo(() => {
    if (!metricas || players.length === 0 || Object.keys(escalas).length === 0) return [];
    const labels = metricas.map(m => m.label);
    const data   = [];

    players.forEach((player, idx) => {
      const vals = metricas.map(m => Math.min((getValorMetrica(player, m) / (escalas[m.label] || 1)) * 100, 100));
      const cor  = CORES_JOGADORES[idx % CORES_JOGADORES.length];
      data.push({
        type: 'scatterpolar',
        r: [...vals, vals[0]],
        theta: [...labels, labels[0]],
        fill: 'toself',
        name: player.name,
        line: { color: cor, width: 3 },
        fillcolor: cor + '40',
        mode: 'lines',
      });
    });

    if (radarMode === 'media' && mesmaPosicao.length > 0) {
      const mediaVals = metricas.map(m => {
        const vals = mesmaPosicao.map(j => getValorMetrica(j, m));
        const med  = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
        return Math.min((med / (escalas[m.label] || 1)) * 100, 100);
      });
      const posLabel = POSITION_METRICS[normalizePosicao(posicaoDetectada)]?.label || 'Posição';
      data.push({
        type: 'scatterpolar',
        r: [...mediaVals, mediaVals[0]],
        theta: [...labels, labels[0]],
        fill: 'toself',
        name: `Média ${posLabel}`,
        line: { color: '#ef4444', dash: 'dot', width: 2 },
        fillcolor: 'rgba(239,68,68,0.1)',
        mode: 'lines',
      });
    }
    return data;
  }, [players, metricas, escalas, mesmaPosicao, radarMode, posicaoDetectada]);

  const layout = {
    polar: {
      radialaxis: { visible: true, range: [0, 100], tickfont: { color: '#94a3b8', size: 9 }, gridcolor: 'rgba(255,255,255,0.08)' },
      angularaxis: { tickfont: { color: '#e2e8f0', size: 10 } },
      bgcolor: 'rgba(10,12,16,0.4)',
    },
    showlegend: true,
    legend: { x: 1.05, y: 1, bgcolor: 'rgba(10,12,16,0.8)', bordercolor: '#fbbf24', borderwidth: 1, font: { color: '#e2e8f0', size: 11 } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e2e8f0', family: 'Arial,sans-serif' },
    margin: { l: 60, r: 180, t: 60, b: 60 },
    height: 650,
  };

  const tabelaPercentis = useMemo(() => {
    if (!metricas || players.length === 0 || mesmaPosicao.length === 0) return [];
    return metricas.map(m => {
      const grupo = mesmaPosicao.map(j => getValorMetrica(j, m));
      return {
        label: m.label,
        description: m.description,
        media: grupo.reduce((a, b) => a + b, 0) / (grupo.length || 1),
        valores: players.map(p => {
          const v = getValorMetrica(p, m);
          return { nome: p.name, valor: v, percentil: calcPercentil(v, grupo) };
        }),
      };
    });
  }, [metricas, players, mesmaPosicao]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Carregando Radar...</span>
      </div>
    </div>
  );

  const posLabel = posicaoDetectada
    ? (POSITION_METRICS[normalizePosicao(posicaoDetectada)]?.label || posicaoDetectada)
    : 'Atletas';

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-brand-yellow transition-colors font-black uppercase text-[10px]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-black italic uppercase text-brand-yellow">Radar de Desempenho</h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
              {posLabel} · {mesmaPosicao.length} atletas na base de comparação
            </p>
          </div>
          <div className="w-24"></div>
        </div>

        {/* AVISO POSIÇÃO SEM CONFIG */}
        {!metricas && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
            <p className="text-amber-400 text-[11px] font-black uppercase tracking-widest">
              Posição "{posicaoDetectada || 'não definida'}" sem métricas configuradas.
            </p>
          </div>
        )}

        {/* CONTROLES */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-5 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-3">
            {players.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-950/60">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CORES_JOGADORES[idx % CORES_JOGADORES.length] }}></div>
                <span className="text-[11px] font-black uppercase text-white">{p.name}</span>
                <span className="text-[9px] text-slate-500">{p.Posição}</span>
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-500 uppercase">Média da posição:</span>
            <button
              onClick={() => setRadarMode(m => m === 'media' ? 'individual' : 'media')}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${radarMode === 'media' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-slate-700 text-slate-500'}`}
            >
              {radarMode === 'media' ? '● Ativa' : '○ Inativa'}
            </button>
            <button onClick={() => window.print()} className="px-4 py-1.5 bg-slate-700 text-white font-black uppercase text-[9px] rounded-xl hover:bg-slate-600 transition-all">
              🖨️ PDF
            </button>
          </div>
        </div>

        {/* RADAR */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6">
          {metricas && radarData.length > 0 ? (
            <Plot data={radarData} layout={layout} config={{ responsive: true, displayModeBar: false }} style={{ width: '100%' }} />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 font-black uppercase">
              {metricas ? 'Nenhum atleta carregado' : 'Posição sem métricas configuradas'}
            </div>
          )}
        </div>

        {/* TABELA DE PERCENTIS */}
        {metricas && tabelaPercentis.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-yellow">
                Percentis vs {posLabel} · {mesmaPosicao.length} atletas na base
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60">
                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase text-slate-500">Métrica</th>
                    <th className="px-4 py-3 text-center text-[9px] font-black uppercase text-slate-500">Média</th>
                    {players.map((p, idx) => (
                      <th key={p.id} className="px-4 py-3 text-center text-[9px] font-black uppercase" style={{ color: CORES_JOGADORES[idx % CORES_JOGADORES.length] }}>
                        {p.name.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {tabelaPercentis.map(row => (
                    <tr key={row.label} className="hover:bg-slate-900/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-200 text-[10px]">{row.label}</div>
                        <div className="text-[8px] text-slate-600 italic">{row.description}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 font-bold tabular-nums">{row.media.toFixed(2)}</td>
                      {row.valores.map((v, idx) => {
                        const isTop = v.percentil >= 75;
                        const isMid = v.percentil >= 50;
                        return (
                          <td key={idx} className="px-4 py-3 text-center">
                            <div className={`font-black tabular-nums text-[11px] ${isTop ? 'text-emerald-400' : isMid ? 'text-brand-yellow' : 'text-slate-500'}`}>
                              {v.valor.toFixed(2)}
                            </div>
                            <div className={`text-[8px] font-black ${isTop ? 'text-emerald-500' : isMid ? 'text-amber-500' : 'text-slate-600'}`}>
                              P{v.percentil}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function RadarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
      </div>
    }>
      <RadarContent />
    </Suspense>
  );
}
