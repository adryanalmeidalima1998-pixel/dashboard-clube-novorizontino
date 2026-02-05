'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

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
  const [mostrarPainelMetricas, setMostrarPainelMetricas] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  const [categoriasMetricas, setCategoriasMetricas] = useState({})

  // Carregar dados do CSV
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv&t=' + Date.now())
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            setJogadores(dados)
            if (dados.length > 0) {
              setJogadorSelecionado(dados[0])
              const colunas = Object.keys(dados[0]).filter(col => col && col.trim() && !['Jogador', 'Time', 'Posição', 'Número', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '?', 'Liga', 'Temporada'].includes(col))
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

  const parseValue = (val) => {
    if (!val || val === '-' || val === 'nan' || val === '') return 0
    const clean = String(val).replace('%', '').replace(',', '.')
    const num = parseFloat(clean)
    return isNaN(num) ? 0 : num
  }

  const times = useMemo(() => ['Todas', ...new Set(jogadores.map(j => j.Time).filter(Boolean))].sort(), [jogadores])
  const posicoes = useMemo(() => [...new Set(jogadores.map(j => j.Posição).filter(Boolean))].sort(), [jogadores])

  const jogadoresFiltrados = useMemo(() => {
    return jogadores.filter(j => {
      const passaBusca = j.Jogador.toLowerCase().includes(busca.toLowerCase())
      const passaTime = filtroTime === 'Todas' || j.Time === filtroTime
      const passaPosicao = filtrosPosicao.length === 0 || filtrosPosicao.includes(j.Posição)
      return passaBusca && passaTime && passaPosicao
    })
  }, [jogadores, busca, filtroTime, filtrosPosicao])

  const mediaReferencia = useMemo(() => {
    if (!jogadorSelecionado) return {}
    const posParaMedia = posicaoReferencia === 'MESMA' ? jogadorSelecionado.Posição : posicaoReferencia
    const jogadoresParaMedia = posParaMedia === 'LIGA' 
      ? jogadores 
      : jogadores.filter(j => j.Posição === posParaMedia)
    
    const medias = {}
    metricasBenchmark.forEach(m => {
      const valores = jogadoresParaMedia.map(j => parseValue(j[m]))
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
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse italic">Calculando Benchmarks...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/central-dados')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
              Benchmark <span className="text-emerald-500">Performance</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Comparação Técnica com a Média da Liga</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SIDEBAR FILTROS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50 shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtros de Contexto</h3>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="BUSCAR ATLETA..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none"
                />
                <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none">
                  {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
                <div className="flex flex-wrap gap-1 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                  {posicoes.map(p => (
                    <button key={p} onClick={() => togglePosicao(p)} className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${filtrosPosicao.includes(p) ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50 shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Atletas ({jogadoresFiltrados.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {jogadoresFiltrados.map(j => (
                  <button 
                    key={j.Jogador}
                    onClick={() => setJogadorSelecionado(j)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border ${jogadorSelecionado?.Jogador === j.Jogador ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    <div className="font-black italic uppercase text-[11px] tracking-tighter">{j.Jogador}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">{j.Posição} • {j.Time}</div>
                  </button>
                ))}
                {jogadoresFiltrados.length === 0 && <p className="text-[10px] text-slate-600 font-black uppercase text-center py-8">Nenhum atleta encontrado</p>}
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="lg:col-span-3 space-y-6">
            {jogadorSelecionado && (
              <div className="bg-slate-900/40 backdrop-blur-md rounded-[3rem] p-10 border border-slate-800/50 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-950 rounded-[2rem] flex items-center justify-center border border-slate-800 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                      <span className="text-emerald-500 font-black italic text-2xl">{jogadorSelecionado.Jogador.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                        <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">Perfil de Benchmark</span>
                      </div>
                      <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">{jogadorSelecionado.Jogador}</h2>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">{jogadorSelecionado.Posição} • {jogadorSelecionado.Time}</p>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 min-w-[250px]">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-3">Comparar com Média de:</span>
                    <select 
                      value={posicaoReferencia} 
                      onChange={(e) => setPosicaoReferencia(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-emerald-500 font-black italic uppercase text-sm outline-none focus:border-emerald-500/50"
                    >
                      <option value="MESMA">MESMA POSIÇÃO ({jogadorSelecionado.Posição})</option>
                      <option value="LIGA">TODA A LIGA</option>
                      {posicoes.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Métricas de Performance</h3>
                  <button onClick={() => setMostrarPainelMetricas(true)} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Personalizar Métricas</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {metricasBenchmark.map(m => {
                    const valorAtleta = parseValue(jogadorSelecionado[m])
                    const valorMedia = mediaReferencia[m] || 0
                    const variacao = valorMedia === 0 ? 0 : ((valorAtleta - valorMedia) / valorMedia) * 100
                    const percentualBarra = Math.min(Math.max((valorAtleta / (valorMedia * 2 || 1)) * 50, 5), 100)

                    return (
                      <div key={m} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 group hover:border-emerald-500/30 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-all">{m}</span>
                          <span className={`text-[10px] font-black italic ${variacao >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {variacao >= 0 ? '+' : ''}{variacao.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-end justify-between mb-2">
                          <div className="text-2xl font-black italic text-white">{jogadorSelecionado[m] || '0'}</div>
                          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Média: {valorMedia.toFixed(2)}</div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${variacao >= 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}
                            style={{ width: `${percentualBarra}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL MÉTRICAS BENCHMARK */}
      {mostrarPainelMetricas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a0c10]/90 backdrop-blur-xl" onClick={() => setMostrarPainelMetricas(false)}></div>
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Métricas do Benchmark</h2>
              <button onClick={() => setMostrarPainelMetricas(false)} className="p-4 hover:bg-slate-800 rounded-2xl transition-all text-slate-500 hover:text-white">×</button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="flex gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
                {Object.keys(categoriasMetricas).map(cat => (
                  <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-6 py-3 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all border whitespace-nowrap ${abaAtiva === cat ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categoriasMetricas[abaAtiva]?.map(m => (
                  <button key={m} onClick={() => {
                    if (metricasBenchmark.includes(m)) setMetricasBenchmark(metricasBenchmark.filter(x => x !== m))
                    else setMetricasBenchmark([...metricasBenchmark, m])
                  }} className={`p-4 rounded-2xl text-left transition-all border text-[10px] font-black uppercase ${metricasBenchmark.includes(m) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-slate-800">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">Templates Salvos</h3>
                <div className="flex flex-wrap gap-3 mb-6">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setMetricasBenchmark(t.metricas)} className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-white">{t.nome}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="NOME DO TEMPLATE..." value={nomeNovoTemplate} onChange={(e) => setNomeNovoTemplate(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[9px] font-black uppercase outline-none focus:border-emerald-500/50" />
                  <button onClick={salvarTemplate} className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-[9px] font-black uppercase">Salvar Atual</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>
    </div>
  )
}
