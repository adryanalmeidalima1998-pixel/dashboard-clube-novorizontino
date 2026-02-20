'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';

// Categorização de métricas
const CATEGORIAS_METRICAS = {
  'ATAQUE': {
    icon: '⚽',
    color: 'from-red-900/30 to-red-900/10',
    borderColor: 'border-red-900/50',
    keywords: ['gol', 'finalização', 'toque na área', 'chances', 'xg', 'shot']
  },
  'DEFESA': {
    icon: '🛡️',
    color: 'from-blue-900/30 to-blue-900/10',
    borderColor: 'border-blue-900/50',
    keywords: ['desarme', 'interceptação', 'recuperação', 'bloqueio', 'falta', 'cartão']
  },
  'PASSES & CRIAÇÃO': {
    icon: '🪄',
    color: 'from-purple-900/30 to-purple-900/10',
    borderColor: 'border-purple-900/50',
    keywords: ['assistência', 'passe', 'cruzamento', 'decisivo', 'progressão', 'criação']
  },
  'POSSE & CONTROLE': {
    icon: '🎯',
    color: 'from-cyan-900/30 to-cyan-900/10',
    borderColor: 'border-cyan-900/50',
    keywords: ['posse', 'controle', 'toque', 'drible', 'condução']
  },
  'FÍSICO & DUELOS': {
    icon: '💪',
    color: 'from-yellow-900/30 to-yellow-900/10',
    borderColor: 'border-yellow-900/50',
    keywords: ['duelo', 'aceleração', 'velocidade', 'físico', 'corrida', 'distância']
  },
  'GERAL': {
    icon: '📊',
    color: 'from-slate-900/30 to-slate-900/10',
    borderColor: 'border-slate-900/50',
    keywords: ['minuto', 'index', 'rating', 'nota']
  }
};

function categorizarMetrica(metrica) {
  const metricaLower = metrica.toLowerCase();
  
  for (const [categoria, config] of Object.entries(CATEGORIAS_METRICAS)) {
    if (config.keywords.some(keyword => metricaLower.includes(keyword))) {
      return categoria;
    }
  }
  
  return 'GERAL';
}

function ListaPreferencialContent() {
  const router = useRouter();
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioBravo, setGremiBravo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [metricasSelecionadas, setMetricasSelecionadas] = useState([]);
  const [todasMetricas, setTodasMetricas] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  const colunasFixas = [
    'ID_ATLETA', 'Jogador', 'Time', 'Idade', 'Altura', 'Peso', 
    'Nacionalidade', 'Pé dominante', 'Index', 'Minutos jogados', 
    'Posição', 'Falhas em gol', 'Erros graves'
  ];

  const calcularPor90 = (valor, minutosJogados) => {
    const val = safeParseFloat(valor);
    const minutos = safeParseFloat(minutosJogados);
    
    if (minutos === 0 || minutos === '-' || val === '-') return 0;
    return (val / minutos) * 90;
  };

  const processarDados = (dados, aba) => {
    if (dados.length === 0) return [];

    const metricasReais = Object.keys(dados[0]).filter(
      k => !colunasFixas.includes(k) && k.trim() !== ''
    );

    return dados.map(jogador => {
      const minutosJogados = safeParseFloat(jogador['Minutos jogados']);
      
      const processado = {
        ...jogador,
        aba: aba,
        minutosJogados: minutosJogados,
      };

      metricasReais.forEach(metrica => {
        const chaveCalc = `${metrica}_por_90`;
        processado[chaveCalc] = calcularPor90(jogador[metrica], minutosJogados);
      });
      
      return processado;
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('metricasTemplate');
    if (saved) {
      try {
        setMetricasSelecionadas(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar template:', e);
      }
    }
  }, []);

  const salvarTemplate = () => {
    localStorage.setItem('metricasTemplate', JSON.stringify(metricasSelecionadas));
    alert('✅ Template de métricas salvo com sucesso!');
  };

  const toggleMetrica = (metrica) => {
    setMetricasSelecionadas(prev => {
      if (prev.includes(metrica)) {
        return prev.filter(m => m !== metrica);
      } else {
        return [...prev, metrica];
      }
    });
  };

  const toggleCategoryAll = (categoria) => {
    const metricasCategoria = todasMetricas.filter(m => categorizarMetrica(m) === categoria);
    const todasSelecionadas = metricasCategoria.every(m => metricasSelecionadas.includes(m));
    
    if (todasSelecionadas) {
      setMetricasSelecionadas(prev => prev.filter(m => !metricasCategoria.includes(m)));
    } else {
      setMetricasSelecionadas(prev => [
        ...prev,
        ...metricasCategoria.filter(m => !prev.includes(m))
      ]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlAba1 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=0&t=' + Date.now();
        const urlAba2 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=1236859817&t=' + Date.now();
        
        let listaProcessada = [];
        let gremioProcessada = [];
        let todasMetricasDetectadas = [];

        const response1 = await fetch(urlAba1);
        const csvText1 = await response1.text();
        
        Papa.parse(csvText1, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data);
            listaProcessada = processarDados(dadosLimpos, 'LISTA PREFERENCIAL');
            
            if (listaProcessada.length > 0) {
              todasMetricasDetectadas = Object.keys(listaProcessada[0]).filter(
                k => k.endsWith('_por_90')
              );
            }
            
            setListaPreferencial(listaProcessada);
            setTodasMetricas(todasMetricasDetectadas);

            if (metricasSelecionadas.length === 0 && todasMetricasDetectadas.length > 0) {
              setMetricasSelecionadas(todasMetricasDetectadas.slice(0, 3));
            }

            // Inicializar categorias expandidas
            const categoriesInit = {};
            Object.keys(CATEGORIAS_METRICAS).forEach(cat => {
              categoriesInit[cat] = true;
            });
            setExpandedCategories(categoriesInit);
          }
        });

        const response2 = await fetch(urlAba2);
        const csvText2 = await response2.text();
        
        Papa.parse(csvText2, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data);
            gremioProcessada = processarDados(dadosLimpos, 'GRÊMIO NOVORIZONTINO');
            setGremiBravo(gremioProcessada);
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const metricasPorCategoria = useMemo(() => {
    const grouped = {};
    Object.keys(CATEGORIAS_METRICAS).forEach(cat => {
      grouped[cat] = [];
    });
    
    todasMetricas.forEach(metrica => {
      const categoria = categorizarMetrica(metrica);
      grouped[categoria].push(metrica);
    });
    
    return grouped;
  }, [todasMetricas]);

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
      <div className="max-w-[1800px] mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <button 
            onClick={() => router.push('/central-scouting')}
            className="mb-4 p-2 hover:bg-slate-900 rounded-lg transition-all text-slate-400 hover:text-brand-yellow"
          >
            ← Voltar
          </button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-black italic uppercase text-brand-yellow mb-2">Lista Preferencial</h1>
              <p className="text-slate-400 font-bold">Comparação de Atletas - Métricas por 90 minutos</p>
            </div>
          </div>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-900/50 rounded-xl p-6">
            <p className="text-[11px] text-blue-300 uppercase font-black tracking-wider mb-2">Lista Preferencial</p>
            <p className="text-3xl font-black text-brand-yellow">{listaPreferencial.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-900/50 rounded-xl p-6">
            <p className="text-[11px] text-green-300 uppercase font-black tracking-wider mb-2">Grêmio Novorizontino</p>
            <p className="text-3xl font-black text-brand-yellow">{gremioBravo.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-900/50 rounded-xl p-6">
            <p className="text-[11px] text-purple-300 uppercase font-black tracking-wider mb-2">Selecionados</p>
            <p className="text-3xl font-black text-brand-yellow">{selectedPlayers.size}</p>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS - CATEGORIZADO */}
        {todasMetricas.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black uppercase italic text-brand-yellow">📊 Selecionar Métricas</h3>
              <button
                onClick={salvarTemplate}
                className="px-4 py-2 bg-brand-yellow text-black font-black uppercase text-[10px] rounded-lg hover:bg-yellow-500 transition-all"
              >
                💾 Salvar Template
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(metricasPorCategoria).map(([categoria, metricas]) => {
                if (metricas.length === 0) return null;
                
                const config = CATEGORIAS_METRICAS[categoria];
                const todasSelecionadas = metricas.every(m => metricasSelecionadas.includes(m));
                const algunaSelecionada = metricas.some(m => metricasSelecionadas.includes(m));

                return (
                  <div key={categoria} className={`bg-gradient-to-r ${config.color} border ${config.borderColor} rounded-xl overflow-hidden`}>
                    <button
                      onClick={() => setExpandedCategories(prev => ({ ...prev, [categoria]: !prev[categoria] }))}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div className="text-left">
                          <p className="font-black uppercase text-[12px] text-white">{categoria}</p>
                          <p className="text-[10px] text-slate-400">{metricas.length} métricas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={todasSelecionadas}
                          ref={el => {
                            if (el) el.indeterminate = algunaSelecionada && !todasSelecionadas;
                          }}
                          onChange={() => toggleCategoryAll(categoria)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 cursor-pointer"
                        />
                        <span className="text-brand-yellow font-black">{expandedCategories[categoria] ? '▼' : '▶'}</span>
                      </div>
                    </button>

                    {expandedCategories[categoria] && (
                      <div className="px-6 py-4 bg-black/20 border-t border-white/10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {metricas.map(metrica => (
                          <label key={metrica} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-all">
                            <input
                              type="checkbox"
                              checked={metricasSelecionadas.includes(metrica)}
                              onChange={() => toggleMetrica(metrica)}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-[11px] font-bold uppercase text-slate-200">
                              {metrica.replace('_por_90', '')}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 mb-8">
          <h3 className="text-lg font-black uppercase italic text-brand-yellow mb-6">🔍 Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-3">Tipo</label>
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
                    {type === 'todos' ? 'Todos' : type === 'lista' ? 'Lista' : 'Grêmio'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-3">Time</label>
              <input
                type="text"
                placeholder="Filtrar por time..."
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-yellow text-[12px]"
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
        <div className="bg-slate-900/30 rounded-2xl border border-slate-800 overflow-hidden mb-8">
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
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Pos</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Idade</th>
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Min</th>
                  {metricasSelecionadas.map(metrica => (
                    <th key={metrica} className="p-4 text-[10px] font-black uppercase text-slate-500 text-center whitespace-nowrap">
                      {metrica.replace('_por_90', '').substring(0, 10)}/90
                    </th>
                  ))}
                  <th className="p-4 text-[10px] font-black uppercase text-slate-500">Aba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {jogadoresFiltrados.map((jogador, idx) => (
                  <tr key={idx} className="hover:bg-brand-yellow/[0.03] transition-all border-b border-slate-800/20">
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedPlayers.has(idx)}
                        onChange={() => toggleSelect(idx)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-black text-white text-[12px]">{jogador['Jogador']}</td>
                    <td className="p-4 text-slate-400 text-[10px]">{jogador['Time']}</td>
                    <td className="p-4 text-slate-400 text-[10px]">{jogador['Posição']}</td>
                    <td className="p-4 text-slate-400 text-[10px]">{jogador['Idade']}</td>
                    <td className="p-4 text-slate-400 text-[10px]">{jogador['minutosJogados']}</td>
                    {metricasSelecionadas.map(metrica => (
                      <td key={metrica} className="p-4 text-brand-yellow font-black text-center text-[11px]">
                        {typeof jogador[metrica] === 'number' ? jogador[metrica].toFixed(2) : '-'}
                      </td>
                    ))}
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

        {jogadoresFiltrados.length === 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400 font-bold">Nenhum atleta encontrado com os filtros selecionados.</p>
          </div>
        )}

        {/* FOOTER INFO */}
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
