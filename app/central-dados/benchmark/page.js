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
  const [jogadorSelecionado, setJogadorSelecionado] = useState(null)
  const [todasAsMetricas, setTodasAsMetricas] = useState([])
  const [categoriasMetricas, setCategoriasMetricas] = useState({})
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  const [ligaSelecionada, setLigaSelecionada] = useState('Todas')
  const [temporadaSelecionada, setTemporadaSelecionada] = useState('Todas')
  
  // Dados calculados
  const [mediasLiga, setMediasLiga] = useState({})
  const [ligas, setLigas] = useState([])
  const [temporadas, setTemporadas] = useState([])

  // Carregar dados do CSV
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
                // Extrair ligas e temporadas únicas
                const ligasUnicas = ['Todas', ...new Set(dados.map(j => j.Liga).filter(Boolean))]
                const temporadasUnicas = ['Todas', ...new Set(dados.map(j => j.Temporada).filter(Boolean))]
                setLigas(ligasUnicas)
                setTemporadas(temporadasUnicas)
                
                const colunas = Object.keys(dados[0]).filter(col => 
                  col && col.trim() && !['Jogador', 'Time', 'Posição', 'Número', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '?', 'Liga', 'Temporada'].includes(col)
                )
                setTodasAsMetricas(colunas)
                const categorias = categorizarMetricas(colunas)
                setCategoriasMetricas(categorias)
                
                // Calcular médias por posição
                calcularMedias(dados, colunas, 'Todas', 'Todas')
                
                // Selecionar primeiro jogador por padrão
                if (dados.length > 0) {
                  setJogadorSelecionado(dados[0].Jogador)
                }
              }
              
              setCarregando(false)
            } catch (e) {
              console.error('Erro ao processar dados:', e)
              setErro('Erro ao processar dados do CSV')
              setCarregando(false)
            }
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

  // Recalcular médias quando filtros mudam
  useEffect(() => {
    if (jogadores.length > 0) {
      const colunas = Object.keys(jogadores[0]).filter(col => 
        col && col.trim() && !['Jogador', 'Time', 'Posição', 'Número', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '?', 'Liga', 'Temporada'].includes(col)
      )
      calcularMedias(jogadores, colunas, ligaSelecionada, temporadaSelecionada)
    }
  }, [ligaSelecionada, temporadaSelecionada, jogadores])

  const parseValue = (val) => {
    if (!val || val === '-' || val === 'nan' || val === '') return 0
    try {
      const clean = String(val).replace('%', '').replace(',', '.')
      const num = parseFloat(clean)
      return isNaN(num) ? 0 : num
    } catch {
      return 0
    }
  }

  const categorizarMetricas = (colunas) => {
    const categorias = {
      'Ataque': [],
      'Defesa': [],
      'Passes & Criação': [],
      'Posse & Controle': [],
      'Físico': [],
      'Geral': []
    }

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
          categorias[categoria].push(col)
          categorizado = true
          break
        }
      }

      if (!categorizado) {
        categorias['Geral'].push(col)
      }
    })

    return categorias
  }

  const calcularMedias = (dados, metricas, liga, temporada) => {
    // Filtrar dados com base em Liga e Temporada
    let dadosFiltrados = dados
    if (liga !== 'Todas') {
      dadosFiltrados = dadosFiltrados.filter(j => j.Liga === liga)
    }
    if (temporada !== 'Todas') {
      dadosFiltrados = dadosFiltrados.filter(j => j.Temporada === temporada)
    }

    const posicoes = [...new Set(dadosFiltrados.map(j => j.Posição).filter(Boolean))]
    const medias = {}

    posicoes.forEach(posicao => {
      medias[posicao] = {}
      const jogadoresPosicao = dadosFiltrados.filter(j => j.Posição === posicao)

      metricas.forEach(metrica => {
        const valores = jogadoresPosicao
          .map(j => parseValue(j[metrica]))
          .filter(v => v > 0)

        if (valores.length > 0) {
          medias[posicao][metrica] = valores.reduce((a, b) => a + b, 0) / valores.length
        } else {
          medias[posicao][metrica] = 0
        }
      })
    })

    setMediasLiga(medias)
  }

  const jogadorAtual = useMemo(() => {
    return jogadores.find(j => j.Jogador === jogadorSelecionado)
  }, [jogadores, jogadorSelecionado])

  const calcularVariacao = (valor, media) => {
    if (media === 0) return 0
    return ((valor - media) / media) * 100
  }

  const obterCor = (variacao) => {
    if (variacao > 10) return 'bg-emerald-900 border-emerald-500'
    if (variacao > 0) return 'bg-emerald-950 border-emerald-600'
    if (variacao > -10) return 'bg-red-950 border-red-600'
    return 'bg-red-900 border-red-500'
  }

  const obterCorBarra = (variacao) => {
    if (variacao > 10) return 'bg-emerald-500'
    if (variacao > 0) return 'bg-emerald-600'
    if (variacao > -10) return 'bg-red-600'
    return 'bg-red-500'
  }

  if (carregando) return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <span className="text-lg">Carregando dados de benchmark...</span>
      </div>
    </div>
  )

  if (erro) return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <span className="text-lg text-red-500">{erro}</span>
      </div>
    </div>
  )

  const metricasCategoria = categoriasMetricas[abaAtiva] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/central-dados')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold">Benchmark: Comparação com a Liga</h1>
            <p className="text-slate-400 text-sm">Análise de performance por posição, liga e temporada</p>
          </div>
        </div>

        {/* FILTROS DE LIGA E TEMPORADA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">Liga</label>
            <select 
              value={ligaSelecionada}
              onChange={(e) => setLigaSelecionada(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              {ligas.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">Temporada</label>
            <select 
              value={temporadaSelecionada}
              onChange={(e) => setTemporadaSelecionada(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            >
              {temporadas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* SELETOR DE JOGADOR */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 sticky top-6">
              <h2 className="text-lg font-bold text-white mb-4">Selecionar Jogador</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {jogadores.map(j => (
                  <button
                    key={j.Jogador}
                    onClick={() => setJogadorSelecionado(j.Jogador)}
                    className={`w-full text-left p-3 rounded-lg transition-colors border ${
                      jogadorSelecionado === j.Jogador
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-700 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm">{j.Jogador}</div>
                    <div className="text-xs text-slate-400">{j.Posição} • {j.Time}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ANÁLISE DE BENCHMARK */}
          <div className="lg:col-span-3">
            {jogadorAtual && mediasLiga[jogadorAtual.Posição] && (
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">{jogadorAtual.Jogador}</h2>
                  <div className="flex gap-4 text-sm flex-wrap">
                    <span className="text-slate-400">Posição: <span className="text-emerald-400 font-bold">{jogadorAtual.Posição}</span></span>
                    <span className="text-slate-400">Time: <span className="text-emerald-400 font-bold">{jogadorAtual.Time}</span></span>
                    {jogadorAtual.Liga && <span className="text-slate-400">Liga: <span className="text-blue-400 font-bold">{jogadorAtual.Liga}</span></span>}
                    {jogadorAtual.Temporada && <span className="text-slate-400">Temporada: <span className="text-blue-400 font-bold">{jogadorAtual.Temporada}</span></span>}
                  </div>
                </div>

                {/* ABAS DE CATEGORIAS */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {Object.keys(categoriasMetricas).map(aba => (
                    <button 
                      key={aba}
                      onClick={() => setAbaAtiva(aba)}
                      className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${
                        abaAtiva === aba 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      {aba} ({categoriasMetricas[aba]?.length || 0})
                    </button>
                  ))}
                </div>

                {/* GRID DE MÉTRICAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {metricasCategoria.map(metrica => {
                    const valorJogador = parseValue(jogadorAtual[metrica])
                    const mediaLiga = mediasLiga[jogadorAtual.Posição][metrica] || 0
                    const variacao = calcularVariacao(valorJogador, mediaLiga)
                    const acimaDaMedia = variacao > 0

                    return (
                      <div key={metrica} className={`p-4 rounded-lg border ${obterCor(variacao)}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-slate-300">{metrica}</span>
                          <span className={`text-xs font-bold ${acimaDaMedia ? 'text-emerald-400' : 'text-red-400'}`}>
                            {variacao > 0 ? '+' : ''}{variacao.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex gap-2 items-center mb-2">
                          <span className="text-sm font-bold text-white">{valorJogador.toFixed(2)}</span>
                          <span className="text-xs text-slate-400">vs {mediaLiga.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full ${obterCorBarra(variacao)} transition-all`}
                            style={{ width: `${Math.min(Math.abs(variacao), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {metricasCategoria.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    Nenhuma métrica disponível nesta categoria
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* LEGENDA */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">Como Ler o Benchmark</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="font-bold">Acima da Média</span>
              </div>
              <p className="text-sm text-slate-400">O jogador performa melhor que a média de sua posição na liga/temporada selecionada</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="font-bold">Abaixo da Média</span>
              </div>
              <p className="text-sm text-slate-400">O jogador performa pior que a média de sua posição na liga/temporada selecionada</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-slate-500 rounded"></div>
                <span className="font-bold">Percentual (%)</span>
              </div>
              <p className="text-sm text-slate-400">Quanto o jogador está acima ou abaixo da média em percentual</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
