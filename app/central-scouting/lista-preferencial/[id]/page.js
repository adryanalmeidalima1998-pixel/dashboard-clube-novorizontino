'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { EXTREMOS_PLAYERS, EXTREMO_METRICS, RADAR_METRICS } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function PlayerProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerData = async () => {
      const config = EXTREMOS_PLAYERS.find(p => p.id === id);
      if (!config) {
        router.push('/central-scouting/lista-preferencial');
        return;
      }

      try {
        const response = await fetch(config.url);
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleaned = cleanData(results.data);
            setPlayer({ ...config, ...cleaned[0] });
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("Erro ao carregar atleta:", error);
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [id]);

  const radarData = useMemo(() => {
    if (!player) return null;

    const values = RADAR_METRICS.map(metric => {
      let val = safeParseFloat(player[metric]);
      // Normalizar valores para escala 0-100
      if (metric.includes('%')) {
        return val;
      } else if (metric === 'Gols' || metric === 'xG') {
        return Math.min(val * 15, 100);
      } else if (metric === 'xA') {
        return Math.min(val * 20, 100);
      } else if (metric === 'Recuperações de bola campo ataque') {
        return Math.min(val * 10, 100);
      }
      return val;
    });

    return {
      labels: RADAR_METRICS,
      datasets: [
        {
          label: player.name,
          data: values,
          backgroundColor: 'rgba(251, 191, 36, 0.2)',
          borderColor: '#fbbf24',
          borderWidth: 3,
          pointBackgroundColor: '#fbbf24',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#fbbf24',
          pointRadius: 5,
          pointHoverRadius: 7
        },
      ],
    };
  }, [player]);

  const radarOptions = {
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        pointLabels: { color: '#94a3b8', font: { size: 11, weight: 'bold' } },
        ticks: { display: true, color: '#64748b', max: 100, stepSize: 20 },
        suggestedMin: 0,
        suggestedMax: 100
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(10, 12, 16, 0.9)', titleColor: '#fbbf24', bodyColor: '#fff', borderColor: '#fbbf24', borderWidth: 1 }
    },
    maintainAspectRatio: true
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        {/* HEADER / VOLTAR */}
        <button onClick={() => router.back()} className="mb-8 flex items-center gap-2 text-slate-500 hover:text-brand-yellow transition-colors font-black uppercase text-[10px] tracking-widest">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUNA ESQUERDA: PERFIL */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-yellow/10 to-transparent"></div>
              <div className="relative z-10">
                <div className="w-48 h-48 mx-auto rounded-3xl bg-slate-800 border-2 border-brand-yellow/30 overflow-hidden mb-6 shadow-2xl">
                  <img 
                    src={`/images/players/${player.id}.png`} 
                    alt={player.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300/1e293b/fbbf24?text=' + player.name.charAt(0); }}
                  />
                </div>
                <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-2">{player.name}</h1>
                <p className="text-brand-yellow font-black uppercase tracking-[0.2em] text-xs mb-6">{player.Posição || 'EXTREMO'}</p>
                
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Time</p>
                    <p className="text-xs font-bold text-slate-200">{player.Time || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Idade</p>
                    <p className="text-xs font-bold text-slate-200">{player.Idade || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RADAR CHART */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8 text-center italic">Radar de Competências</h3>
              <div className="w-full aspect-square flex items-center justify-center">
                {radarData && <Radar data={radarData} options={radarOptions} />}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: DADOS E MAPA */}
          <div className="lg:col-span-8 space-y-8">
            {/* MÉTRICAS CATEGORIZADAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricBox title="Ataque & Finalização" metrics={EXTREMO_METRICS.ataque} data={player} color="text-red-400" />
              <MetricBox title="Criação & Passes" metrics={EXTREMO_METRICS.criacao} data={player} color="text-blue-400" />
              <MetricBox title="Posse & Dribles" metrics={EXTREMO_METRICS.posse} data={player} color="text-brand-yellow" />
              <MetricBox title="Defesa & Duelos" metrics={EXTREMO_METRICS.defesa} data={player} color="text-green-400" />
            </div>

            {/* MAPA DE CALOR / CAMPINHO */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h3 className="text-xl font-black uppercase italic text-white">Mapa de Influência</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Zonas de maior atividade</p>
                </div>
                <div className="px-4 py-2 bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl text-[10px] font-black text-brand-yellow uppercase tracking-widest">
                  Heatmap Dinâmico
                </div>
              </div>

              <div className="relative aspect-[1.5/1] bg-emerald-900/20 border-2 border-emerald-800/30 rounded-3xl overflow-hidden">
                {/* Campo de Futebol */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice">
                  {/* Linhas do campo */}
                  <line x1="50" y1="0" x2="50" y2="60" stroke="#10b981" strokeWidth="0.5" opacity="0.3" />
                  <line x1="0" y1="30" x2="100" y2="30" stroke="#10b981" strokeWidth="0.5" opacity="0.3" />
                  <circle cx="50" cy="30" r="8" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.3" />
                  <circle cx="50" cy="30" r="1" fill="#10b981" opacity="0.3" />
                  {/* Áreas */}
                  <rect x="0" y="12" width="16" height="36" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.3" />
                  <rect x="84" y="12" width="16" height="36" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.3" />
                </svg>

                {/* Heatmap Dinâmico - Simula atividade baseada em posição */}
                <div className="absolute inset-0">
                  <div className="absolute top-1/4 right-10 w-32 h-32 bg-brand-yellow/30 blur-[40px] rounded-full animate-pulse"></div>
                  <div className="absolute bottom-1/4 right-20 w-24 h-24 bg-brand-yellow/20 blur-[30px] rounded-full"></div>
                  <div className="absolute top-1/2 right-4 w-16 h-16 bg-brand-yellow/40 blur-[20px] rounded-full"></div>
                </div>
              </div>

              {/* Legenda do Heatmap */}
              <div className="mt-6 flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-brand-yellow/40"></div>
                  <span className="text-[10px] text-slate-400 font-bold">Alta Atividade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-brand-yellow/20"></div>
                  <span className="text-[10px] text-slate-400 font-bold">Média Atividade</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-brand-yellow/10"></div>
                  <span className="text-[10px] text-slate-400 font-bold">Baixa Atividade</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ title, metrics, data, color }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6">
      <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${color}`}>{title}</h4>
      <div className="space-y-4">
        {metrics.map(m => (
          <div key={m} className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase">{m}</span>
            <span className="text-sm font-black text-white">{data[m] || '0'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
