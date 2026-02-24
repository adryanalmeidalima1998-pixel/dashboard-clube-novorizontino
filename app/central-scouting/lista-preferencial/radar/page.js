'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { findPlayersByIds } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { DEFAULT_METRICS, ALL_AVAILABLE_METRICS, saveMetricsTemplate, loadMetricsTemplate } from '@/app/utils/metricsTemplates';
import { sheetUrl } from '@/app/datasources';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false, loading: () => <div className="h-96 flex items-center justify-center">Carregando gráfico...</div> });

function RadarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playersParam = searchParams.get('players');
  
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState(DEFAULT_METRICS.map(m => m.label));
  const [templateName, setTemplateName] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    const loadPlayers = async () => {
      if (!playersParam) {
        router.push('/central-scouting/lista-preferencial');
        return;
      }

      const playerIds = playersParam.split(',');

      try {
        const response = await fetch(sheetUrl('LISTA_PREFERENCIAL'));
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleaned = cleanData(results.data);
            const found = findPlayersByIds(cleaned, playerIds);
            setPlayers(found);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        setLoading(false);
      }
    };

    loadPlayers();
  }, [playersParam]);

  const metricsConfig = useMemo(() => {
    return DEFAULT_METRICS.filter(m => selectedMetrics.includes(m.label));
  }, [selectedMetrics]);

  const radarData = useMemo(() => {
    if (players.length === 0) return [];

    return players.map((player, idx) => {
      const values = metricsConfig.map(metric => {
        const val = safeParseFloat(player[metric.key]);
        const normalized = (val / metric.max) * 100;
        return Math.min(normalized, 100);
      });

      return {
        type: 'scatterpolar',
        r: values,
        theta: metricsConfig.map(m => m.label),
        fill: 'toself',
        name: player.name,
        line: { color: metricsConfig[0]?.color || '#fbbf24' },
        fillcolor: metricsConfig[0]?.color || 'rgba(251, 191, 36, 0.2)'
      };
    });
  }, [players, metricsConfig]);

  const layout = {
    polar: {
      radialaxis: {
        visible: true,
        range: [0, 100],
        tickfont: { color: '#94a3b8', size: 10 },
        gridcolor: 'rgba(255, 255, 255, 0.1)'
      },
      angularaxis: {
        tickfont: { color: '#e2e8f0', size: 11, weight: 'bold' }
      },
      bgcolor: 'rgba(10, 12, 16, 0.5)'
    },
    showlegend: true,
    legend: {
      x: 1.1,
      y: 1,
      bgcolor: 'rgba(10, 12, 16, 0.8)',
      bordercolor: '#fbbf24',
      borderwidth: 2,
      font: { color: '#e2e8f0', size: 12 }
    },
    paper_bgcolor: 'rgba(10, 12, 16, 0)',
    plot_bgcolor: 'rgba(10, 12, 16, 0)',
    font: { color: '#e2e8f0', family: 'Arial, sans-serif' },
    margin: { l: 80, r: 200, t: 80, b: 80 },
    height: 700
  };

  const handleSaveTemplate = () => {
    if (templateName.trim()) {
      saveMetricsTemplate(templateName, selectedMetrics);
      setTemplateName('');
      setShowTemplateModal(false);
      alert('Template salvo com sucesso!');
    }
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
          <h1 className="text-3xl font-black italic uppercase text-brand-yellow">Análise de Radar</h1>
          <div className="w-12"></div>
        </div>

        {/* SELETOR DE MÉTRICAS */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 mb-8">
          <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">Selecione as Métricas</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {ALL_AVAILABLE_METRICS.map(metric => (
              <label key={metric} className="flex items-center gap-3 cursor-pointer p-3 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-brand-yellow/50 transition-all">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMetrics([...selectedMetrics, metric]);
                    } else {
                      setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                    }
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-300">{metric}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] rounded-lg hover:bg-yellow-500 transition-all"
            >
              💾 Salvar Template
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-slate-700 text-white font-black uppercase text-[10px] rounded-lg hover:bg-slate-600 transition-all"
            >
              🖨️ Exportar PDF
            </button>
          </div>
        </div>

        {/* GRÁFICO DE RADAR */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
          <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6 text-center">Gráfico de Desempenho</h3>
          {radarData.length > 0 ? (
            <div className="flex justify-center">
              <Plot
                data={radarData}
                layout={layout}
                config={{ responsive: true, displayModeBar: true }}
                style={{ width: '100%', height: '700px' }}
              />
            </div>
          ) : (
            <p className="text-center text-slate-400">Nenhum atleta selecionado</p>
          )}
        </div>

        {/* MODAL DE SALVAR TEMPLATE */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-[2rem] p-8 max-w-md w-full">
              <h3 className="text-xl font-black uppercase italic text-brand-yellow mb-6">Salvar Template</h3>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nome do template"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-brand-yellow"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleSaveTemplate}
                  className="flex-1 px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] rounded-lg hover:bg-yellow-500 transition-all"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white font-black uppercase text-[10px] rounded-lg hover:bg-slate-600 transition-all"
                >
                  Cancelar
                </button>
              </div>
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
