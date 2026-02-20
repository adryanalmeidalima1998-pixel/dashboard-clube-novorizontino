'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { EXTREMOS_PLAYERS } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { ALL_AVAILABLE_METRICS } from '@/app/utils/metricsTemplates';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false, loading: () => <div className="h-96 flex items-center justify-center">Carregando gráfico...</div> });

function DispersaoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playersParam = searchParams.get('players');
  
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricX, setMetricX] = useState('Gols');
  const [metricY, setMetricY] = useState('Assistências');

  useEffect(() => {
    const loadPlayers = async () => {
      if (!playersParam) {
        router.push('/central-scouting/lista-preferencial');
        return;
      }

      const playerIds = playersParam.split(',');
      const loadedPlayers = [];

      for (const id of playerIds) {
        const config = EXTREMOS_PLAYERS.find(p => p.id === id);
        if (config) {
          try {
            const response = await fetch(config.url);
            const csvText = await response.text();
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                const cleaned = cleanData(results.data);
                loadedPlayers.push({ ...config, ...cleaned[0] });
              }
            });
          } catch (error) {
            console.error(`Erro ao carregar ${id}:`, error);
          }
        }
      }

      setPlayers(loadedPlayers);
      setLoading(false);
    };

    loadPlayers();
  }, [playersParam]);

  const scatterData = useMemo(() => {
    if (players.length === 0) return [];

    const nossos = players.filter(p => p.type === 'nosso');
    const alvos = players.filter(p => p.type !== 'nosso');

    const createTrace = (playerList, name, color) => ({
      type: 'scatter',
      mode: 'markers+text',
      x: playerList.map(p => safeParseFloat(p[metricX])),
      y: playerList.map(p => safeParseFloat(p[metricY])),
      text: playerList.map(p => p.name.split(' ')[0]),
      textposition: 'top center',
      textfont: { color: '#fff', size: 10, weight: 'bold' },
      marker: {
        size: 12,
        color: color,
        opacity: 0.8,
        line: { color: '#fff', width: 2 }
      },
      name: name,
      hovertemplate: '<b>%{text}</b><br>' + metricX + ': %{x}<br>' + metricY + ': %{y}<extra></extra>'
    });

    return [
      createTrace(nossos, 'Nossos Atletas', '#fbbf24'),
      createTrace(alvos, 'Alvos de Mercado', '#64748b')
    ];
  }, [players, metricX, metricY]);

  const layout = {
    xaxis: {
      title: metricX,
      titlefont: { color: '#e2e8f0', size: 14, weight: 'bold' },
      tickfont: { color: '#94a3b8', size: 11 },
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      zeroline: false
    },
    yaxis: {
      title: metricY,
      titlefont: { color: '#e2e8f0', size: 14, weight: 'bold' },
      tickfont: { color: '#94a3b8', size: 11 },
      gridcolor: 'rgba(255, 255, 255, 0.1)',
      zeroline: false
    },
    paper_bgcolor: 'rgba(10, 12, 16, 0)',
    plot_bgcolor: 'rgba(10, 12, 16, 0.3)',
    font: { color: '#e2e8f0', family: 'Arial, sans-serif' },
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: 'rgba(10, 12, 16, 0.8)',
      bordercolor: '#fbbf24',
      borderwidth: 2,
      font: { color: '#e2e8f0', size: 12 }
    },
    margin: { l: 80, r: 80, t: 80, b: 80 },
    height: 700
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-brand-yellow transition-colors font-black uppercase text-[10px]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <h1 className="text-3xl font-black italic uppercase text-brand-yellow">Análise de Dispersão</h1>
          <div className="w-12"></div>
        </div>

        {/* SELETORES DE MÉTRICAS */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 mb-8">
          <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">Selecione as Métricas para Comparação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3">Eixo X (Horizontal)</label>
              <select
                value={metricX}
                onChange={(e) => setMetricX(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-yellow"
              >
                {ALL_AVAILABLE_METRICS.map(metric => (
                  <option key={metric} value={metric}>{metric}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-3">Eixo Y (Vertical)</label>
              <select
                value={metricY}
                onChange={(e) => setMetricY(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-yellow"
              >
                {ALL_AVAILABLE_METRICS.map(metric => (
                  <option key={metric} value={metric}>{metric}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] rounded-lg hover:bg-yellow-500 transition-all"
          >
            🖨️ Exportar PDF
          </button>
        </div>

        {/* GRÁFICO DE DISPERSÃO */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
          <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6 text-center">Gráfico de Dispersão</h3>
          {scatterData.length > 0 ? (
            <div className="flex justify-center">
              <Plot
                data={scatterData}
                layout={layout}
                config={{ responsive: true, displayModeBar: true }}
                style={{ width: '100%', height: '700px' }}
              />
            </div>
          ) : (
            <p className="text-center text-slate-400">Nenhum atleta selecionado</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DispersaoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
      </div>
    }>
      <DispersaoContent />
    </Suspense>
  );
}
