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
  const [posicaoReferencia, setPosicaoReferencia] = useState(null) // NOVO: Posição para comparação
  const [todasAsMetricas, setTodasAsMetricas] = useState([])
  const [categoriasMetricas, setCategoriasMetricas] = useState({})
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  const [ligaSelecionada, setLigaSelecionada] = useState('Todas')
  const [temporadaSelecionada, setTemporadaSelecionada] = useState('Todas')
  
  const [mediasLiga, setMediasLiga] = useState({})
  const [ligas, setLigas] = useState([])
  const [temporadas, setTemporadas] = useState([])
  const [todasPosicoes, setTodasPosicoes] = useState([])

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv')
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
              setJogadores(dados)
              if (dados.length > 0) {
                setLigas(['Todas', ...new Set(dados.map(j => j.Liga).filter(Boolean))])
                setTemporadas(['Todas', ...new Set(dados.map(j => j.Temporada).filter(Boolean))])
                setTodasPosicoes([...new Set(dados.map(j => j.Posição).filter(Boolean))].sort())
                
                const colunas = Object.keys(dados[0]).filter(col => col && col.trim() && !['Jogador', 'Time', 'Posição', 'Número', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '?', 'Liga', 'Temporada'].includes(col))
                setTodasAsMetricas(colunas)
                setCategoriasMetricas(categorizarMetricas(colunas))
                calcularMedias(dados, colunas, 'Todas', 'Todas')
                
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

  useEffect(() => {
    if (jogadores.length > 0) {
      const colunas = Object.keys(jogadores[0]).filter(col => col && col.trim() && !['Jogador', 'Time', 'Posição', 'Número', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '?', 'Liga', 'Temporada'].includes(col))
      calcularMedias(jogadores, colunas, ligaSelecionada, temporadaSelecionada)
    }
  }, [ligaSelecionada, temporadaSelecionada, jogadores])

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

  const calcularMedias = (dados, metricas, liga, temporada) => {
    let dadosFiltrados = dados
    if (liga !== 'Todas') dadosFiltrados = dadosFiltrados.filter(j => j.Liga === liga)
    if (temporada !== 'Todas') dadosFiltrados = dadosFiltrados.filter(j => j.Temporada === temporada)
    const posicoes = [...new Set(dadosFiltrados.map(j => j.Posição).filter(Boolean))]
    const medias = {}
    posicoes.forEach(posicao => {
      medias[posicao] = {}
      const jogadoresPosicao = dadosFiltrados.filter(j => j.Posição === posicao)
      metricas.forEach(metrica => {
        const valores = jogadoresPosicao.map(j => parseValue(j[metrica])).filter(v => v > 0)
        medias[posicao][metrica] = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0
      })
    })
    setMediasLiga(medias)
  }

  const jogadorAtual = useMemo(() => {
    const j = jogadores.find(j => j.Jogador === jogadorSelecionado)
    if (j && !posicaoReferencia) setPosicaoReferencia(j.Posição)
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
                <select value={ligaSelecionada} onChange={(e) => setLigaSelecionada(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50">
                  {ligas.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={temporadaSelecionada} onChange={(e) => setTemporadaSelecionada(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50">
                  {temporadas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-6 border border-slate-800/50 shadow-2xl">
              <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6">Atletas</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {jogadores.map(j => (
                  <button key={j.Jogador} onClick={() => { setJogadorSelecionado(j.Jogador); setPosicaoReferencia(j.Posição); }} className={`w-full text-left p-4 rounded-2xl transition-all border ${jogadorSelecionado === j.Jogador ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'}`}>
                    <div className="font-black italic uppercase text-xs tracking-tighter">{j.Jogador}</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${jogadorSelecionado === j.Jogador ? 'text-slate-900' : 'text-slate-600'}`}>{j.Posição}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ÁREA DE ANÁLISE */}
          <div className="lg:col-span-3 space-y-8">
            {jogadorAtual && (
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
                  
                  {/* NOVO: Seletor de Posição de Referência */}
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
                    const val = parseValue(jogadorAtual[metrica])
                    const media = (mediasLiga[posicaoReferencia] && mediasLiga[posicaoReferencia][metrica]) || 0
                    const variacao = calcularVariacao(val, media)
                    const isPositive = variacao >= 0
                    return (
                      <div key={metrica} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 group hover:border-emerald-500/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest max-w-[150px] leading-tight">{metrica}</span>
                          <div className={`px-3 py-1 rounded-lg text-[10px] font-black italic ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isPositive ? '+' : ''}{variacao.toFixed(1)}%
                          </div>
                        </div>
                        <div className="flex items-end justify-between gap-4">
                          <div className="flex-grow">
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                              <span>Atleta: {val.toFixed(2)}</span>
                              <span>Média ({posicaoReferencia}): {media.toFixed(2)}</span>
                            </div>
                            <div className="h-2 bg-slate-900 rounded-full overflow-hidden flex">
                              <div className={`h-full transition-all duration-1000 ${isPositive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500/50'}`} style={{ width: `${Math.min(Math.max((val / (media || 1)) * 50, 5), 100)}%` }}></div>
                            </div>
                          </div>
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
    </div>
  )
}
