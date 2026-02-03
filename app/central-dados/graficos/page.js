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

  const normalizarMetrica = (valor, metrica) => {
    const valores = jogadores
      .map(j => parseValue(j[metrica]))
      .filter(v => v > 0)
    if (valores.length === 0) return 1.0
    const media = valores.reduce((a, b) => a + b, 0) / valores.length
    if (media === 0) return 1.0
    const normalizado = (valor / media)
    return Math.min(normalizado, 2.0)
  }

  const times = useMemo(() => ['Todos', ...new Set(jogadores.map(j => j.Time).filter(Boolean))], [jogadores])
  const posicoes = useMemo(() => ['Todos', ...new Set(jogadores.map(j => j.Posição).filter(Boolean))], [jogadores])
  const todasAsMetricas = useMemo(() => {
    if (jogadores.length === 0) return []
    return Object.keys(jogadores[0]).filter(k => k !== 'Jogador' && k !== 'Time' && k !== 'Posição' && k !== 'Número').sort()
  }, [jogadores])

  const jogadoresFiltradosRadar = useMemo(() => {
    return jogadores.filter(j => {
      const filtroTime = filtroTimeRadar === 'Todos' || j.Time === filtroTimeRadar
      const filtroPosicao = filtroPosicaoRadar === 'Todos' || j.Posição === filtroPosicaoRadar
      return filtroTime && filtroPosicao
    })
  }, [jogadores, filtroTimeRadar, filtroPosicaoRadar])

  const radarData = useMemo(() => {
    if (jogadoresSelecionadosRadar.length === 0 || metricasRadar.length === 0) return null
    const datasets = jogadoresSelecionadosRadar.map((nomeJogador, idx) => {
      const jogador = jogadores.find(j => j.Jogador === nomeJogador)
      if (!jogador) return null
      return {
        label: jogador.Jogador,
        data: metricasRadar.map(metrica => normalizarMetrica(parseValue(jogador[metrica]), metrica)),
        borderColor: CORES_JOGADORES[idx % CORES_JOGADORES.length],
        backgroundColor: CORES_JOGADORES[idx % CORES_JOGADORES.length] + '20',
        borderWidth: 3,
        pointBackgroundColor: CORES_JOGADORES[idx % CORES_JOGADORES.length],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }
    }).filter(Boolean)
    return { labels: metricasRadar, datasets }
  }, [jogadores, jogadoresSelecionadosRadar, metricasRadar])

  const scatterData = useMemo(() => {
    const jogadoresParaMostrar = jogadoresSelecionadosDispersa.length > 0 
      ? jogadores.filter(j => jogadoresSelecionadosDispersa.includes(j.Jogador))
      : jogadores.filter(j => filtroPosicaoDispersa === 'Todos' || j.Posição === filtroPosicaoDispersa)
    const pontos = jogadoresParaMostrar.map((j, idx) => ({
      x: parseValue(j[metricaXDispersa]),
      y: parseValue(j[metricaYDispersa]),
      jogador: j.Jogador,
      cor: CORES_JOGADORES[idx % CORES_JOGADORES.length]
    })).filter(p => p.x >= 0 && p.y >= 0 && p.jogador)
    return {
      datasets: [{
        label: `${metricaXDispersa} vs ${metricaYDispersa}`,
        data: pontos,
        backgroundColor: pontos.map(p => p.cor + 'cc'),
        borderColor: pontos.map(p => p.cor),
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 10
      }]
    }
  }, [jogadores, jogadoresSelecionadosDispersa, filtroPosicaoDispersa, metricaXDispersa, metricaYDispersa])

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10, weight: 'bold' }, padding: 20 } },
      tooltip: { backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#94a3b8', borderColor: '#1e293b', borderWidth: 1 }
    },
    scales: {
      r: {
        beginAtZero: true, max: 2.0, min: 0,
        ticks: { display: false, stepSize: 0.5 },
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        angleLines: { color: 'rgba(148, 163, 184, 0.1)' },
        pointLabels: { color: '#64748b', font: { size: 10, weight: 'black', family: 'sans-serif' } }
      }
    }
  }

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        callbacks: { label: (ctx) => `${ctx.raw.jogador}: (${ctx.raw.x.toFixed(1)}, ${ctx.raw.y.toFixed(1)})` }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(148, 163, 184, 0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(148, 163, 184, 0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } }
    }
  }

  if (carregando) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Renderizando Inteligência Visual...</span>
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
              Análise <span className="text-emerald-500">Visual</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Gráficos de Radar e Dispersão de Performance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* RADAR CHART CARD */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-slate-800/50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Radar de Atributos</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <select value={filtroTimeRadar} onChange={(e) => setFiltroTimeRadar(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50">
                {times.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filtroPosicaoRadar} onChange={(e) => setFiltroPosicaoRadar(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50">
                {posicoes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex-grow min-h-[400px] relative">
              {radarData && <Radar data={radarData} options={radarOptions} />}
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {jogadoresFiltradosRadar.slice(0, 12).map(j => (
                <button 
                  key={j.Jogador}
                  onClick={() => {
                    if (jogadoresSelecionadosRadar.includes(j.Jogador)) {
                      setJogadoresSelecionadosRadar(jogadoresSelecionadosRadar.filter(n => n !== j.Jogador))
                    } else if (jogadoresSelecionadosRadar.length < 5) {
                      setJogadoresSelecionadosRadar([...jogadoresSelecionadosRadar, j.Jogador])
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border ${jogadoresSelecionadosRadar.includes(j.Jogador) ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                >
                  {j.Jogador}
                </button>
              ))}
            </div>
          </div>

          {/* SCATTER CHART CARD */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-slate-800/50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Dispersão de Métricas</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <select value={metricaXDispersa} onChange={(e) => setMetricaXDispersa(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50">
                {todasAsMetricas.map(m => <option key={m} value={m}>X: {m.toUpperCase()}</option>)}
              </select>
              <select value={metricaYDispersa} onChange={(e) => setMetricaYDispersa(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50">
                {todasAsMetricas.map(m => <option key={m} value={m}>Y: {m.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="flex-grow min-h-[400px] relative">
              <Scatter data={scatterData} options={scatterOptions} />
            </div>

            <p className="mt-8 text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] text-center italic">
              Analise a correlação entre diferentes indicadores técnicos
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
