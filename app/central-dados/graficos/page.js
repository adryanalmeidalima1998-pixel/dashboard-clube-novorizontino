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
  '#fbbf24', '#d4af37', '#e2e8f0', '#3b82f6', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
]

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv";

export default function GraficosPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  // Filtros e Seleção
  const [filtroTime, setFiltroTime] = useState('Todos')
  const [filtrosPosicao, setFiltrosPosicao] = useState([])
  const [jogadoresSelecionados, setJogadoresSelecionados] = useState([])
  const [metricasRadar, setMetricasRadar] = useState(['Gols', 'Passes precisos %', 'Dribles', 'Desafios vencidos, %', 'Interceptações'])
  const [metricaX, setMetricaX] = useState('Minutos jogados')
  const [metricaY, setMetricaY] = useState('Gols')
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)

  // Templates e UI
  const [templates, setTemplates] = useState([])
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  const [categoriasMetricas, setCategoriasMetricas] = useState({})
  const [tipoGrafico, setTipoGrafico] = useState('radar') // 'radar' ou 'dispersao'

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`)
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
    const saved = localStorage.getItem('chartTemplates_Graficos')
    if (saved) setTemplates(JSON.parse(saved))
  }, [])

  useEffect(() => { localStorage.setItem('chartTemplates_Graficos', JSON.stringify(templates)) }, [templates])

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
      if (['Jogador', 'Time', 'Equipe', 'Posição', 'Idade', '№'].includes(metrica)) return
      let categorizado = false
      for (const [cat, palavras] of Object.entries(palavrasChave)) {
        if (palavras.some(p => metrica.includes(p))) { categorias[cat].push(metrica); categorizado = true; break }
      }
      if (!categorizado) categorias['Geral'].push(metrica)
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
  const posicoes = useMemo(() => [...new Set(jogadores.map(j => j.Posição).filter(Boolean))], [jogadores])

  const jogadoresFiltrados = useMemo(() => {
    let baseFiltrada = jogadores;
    if (filtroTime !== 'Todos') {
      baseFiltrada = baseFiltrada.filter(j => {
        const timeAtleta = (j.Time || j.Equipe || '').trim();
        return timeAtleta === filtroTime;
      });
    }
    return baseFiltrada.filter(j => {
      const passaPosicao = filtrosPosicao.length === 0 || filtrosPosicao.includes(j.Posição);
      const idade = parseValue(j.Idade);
      const passaIdade = idade >= filtroIdade.min && idade <= filtroIdade.max;
      const passaMinutagem = parseValue(j['Minutos jogados']) >= filtroMinutagem;
      return passaPosicao && passaIdade && passaMinutagem;
    });
  }, [jogadores, filtroTime, filtrosPosicao, filtroIdade, filtroMinutagem])

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
    doc.text(`Relatório de Gráficos - ${tipoGrafico.toUpperCase()}`, 14, 20)
    doc.addImage(imgData, 'PNG', 15, 30, 260, 150)
    doc.save('graficos.pdf')
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

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-brand-yellow">Carregando Gráficos...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/central-dados')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group"><svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
            <div><h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">Gráficos de <span className="text-brand-yellow">Performance</span></h1></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setTipoGrafico(tipoGrafico === 'radar' ? 'dispersao' : 'radar')} className="px-6 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/20 transition-all">{tipoGrafico === 'radar' ? 'Ver Dispersão' : 'Ver Radar'}</button>
            <button onClick={exportarPDF} className="px-6 py-3 bg-brand-yellow text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all">PDF Clean</button>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS NO TOPO */}
        <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Configurar <span className="text-brand-yellow">Métricas</span></h2>
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
                  onClick={() => {
                    if (tipoGrafico === 'radar') setMetricasRadar([])
                    else { setMetricaX(''); setMetricaY('') }
                  }}
                  className="text-[9px] font-black uppercase text-slate-500 hover:text-brand-yellow transition-all"
                >
                  [ Desmarcar Tudo ]
                </button>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar max-w-[500px]">
                  {Object.keys(categoriasMetricas).map(cat => (
                    <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === cat ? 'bg-brand-yellow text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}>{cat}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {templates.filter(t => t.tipo === tipoGrafico).map(t => (
                  <button key={t.id} onClick={() => {
                    if (t.tipo === 'radar') setMetricasRadar(t.metricas)
                    else { setMetricaX(t.metricas[0]); setMetricaY(t.metricas[1]) }
                  }} className="text-[8px] font-black uppercase bg-slate-800 px-2 py-1 rounded border border-slate-700 hover:border-brand-yellow/50 hover:text-brand-yellow transition-all">{t.nome}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categoriasMetricas[abaAtiva]?.map(metrica => (
              <button 
                key={metrica} 
                onClick={() => {
                  if (tipoGrafico === 'radar') {
                    setMetricasRadar(prev => prev.includes(metrica) ? prev.filter(x => x !== metrica) : (prev.length < 10 ? [...prev, metrica] : prev))
                  } else {
                    if (metricaX === metrica) setMetricaX('')
                    else if (metricaY === metrica) setMetricaY('')
                    else if (!metricaX) setMetricaX(metrica)
                    else setMetricaY(metrica)
                  }
                }} 
                className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group ${
                  (tipoGrafico === 'radar' ? metricasRadar.includes(metrica) : (metricaX === metrica || metricaY === metrica)) 
                  ? 'bg-brand-yellow/10 border-brand-yellow text-brand-yellow' 
                  : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-600'
                }`}
              >
                <span className="truncate mr-2">{metrica}</span>
                {(tipoGrafico === 'radar' ? metricasRadar.includes(metrica) : (metricaX === metrica || metricaY === metrica)) && (
                  <div className="flex items-center gap-1">
                    {tipoGrafico === 'dispersao' && <span className="text-[8px] font-black">{metricaX === metrica ? 'X' : 'Y'}</span>}
                    <div className="w-2 h-2 bg-brand-yellow rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SIDEBAR FILTROS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtros de Base</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Equipe (Soberano)</label>
                  <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50">{times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select>
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Posições (Multi)</label>
                  <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-1 custom-scrollbar">
                    {posicoes.map(p => (
                      <button key={p} onClick={() => setFiltrosPosicao(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition-all ${filtrosPosicao.includes(p) ? 'bg-brand-yellow text-slate-950 border-brand-yellow' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Idade Min</label>
                    <input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold focus:border-brand-yellow/50 outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Idade Max</label>
                    <input type="number" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold focus:border-brand-yellow/50 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Minutos Mínimos</label>
                  <input type="number" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold focus:border-brand-yellow/50 outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Atletas ({jogadoresFiltrados.length})</h3>
                <button 
                  onClick={() => {
                    if (jogadoresSelecionados.length === jogadoresFiltrados.length) setJogadoresSelecionados([])
                    else setJogadoresSelecionados(jogadoresFiltrados.map(j => j.Jogador))
                  }}
                  className="text-[8px] font-black uppercase text-brand-yellow hover:text-brand-yellow/80 transition-all"
                >
                  {jogadoresSelecionados.length === jogadoresFiltrados.length ? '[ Desmarcar Todos ]' : '[ Selecionar Todos ]'}
                </button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {jogadoresFiltrados.map(j => (
                  <button 
                    key={j.Jogador}
                    onClick={() => {
                      if (jogadoresSelecionados.includes(j.Jogador)) setJogadoresSelecionados(jogadoresSelecionados.filter(x => x !== j.Jogador))
                      else if (jogadoresSelecionados.length < 10) setJogadoresSelecionados([...jogadoresSelecionados, j.Jogador])
                    }}
                    className={`w-full p-4 rounded-2xl text-left transition-all border ${jogadoresSelecionados.includes(j.Jogador) ? 'bg-brand-yellow border-brand-yellow text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    <div className="font-black italic uppercase text-[11px] tracking-tighter">{j.Jogador}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">{j.Time || j.Equipe}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ÁREA DO GRÁFICO */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 rounded-[3rem] p-10 border border-slate-800/50 shadow-2xl flex items-center justify-center min-h-[600px]">
              {tipoGrafico === 'radar' ? (
                radarData ? (
                  <Radar 
                    data={radarData} 
                    options={{
                      scales: { r: { min: 0, max: 2, ticks: { display: false }, grid: { color: '#1e293b' }, angleLines: { color: '#1e293b' }, pointLabels: { color: '#64748b', font: { size: 10, weight: '900' } } } },
                      plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10, weight: '900' }, padding: 20 } } }
                    }} 
                  />
                ) : <div className="text-slate-600 font-black italic uppercase tracking-widest">Selecione atletas e métricas para o radar</div>
              ) : (
                <Scatter 
                  data={scatterData}
                  options={{
                    scales: {
                      x: { title: { display: true, text: metricaX.toUpperCase(), color: '#64748b', font: { size: 10, weight: '900' } }, grid: { color: '#1e293b' }, ticks: { color: '#475569' } },
                      y: { title: { display: true, text: metricaY.toUpperCase(), color: '#64748b', font: { size: 10, weight: '900' } }, grid: { color: '#1e293b' }, ticks: { color: '#475569' } }
                    },
                    plugins: {
                      tooltip: { callbacks: { label: (ctx) => ctx.raw.jogador + ': ' + ctx.raw.x + ' / ' + ctx.raw.y } },
                      legend: { display: false }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c10; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fbbf24; }
      `}</style>
    </div>
  )
}
