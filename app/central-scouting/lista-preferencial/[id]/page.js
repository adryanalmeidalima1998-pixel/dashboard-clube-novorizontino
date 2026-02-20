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
  const [selectedComparison, setSelectedComparison] = useState(null);

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
        },
      ],
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
          callback: function(value) {
            return value + '%';
          }
        },
        angleLines: {
          color: 'rgba(255, 255, 255, 0.08)',
          lineWidth: 1
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
          circular: true,
          drawBorder: false
        },
        pointLabels: {
          color: '#e2e8f0',
          font: { size: 10, weight: 'bold' },
          padding: 10
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { size: 11, weight: 'bold' },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 12, 16, 0.95)',
        titleColor: '#fbbf24',
        bodyColor: '#fff',
        borderColor: '#fbbf24',
        borderWidth: 2,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const metricIndex = context.dataIndex;
            const metric = radarMetrics[metricIndex];
            const rawValue = safeParseFloat(player[metric.key]);
            return `${metric.label}: ${rawValue.toFixed(2)} (${context.parsed.r.toFixed(0)}%)`;
          }
        }
      },
      filler: {
        propagate: true
      }
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.setTextColor(251, 191, 36);
      doc.text('PERFIL DO ATLETA', 20, 20);
      
      // Dados básicos
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Nome: ${player.name}`, 20, 35);
      doc.text(`Time: ${player.Time || 'N/A'}`, 20, 45);
      doc.text(`Posição: ${player.Posição || 'N/A'}`, 20, 55);
      doc.text(`Idade: ${player.Idade || 'N/A'}`, 20, 65);
      
      // Métricas
      doc.setFontSize(14);
      doc.setTextColor(251, 191, 36);
      doc.text('MÉTRICAS DE DESEMPENHO', 20, 85);
      
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      let yPos = 100;
      
      radarMetrics.forEach(metric => {
        const value = safeParseFloat(player[metric.key]);
        doc.text(`${metric.label}: ${value.toFixed(2)}`, 20, yPos);
        yPos += 8;
      });
      
      doc.save(`${player.name.replace(/\s+/g, '_')}_perfil.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF');
    }
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
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-brand-yellow transition-colors font-black uppercase text-[10px] tracking-widest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-brand-yellow/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Exportar PDF
          </button>
        </div>

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

            {/* BOTÃO DE COMPARAÇÃO */}
            <button
              onClick={() => router.push(`/central-scouting/lista-preferencial/comparacao?player1=${id}`)}
              className="w-full py-4 bg-gradient-to-r from-brand-yellow/20 to-brand-yellow/10 border border-brand-yellow/50 rounded-2xl text-brand-yellow font-black uppercase text-[10px] tracking-widest hover:from-brand-yellow/30 hover:to-brand-yellow/20 transition-all"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Comparar com Outro
            </button>

            {/* LEGENDA DO RADAR */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Legenda de Cores</h4>
              <div className="space-y-3">
                {radarMetrics.map((metric, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: metric.color }}></div>
                    <span className="text-[10px] text-slate-400 font-bold">{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: RADAR E DADOS */}
          <div className="lg:col-span-8 space-y-8">
            {/* GRÁFICO DE RADAR */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10">
              <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-8 text-center">Análise de Desempenho</h3>
              <div className="w-full h-96 flex items-center justify-center">
                {radarData && <Radar data={radarData} options={radarOptions} />}
              </div>
            </div>

            {/* MÉTRICAS CATEGORIZADAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricBox title="Ataque & Finalização" metrics={EXTREMO_METRICS.ataque} data={player} color="text-red-400" icon="⚽" />
              <MetricBox title="Criação & Passes" metrics={EXTREMO_METRICS.criacao} data={player} color="text-blue-400" icon="🎯" />
              <MetricBox title="Posse & Dribles" metrics={EXTREMO_METRICS.posse} data={player} color="text-brand-yellow" icon="🔄" />
              <MetricBox title="Defesa & Duelos" metrics={EXTREMO_METRICS.defesa} data={player} color="text-green-400" icon="🛡️" />
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

                {/* Heatmap Dinâmico */}
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

function MetricBox({ title, metrics, data, color, icon }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">{icon}</span>
        <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${color}`}>{title}</h4>
      </div>
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
