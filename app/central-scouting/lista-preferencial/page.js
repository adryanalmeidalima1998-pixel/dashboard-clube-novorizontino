'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';

function ListaPreferencialContent() {
  const router = useRouter();
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioBravo, setGremiBravo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());

  // Função para calcular métrica por 90 minutos
  const calcularPor90 = (valor, minutosJogados) => {
    const val = safeParseFloat(valor);
    const minutos = safeParseFloat(minutosJogados);
    
    if (minutos === 0 || minutos === '-' || val === '-') return 0;
    return (val / minutos) * 90;
  };

  // Função para processar dados e calcular métricas por 90
  const processarDados = (dados, aba) => {
    return dados.map(jogador => {
      const minutosJogados = safeParseFloat(jogador['Minutos jogados']);
      
      // Criar objeto com dados originais e métricas por 90
      const processado = {
        ...jogador,
        aba: aba,
        minutosJogados: minutosJogados,
        'Gols_por_90': calcularPor90(jogador['Gols'], minutosJogados),
        'Assistências_por_90': calcularPor90(jogador['Assistências'], minutosJogados),
        'Dribles_por_90': calcularPor90(jogador['Dribles com sucesso (%)'], minutosJogados),
        'Cruzamentos_por_90': calcularPor90(jogador['Cruzamentos precisos (%)'], minutosJogados),
        'Recuperações_por_90': calcularPor90(jogador['Recuperações de bola campo ataque'], minutosJogados),
        'Desarmes_por_90': calcularPor90(jogador['Desarmes'], minutosJogados),
        'Finalizações_por_90': calcularPor90(jogador['Finalizações'], minutosJogados),
        'Finalizações_alvo_por_90': calcularPor90(jogador['Finalizações no alvo'], minutosJogados),
        'Toques_area_por_90': calcularPor90(jogador['Toques na área adversária'], minutosJogados),
        'Passes_decisivos_por_90': calcularPor90(jogador['Passes decisivos'], minutosJogados),
        'Passes_area_por_90': calcularPor90(jogador['Passes para a área'], minutosJogados),
        'Progressoes_por_90': calcularPor90(jogador['Progressões com bola'], minutosJogados),
        'Perdas_por_90': calcularPor90(jogador['Perdas de posse'], minutosJogados),
        'Interceptacoes_por_90': calcularPor90(jogador['Interceptações'], minutosJogados),
        'Duelos_ofensivos_por_90': calcularPor90(jogador['Duelos ofensivos ganhos (%)'], minutosJogados),
        'Aceleracoes_por_90': calcularPor90(jogador['Acelerações'], minutosJogados),
      };
      
      return processado;
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // URL do CSV com duas abas
        const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&t=' + Date.now();
        
        const response = await fetch(csvUrl);
        const csvText = await response.text();

        // Fazer parsing do CSV
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data);
            
            // Separar dados por aba (usando coluna 'Aba' ou detectar automaticamente)
            const lista = dadosLimpos.filter(d => 
              d['Aba'] === 'LISTA PREFERENCIAL' || 
              (d['Time'] && !d['Time'].toLowerCase().includes('novorizontino'))
            );
            
            const gremio = dadosLimpos.filter(d => 
              d['Aba'] === 'GRÊMIO NOVORIZONTINO' || 
              (d['Time'] && d['Time'].toLowerCase().includes('novorizontino'))
            );

            // Processar dados e calcular métricas por 90
            const listaProcessada = processarDados(lista, 'LISTA PREFERENCIAL');
            const gremioProcessada = processarDados(gremio, 'GRÊMIO NOVORIZONTINO');

            setListaPreferencial(listaProcessada);
            setGremiBravo(gremioProcessada);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const todosJogadores = useMemo(() => {
    return [...listaPreferencial, ...gremioBravo];
  }, [listaPreferencial, gremioBravo]);

  const jogadoresFiltrados = useMemo(() => {
    return todosJogadores.filter(j => {
      const matchTeam = !filterTeam || (j.Time && j.Time.toLowerCase().includes(filterTeam.toLowerCase()));
      const matchType = 
        filterType === 'todos' ? true :
        filterType === 'lista' ? j.aba === 'LISTA PREFERENCIAL' :
        filterType === 'gremio' ? j.aba === 'GRÊMIO NOVORIZONTINO' : true;
      return matchTeam && matchType;
    });
  }, [todosJogadores, filterTeam, filterType]);

  const toggleSelect = (idx) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedPlayers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPlayers.size === jogadoresFiltrados.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(jogadoresFiltrados.map((_, idx) => idx)));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin"></div>
        <p className="text-brand-yellow font-black tracking-widest uppercase text-xs italic">Carregando Lista Preferencial...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <button 
            onClick={() => router.push('/central-scouting')}
            className="mb-4 p-2 hover:bg-slate-900 rounded-lg transition-all"
          >
            ← Voltar
          </button>
          <h1 className="text-4xl font-black italic uppercase text-brand-yellow mb-2">Lista Preferencial</h1>
          <p className="text-slate-400 font-bold">Comparação de Atletas - Métricas por 90 minutos</p>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <p className="text-[10px] text-slate-500 uppercase font-black">Lista Preferencial</p>
            <p className="text-2xl font-black text-brand-yellow">{listaPreferencial.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <p className="text-[10px] text-slate-500 uppercase font-black">Grêmio Novorizontino</p>
            <p className="text-2xl font-black text-brand-yellow">{gremioBravo.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <p className="text-[10px] text-slate-500 uppercase font-black">Selecionados</p>
            <p className="text-2xl font-black text-brand-yellow">{selectedPlayers.size}</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-3">Tipo</label>
              <div className="flex gap-3">
                {['todos', 'lista', 'gremio'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg font-black uppercase text-[10px] transition-all ${
                      filterType === type
                        ? 'bg-brand-yellow text-black'
                        : 'bg-slate-950 border border-slate-700 text-slate-400 hover:border-brand-yellow'
                    }`}
                  >
                    {type === 'todos' ? 'Todos' : type === 'lista' ? 'Lista Preferencial' : 'Grêmio Novorizontino'}
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
                onClick={() => setSelectedPlayers(new Set())}
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
        </div>

        {/* TABELA DE ATLETAS */}
        <div className="bg-slate-900/30 rounded-[2rem] border border-slate-800 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-brand-yellow/20">
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500 w-12">
                    <input 
                      type="checkbox" 
                      checked={selectedPlayers.size === jogadoresFiltrados.length && jogadoresFiltrados.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Jogador</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Time</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Posição</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Idade</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Min Jogados</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Gols/90</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Assist/90</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Finalizações/90</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Aba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {jogadoresFiltrados.map((jogador, idx) => (
                  <tr key={idx} className="hover:bg-brand-yellow/[0.03] transition-all">
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedPlayers.has(idx)}
                        onChange={() => toggleSelect(idx)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-black text-white">{jogador['Jogador']}</td>
                    <td className="p-4 text-slate-400 text-[10px]">{jogador['Time']}</td>
                    <td className="p-4 text-slate-400 text-[10px]">{jogador['Posição']}</td>
                    <td className="p-4 text-slate-400 text-[10px]">{jogador['Idade']}</td>
                    <td className="p-4 text-slate-400 text-[10px]">{jogador['minutosJogados']}</td>
                    <td className="p-4 text-brand-yellow font-black">{jogador['Gols_por_90']?.toFixed(2) || '-'}</td>
                    <td className="p-4 text-brand-yellow font-black">{jogador['Assistências_por_90']?.toFixed(2) || '-'}</td>
                    <td className="p-4 text-brand-yellow font-black">{jogador['Finalizações_por_90']?.toFixed(2) || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black ${
                        jogador['aba'] === 'GRÊMIO NOVORIZONTINO' 
                          ? 'bg-green-900/30 text-green-400' 
                          : 'bg-blue-900/30 text-blue-400'
                      }`}>
                        {jogador['aba'] === 'GRÊMIO NOVORIZONTINO' ? 'GN' : 'LP'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* INFORMAÇÃO SOBRE MÉTRICAS */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
          <p className="text-[10px] text-slate-400 font-bold">
            ℹ️ Todas as métricas são exibidas em <strong>valores por 90 minutos</strong> para permitir comparação justa entre atletas com diferentes tempos de jogo.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ListaPreferencial() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ListaPreferencialContent />
    </Suspense>
  );
}
