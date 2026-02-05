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
  const [filtrosPosicaoRadar, setFiltrosPosicaoRadar] = useState([])
  const [jogadoresSelecionadosRadar, setJogadoresSelecionadosRadar] = useState([])
  const [metricasRadar, setMetricasRadar] = useState(['Gols', 'Passes precisos %', 'Dribles', 'Desafios vencidos, %', 'Interceptações'])
  
  // Filtros Dispersão
  const [filtroPosicaoDispersa, setFiltroPosicaoDispersa] = useState('Todos')
  const [jogadoresSelecionadosDispersa, setJogadoresSelecionadosDispersa] = useState([])
  const [metricaXDispersa, setMetricaXDispersa] = useState('Minutos jogados')
  const [metricaYDispersa, setMetricaYDispersa] = useState('Gols')

  // Templates
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
            try {
              const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
              setJogadores(dados)
              if (dados.length > 0) {
                setJogadoresSelecionadosRadar([dados[0].Jogador])
                setJogadoresSelecionadosDispersa([dados[0].Jogador])
                
                const colunas = Object.keys(dados[0]).filter(col => col && col.trim())
                setCategoriasMetricas(categorizarMetricas(colunas))
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

  // Templates LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('chartTemplates')
    if (saved) setTemplates(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('chartTemplates', JSON.stringify(templates))
  }, [templates])

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Ataque': [], 'Defesa': [], 'Passes & Criação': [], 'Posse & Controle': [], 'Físico & Duelos': [], 'Geral': [] }
    const palavrasChave = {
      'Ataque': ['Gol', 'Assistência', 'Chance', 'Chute', 'Finalização', 'Xg', 'xA', 'Tiro', 'Header', 'Poste', 'Entradas no terço final'],
      'Defesa': ['Desarme', 'Interceptação', 'Rebote', 'Falha', 'Erro', 'Cartão', 'Falta', 'Defesa', 'Disputa defensiva', 'Disputa na defesa'],
      'Passes & Criação': ['Passe', 'Cruzamento', 'Passe chave', 'Passe progressivo', 'Passe longo', 'Passe super longo', 'Passe para', 'Precisão'],
      'Posse & Controle': ['Drible', 'Controle', 'Bola', 'Posse', 'Impedimento', 'Perda'],
      'Físico & Duelos': ['Duelo', 'Disputa', 'Disputa aérea', 'Desafio', 'Minutos']
    }
    colunas.forEach(metrica => {
      if (['?', 'Jogador', 'Time', 'Posição', 'Idade', 'Altura', 'Peso', 'Nacionalidade'].includes(metrica)) return
      let categorizado = false
      for (const [cat, palavras] of Object.entries(palavrasChave)) {
        if (palavras.some(p => metrica.includes(p))) {
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

  const normalizarMetrica = (valor, metrica) => {
    const valores = jogadores.map(j => parseValue(j[metrica])).filter(v => v > 0)
    if (valores.length === 0) return 1.0
    const media = valores.reduce((a, b) => a + b, 0) / valores.length
    if (media === 0) return 1.0
    return Math.min(valor / media, 2.0)
  }

  const times = useMemo(() => ['Todos', ...new Set(jogadores.map(j => j.Time).filter(Boolean))], [jogadores])
  const posicoes = useMemo(() => [...new Set(jogadores.map(j => j.Posição).filter(Boolean))], [jogadores])
  const todasAsMetricas = useMemo(() => {
    if (jogadores.length === 0) return []
    return Object.keys(jogadores[0]).filter(k => !['Jogador', 'Time', 'Posição', 'Número', '?', 'Idade', 'Altura', 'Peso', 'Nacionalidade'].includes(k)).sort()
  }, [jogadores])

  const jogadoresFiltradosRadar = useMemo(() => {
    return jogadores.filter(j => {
      const passaTime = filtroTimeRadar === 'Todos' || j.Time === filtroTimeRadar
      const passaPosicao = filtrosPosicaoRadar.length === 0 || filtrosPosicaoRadar.includes(j.Posição)
      return passaTime && passaPosicao
    })
  }, [jogadores, filtroTimeRadar, filtrosPosicaoRadar])

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

  const togglePosicaoRadar = (pos) => {
    setFiltrosPosicaoRadar(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos])
  }

  const salvarTemplate = () => {
    if (!nomeNovoTemplate.trim()) return
    setTemplates([...templates, { id: Date.now(), nome: nomeNovoTemplate, metricas: [...metricasRadar] }])
    setNomeNovoTemplate('')
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
              <button onClick={() => setMostrarPainelMetricas(true)} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Personalizar Métricas</button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <select value={filtroTimeRadar} onChange={(e) => setFiltroTimeRadar(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50">
                  {times.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="flex flex-wrap gap-1 bg-slate-950 border border-slate-800 rounded-xl p-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                  {posicoes.map(p => (
                    <button key={p} onClick={() => togglePosicaoRadar(p)} className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${filtrosPosicaoRadar.includes(p) ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-grow min-h-[400px] relative">
              {radarData && <Radar data={radarData} options={radarOptions} />}
            </div>

            <div className="mt-8 flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar p-2">
              {jogadoresFiltradosRadar.map(j => (
                <button 
                  key={j.Jogador}
                  onClick={() => {
                    if (jogadoresSelecionadosRadar.includes(j.Jogador)) {
                      setJogadoresSelecionadosRadar(jogadoresSelecionadosRadar.filter(n => n !== j.Jogador))
                    } else if (jogadoresSelecionadosRadar.length < 10) {
                      setJogadoresSelecionadosRadar([...jogadoresSelecionadosRadar, j.Jogador])
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${jogadoresSelecionadosRadar.includes(j.Jogador) ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'}`}
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
                <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Dispersão de Performance</h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-2">Eixo X</span>
                <select value={metricaXDispersa} onChange={(e) => setMetricaXDispersa(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50">
                  {todasAsMetricas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-2">Eixo Y</span>
                <select value={metricaYDispersa} onChange={(e) => setMetricaYDispersa(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50">
                  {todasAsMetricas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-2">Posição</span>
                <select value={filtroPosicaoDispersa} onChange={(e) => setFiltroPosicaoDispersa(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50">
                  {posicoes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-grow min-h-[400px] relative">
              <Scatter data={scatterData} options={scatterOptions} />
            </div>

            <div className="mt-8 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                Este gráfico correlaciona duas métricas para identificar "outliers" (jogadores fora da curva). Atletas no quadrante superior direito são os mais eficientes em ambos os critérios.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MÉTRICAS RADAR */}
      {mostrarPainelMetricas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a0c10]/90 backdrop-blur-xl" onClick={() => setMostrarPainelMetricas(false)}></div>
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Métricas do Radar</h2>
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
                    if (metricasRadar.includes(m)) setMetricasRadar(metricasRadar.filter(x => x !== m))
                    else if (metricasRadar.length < 8) setMetricasRadar([...metricasRadar, m])
                  }} className={`p-4 rounded-2xl text-left transition-all border text-[10px] font-black uppercase ${metricasRadar.includes(m) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-slate-800">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">Templates Salvos</h3>
                <div className="flex flex-wrap gap-3 mb-6">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setMetricasRadar(t.metricas)} className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-white">{t.nome}</button>
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
