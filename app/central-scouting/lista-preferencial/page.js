'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { EXTREMOS_PLAYERS } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

function ListaPreferencialContent() {
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [metricX, setMetricX] = useState('Gols');
  const [metricY, setMetricY] = useState('Assistências');
  const [showRadar, setShowRadar] = useState(false);
  const [showDispersao, setShowDispersao] = useState(false);

  // Todas as métricas disponíveis
  const allMetrics = [
    'Gols', 'xG', 'Assistências', 'xA', 'Dribles com sucesso (%)',
    'Cruzamentos precisos (%)', 'Recuperações de bola campo ataque', 'Desarmes',
    'Finalizações', 'Finalizações no alvo', 'Toques na área adversária',
    'Passes decisivos', 'Passes para a área', 'Progressões com bola',
    'Perdas de posse', 'Interceptações', 'Duelos ofensivos ganhos (%)',
    'Acelerações', 'Minutos jogados'
  ];

  useEffect(() => {
    const loadPlayers = async () => {
      const playersData = [];

      for (const config of EXTREMOS_PLAYERS) {
        try {
          const response = await fetch(config.url);
          const csvText = await response.text();
          await new Promise((resolve) => {
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                const cleaned = cleanData(results.data);
                if (cleaned.length > 0) {
                  playersData.push({
                    ...config,
                    ...cleaned[0],
                    isOurPlayer: config.type === 'nosso'
                  });
                }
                resolve();
              }
            });
          });
        } catch (error) {
          console.error(`Erro ao carregar ${config.name}:`, error);
        }
      }

      setPlayers(playersData);
      setLoading(false);
    };

    loadPlayers();
  }, []);

  const filteredPlayers = players.filter(p => {
    const matchTeam = !filterTeam || (p.Time && p.Time.toLowerCase().includes(filterTeam.toLowerCase()));
    const matchType = 
      filterType === 'todos' ? true :
      filterType === 'nossos' ? p.isOurPlayer :
      filterType === 'alvos' ? !p.isOurPlayer : true;
    return matchTeam && matchType;
  });

  const toggleSelect = (playerId) => {
    const newSelected = new Set(selected);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredPlayers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredPlayers.map(p => p.id)));
    }
  };

  const handleCompare = () => {
    if (selected.size === 0) {
      alert('Selecione pelo menos um atleta');
      return;
    }
    const playerIds = Array.from(selected).join(',');
    router.push(`/central-scouting/lista-preferencial/comparacao?players=${playerIds}`);
  };

  const handleViewProfile = (playerId) => {
    router.push(`/central-scouting/lista-preferencial/${playerId}`);
  };

  // Dados para Radar
  const radarMetrics = ['Gols', 'Assistências', 'Dribles com sucesso (%)', 'Cruzamentos precisos (%)', 'Recuperações de bola campo ataque', 'Desarmes'];
  
  const radarData = useMemo(() => {
    if (selected.size === 0) return [];
    
    const selectedPlayers = players.filter(p => selected.has(p.id));
    const colors = ['#fbbf24', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b'];
    
    return selectedPlayers.map((player, idx) => {
      const values = radarMetrics.map(metric => {
        const val = safeParseFloat(player[metric]);
        return Math.min(val, 100);
      });
      
      return {
        type: 'scatterpolar',
        r: values,
        theta: radarMetrics,
        fill: 'toself',
        name: player.name,
        line: { color: colors[idx % colors.length] },
        fillcolor: colors[idx % colors.length]
      };
    });
  }, [selected, players]);

  // Dados para Dispersão
  const scatterData = useMemo(() => {
    if (selected.size === 0) return [];
    
    const selectedPlayers = players.filter(p => selected.has(p.id));
    const nossos = selectedPlayers.filter(p => p.isOurPlayer);
    const alvos = selectedPlayers.filter(p => !p.isOurPlayer);

    const createTrace = (playerList, name, color) => ({
      type: 'scatter',
      mode: 'markers+text',
      x: playerList.map(p => safeParseFloat(p[metricX])),
      y: playerList.map(p => safeParseFloat(p[metricY])),
      text: playerList.map(p => p.name.split(' ')[0]),
      textposition: 'top center',
      marker: {
        size: 12,
        color: color,
        opacity: 0.8,
        line: { color: '#fff', width: 2 }
      },
      name: name
    });

    return [
      createTrace(nossos, 'Nossos Atletas', '#fbbf24'),
      createTrace(alvos, 'Alvos de Mercado', '#64748b')
    ];
  }, [selected, players, metricX, metricY]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-black italic uppercase text-brand-yellow mb-2">Lista Preferencial</h1>
          <p className="text-slate-400 font-bold">Extremos de Mercado & Análise Comparativa</p>
        </div>

        {/* FILTROS */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-3">Tipo</label>
              <div className="flex gap-3">
                {['todos', 'nossos', 'alvos'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${
                      filterType === type
                        ? 'bg-brand-yellow text-black'
                        : 'bg-slate-950 border border-slate-700 text-slate-400 hover:border-brand-yellow'
                    }`}
                  >
                    {type === 'todos' ? 'Todos' : type === 'nossos' ? 'Nossos Atletas' : 'Alvos de Mercado'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-3">Time</label>
              <input
                type="text"
                placeholder="Filtrar por time..."
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-yellow"
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={() => setSelected(new Set())}
                className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 text-slate-400 font-black uppercase text-[10px] rounded-lg hover:border-brand-yellow transition-all"
              >
                Limpar
              </button>
              <button
                onClick={toggleSelectAll}
                className="flex-1 px-4 py-2 bg-slate-700 text-white font-black uppercase text-[10px] rounded-lg hover:bg-slate-600 transition-all"
              >
                Selecionar Todos
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase text-slate-500">
              <span className="text-brand-yellow text-lg">{selected.size}</span> / {filteredPlayers.length} selecionados
            </div>
            <button
              onClick={handleCompare}
              disabled={selected.size === 0}
              className="px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Comparar ({selected.size})
            </button>
          </div>
        </div>

        {/* BOTÕES DE GRÁFICOS */}
        {selected.size > 0 && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => {
                const playerIds = Array.from(selected).join(',');
                router.push(`/central-scouting/lista-preferencial/radar?players=${playerIds}`);
              }}
              className="flex-1 px-6 py-4 bg-blue-600 text-white font-black uppercase text-[10px] rounded-lg hover:bg-blue-700 transition-all"
            >
              📊 Abrir Radar Completo
            </button>
            <button
              onClick={() => {
                const playerIds = Array.from(selected).join(',');
                router.push(`/central-scouting/lista-preferencial/dispersao?players=${playerIds}`);
              }}
              className="flex-1 px-6 py-4 bg-purple-600 text-white font-black uppercase text-[10px] rounded-lg hover:bg-purple-700 transition-all"
            >
              📈 Abrir Dispersão Completa
            </button>
          </div>
        )}

        {/* GRÁFICOS PREVIEW */}
        {selected.size > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* RADAR PREVIEW */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 opacity-50 pointer-events-none">
              <h3 className="text-lg font-black uppercase italic text-slate-500 mb-4">Análise de Desempenho (Radar) - Preview</h3>
              {radarData.length > 0 && (
                <Plot
                  data={radarData}
                  layout={{
                    polar: {
                      radialaxis: { visible: true, range: [0, 100] }
                    },
                    paper_bgcolor: 'rgba(10, 12, 16, 0)',
                    plot_bgcolor: 'rgba(10, 12, 16, 0.3)',
                    font: { color: '#e2e8f0' },
                    showlegend: true,
                    height: 400
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%' }}
                />
              )}
            </div>

            {/* DISPERSÃO */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
              <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-4">Gráfico de Dispersão</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <select
                  value={metricX}
                  onChange={(e) => setMetricX(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-yellow"
                >
                  {allMetrics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={metricY}
                  onChange={(e) => setMetricY(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-yellow"
                >
                  {allMetrics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {scatterData.length > 0 && (
                <Plot
                  data={scatterData}
                  layout={{
                    xaxis: { title: metricX },
                    yaxis: { title: metricY },
                    paper_bgcolor: 'rgba(10, 12, 16, 0)',
                    plot_bgcolor: 'rgba(10, 12, 16, 0.3)',
                    font: { color: '#e2e8f0' },
                    height: 400
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%' }}
                />
              )}
            </div>
          </div>
        )}

        {/* TABELA */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-500 w-12">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredPlayers.length && filteredPlayers.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-500">Nome</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500">Idade</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500">Posição</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500">Time</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500">Gols</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500">Assistências</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500">Dribles %</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black uppercase text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr
                    key={player.id}
                    className={`border-b border-slate-800 hover:bg-slate-950/30 transition-all ${
                      selected.has(player.id) ? 'bg-brand-yellow/10' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(player.id)}
                        onChange={() => toggleSelect(player.id)}
                        className="w-5 h-5 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
                          <img
                            src={`/images/players/${player.id}.png`}
                            alt={player.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/100/1e293b/fbbf24?text=' + player.name.charAt(0); }}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{player.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold">{player.isOurPlayer ? '🏠 Nosso' : '🎯 Alvo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-300">{player.Idade || '-'}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-300">{player.Posição || '-'}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-slate-300">{player.Time || '-'}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-brand-yellow">{safeParseFloat(player['Gols']).toFixed(1)}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-blue-400">{safeParseFloat(player['Assistências']).toFixed(1)}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-green-400">{safeParseFloat(player['Dribles com sucesso (%)']).toFixed(1)}%</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewProfile(player.id)}
                        className="px-4 py-2 bg-slate-950/50 border border-slate-800 hover:border-brand-yellow/50 rounded-lg text-[10px] font-black uppercase text-slate-400 hover:text-brand-yellow transition-all"
                      >
                        Ver Perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 text-[10px] text-slate-500 font-bold">
            Total de Atletas: {players.length} | Filtrados: {filteredPlayers.length} | Selecionados: {selected.size}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListaPreferencial() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
      </div>
    }>
      <ListaPreferencialContent />
    </Suspense>
  );
}
