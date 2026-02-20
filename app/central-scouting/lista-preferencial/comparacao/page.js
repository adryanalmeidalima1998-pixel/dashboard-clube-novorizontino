'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import { EXTREMOS_PLAYERS } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { Radar, Scatter } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ScatterController
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ScatterController
);

function ComparacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const playersParam = searchParams.get('players');
  
  const [players, setPlayers] = useState([]);
  const [allMetrics, setAllMetrics] = useState([]);
  const [selectedMetricX, setSelectedMetricX] = useState('Gols');
  const [selectedMetricY, setSelectedMetricY] = useState('Assistências');
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [loading, setLoading] = useState(true);
  const [compareModal, setCompareModal] = useState(false);
  const [player1Compare, setPlayer1Compare] = useState(null);
  const [player2Compare, setPlayer2Compare] = useState(null);
  
  const radarRef = useRef(null);
  const scatterRef = useRef(null);

  useEffect(() => {
    const loadPlayers = async () => {
      if (!playersParam) {
        router.push('/central-scouting/lista-preferencial');
        return;
      }

      const playerIds = playersParam.split(',');
      const playersData = [];

      for (const playerId of playerIds) {
        const config = EXTREMOS_PLAYERS.find(p => p.id === playerId);
        if (!config) continue;

        try {
          const response = await fetch(config.url);
          const csvText = await response.text();
          await new Promise((resolve) => {
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                const cleaned = cleanData(results.data);
                playersData.push({
                  ...config,
                  ...cleaned[0],
                  rawData: cleaned[0]
                });
                resolve();
              }
            });
          });
        } catch (error) {
          console.error(`Erro ao carregar ${playerId}:`, error);
        }
      }

      setPlayers(playersData);
      
      if (playersData.length > 0) {
        const metrics = Object.keys(playersData[0].rawData || {})
          .filter(key => key && typeof key === 'string' && key.trim() !== '')
          .sort();
        setAllMetrics(metrics);
      }

      setLoading(false);
    };

    loadPlayers();
  }, [playersParam]);

  const getNormalizedValue = (value, metric) => {
    const val = safeParseFloat(value);
    if (val === 0) return 0;
    
    if (metric.includes('%')) return Math.min(val, 100);
    if (metric.includes('Gols') || metric.includes('Finalizações')) return Math.min((val / 30) * 100, 100);
    if (metric.includes('Assistências') || metric.includes('Cruzamentos')) return Math.min((val / 15) * 100, 100);
    if (metric.includes('Duelos') || metric.includes('Recuperações')) return Math.min((val / 50) * 100, 100);
    
    return Math.min((val / 100) * 100, 100);
  };

  const radarMetrics = useMemo(() => {
    if (allMetrics.length === 0) return [];
    return allMetrics.slice(0, 8);
  }, [allMetrics]);

  const radarData = useMemo(() => {
    if (players.length === 0 || radarMetrics.length === 0) return null;

    const colors = ['#fbbf24', '#64748b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];

    return {
      labels: radarMetrics,
      datasets: players.map((player, idx) => ({
        label: player.name,
        data: radarMetrics.map(metric => getNormalizedValue(player[metric], metric)),
        backgroundColor: colors[idx % colors.length].replace(')', ', 0.15)').replace('(', '('),
        borderColor: colors[idx % colors.length],
        borderWidth: 2.5,
        pointBackgroundColor: colors[idx % colors.length],
        pointBorderColor: '#fff',
        pointRadius: 4,
        fill: true
      }))
    };
  }, [players, radarMetrics]);

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
          stepSize: 20,
          callback: (value) => value + '%'
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

  const scatterData = useMemo(() => {
    if (players.length === 0 || !selectedMetricX || !selectedMetricY) return null;

    const colors = ['#fbbf24', '#64748b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];

    return {
      datasets: players.map((player, idx) => ({
        label: player.name,
        data: [{
          x: safeParseFloat(player[selectedMetricX]),
          y: safeParseFloat(player[selectedMetricY])
        }],
        backgroundColor: colors[idx % colors.length],
        borderColor: colors[idx % colors.length],
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 10
      }))
    };
  }, [players, selectedMetricX, selectedMetricY]);

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: { display: true, text: selectedMetricX, color: '#94a3b8', font: { size: 11, weight: 'bold' } },
        ticks: { color: '#64748b', font: { size: 9 } },
        grid: { color: 'rgba(255, 255, 255, 0.08)' }
      },
      y: {
        title: { display: true, text: selectedMetricY, color: '#94a3b8', font: { size: 11, weight: 'bold' } },
        ticks: { color: '#64748b', font: { size: 9 } },
        grid: { color: 'rgba(255, 255, 255, 0.08)' }
      }
    },
    plugins: {
      legend: {
        display: true,
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

  const exportPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // TÍTULO
      pdf.setFontSize(20);
      pdf.setTextColor(251, 191, 36);
      pdf.text('ANÁLISE COMPARATIVA DE ATLETAS', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // ATLETAS
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 200);
      const playerNames = players.map(p => p.name).join(' vs ');
      pdf.text(playerNames, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // DADOS DOS ATLETAS
      pdf.setFontSize(9);
      players.forEach((player, idx) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setTextColor(251, 191, 36);
        pdf.text(`${idx + 1}. ${player.name}`, 20, yPosition);
        yPosition += 8;
        
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text(`Time: ${player.Time || 'N/A'} | Posição: ${player.Posição || 'N/A'} | Idade: ${player.Idade || 'N/A'}`, 25, yPosition);
        yPosition += 10;
      });

      // NOVA PÁGINA PARA GRÁFICOS
      pdf.addPage();
      yPosition = 20;

      // RADAR
      if (radarRef.current) {
        try {
          const radarCanvas = await html2canvas(radarRef.current, { scale: 2, backgroundColor: '#0a0c10' });
          const radarImg = radarCanvas.toDataURL('image/png');
          pdf.setFontSize(12);
          pdf.setTextColor(251, 191, 36);
          pdf.text('GRÁFICO DE RADAR - DESEMPENHO', 20, yPosition);
          yPosition += 5;
          pdf.addImage(radarImg, 'PNG', 15, yPosition, 180, 100);
          yPosition += 110;
        } catch (error) {
          console.error('Erro ao capturar radar:', error);
        }
      }

      // NOVA PÁGINA PARA DISPERSÃO
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = 20;
      }

      if (scatterRef.current) {
        try {
          const scatterCanvas = await html2canvas(scatterRef.current, { scale: 2, backgroundColor: '#0a0c10' });
          const scatterImg = scatterCanvas.toDataURL('image/png');
          pdf.setFontSize(12);
          pdf.setTextColor(251, 191, 36);
          pdf.text(`GRÁFICO DE DISPERSÃO - ${selectedMetricX} vs ${selectedMetricY}`, 20, yPosition);
          yPosition += 5;
          pdf.addImage(scatterImg, 'PNG', 15, yPosition, 180, 100);
        } catch (error) {
          console.error('Erro ao capturar scatter:', error);
        }
      }

      // SALVAR PDF
      const fileName = `comparacao-${players.map(p => p.name.split(' ')[0]).join('-vs-')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
    </div>
  );

  if (players.length === 0) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-lg font-black uppercase mb-4">Nenhum atleta selecionado</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] tracking-widest rounded-lg"
        >
          Voltar
        </button>
      </div>
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
          <h1 className="text-2xl font-black italic uppercase text-brand-yellow">Comparação de Atletas</h1>
          <button
            onClick={exportPDF}
            className="px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] tracking-widest rounded-lg hover:bg-brand-yellow/80 transition-all"
          >
            📄 Exportar PDF
          </button>
        </div>

        {/* CARDS DOS ATLETAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {players.map((player) => (
            <div key={player.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
              <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden mb-3 mx-auto">
                <img 
                  src={`/images/players/${player.id}.png`} 
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/100/1e293b/fbbf24?text=' + player.name.charAt(0); }}
                />
              </div>
              <p className="text-xs font-black uppercase text-center text-white truncate">{player.name}</p>
              <p className="text-[8px] text-slate-500 text-center">{player.Time}</p>
              {players.length === 2 && (
                <button
                  onClick={() => {
                    setPlayer1Compare(player);
                    setPlayer2Compare(players.find(p => p.id !== player.id));
                    setCompareModal(true);
                  }}
                  className="w-full mt-3 px-2 py-1 bg-slate-950/50 border border-slate-800 hover:border-brand-yellow/50 rounded text-[8px] font-black uppercase text-slate-400 hover:text-brand-yellow transition-all"
                >
                  Comparar 1x1
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ABAS */}
        <div className="flex gap-4 mb-8 border-b border-slate-800 overflow-x-auto">
          {[
            { id: 'visao-geral', label: 'Visão Geral' },
            { id: 'radar', label: 'Radar' },
            { id: 'dispersao', label: 'Dispersão' },
            { id: 'atributos', label: 'Atributos' }
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
          <div className="space-y-8">
            {players.map(player => (
              <div key={player.id} className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                <div className="flex items-start gap-8 mb-8">
                  <div className="w-32 h-32 rounded-2xl bg-slate-800 border-2 border-brand-yellow/30 overflow-hidden flex-shrink-0">
                    <img 
                      src={`/images/players/${player.id}.png`} 
                      alt={player.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/300/1e293b/fbbf24?text=' + player.name.charAt(0); }}
                    />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase italic text-brand-yellow mb-2">{player.name}</h2>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Time</p>
                        <p className="text-sm font-bold text-white">{player.Time || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Posição</p>
                        <p className="text-sm font-bold text-white">{player.Posição || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Idade</p>
                        <p className="text-sm font-bold text-white">{player.Idade || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'radar' && radarData && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10">
            <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-8 text-center">Análise de Desempenho Comparativa</h3>
            <div ref={radarRef} className="w-full h-96 flex items-center justify-center">
              <Radar data={radarData} options={radarOptions} />
            </div>
          </div>
        )}

        {activeTab === 'dispersao' && (
          <div className="space-y-8">
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-3">Métrica X</label>
                <select
                  value={selectedMetricX}
                  onChange={(e) => setSelectedMetricX(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm font-bold"
                >
                  {allMetrics.map(metric => (
                    <option key={metric} value={metric}>{metric}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-3">Métrica Y</label>
                <select
                  value={selectedMetricY}
                  onChange={(e) => setSelectedMetricY(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm font-bold"
                >
                  {allMetrics.map(metric => (
                    <option key={metric} value={metric}>{metric}</option>
                  ))}
                </select>
              </div>
            </div>

            {scatterData && (
              <div ref={scatterRef} className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10">
                <div className="w-full h-96 flex items-center justify-center">
                  <Scatter data={scatterData} options={scatterOptions} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'atributos' && (
          <div className="space-y-8">
            {players.map(player => (
              <div key={player.id} className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">{player.name} - Todos os Atributos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allMetrics.map(metric => (
                    <div key={metric} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
                      <p className="text-[10px] text-slate-500 font-black uppercase mb-2">{metric}</p>
                      <p className="text-lg font-black text-brand-yellow">{safeParseFloat(player[metric]).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL COMPARAÇÃO 1x1 */}
        {compareModal && player1Compare && player2Compare && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border-2 border-brand-yellow rounded-[2rem] p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic text-brand-yellow">Comparação 1x1</h2>
                <button
                  onClick={() => setCompareModal(false)}
                  className="text-slate-500 hover:text-brand-yellow text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {[player1Compare, player2Compare].map((player, idx) => (
                  <div key={player.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6">
                    <div className="w-20 h-20 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden mb-4 mx-auto">
                      <img 
                        src={`/images/players/${player.id}.png`} 
                        alt={player.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/100/1e293b/fbbf24?text=' + player.name.charAt(0); }}
                      />
                    </div>
                    <p className="text-lg font-black uppercase text-center text-white mb-4">{player.name}</p>
                    
                    <div className="space-y-3">
                      {radarMetrics.map(metric => {
                        const val1 = getNormalizedValue(player1Compare[metric], metric);
                        const val2 = getNormalizedValue(player2Compare[metric], metric);
                        const winner = val1 > val2 ? 0 : val2 > val1 ? 1 : -1;
                        
                        return (
                          <div key={metric} className="bg-slate-900/50 p-3 rounded-lg">
                            <p className="text-[8px] text-slate-500 font-black uppercase mb-2">{metric}</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${idx === 0 ? 'bg-brand-yellow' : 'bg-slate-600'}`}
                                    style={{ width: `${idx === 0 ? val1 : val2}%` }}
                                  ></div>
                                </div>
                              </div>
                              <span className="text-sm font-black text-white w-12 text-right">
                                {idx === 0 ? val1.toFixed(0) : val2.toFixed(0)}%
                              </span>
                              {winner === idx && <span className="text-brand-yellow font-black">✓</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setCompareModal(false)}
                className="w-full mt-8 px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] tracking-widest rounded-lg hover:bg-brand-yellow/80 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparacaoAtletas() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
      </div>
    }>
      <ComparacaoContent />
    </Suspense>
  );
}
