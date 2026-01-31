'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Chart as ChartJS,
  RadarController,
  ScatterController,
  LineController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import { Radar, Scatter } from 'react-chartjs-2'
import Papa from 'papaparse'

ChartJS.register(
  RadarController,
  ScatterController,
  LineController,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const CORES_JOGADORES = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
]

export default function GraficosPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  
  // Filtros Radar
  const [filtroTimeRadar, setFiltroTimeRadar] = useState('Todos')
  const [filtroPosicaoRadar, setFiltroPosicaoRadar] = useState('Todos')
  const [jogadoresSelecionadosRadar, setJogadoresSelecionadosRadar] = useState([])
  const [metricasRadar, setMetricasRadar] = useState(['Gols', 'Passes precisos %', 'Dribles', 'Desafios vencidos, %', 'Interceptações'])
  
  // Filtros Dispersão
  const [filtroPosicaoDispersa, setFiltroPosicaoDispersa] = useState('Todos')
  const [jogadoresSelecionadosDispersa, setJogadoresSelecionadosDispersa] = useState([])
  const [metricaXDispersa, setMetricaXDispersa] = useState('Minutos jogados')
  const [metricaYDispersa, setMetricaYDispersa] = useState('Gols')

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
                setJogadoresSelecionadosRadar([dados[0].Jogador])
                setJogadoresSelecionadosDispersa([dados[0].Jogador])
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

  // Normalizar métrica para escala 0.0-2.0 baseado na média do elenco
  const normalizarMetrica = (valor, metrica) => {
    const valores = jogadores
      .map(j => parseValue(j[metrica]))
      .filter(v => v > 0)
    
    if (valores.length === 0) return 1.0
    
    const media = valores.reduce((a, b) => a + b, 0) / valores.length
    
    if (media === 0) return 1.0
    
    // Normalizar para 0.0-2.0 onde 1.0 é a média
    const normalizado = (valor / media)
    // Limitar a 2.0 no máximo
    return Math.min(normalizado, 2.0)
  }

  // Obter lista de times e posições únicas
  const times = useMemo(() => {
    const unique = ['Todos', ...new Set(jogadores.map(j => j.Time).filter(Boolean))]
    return unique
  }, [jogadores])

  const posicoes = useMemo(() => {
    const unique = ['Todos', ...new Set(jogadores.map(j => j.Posição).filter(Boolean))]
    return unique
  }, [jogadores])

  // Obter lista de todas as métricas disponíveis
  const todasAsMetricas = useMemo(() => {
    if (jogadores.length === 0) return []
    const metricas = Object.keys(jogadores[0]).filter(k => 
      k !== 'Jogador' && k !== 'Time' && k !== 'Posição' && k !== 'Número'
    )
    return metricas.sort()
  }, [jogadores])

  // Filtrar jogadores para Radar
  const jogadoresFiltradosRadar = useMemo(() => {
    return jogadores.filter(j => {
      const filtroTime = filtroTimeRadar === 'Todos' || j.Time === filtroTimeRadar
      const filtroPosicao = filtroPosicaoRadar === 'Todos' || j.Posição === filtroPosicaoRadar
      return filtroTime && filtroPosicao
    })
  }, [jogadores, filtroTimeRadar, filtroPosicaoRadar])

  // Filtrar jogadores para Dispersão
  const jogadoresFiltradosDispersa = useMemo(() => {
    return jogadores.filter(j => {
      const filtroPosicao = filtroPosicaoDispersa === 'Todos' || j.Posição === filtroPosicaoDispersa
      return filtroPosicao
    })
  }, [jogadores, filtroPosicaoDispersa])

  // Dados para o Gráfico de Radar (COM NORMALIZAÇÃO)
  const radarData = useMemo(() => {
    if (jogadoresSelecionadosRadar.length === 0 || metricasRadar.length === 0) return null

    try {
      const datasets = jogadoresSelecionadosRadar.map((nomeJogador, idx) => {
        const jogador = jogadores.find(j => j.Jogador === nomeJogador)
        if (!jogador) return null

        return {
          label: jogador.Jogador,
          data: metricasRadar.map(metrica => normalizarMetrica(parseValue(jogador[metrica]), metrica)),
          borderColor: CORES_JOGADORES[idx % CORES_JOGADORES.length],
          backgroundColor: CORES_JOGADORES[idx % CORES_JOGADORES.length] + '20',
          borderWidth: 2,
          pointBackgroundColor: CORES_JOGADORES[idx % CORES_JOGADORES.length],
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      }).filter(Boolean)

      return {
        labels: metricasRadar,
        datasets
      }
    } catch (e) {
      console.error('Erro ao gerar dados do radar:', e)
      return null
    }
  }, [jogadores, jogadoresSelecionadosRadar, metricasRadar])

  // Dados para o Gráfico de Dispersão
  const scatterData = useMemo(() => {
    try {
      const jogadoresParaMostrar = jogadoresSelecionadosDispersa.length > 0 
        ? jogadores.filter(j => jogadoresSelecionadosDispersa.includes(j.Jogador))
        : jogadoresFiltradosDispersa

      const pontos = jogadoresParaMostrar
        .map((j, idx) => ({
          x: parseValue(j[metricaXDispersa]),
          y: parseValue(j[metricaYDispersa]),
          jogador: j.Jogador,
          cor: CORES_JOGADORES[idx % CORES_JOGADORES.length]
        }))
        .filter(p => p.x >= 0 && p.y >= 0 && p.jogador)

      return {
        datasets: [
          {
            label: `${metricaXDispersa} vs ${metricaYDispersa}`,
            data: pontos,
            backgroundColor: pontos.map(p => p.cor + 'cc'),
            borderColor: pontos.map(p => p.cor),
            borderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 9
          }
        ]
      }
    } catch (e) {
      console.error('Erro ao gerar dados de dispersão:', e)
      return { datasets: [] }
    }
  }, [jogadores, jogadoresSelecionadosDispersa, jogadoresFiltradosDispersa, metricaXDispersa, metricaYDispersa])

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#e2e8f0',
          font: { size: 12 },
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        borderColor: '#10b981',
        borderWidth: 1,
        padding: 10
      },
      datalabels: {
        display: false
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 2.0,
        min: 0,
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          stepSize: 0.5,
          callback: function(value) {
            if (value === 1.0) return 'Média (1.0)'
            return value.toFixed(1)
          }
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        },
        pointLabels: {
          color: '#cbd5e1',
          font: { size: 11, weight: 'bold' }
        }
      }
    }
  }

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#e2e8f0',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        borderColor: '#10b981',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function(context) {
            try {
              return `${context.raw.jogador}: (${context.raw.x.toFixed(2)}, ${context.raw.y.toFixed(2)})`
            } catch {
              return 'Dados indisponíveis'
            }
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: metricaXDispersa,
          color: '#cbd5e1',
          font: { size: 12, weight: 'bold' }
        },
        ticks: {
          color: '#94a3b8'
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        }
      },
      y: {
        title: {
          display: true,
          text: metricaYDispersa,
          color: '#cbd5e1',
          font: { size: 12, weight: 'bold' }
        },
        ticks: {
          color: '#94a3b8'
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        }
      }
    }
  }

  if (carregando) return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <span className="text-lg">Carregando gráficos...</span>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/central-dados')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold">Análise Gráfica Avançada</h1>
            <p className="text-slate-400 text-sm">Gráficos de Radar (Normalizado 0.0-2.0) e Dispersão com Filtros Inteligentes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GRÁFICO DE RADAR */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-2">Perfil do Jogador (Radar 360°)</h2>
            <p className="text-xs text-slate-400 mb-4">Escala normalizada: 1.0 = Média do Elenco | Máximo: 2.0</p>
            
            {/* Filtros Radar */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Time</label>
                  <select 
                    value={filtroTimeRadar} 
                    onChange={(e) => setFiltroTimeRadar(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {times.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Posição</label>
                  <select 
                    value={filtroPosicaoRadar} 
                    onChange={(e) => setFiltroPosicaoRadar(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {posicoes.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-300">Selecionar Jogadores (até 5)</label>
                  <button onClick={() => setJogadoresSelecionadosRadar([])} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 hover:text-white transition-colors">Desmarcar Todos</button>
                </div>
                <div className="max-h-32 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
                  {jogadoresFiltradosRadar.map(j => (
                    <label key={j.Jogador} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800 p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={jogadoresSelecionadosRadar.includes(j.Jogador)}
                        onChange={(e) => {
                          if (e.target.checked && jogadoresSelecionadosRadar.length < 5) {
                            setJogadoresSelecionadosRadar([...jogadoresSelecionadosRadar, j.Jogador])
                          } else if (!e.target.checked) {
                            setJogadoresSelecionadosRadar(jogadoresSelecionadosRadar.filter(jog => jog !== j.Jogador))
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span>{j.Jogador} ({j.Posição})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-300">Selecionar Métricas (até 5)</label>
                  <button onClick={() => setMetricasRadar([])} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 hover:text-white transition-colors">Desmarcar Todos</button>
                </div>
                <div className="max-h-32 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
                  {todasAsMetricas.map(m => (
                    <label key={m} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800 p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={metricasRadar.includes(m)}
                        onChange={(e) => {
                          if (e.target.checked && metricasRadar.length < 5) {
                            setMetricasRadar([...metricasRadar, m])
                          } else if (!e.target.checked) {
                            setMetricasRadar(metricasRadar.filter(met => met !== m))
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 min-h-96">
              {radarData && jogadoresSelecionadosRadar.length > 0 ? <Radar data={radarData} options={radarOptions} /> : <div className="text-slate-400 text-center py-20">Selecione jogadores e métricas</div>}
            </div>
          </div>

          {/* GRÁFICO DE DISPERSÃO */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">Comparativo de Elenco (Dispersão)</h2>
            
            {/* Filtros Dispersão */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Posição</label>
                <select 
                  value={filtroPosicaoDispersa} 
                  onChange={(e) => setFiltroPosicaoDispersa(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  {posicoes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Eixo X</label>
                  <select 
                    value={metricaXDispersa} 
                    onChange={(e) => setMetricaXDispersa(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {todasAsMetricas.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Eixo Y</label>
                  <select 
                    value={metricaYDispersa} 
                    onChange={(e) => setMetricaYDispersa(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {todasAsMetricas.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-300">Selecionar Jogadores (deixe vazio para mostrar todos)</label>
                  <button onClick={() => setJogadoresSelecionadosDispersa([])} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 hover:text-white transition-colors">Desmarcar Todos</button>
                </div>
                <div className="max-h-32 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
                  {jogadoresFiltradosDispersa.map(j => (
                    <label key={j.Jogador} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-800 p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={jogadoresSelecionadosDispersa.includes(j.Jogador)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setJogadoresSelecionadosDispersa([...jogadoresSelecionadosDispersa, j.Jogador])
                          } else {
                            setJogadoresSelecionadosDispersa(jogadoresSelecionadosDispersa.filter(jog => jog !== j.Jogador))
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span>{j.Jogador} ({j.Posição})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 min-h-96">
              {scatterData?.datasets?.length > 0 ? <Scatter data={scatterData} options={scatterOptions} /> : <div className="text-slate-400 text-center py-20">Nenhum dado disponível</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
