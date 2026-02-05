'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

export default function BenchmarkPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  
  const [jogadorSelecionado, setJogadorSelecionado] = useState(null)
  const [posicaoReferencia, setPosicaoReferencia] = useState(null)
  const [categoriasMetricas, setCategoriasMetricas] = useState({})
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  
  // Filtros de Contexto
  const [filtroTime, setFiltroTime] = useState('Todas')
  const [filtroPosicao, setFiltroPosicao] = useState('Todas')
  const [busca, setBusca] = useState('')
  
  const [mediasLiga, setMediasLiga] = useState({})
  const [times, setTimes] = useState([])
  const [posicoes, setPosicoes] = useState([])
  const [todasPosicoes, setTodasPosicoes] = useState([])

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv&t=' + Date.now())
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
              setJogadores(dados)
              if (dados.length > 0) {
                setTimes(['Todas', ...new Set(dados.map(j => j.Time).filter(Boolean))].sort())
                setPosicoes(['Todas', ...new Set(dados.map(j => j.Posição).filter(Boolean))].sort())
                setTodasPosicoes([...new Set(dados.map(j => j.Posição).filter(Boolean))].sort())
                
                const colunas = Object.keys(dados[0]).filter(col => col && col.trim() && !['Jogador', 'Time', 'Posição', 'Número', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '?', 'Liga', 'Temporada'].includes(col))
                setCategoriasMetricas(categorizarMetricas(colunas))
                calcularMedias(dados, colunas)
                
                if (dados[0]) {
                  setJogadorSelecionado(dados[0].Jogador)
                  setPosicaoReferencia(dados[0].Posição)
                }
              }
              setCarregando(false)
            } catch (e) {
              setErro('Erro ao processar dados do CSV')
              setCarregando(false)
            }
          },
          error: () => {
            setErro('Erro ao carregar dados do CSV')
            setCarregando(false)
          }
        })
      } catch (error) {
        setErro('Erro ao conectar com a planilha')
        setCarregando(false)
      }
    }
    carregarDados()
  }, [])

  const parseValue = (val) => {
    if (!val || val === '-' || val === 'nan' || val === '') return 0
    const clean = String(val).replace('%', '').replace(',', '.')
    const num = parseFloat(clean)
    return isNaN(num) ? 0 : num
  }

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Ataque': [], 'Defesa': [], 'Passes & Criação': [], 'Posse & Controle': [], 'Físico': [], 'Geral': [] }
    const palavrasChave = {
      'Ataque': ['gol', 'finalização', 'chute', 'xg', 'chance', 'header', 'entradas no terço'],
      'Defesa': ['desarme', 'interceptação', 'disputa', 'defesa', 'cartão', 'falta sofrida', 'erro grave'],
      'Passes & Criação': ['passe', 'cruzamento', 'chave', 'progressivo', 'assistência', 'nxg', 'xa'],
      'Posse & Controle': ['drible', 'controle', 'perda', 'bola', 'recuperada', 'posse'],
      'Físico': ['minuto', 'duelo', 'disputa aérea', 'impedimento', 'escalação', 'substituído']
    }
    colunas.forEach(col => {
      const colLower = col.toLowerCase()
      let categorizado = false
      for (const [categoria, palavras] of Object.entries(palavrasChave)) {
        if (palavras.some(p => colLower.includes(p))) {
          categorias[categoria].push(col); categorizado = true; break
        }
      }
      if (!categorizado) categorias['Geral'].push(col)
    })
    return categorias
  }

  const calcularMedias = (dados, metricas) => {
    const posicoesUnicas = [...new Set(dados.map(j => j.Posição).filter(Boolean))]
    const medias = {}
    posicoesUnicas.forEach(posicao => {
      medias[posicao] = {}
      const jogadoresPosicao = dados.filter(j => j.Posição === posicao)
      metricas.forEach(metrica => {
        const valores = jogadoresPosicao.map(j => parseValue(j[metrica])).filter(v => v > 0)
        medias[posicao][metrica] = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0
      })
    })
    setMediasLiga(medias)
  }

  const jogadoresFiltrados = useMemo(() => {
    return jogadores.filter(j => {
      const passaBusca = j.Jogador.toLowerCase().includes(busca.toLowerCase())
      const passaTime = filtroTime === 'Todas' || j.Time === filtroTime
      const passaPosicao = filtroPosicao === 'Todas' || j.Posição === filtroPosicao
      return passaBusca && passaTime && passaPosicao
    })
  }, [jogadores, busca, filtroTime, filtroPosicao])

  const jogadorAtual = useMemo(() => {
    const j = jogadores.find(j => j.Jogador === jogadorSelecionado)
    return j
  }, [jogadores, jogadorSelecionado])

  const calcularVariacao = (valor, media) => media === 0 ? 0 : ((valor - media) / media) * 100

  if (carregando) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse italic">Calculando Benchmark...</span>
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
          
          {/* SELETOR LATERAL */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-6 border border-slate-800/50 shadow-2xl">
              <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6">Filtros de Contexto</h2>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="BUSCAR ATLETA..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none"
                />
                <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50">
                  {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
                <select value={filtroPosicao} onChange={(e) => setFiltroPosicao(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50">
                  {posicoes.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-6 border border-slate-800/50 shadow-2xl">
              <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6">Atletas ({jogadoresFiltrados.length})</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {jogadoresFiltrados.map(j => (
                  <button key={j.Jogador} onClick={() => { setJogadorSelecionado(j.Jogador); setPosicaoReferencia(j.Posição); }} className={`w-full text-left p-4 rounded-2xl transition-all border ${jogadorSelecionado === j.Jogador ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'}`}>
                    <div className="font-black italic uppercase text-xs tracking-tighter">{j.Jogador}</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${jogadorSelecionado === j.Jogador ? 'text-slate-900' : 'text-slate-600'}`}>{j.Time} • {j.Posição}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ÁREA DE ANÁLISE */}
          <div className="lg:col-span-3 space-y-8">
            {jogadorAtual ? (
              <div className="bg-slate-900/40 backdrop-blur-md rounded-[3rem] p-10 border border-slate-800/50 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-8 border-b border-slate-800/50">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                      <h2 className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em]">Perfil de Benchmark</h2>
                    </div>
                    <h3 className="text-5xl font-black italic uppercase tracking-tighter text-white">{jogadorAtual.Jogador}</h3>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">{jogadorAtual.Posição} • {jogadorAtual.Time}</p>
                  </div>
                  
                  <div className="bg-slate-950 px-6 py-4 rounded-2xl border border-slate-800 text-center min-w-[200px]">
                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">Comparar com Média de:</span>
                    <select 
                      value={posicaoReferencia || ''} 
                      onChange={(e) => setPosicaoReferencia(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-emerald-500 font-black italic uppercase text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500/50 w-full text-center"
                    >
                      {todasPosicoes.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 mb-10 overflow-x-auto pb-2">
                  {Object.keys(categoriasMetricas).map(cat => (
                    <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-6 py-3 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all border ${abaAtiva === cat ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categoriasMetricas[abaAtiva]?.map(metrica => {
                    const valorAtleta = parseValue(jogadorAtual[metrica])
                    const mediaPosicao = mediasLiga[posicaoReferencia]?.[metrica] || 0
                    const variacao = calcularVariacao(valorAtleta, mediaPosicao)
                    
                    return (
                      <div key={metrica} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 group hover:border-emerald-500/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{metrica}</span>
                          <span className={`text-[10px] font-black italic ${variacao >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {variacao >= 0 ? '+' : ''}{variacao.toFixed(1)}%
                          </span>
                        </div>
                        
                        <div className="flex items-end justify-between gap-4 mb-2">
                          <div className="flex-grow">
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${variacao >= 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}
                                style={{ width: `${Math.min(Math.max((valorAtleta / (mediaPosicao * 2 || 1)) * 100, 5), 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                          <span className="text-white">Atleta: {valorAtleta.toFixed(2)}</span>
                          <span className="text-slate-600">Média ({posicaoReferencia}): {mediaPosicao.toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/40 backdrop-blur-md rounded-[3rem] p-20 border border-slate-800/50 text-center">
                <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800 mx-auto mb-6">
                  <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-500">Selecione um Atleta</h3>
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-2">Utilize os filtros laterais para encontrar o perfil desejado</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>
    </div>
  )
}
