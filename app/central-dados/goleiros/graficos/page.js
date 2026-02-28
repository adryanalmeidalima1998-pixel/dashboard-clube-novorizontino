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
import { jsPDF } from 'jspdf'

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

const GOLEIROS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlQGKcj7Dv6ziVn4MU-zs6PAJc5WFyjwr0aks9xNdG4rgRw4iwRNFws7lDGXtjNoQHGypQJ4ssSlqM/pub?output=csv";

export default function GraficosGoleirosPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  // Filtros e Seleção
  const [filtroTime, setFiltroTime] = useState('Todos')
  const [jogadoresSelecionados, setJogadoresSelecionados] = useState([])
  const [metricasRadar, setMetricasRadar] = useState(['Defesas', 'Gols sofridos', 'Clean sheets', 'Saídas do gol', 'Passes precisos %'])
  const [metricaX, setMetricaX] = useState('Minutos jogados')
  const [metricaY, setMetricaY] = useState('Defesas')
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)

  // Templates e UI
  const [templates, setTemplates] = useState([])
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('Defesa')
  const [categoriasMetricas, setCategoriasMetricas] = useState({})
  const [tipoGrafico, setTipoGrafico] = useState('radar')

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${GOLEIROS_CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            setJogadores(dados)
            if (dados.length > 0) {
              const colunas = Object.keys(dados[0]).filter(col => col && col.trim())
              setCategoriasMetricas(categorizarMetricas(colunas))
              if (dados.length > 0) setJogadoresSelecionados([dados[0].Jogador])
            }
            setCarregando(false)
          }
        })
      } catch (error) { setCarregando(false) }
    }
    carregarDados()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('chartTemplates_Goleiros')
    if (saved) setTemplates(JSON.parse(saved))
  }, [])

  useEffect(() => { localStorage.setItem('chartTemplates_Goleiros', JSON.stringify(templates)) }, [templates])

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Defesa': [], 'Passes': [], 'Geral': [] }
    colunas.forEach(metrica => {
      if (['Jogador', 'Time', 'Equipe', 'Posição', 'Idade', '№'].includes(metrica)) return
      if (metrica.includes('Defesa') || metrica.includes('Gol') || metrica.includes('Clean') || metrica.includes('Saída')) categorias['Defesa'].push(metrica)
      else if (metrica.includes('Passe') || metrica.includes('Lançamento')) categorias['Passes'].push(metrica)
      else categorias['Geral'].push(metrica)
    })
    return categorias
  }

  const parseValue = (val) => {
    if (!val || val === '-') return 0
    const clean = String(val).replace('%', '').replace(',', '.')
    return parseFloat(clean) || 0
  }

  const normalizarMetrica = (valor, metrica) => {
    const valores = jogadores.map(j => parseValue(j[metrica])).filter(v => v > 0)
    if (valores.length === 0) return 1.0
    const media = valores.reduce((a, b) => a + b, 0) / valores.length
    return media === 0 ? 1.0 : Math.min(valor / media, 2.0)
  }

  const times = useMemo(() => ['Todos', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))], [jogadores])

  const jogadoresFiltrados = useMemo(() => {
    return jogadores.filter(j => {
      const timeAtleta = (j.Time || j.Equipe || '').trim();
      const passaTime = filtroTime === 'Todos' || timeAtleta === filtroTime;
      const idade = parseValue(j.Idade), pI = idade >= filtroIdade.min && idade <= filtroIdade.max
      const pM = parseValue(j['Minutos jogados']) >= filtroMinutagem
      return passaTime && pI && pM
    })
  }, [jogadores, filtroTime, filtroIdade, filtroMinutagem])

  const radarData = useMemo(() => {
    if (jogadoresSelecionados.length === 0 || metricasRadar.length === 0) return null
    const datasets = jogadoresSelecionados.map((nome, idx) => {
      const j = jogadores.find(x => x.Jogador === nome)
      if (!j) return null
      return {
        label: j.Jogador,
        data: metricasRadar.map(m => normalizarMetrica(parseValue(j[m]), m)),
        borderColor: CORES_JOGADORES[idx % CORES_JOGADORES.length],
        backgroundColor: CORES_JOGADORES[idx % CORES_JOGADORES.length] + '20',
        borderWidth: 3, pointRadius: 4
      }
    }).filter(Boolean)
    return { labels: metricasRadar, datasets }
  }, [jogadores, jogadoresSelecionados, metricasRadar])

  const scatterData = useMemo(() => {
    const pontos = jogadoresFiltrados.map((j, idx) => ({
      x: parseValue(j[metricaX]), y: parseValue(j[metricaY]), jogador: j.Jogador,
      cor: jogadoresSelecionados.includes(j.Jogador) ? CORES_JOGADORES[jogadoresSelecionados.indexOf(j.Jogador) % CORES_JOGADORES.length] : '#475569'
    }))
    return {
      datasets: [{
        label: 'Dispersão', data: pontos,
        backgroundColor: pontos.map(p => p.cor + 'cc'),
        pointRadius: pontos.map(p => jogadoresSelecionados.includes(p.jogador) ? 10 : 4)
      }]
    }
  }, [jogadoresFiltrados, jogadoresSelecionados, metricaX, metricaY])

  const exportarPDF = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const imgData = canvas.toDataURL('image/png')
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.text(`Relatório de Gráficos Goleiros - ${tipoGrafico.toUpperCase()}`, 14, 20)
    doc.addImage(imgData, 'PNG', 15, 30, 260, 150)
    doc.save('graficos-goleiros.pdf')
  }

  const salvarTemplate = () => {
    if (!nomeNovoTemplate.trim()) return
    const novoTemplate = { 
      id: Date.now(), 
      nome: nomeNovoTemplate, 
      metricas: tipoGrafico === 'radar' ? [...metricasRadar] : [metricaX, metricaY],
      tipo: tipoGrafico
    }
    setTemplates([...templates, novoTemplate])
    setNomeNovoTemplate('')
  }

  if (carregando) return <div className="min-h-screen bg-white flex items-center justify-center text-emerald-600">Carregando Gráficos de Goleiros...</div>

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2 mb-6">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button onClick={() => router.push('/central-dados/goleiros')} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors">
              ← VOLTAR
            </button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Gráficos de Goleiros
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setTipoGrafico(tipoGrafico === 'radar' ? 'dispersao' : 'radar')} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-[10px] font-black uppercase hover:bg-slate-300 transition-colors">{tipoGrafico === 'radar' ? 'Ver Dispersão' : 'Ver Radar'}</button>
              <button onClick={exportarPDF} className="bg-slate-900 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase hover:bg-black transition-colors">PDF</button>
            </div>
          </div>
        </header>

        {/* SELETOR DE MÉTRICAS NO TOPO */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Configurar <span className="text-emerald-600">Métricas</span></h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="NOME DO TEMPLATE..." 
                  value={nomeNovoTemplate} 
                  onChange={e => setNomeNovoTemplate(e.target.value)} 
                  className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-emerald-500/50"
                />
                <button onClick={salvarTemplate} className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-400 transition-all">Salvar</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 mb-1">
                <button 
                  onClick={() => {
                    if (tipoGrafico === 'radar') setMetricasRadar([])
                    else { setMetricaX(''); setMetricaY(''); }
                  }}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-emerald-400 transition-colors ml-1"
                >
                  [ Desmarcar Tudo ]
                </button>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto custom-scrollbar flex-1">
                  {Object.keys(categoriasMetricas).map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setAbaAtiva(cat)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === cat ? 'bg-emerald-500 text-black' : 'text-slate-500 hover:text-slate-600'}`}
                  >
                    {cat}
                  </button>
                ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {templates.filter(t => t.tipo === tipoGrafico).map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => {
                      if (tipoGrafico === 'radar') setMetricasRadar(t.metricas)
                      else { setMetricaX(t.metricas[0]); setMetricaY(t.metricas[1]); }
                    }}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[8px] font-black uppercase text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categoriasMetricas[abaAtiva]?.map(metrica => {
              const isSelected = tipoGrafico === 'radar' ? metricasRadar.includes(metrica) : (metricaX === metrica || metricaY === metrica)
              return (
                <button 
                  key={metrica}
                  onClick={() => {
                    if (tipoGrafico === 'radar') {
                      if (metricasRadar.includes(metrica)) setMetricasRadar(metricasRadar.filter(m => m !== metrica))
                      else if (metricasRadar.length < 8) setMetricasRadar([...metricasRadar, metrica])
                    } else {
                      if (metricaX === metrica) return
                      setMetricaY(metricaX)
                      setMetricaX(metrica)
                    }
                  }}
                  className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group ${isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-600'}`}
                >
                  <span className="truncate mr-2">{metrica}</span>
                  {isSelected && <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filtros */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtros Goleiros</h3>
              <div className="space-y-4">
                <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none">{times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select>
                <div className="flex gap-2">
                  <input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-[10px] font-bold" placeholder="Idade Min" />
                  <input type="number" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-[10px] font-bold" placeholder="Idade Max" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Selecionar Goleiros ({jogadoresSelecionados.length})</h3>
              <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                {jogadoresFiltrados.map(j => (
                  <label key={j.Jogador} className="flex items-center p-2 hover:bg-slate-800 rounded cursor-pointer transition-colors">
                    <input type="checkbox" checked={jogadoresSelecionados.includes(j.Jogador)} onChange={e => {
                      if (e.target.checked) setJogadoresSelecionados([...jogadoresSelecionados, j.Jogador])
                      else setJogadoresSelecionados(jogadoresSelecionados.filter(x => x !== j.Jogador))
                    }} className="mr-3 accent-emerald-500" />
                    <span className="text-[10px] font-black uppercase truncate">{j.Jogador}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Área do Gráfico */}
          <div className="lg:col-span-3">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 h-[600px] relative">
              {tipoGrafico === 'radar' ? (
                radarData && <Radar data={radarData} options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  scales: { 
                    r: { 
                      beginAtZero: true, 
                      max: 2.0, 
                      ticks: { display: false },
                      grid: { color: '#1e293b' },
                      angleLines: { color: '#1e293b' },
                      pointLabels: { color: '#94a3b8', font: { size: 10, weight: 'bold' } }
                    } 
                  },
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#fff', font: { size: 10, weight: 'bold' } } }
                  }
                }} />
              ) : (
                scatterData && <Scatter data={scatterData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { title: { display: true, text: metricaX, color: '#94a3b8' }, grid: { color: '#1e293b' }, ticks: { color: '#64748b' } },
                    y: { title: { display: true, text: metricaY, color: '#94a3b8' }, grid: { color: '#1e293b' }, ticks: { color: '#64748b' } }
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.raw.jogador}: (${ctx.raw.x}, ${ctx.raw.y})`
                      }
                    },
                    legend: { display: false }
                  }
                }} />
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c10; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>
    </div>
  )
}
