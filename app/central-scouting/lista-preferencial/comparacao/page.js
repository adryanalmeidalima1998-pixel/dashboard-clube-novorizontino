'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

export default function ComparacaoAtletas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const player1Id = searchParams.get('player1');
  
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [selectedPlayer2, setSelectedPlayer2] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayer = async (playerId, setPlayer) => {
      const config = EXTREMOS_PLAYERS.find(p => p.id === playerId);
      if (!config) return;

      try {
        const response = await fetch(config.url);
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleaned = cleanData(results.data);
            setPlayer({ ...config, ...cleaned[0] });
          }
        });
      } catch (error) {
        console.error("Erro ao carregar atleta:", error);
      }
    };

    if (player1Id) {
      fetchPlayer(player1Id, setPlayer1);
      setLoading(false);
    }
  }, [player1Id]);

  const radarMetrics = [
    { label: 'Gols', key: 'Gols', max: 30 },
    { label: 'xG', key: 'xG', max: 10 },
    { label: 'Assistências', key: 'Assistências', max: 15 },
    { label: 'xA', key: 'xA', max: 8 },
    { label: 'Dribles %', key: 'Dribles com sucesso (%)', max: 100 },
    { label: 'Cruzamentos %', key: 'Cruzamentos precisos (%)', max: 100 },
    { label: 'Recuperações', key: 'Recuperações de bola campo ataque', max: 50 },
    { label: 'Desarmes', key: 'Desarmes', max: 30 }
  ];

  const radarData = useMemo(() => {
    if (!player1 || !player2) return null;

    const getValues = (player) => {
      return radarMetrics.map(metric => {
        const val = safeParseFloat(player[metric.key]);
        const normalized = (val / metric.max) * 100;
        return Math.min(normalized, 100);
      });
    };

    return {
      labels: radarMetrics.map(m => m.label),
      datasets: [
        {
          label: player1.name,
          data: getValues(player1),
          backgroundColor: 'rgba(251, 191, 36, 0.15)',
          borderColor: '#fbbf24',
          borderWidth: 2.5,
          pointBackgroundColor: '#fbbf24',
          pointBorderColor: '#fff',
          pointRadius: 4,
          fill: true
        },
        {
          label: player2.name,
          data: getValues(player2),
          backgroundColor: 'rgba(100, 116, 139, 0.15)',
          borderColor: '#64748b',
          borderWidth: 2.5,
          pointBackgroundColor: '#64748b',
          pointBorderColor: '#fff',
          pointRadius: 4,
          fill: true
        }
      ],
    };
  }, [player1, player2]);

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
          font: { size: 9, weight: 'bold' },
          stepSize: 20
        },
        angleLines: { color: 'rgba(255, 255, 255, 0.08)', lineWidth: 1 },
        grid: { color: 'rgba(255, 255, 255, 0.08)', circular: true, drawBorder: false },
        pointLabels: { color: '#e2e8f0', font: { size: 9, weight: 'bold' }, padding: 8 }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: '#94a3b8', font: { size: 10, weight: 'bold' }, padding: 15 }
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

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-brand-yellow transition-colors font-black uppercase text-[10px] tracking-widest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <h1 className="text-2xl font-black italic uppercase text-brand-yellow">Comparação de Atletas</h1>
        </div>

        {/* SELETOR DE SEGUNDO ATLETA */}
        {!player2 && (
          <div className="mb-8 bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
            <h2 className="text-lg font-black uppercase italic text-white mb-6">Selecione o segundo atleta para comparar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {EXTREMOS_PLAYERS.filter(p => p.id !== player1Id).map(player => (
                <button
                  key={player.id}
                  onClick={async () => {
                    const config = EXTREMOS_PLAYERS.find(p => p.id === player.id);
                    try {
                      const response = await fetch(config.url);
                      const csvText = await response.text();
                      Papa.parse(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                          const cleaned = cleanData(results.data);
                          setPlayer2({ ...config, ...cleaned[0] });
                          setSelectedPlayer2(player.id);
                        }
                      });
                    } catch (error) {
                      console.error("Erro ao carregar atleta:", error);
                    }
                  }}
                  className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl hover:border-brand-yellow/50 transition-all text-left"
                >
                  <p className="font-black uppercase text-sm text-white mb-1">{player.name}</p>
                  <p className="text-[10px] text-slate-500">{player.Time || 'N/A'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* COMPARAÇÃO */}
        {player1 && player2 && (
          <div className="space-y-8">
            {/* CARDS DOS ATLETAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900/40 border border-brand-yellow/30 rounded-[2rem] p-8 text-center">
                <div className="w-40 h-40 mx-auto rounded-2xl bg-slate-800 border-2 border-brand-yellow/30 overflow-hidden mb-4">
                  <img 
                    src={`/images/players/${player1.id}.png`} 
                    alt={player1.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300/1e293b/fbbf24?text=' + player1.name.charAt(0); }}
                  />
                </div>
                <h3 className="text-2xl font-black uppercase italic text-brand-yellow mb-2">{player1.name}</h3>
                <p className="text-slate-500 text-xs font-bold">{player1.Time}</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-700/30 rounded-[2rem] p-8 text-center">
                <div className="w-40 h-40 mx-auto rounded-2xl bg-slate-800 border-2 border-slate-700/30 overflow-hidden mb-4">
                  <img 
                    src={`/images/players/${player2.id}.png`} 
                    alt={player2.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300/1e293b/64748b?text=' + player2.name.charAt(0); }}
                  />
                </div>
                <h3 className="text-2xl font-black uppercase italic text-slate-400 mb-2">{player2.name}</h3>
                <p className="text-slate-500 text-xs font-bold">{player2.Time}</p>
              </div>
            </div>

            {/* RADAR COMPARATIVO */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10">
              <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-8 text-center">Análise Comparativa</h3>
              <div className="w-full h-96 flex items-center justify-center">
                {radarData && <Radar data={radarData} options={radarOptions} />}
              </div>
            </div>

            {/* TABELA COMPARATIVA */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 overflow-x-auto">
              <h3 className="text-lg font-black uppercase italic text-white mb-6">Comparação Métrica a Métrica</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase text-slate-500">Métrica</th>
                    <th className="text-center py-3 px-4 text-[10px] font-black uppercase text-brand-yellow">{player1.name}</th>
                    <th className="text-center py-3 px-4 text-[10px] font-black uppercase text-slate-400">{player2.name}</th>
                    <th className="text-center py-3 px-4 text-[10px] font-black uppercase text-slate-500">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {radarMetrics.map(metric => {
                    const val1 = safeParseFloat(player1[metric.key]);
                    const val2 = safeParseFloat(player2[metric.key]);
                    const diff = val1 - val2;
                    const winner = diff > 0 ? 'player1' : diff < 0 ? 'player2' : 'tie';
                    
                    return (
                      <tr key={metric.key} className="border-b border-slate-800/50 hover:bg-slate-950/30">
                        <td className="py-3 px-4 text-[10px] font-bold text-slate-400">{metric.label}</td>
                        <td className={`text-center py-3 px-4 font-black ${winner === 'player1' ? 'text-brand-yellow bg-brand-yellow/10' : 'text-slate-300'}`}>
                          {val1.toFixed(2)}
                        </td>
                        <td className={`text-center py-3 px-4 font-black ${winner === 'player2' ? 'text-slate-300 bg-slate-800/30' : 'text-slate-400'}`}>
                          {val2.toFixed(2)}
                        </td>
                        <td className={`text-center py-3 px-4 font-black ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* BOTÃO PARA TROCAR */}
            <button
              onClick={() => {
                setPlayer2(null);
                setSelectedPlayer2(null);
              }}
              className="w-full py-4 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-widest hover:border-slate-700 transition-all"
            >
              Comparar com Outro Atleta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
