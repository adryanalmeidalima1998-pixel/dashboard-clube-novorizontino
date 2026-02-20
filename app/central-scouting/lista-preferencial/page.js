'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { EXTREMOS_PLAYERS } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';

export default function ListaPreferencial() {
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('todos');

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
                playersData.push({
                  ...config,
                  ...cleaned[0],
                  isOurPlayer: config.type === 'nosso'
                });
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
      alert('Selecione pelo menos um atleta para comparar');
      return;
    }
    const playerIds = Array.from(selected).join(',');
    router.push(`/central-scouting/lista-preferencial/comparacao?players=${playerIds}`);
  };

  const handleViewProfile = (playerId) => {
    router.push(`/central-scouting/lista-preferencial/${playerId}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
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
          <div>
            <h1 className="text-3xl font-black italic uppercase text-brand-yellow">Lista Preferencial</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Extremos de Mercado & Análise Comparativa</p>
          </div>
        </div>

        {/* FILTROS E AÇÕES */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-3">Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm font-bold hover:border-brand-yellow/50 transition-all"
              >
                <option value="todos">Todos</option>
                <option value="nossos">Nossos Atletas</option>
                <option value="alvos">Alvos de Mercado</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-3">Time</label>
              <input
                type="text"
                placeholder="Filtrar por time..."
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-2 text-white text-sm font-bold placeholder-slate-600 hover:border-brand-yellow/50 transition-all"
              />
            </div>

            <div className="flex items-end">
              <div className="text-[10px] font-black uppercase text-slate-500">
                <span className="text-brand-yellow text-lg">{selected.size}</span> / {filteredPlayers.length} selecionados
              </div>
            </div>

            <div className="flex items-end gap-3">
              <button
                onClick={handleCompare}
                disabled={selected.size === 0}
                className="flex-1 px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] tracking-widest rounded-lg hover:bg-brand-yellow/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Comparar ({selected.size})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6 border-t border-slate-800">
            <input
              type="checkbox"
              checked={selected.size === filteredPlayers.length && filteredPlayers.length > 0}
              onChange={toggleSelectAll}
              className="w-5 h-5 cursor-pointer"
            />
            <label className="text-[10px] font-black uppercase text-slate-500 cursor-pointer">
              Selecionar Todos ({filteredPlayers.length})
            </label>
          </div>
        </div>

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
        </div>

        {/* FOOTER */}
        <div className="mt-8 p-6 bg-slate-950/50 rounded-[2rem] border border-slate-900 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Total de Atletas: <span className="text-brand-yellow">{players.length}</span> | 
            Filtrados: <span className="text-brand-yellow">{filteredPlayers.length}</span> | 
            Selecionados: <span className="text-brand-yellow">{selected.size}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
