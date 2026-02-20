'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { EXTREMOS_PLAYERS } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

export default function ComparacaoExtremos() {
  const router = useRouter();
  const [playersData, setPlayersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetricX, setSelectedMetricX] = useState('Dribles com sucesso (%)');
  const [selectedMetricY, setSelectedMetricY] = useState('Gols');

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const promises = EXTREMOS_PLAYERS.map(async (player) => {
          const response = await fetch(player.url);
          const csvText = await response.text();
          return new Promise((resolve) => {
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                const cleaned = cleanData(results.data);
                const latestData = cleaned[0] || {};
                resolve({
                  ...player,
                  ...latestData
                });
              }
            });
          });
        });

        const results = await Promise.all(promises);
        setPlayersData(results);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const scatterData = useMemo(() => {
    if (playersData.length === 0) return null;

    const nossos = playersData.filter(p => p.type === 'nosso');
    const alvos = playersData.filter(p => p.type === 'alvo');

    const formatData = (players, color, label) => {
      return players.map(p => ({
        x: safeParseFloat(p[selectedMetricX]),
        y: safeParseFloat(p[selectedMetricY]),
        name: p.name,
        type: p.type
      })).filter(d => d.x !== 0 && d.y !== 0);
    };

    return {
      datasets: [
        {
          label: 'Nossos Extremos',
          data: formatData(nossos, '#fbbf24', 'Nossos'),
          backgroundColor: '#fbbf24',
          borderColor: '#fbbf24',
          borderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
          tension: 0
        },
        {
          label: 'Alvos de Mercado',
          data: formatData(alvos, '#64748b', 'Alvos'),
          backgroundColor: '#64748b',
          borderColor: '#64748b',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false,
          tension: 0
        }
      ]
    };
  }, [playersData, selectedMetricX, selectedMetricY]);

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: { display: true, text: selectedMetricX, color: '#94a3b8', font: { size: 12, weight: 'bold' } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b' }
      },
      y: {
        title: { display: true, text: selectedMetricY, color: '#94a3b8', font: { size: 12, weight: 'bold' } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b' }
      }
    },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
      tooltip: {
        backgroundColor: 'rgba(10, 12, 16, 0.9)',
        titleColor: '#fbbf24',
        bodyColor: '#fff',
        borderColor: '#fbbf24',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const point = context.raw;
            return `${point.name}: (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
          }
        }
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
    </div>
  );

  const metricsOptions = ['Gols', 'xG', 'Assistências', 'xA', 'Dribles com sucesso (%)', 'Cruzamentos precisos (%)', 'Recuperações de bola campo ataque', 'Desarmes', 'Interceptações'];

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/central-scouting/lista-preferencial')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
              Comparação de <span className="text-brand-yellow">Extremos</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 ml-1">Gráfico de Dispersão - Análise Comparativa</p>
          </div>
        </div>

        {/* SELETORES DE MÉTRICAS */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Eixo X (Horizontal)</label>
              <select 
                value={selectedMetricX} 
                onChange={(e) => setSelectedMetricX(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white appearance-none cursor-pointer"
              >
                {metricsOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Eixo Y (Vertical)</label>
              <select 
                value={selectedMetricY} 
                onChange={(e) => setSelectedMetricY(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white appearance-none cursor-pointer"
              >
                {metricsOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* GRÁFICO DE DISPERSÃO */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10">
          <div className="w-full h-96">
            {scatterData && <Scatter data={scatterData} options={scatterOptions} />}
          </div>
        </div>

        {/* LEGENDA E INTERPRETAÇÃO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
            <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">Legenda</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-brand-yellow"></div>
                <span className="text-sm text-slate-300">Nossos Extremos (Novorizontino)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-600"></div>
                <span className="text-sm text-slate-300">Alvos de Mercado</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
            <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">Como Interpretar</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Quanto mais à direita e para cima, melhor o desempenho nas métricas selecionadas. Atletas próximos indicam perfis similares. Use para identificar tendências e comparar eficiência entre extremos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
