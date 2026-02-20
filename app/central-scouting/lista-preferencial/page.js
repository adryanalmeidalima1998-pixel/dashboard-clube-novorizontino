'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';

// Colunas fixas que NUNCA são métricas
const COLUNAS_FIXAS = [
  'ID_ATLETA', 'Jogador', 'Time', 'Idade', 'Altura', 'Peso', 
  'Nacionalidade', 'Pé dominante', 'Index', 'Minutos jogados', 
  'Posição', 'Falhas em gol', 'Erros graves'
];

// Categorização dinâmica com palavras-chave
const CATEGORIAS_METRICAS = {
  'ATAQUE': {
    keywords: ['gol', 'finalização', 'toque', 'área', 'chance', 'xg', 'shot', 'remate', 'chute', 'tentativa']
  },
  'DEFESA': {
    keywords: ['desarme', 'interceptação', 'recuperação', 'bloqueio', 'falta', 'cartão', 'defesa', 'roubo', 'corte']
  },
  'PASSES & CRIAÇÃO': {
    keywords: ['assistência', 'passe', 'cruzamento', 'decisivo', 'progressão', 'criação', 'através', 'bola']
  },
  'POSSE & CONTROLE': {
    keywords: ['posse', 'controle', 'toque', 'drible', 'condução', 'domínio', 'bola']
  },
  'FÍSICO & DUELOS': {
    keywords: ['duelo', 'aceleração', 'velocidade', 'físico', 'corrida', 'distância', 'sprint', 'ganho']
  },
  'GERAL': {
    keywords: []
  }
};

function categorizarMetrica(metrica) {
  const metricaLower = metrica.toLowerCase().trim();
  
  if (COLUNAS_FIXAS.some(col => col.toLowerCase() === metricaLower)) {
    return null;
  }
  
  for (const [categoria, config] of Object.entries(CATEGORIAS_METRICAS)) {
    if (categoria === 'GERAL') continue;
    
    if (config.keywords.some(keyword => metricaLower.includes(keyword))) {
      return categoria;
    }
  }
  
  return 'GERAL';
}

function ehNumerico(valor) {
  if (valor === null || valor === undefined || valor === '') return false;
  if (valor === '-') return false;
  const num = parseFloat(String(valor).replace(',', '.'));
  return !isNaN(num);
}

function ListaPreferencialContent() {
  const router = useRouter();
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioBravo, setGremiBravo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [metricasSelecionadas, setMetricasSelecionadas] = useState([]);
  const [todasMetricas, setTodasMetricas] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('ATAQUE');

  const calcularPor90 = (valor, minutosJogados) => {
    const val = safeParseFloat(valor);
    const minutos = safeParseFloat(minutosJogados);
    
    if (minutos === 0 || minutos === '-' || val === '-') return 0;
    return (val / minutos) * 90;
  };

  const processarDados = (dados, aba) => {
    if (dados.length === 0) return [];

    const primeiraLinha = dados[0];
    const metricasReais = Object.keys(primeiraLinha).filter(coluna => {
      if (COLUNAS_FIXAS.includes(coluna)) return false;
      if (!coluna || coluna.trim() === '') return false;
      const temNumerico = dados.some(d => ehNumerico(d[coluna]));
      return temNumerico;
    });

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
              todasMetricasDetectadas = Object.keys(listaProcessada[0])
                .filter(k => k.endsWith('_por_90'))
                .sort();
            }
            
            setListaPreferencial(listaProcessada);
            setTodasMetricas(todasMetricasDetectadas);

            const saved = localStorage.getItem('metricasTemplate');
            if (saved) {
              try {
                const metricas = JSON.parse(saved);
                setMetricasSelecionadas(metricas);
              } catch (e) {
                if (todasMetricasDetectadas.length > 0) {
                  setMetricasSelecionadas(todasMetricasDetectadas.slice(0, 5));
                }
              }
            } else if (todasMetricasDetectadas.length > 0) {
              setMetricasSelecionadas(todasMetricasDetectadas.slice(0, 5));
            }
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
      if (categoria) {
        grouped[categoria].push(metrica);
      }
    });
    
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort();
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

  const handleToggleMetrica = (metrica) => {
    if (metricasSelecionadas.includes(metrica)) {
      setMetricasSelecionadas(metricasSelecionadas.filter(m => m !== metrica));
    } else {
      if (metricasSelecionadas.length < 8) {
        setMetricasSelecionadas([...metricasSelecionadas, metrica]);
      }
    }
  };

  const salvarTemplate = () => {
    localStorage.setItem('metricasTemplate', JSON.stringify(metricasSelecionadas));
    alert('✅ Template de métricas salvo com sucesso!');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin"></div>
        <p className="text-brand-yellow font-black tracking-widest uppercase text-xs italic">Carregando...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/central-scouting')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">Lista <span className="text-brand-yellow">Preferencial</span></h1>
          <div className="flex-1 flex justify-end">
            <button 
              onClick={() => router.push('/central-scouting/lista-preferencial/radar-comparativo')}
              className="px-6 py-3 bg-brand-yellow text-black font-black uppercase text-[10px] rounded-xl hover:bg-yellow-500 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
              Relatórios Radar
            </button>
          </div>
        </div>

        {/* FILTROS PRINCIPAIS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Tipo</h3>
            <div className="flex gap-2">
              {['todos', 'lista', 'gremio'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`flex-1 px-3 py-2 rounded-lg font-black uppercase text-[9px] transition-all ${
                    filterType === type
                      ? 'bg-brand-yellow text-black'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-brand-yellow'
                  }`}
                >
                  {type === 'todos' ? 'Todos' : type === 'lista' ? 'Lista' : 'Grêmio'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Time</h3>
            <input
              type="text"
              placeholder="FILTRAR POR TIME..."
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50"
            />
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Estatísticas</h3>
            <div className="flex gap-3 text-center">
              <div className="flex-1">
                <p className="text-2xl font-black text-brand-yellow">{listaPreferencial.length}</p>
                <p className="text-[8px] text-slate-500 font-bold">LISTA</p>
              </div>
              <div className="flex-1">
                <p className="text-2xl font-black text-brand-yellow">{gremioBravo.length}</p>
                <p className="text-[8px] text-slate-500 font-bold">GRÊMIO</p>
              </div>
            </div>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS */}
        {todasMetricas.length > 0 && (
          <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 mb-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Escolher <span className="text-brand-yellow">Métricas</span></h2>
                <span className="px-3 py-1 bg-brand-yellow/10 text-brand-yellow rounded-full text-[10px] font-black">{metricasSelecionadas.length}/8</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(CATEGORIAS_METRICAS).map(cat => (
                  <button key={cat} onClick={() => setCategoriaAtiva(cat)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoriaAtiva === cat ? 'bg-brand-yellow text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-slate-950/50 text-slate-500 hover:text-white border border-slate-800'}`}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {metricasPorCategoria[categoriaAtiva].map(metrica => (
                <button key={metrica} onClick={() => handleToggleMetrica(metrica)} className={`group relative p-4 rounded-2xl border transition-all text-left overflow-hidden ${metricasSelecionadas.includes(metrica) ? 'bg-brand-yellow/10 border-brand-yellow/50 shadow-inner' : 'bg-slate-950/40 border-slate-800/50 hover:border-slate-700'}`}>
                  <div className={`text-[9px] font-black uppercase tracking-tight leading-tight transition-colors ${metricasSelecionadas.includes(metrica) ? 'text-brand-yellow' : 'text-slate-500 group-hover:text-slate-300'}`}>{metrica.replace('_por_90', '')}</div>
                  {metricasSelecionadas.includes(metrica) && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-yellow rounded-full shadow-[0_0_8px_#fbbf24]" />}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={salvarTemplate}
                className="px-6 py-2.5 bg-brand-yellow text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all"
              >
                💾 Salvar Template
              </button>
            </div>
          </div>
        )}

        {/* TABELA */}
        <div className="bg-slate-900/20 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50">
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Time</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Pos</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Idade</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Min</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-brand-yellow/80">{m.replace('_por_90', '')}</th>
                  ))}
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Aba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {jogadoresFiltrados.map((j, idx) => (
                  <tr key={idx} className="hover:bg-brand-yellow/[0.02] transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-700">{j.Jogador?.substring(0,2).toUpperCase()}</div>
                        <span className="text-sm font-black uppercase italic tracking-tighter">{j.Jogador}</span>
                      </div>
                    </td>
                    <td className="p-6"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{j.Time}</span></td>
                    <td className="p-6"><span className="px-3 py-1 bg-slate-950 rounded-lg text-[9px] font-black text-slate-500 border border-slate-800">{j.Posição}</span></td>
                    <td className="p-6"><span className="text-[10px] font-black">{j.Idade}</span></td>
                    <td className="p-6"><span className="text-[10px] font-black">{j.minutosJogados}</span></td>
                    {metricasSelecionadas.map(m => (
                      <td key={m} className="p-6 text-center"><span className="text-sm font-black italic tabular-nums">{typeof j[m] === 'number' ? j[m].toFixed(2) : '-'}</span></td>
                    ))}
                    <td className="p-6 text-center">
                      <span className={`px-2 py-1 rounded text-[9px] font-black ${
                        j.aba === 'GRÊMIO NOVORIZONTINO' 
                          ? 'bg-green-900/30 text-green-400' 
                          : 'bg-blue-900/30 text-blue-400'
                      }`}>
                        {j.aba === 'GRÊMIO NOVORIZONTINO' ? 'GN' : 'LP'}
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
