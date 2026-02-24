'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { cleanData, normalizeTeamName, safeParseFloat } from '../../utils/dataCleaner'

import { sheetUrl } from '../../datasources'
const CSV_URL = sheetUrl('CENTRAL_DADOS', false)

export default function BenchmarkPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('Todas')
  const [filtrosPosicao, setFiltrosPosicao] = useState([])
  const [jogadorSelecionado, setJogadorSelecionado] = useState(null)
  const [posicaoReferencia, setPosicaoReferencia] = useState('MESMA')

  // Métricas e Templates
  const [metricasBenchmark, setMetricasBenchmark] = useState(['Gols', 'Assistências', 'Passes precisos %', 'Dribles', 'Desafios vencidos, %', 'Interceptações'])
  const [templates, setTemplates] = useState([])
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  const [categoriasMetricas, setCategoriasMetricas] = useState({})

  // Carregar dados do CSV
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data).map(j => ({
              ...j,
              Time: normalizeTeamName(j.Time || j.Equipe || ''),
              Posição: (j.Posição || '').trim().toUpperCase()
            }))
            setJogadores(dadosLimpos)
            if (dadosLimpos.length > 0) {
              setJogadorSelecionado(dadosLimpos[0])
              const colunas = Object.keys(dadosLimpos[0]).filter(col => col && col.trim() && !['Jogador', 'Time', 'Equipe', 'Posição', 'Número', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '?', 'Liga', 'Temporada', '№'].includes(col))
              setCategoriasMetricas(categorizarMetricas(colunas))
            }
            setCarregando(false)
          },
          error: (error) => {
            console.error('Erro ao parsear CSV:', error)
            setErro('Erro ao carregar dados do CSV')
            setCarregando(false)
          }
        })
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        setErro('Erro ao conectar com a planilha')
        setCarregando(false)
      }
    }

    carregarDados()
  }, [])

  // Templates LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('benchmarkTemplates')
    if (saved) setTemplates(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('benchmarkTemplates', JSON.stringify(templates))
  }, [templates])

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Ataque': [], 'Defesa': [], 'Passes & Criação': [], 'Posse & Controle': [], 'Físico & Duelos': [], 'Geral': [] }
    const palavrasChave = {
      'Ataque': ['gol', 'finalização', 'chute', 'xg', 'chance', 'header', 'entradas no terço'],
      'Defesa': ['desarme', 'interceptação', 'disputa', 'defesa', 'cartão', 'falta sofrida', 'erro grave'],
      'Passes & Criação': ['passe', 'cruzamento', 'chave', 'progressivo', 'assistência', 'nxg', 'xa'],
      'Posse & Controle': ['drible', 'controle', 'perda', 'bola', 'recuperada', 'posse'],
      'Físico & Duelos': ['minuto', 'duelo', 'disputa aérea', 'impedimento', 'escalação', 'substituído']
    }
    colunas.forEach(metrica => {
      const metricaLower = metrica.toLowerCase()
      let categorizado = false
      for (const [cat, palavras] of Object.entries(palavrasChave)) {
        if (palavras.some(p => metricaLower.includes(p))) {
          categorias[cat].push(metrica); categorizado = true; break
        }
      }
      if (!categorizado) categorias['Geral'].push(metrica)
    })
    return categorias
  }

  const times = useMemo(() => {
    const uniqueTimes = new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean));
    return ['Todas', ...Array.from(uniqueTimes).sort()];
  }, [jogadores])

  const posicoes = useMemo(() => {
    const uniquePos = new Set(jogadores.map(j => (j.Posição || '').trim().toUpperCase()).filter(Boolean));
    return Array.from(uniquePos).sort();
  }, [jogadores])

  // LÓGICA DE FILTRAGEM CORRIGIDA E BLINDADA
  const jogadoresFiltrados = useMemo(() => {
    return jogadores.filter(j => {
      // 1. Filtro de Time (Comparação exata)
      const timeAtleta = (j.Time || j.Equipe || '').trim();
      if (filtroTime !== 'Todas' && timeAtleta !== filtroTime) return false;

      // 2. Filtro de Posição (Normalizado e Blindado)
      if (filtrosPosicao.length > 0) {
        const posJ = (j.Posição || '').trim().toUpperCase();
        if (!filtrosPosicao.includes(posJ)) return false;
      }

      // 3. Busca por nome
      const nomeAtleta = (j.Jogador || '').trim();
      if (busca && !nomeAtleta.toLowerCase().includes(busca.toLowerCase())) return false;

      return true;
    });
  }, [jogadores, busca, filtroTime, filtrosPosicao])

  const mediaReferencia = useMemo(() => {
    if (!jogadorSelecionado) return {}
    const posParaMedia = posicaoReferencia === 'MESMA' ? (jogadorSelecionado.Posição || '').trim().toUpperCase() : posicaoReferencia
    const jogadoresParaMedia = posParaMedia === 'LIGA' 
      ? jogadores 
      : jogadores.filter(j => (j.Posição || '').trim().toUpperCase() === posParaMedia)
    
    const medias = {}
    metricasBenchmark.forEach(m => {
      const valores = jogadoresParaMedia.map(j => safeParseFloat(j[m]))
      medias[m] = valores.reduce((a, b) => a + b, 0) / (valores.length || 1)
    })
    return medias
  }, [jogadores, jogadorSelecionado, posicaoReferencia, metricasBenchmark])

  const togglePosicao = (pos) => {
    setFiltrosPosicao(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos])
  }

  const salvarTemplate = () => {
    if (!nomeNovoTemplate.trim()) return
    setTemplates([...templates, { id: Date.now(), nome: nomeNovoTemplate, metricas: [...metricasBenchmark] }])
    setNomeNovoTemplate('')
  }

  if (carregando) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse italic">Calculando Benchmarks...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/central-dados')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
              Benchmark <span className="text-brand-yellow">Performance</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Comparação Técnica com a Média da Liga</p>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS NO TOPO */}
        <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Configurar <span className="text-brand-yellow">Benchmark</span></h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="NOME DO TEMPLATE..." 
                  value={nomeNovoTemplate} 
                  onChange={e => setNomeNovoTemplate(e.target.value)} 
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-brand-yellow/50"
                />
                <button onClick={salvarTemplate} className="bg-brand-yellow text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-brand-yellow/80 transition-all">Salvar</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 mb-1">
                <button 
                  onClick={() => setMetricasBenchmark([])}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-brand-yellow transition-colors ml-1"
                >
                  [ Desmarcar Tudo ]
                </button>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar flex-1">
                  {Object.keys(categoriasMetricas).map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setAbaAtiva(cat)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === cat ? 'bg-brand-yellow text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {cat}
                  </button>
                ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setMetricasBenchmark(t.metricas)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[8px] font-black uppercase text-slate-400 hover:text-brand-yellow hover:border-brand-yellow/50 transition-all"
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categoriasMetricas[abaAtiva]?.map(metrica => (
              <button 
                key={metrica}
                onClick={() => {
                  if (metricasBenchmark.includes(metrica)) setMetricasBenchmark(metricasBenchmark.filter(m => m !== metrica))
                  else setMetricasBenchmark([...metricasBenchmark, metrica])
                }}
                className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group ${metricasBenchmark.includes(metrica) ? 'bg-brand-yellow/10 border-brand-yellow text-brand-yellow' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-600'}`}
              >
                <span className="truncate mr-2">{metrica}</span>
                {metricasBenchmark.includes(metrica) && <div className="w-2 h-2 bg-brand-yellow rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* PAINEL DE FILTROS E LISTA */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800/50 shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Seleção de Atleta</h3>
              
              <div className="space-y-4 mb-6">
                <input 
                  type="text" 
                  placeholder="BUSCAR NOME..." 
                  value={busca} 
                  onChange={e => setBusca(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-brand-yellow/50"
                />
                <select 
                  value={filtroTime} 
                  onChange={e => setFiltroTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-brand-yellow/50"
                >
                  {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="flex flex-wrap gap-1 mb-8">
                {posicoes.map(p => (
                  <button 
                    key={p} 
                    onClick={() => togglePosicao(p)}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${filtrosPosicao.includes(p) ? 'bg-brand-yellow text-slate-950 border-brand-yellow' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {jogadoresFiltrados.map(j => (
                  <button 
                    key={`${j.Jogador}-${j.Time}`}
                    onClick={() => setJogadorSelecionado(j)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${jogadorSelecionado?.Jogador === j.Jogador ? 'bg-brand-yellow border-brand-yellow shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}
                  >
                    <div>
                      <div className={`text-[10px] font-black uppercase italic ${jogadorSelecionado?.Jogador === j.Jogador ? 'text-slate-950' : 'text-white'}`}>{j.Jogador}</div>
                      <div className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${jogadorSelecionado?.Jogador === j.Jogador ? 'text-slate-800' : 'text-slate-500'}`}>{j.Posição} • {j.Time}</div>
                    </div>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${jogadorSelecionado?.Jogador === j.Jogador ? 'bg-slate-950/20' : 'bg-slate-900 border border-slate-800'}`}>
                      <svg className={`w-3 h-3 ${jogadorSelecionado?.Jogador === j.Jogador ? 'text-slate-950' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PAINEL DE BENCHMARK */}
          <div className="lg:col-span-8 space-y-8">
            {jogadorSelecionado && (
              <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-800/50 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-yellow/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 relative z-10">
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-slate-950 rounded-3xl border-2 border-brand-yellow/30 flex items-center justify-center text-3xl font-black italic text-brand-yellow shadow-2xl">
                      {jogadorSelecionado.Jogador.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none mb-2">{jogadorSelecionado.Jogador}</h2>
                      <div className="flex items-center gap-4">
                        <span className="text-brand-yellow text-[10px] font-black uppercase tracking-[0.2em]">{jogadorSelecionado.Posição}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{jogadorSelecionado.Time}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-950/80 backdrop-blur-md p-2 rounded-2xl border border-slate-800 flex gap-1">
                    {['MESMA', 'LIGA'].map(p => (
                      <button 
                        key={p} 
                        onClick={() => setPosicaoReferencia(p)}
                        className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${posicaoReferencia === p ? 'bg-brand-yellow text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {p === 'MESMA' ? 'Média Posição' : 'Média Liga'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
                  {metricasBenchmark.map(m => {
                    const valAtleta = safeParseFloat(jogadorSelecionado[m])
                    const valMedia = mediaReferencia[m] || 0
                    const diff = valMedia === 0 ? (valAtleta > 0 ? 100 : 0) : ((valAtleta - valMedia) / valMedia) * 100
                    const isPositive = diff >= 0
                    
                    return (
                      <div key={m} className="group">
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-brand-yellow transition-colors">{m}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black italic text-white">{valAtleta.toLocaleString()}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                              {isPositive ? '+' : ''}{diff.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5 shadow-inner">
                          <div className="relative h-full w-full">
                            {/* Média da Liga (Marcador) */}
                            <div 
                              className="absolute top-0 h-full w-1 bg-white/30 z-20 rounded-full"
                              style={{ left: '50%' }}
                            ></div>
                            {/* Barra do Atleta */}
                            <div 
                              className={`absolute top-0 h-full rounded-full transition-all duration-1000 ${isPositive ? 'bg-brand-yellow shadow-[0_0_10px_rgba(251,191,36,0.4)]' : 'bg-slate-700'}`}
                              style={{ 
                                left: isPositive ? '50%' : `${Math.max(0, 50 + diff/2)}%`,
                                width: `${Math.min(50, Math.abs(diff/2))}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 px-1">
                          <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Abaixo da Média</span>
                          <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Acima da Média</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {metricasBenchmark.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[2rem]">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] italic">Selecione métricas no painel superior para comparar</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fbbf24; }
      `}</style>
    </div>
  )
}
