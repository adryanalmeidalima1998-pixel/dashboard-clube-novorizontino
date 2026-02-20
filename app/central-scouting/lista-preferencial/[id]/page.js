'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { EXTREMOS_PLAYERS, EXTREMO_METRICS } from '@/app/utils/extremosData';
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
  const [activeTab, setActiveTab] = useState('visao-geral');

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

  const radarMetrics = [
    { label: 'Gols', key: 'Gols', max: 30, color: '#ef4444' },
    { label: 'xG', key: 'xG', max: 10, color: '#f97316' },
    { label: 'Assistências', key: 'Assistências', max: 15, color: '#3b82f6' },
    { label: 'xA', key: 'xA', max: 8, color: '#06b6d4' },
    { label: 'Dribles %', key: 'Dribles com sucesso (%)', max: 100, color: '#fbbf24' },
    { label: 'Cruzamentos %', key: 'Cruzamentos precisos (%)', max: 100, color: '#10b981' },
    { label: 'Recuperações', key: 'Recuperações de bola campo ataque', max: 50, color: '#8b5cf6' },
    { label: 'Desarmes', key: 'Desarmes', max: 30, color: '#ec4899' }
  ];

  const radarData = useMemo(() => {
    if (!player) return null;

    const values = radarMetrics.map(metric => {
      const val = safeParseFloat(player[metric.key]);
      const normalized = (val / metric.max) * 100;
      return Math.min(normalized, 100);
    });

    return {
      labels: radarMetrics.map(m => m.label),
      datasets: [
        {
          label: player.name,
          data: values,
          backgroundColor: 'rgba(251, 191, 36, 0.15)',
          borderColor: '#fbbf24',
          borderWidth: 3,
          pointBackgroundColor: '#fbbf24',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#fbbf24',
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.1
        }
      ]
    };
  }, [player]);

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'r',
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 100,
        ticks: {
          display: true,
          color: '#64748b',
          font: { size: 10, weight: 'bold' },
          stepSize: 20,
          callback: (value) => value + '%'
        },
        angleLines: { color: 'rgba(255, 255, 255, 0.08)', lineWidth: 1 },
        grid: { color: 'rgba(255, 255, 255, 0.08)', circular: true, drawBorder: false },
        pointLabels: { color: '#e2e8f0', font: { size: 10, weight: 'bold' }, padding: 10 }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: '#94a3b8', font: { size: 11, weight: 'bold' }, padding: 15 }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 12, 16, 0.95)',
        titleColor: '#fbbf24',
        bodyColor: '#fff',
        borderColor: '#fbbf24',
        borderWidth: 2,
        padding: 10
      }
    }
  };

  // GERAR MAPA DE CALOR BASEADO EM MÉTRICAS
  const generateHeatmapData = () => {
    if (!player) return [];
    
    const metrics = [
      { name: 'Toques na Área', key: 'Toques na área', zone: 'ataque' },
      { name: 'Cruzamentos', key: 'Cruzamentos', zone: 'lateral' },
      { name: 'Passes Curtos', key: 'Passes curtos', zone: 'meio' },
      { name: 'Recuperações', key: 'Recuperações de bola campo ataque', zone: 'defesa' },
      { name: 'Dribles', key: 'Dribles com sucesso', zone: 'lateral' },
    ];

    return metrics.map(m => ({
      ...m,
      value: safeParseFloat(player[m.key]),
      intensity: Math.min((safeParseFloat(player[m.key]) / 50) * 100, 100)
    }));
  };

  const heatmapData = useMemo(() => generateHeatmapData(), [player]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
    </div>
  );

  if (!player) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <p className="text-white text-lg font-black uppercase">Atleta não encontrado</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-brand-yellow transition-colors font-black uppercase text-[10px] tracking-widest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <h1 className="text-2xl font-black italic uppercase text-brand-yellow">Perfil do Atleta</h1>
          <div className="w-12"></div>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10 mb-8">
          <div className="flex items-start gap-8 mb-8">
            <div className="w-40 h-40 rounded-2xl bg-slate-800 border-2 border-brand-yellow/30 overflow-hidden flex-shrink-0">
              <img 
                src={`/images/players/${player.id}.png`} 
                alt={player.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/400/1e293b/fbbf24?text=' + player.name.charAt(0); }}
              />
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase italic text-brand-yellow mb-4">{player.name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Time</p>
                  <p className="text-lg font-bold text-white">{player.Time || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Posição</p>
                  <p className="text-lg font-bold text-white">{player.Posição || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Idade</p>
                  <p className="text-lg font-bold text-white">{player.Idade || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 font-black uppercase mb-2">Nacionalidade</p>
                  <p className="text-lg font-bold text-white">{player.Nacionalidade || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ABAS */}
        <div className="flex gap-4 mb-8 border-b border-slate-800 overflow-x-auto">
          {[
            { id: 'visao-geral', label: 'Visão Geral' },
            { id: 'radar', label: 'Radar' },
            { id: 'mapa-calor', label: 'Mapa de Calor' },
            { id: 'atributos', label: 'Todos os Atributos' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-brand-yellow border-brand-yellow'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO */}
        {activeTab === 'visao-geral' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ESTATÍSTICAS PRINCIPAIS */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
              <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">Estatísticas Principais</h3>
              <div className="space-y-4">
                {[
                  { label: 'Gols', key: 'Gols', color: 'text-red-400' },
                  { label: 'Assistências', key: 'Assistências', color: 'text-blue-400' },
                  { label: 'Dribles %', key: 'Dribles com sucesso (%)', color: 'text-yellow-400' },
                  { label: 'Cruzamentos %', key: 'Cruzamentos precisos (%)', color: 'text-green-400' },
                  { label: 'Recuperações', key: 'Recuperações de bola campo ataque', color: 'text-purple-400' },
                  { label: 'Desarmes', key: 'Desarmes', color: 'text-pink-400' }
                ].map(stat => (
                  <div key={stat.key} className="flex items-center justify-between bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                    <span className="text-sm font-bold text-slate-300">{stat.label}</span>
                    <span className={`text-2xl font-black ${stat.color}`}>{safeParseFloat(player[stat.key]).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RESUMO */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
              <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">Análise Rápida</h3>
              <div className="space-y-4">
                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-2">Força Principal</p>
                  <p className="text-sm font-bold text-brand-yellow">Finalização e Criação</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-2">Tipo de Jogador</p>
                  <p className="text-sm font-bold text-white">Extremo Ofensivo</p>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-black uppercase mb-2">Potencial</p>
                  <p className="text-sm font-bold text-brand-yellow">⭐⭐⭐⭐⭐</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'radar' && radarData && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10">
            <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-8 text-center">Análise de Desempenho</h3>
            <div className="w-full h-96 flex items-center justify-center">
              <Radar data={radarData} options={radarOptions} />
            </div>
          </div>
        )}

        {activeTab === 'mapa-calor' && (
          <div className="space-y-8">
            {/* CAMPO COM MAPA DE CALOR */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
              <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">Mapa de Atividade no Campo</h3>
              
              <div className="relative w-full bg-gradient-to-b from-green-900/20 to-green-800/20 rounded-lg overflow-hidden border border-green-700/30 aspect-video">
                {/* CAMPO DE FUTEBOL */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                  {/* Linhas do campo */}
                  <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <rect x="0" y="35" width="20" height="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <rect x="80" y="35" width="20" height="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                </svg>

                {/* ZONAS DE CALOR */}
                {heatmapData.map((data, idx) => {
                  const positions = [
                    { x: 80, y: 30 }, // Ataque
                    { x: 70, y: 20 }, // Lateral
                    { x: 50, y: 50 }, // Meio
                    { x: 20, y: 70 }, // Defesa
                    { x: 75, y: 60 }  // Lateral
                  ];
                  
                  const pos = positions[idx];
                  const intensity = data.intensity;
                  
                  return (
                    <div
                      key={data.key}
                      className="absolute rounded-full transition-all"
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${15 + (intensity / 100) * 15}px`,
                        height: `${15 + (intensity / 100) * 15}px`,
                        backgroundColor: `rgba(251, 191, 36, ${intensity / 100})`,
                        boxShadow: `0 0 ${20 + (intensity / 100) * 20}px rgba(251, 191, 36, ${intensity / 100 * 0.5})`
                      }}
                      title={`${data.name}: ${data.value.toFixed(1)}`}
                    />
                  );
                })}
              </div>

              {/* LEGENDA */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {heatmapData.map(data => (
                  <div key={data.key} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: `rgba(251, 191, 36, ${data.intensity / 100})`,
                          boxShadow: `0 0 10px rgba(251, 191, 36, ${data.intensity / 100 * 0.5})`
                        }}
                      ></div>
                      <p className="text-sm font-black uppercase text-white">{data.name}</p>
                    </div>
                    <p className="text-lg font-black text-brand-yellow">{data.value.toFixed(1)}</p>
                    <div className="mt-2 h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-yellow"
                        style={{ width: `${data.intensity}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'atributos' && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
            <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">Todos os Atributos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(player).map(([key, value]) => {
                if (typeof value !== 'string' && typeof value !== 'number') return null;
                if (key.startsWith('_') || key === 'id' || key === 'name' || key === 'url' || key === 'type') return null;
                
                return (
                  <div key={key} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-2 truncate">{key}</p>
                    <p className="text-lg font-black text-brand-yellow truncate">{safeParseFloat(value).toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
