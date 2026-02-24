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

/**
 * Paleta de cores expandida e vibrante para evitar repetições.
 * Inclui 20 cores distintas e visualmente contrastantes.
 */
const CORES_JOGADORES = [
  '#fbbf24', // Amarelo Novorizontino
  '#3b82f6', // Azul
  '#ef4444', // Vermelho
  '#10b981', // Verde Esmeralda
  '#8b5cf6', // Roxo
  '#f97316', // Laranja
  '#06b6d4', // Ciano
  '#ec4899', // Rosa
  '#d4af37', // Dourado
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#84cc16', // Lima
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#eab308', // Yellow
  '#ef4444', // Red
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#64748b'  // Slate
]

import { sheetUrl } from '../../datasources'
const CSV_URL = sheetUrl('CENTRAL_DADOS', false)

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

  /**
   * Atribui uma cor única a cada jogador selecionado.
   * Se houver mais jogadores que cores, usa um algoritmo determinístico para gerar novas.
   */
  const getCorJogador = (index) => {
    if (index < CORES_JOGADORES.length) {
      return CORES_JOGADORES[index];
    }
    // Gerar cor baseada no index para garantir que seja determinística mas diferente
    const hue = (index * 137.508) % 360; // Golden angle approximation
    return `hsl(${hue}, 70%, 50%)`;
  }

  const radarData = useMemo(() => {
    if (jogadoresSelecionados.length === 0 || metricasRadar.length === 0) return null
    const datasets = jogadoresSelecionados.map((nome, idx) => {
      const j = jogadores.find(x => x.Jogador === nome)
      if (!j) return null
      const cor = getCorJogador(idx);
      return {
        label: j.Jogador,
        data: metricasRadar.map(m => normalizarMetrica(parseValue(j[m]), m)),
        borderColor: cor,
        backgroundColor: cor.startsWith('hsl') ? cor.replace(')', ', 0.15)').replace('hsl', 'hsla') : cor + '20',
        borderWidth: 3, pointRadius: 4
      }
    }).filter(Boolean)
    return { labels: metricasRadar, datasets }
  }, [jogadores, jogadoresSelecionados, metricasRadar])

  const scatterData = useMemo(() => {
    const pontos = jogadoresFiltrados.map((j, idx) => {
      const isSelected = jogadoresSelecionados.includes(j.Jogador);
      const cor = isSelected ? getCorJogador(jogadoresSelecionados.indexOf(j.Jogador)) : '#475569';
      return {
        x: parseValue(j[metricaX]), 
        y: parseValue(j[metricaY]), 
        jogador: j.Jogador,
        cor: cor
      }
    })
    return {
      datasets: [{
        label: 'Dispersão', data: pontos,
        backgroundColor: pontos.map(p => p.cor + (jogadoresSelecionados.includes(p.jogador) ? 'cc' : '66')),
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
              </div>
              <div className="flex flex-wrap gap-2">
                {['Ataque', 'Defesa', 'Passes & Criação', 'Posse & Controle', 'Físico & Duelos', 'Geral'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setAbaAtiva(cat)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${abaAtiva === cat ? 'bg-brand-yellow border-brand-yellow text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(categoriasMetricas[abaAtiva] || []).map(metrica => (
              <button
                key={metrica}
                onClick={() => {
                  if (tipoGrafico === 'radar') {
                    if (metricasRadar.includes(metrica)) setMetricasRadar(metricasRadar.filter(m => m !== metrica))
                    else if (metricasRadar.length < 12) setMetricasRadar([...metricasRadar, metrica])
                  } else {
                    if (metricaX === metrica) setMetricaX('')
                    else if (metricaY === metrica) setMetricaY('')
                    else if (!metricaX) setMetricaX(metrica)
                    else setMetricaY(metrica)
                  }
                }}
                className={`p-3 rounded-xl text-[9px] font-bold text-left transition-all border ${
                  (tipoGrafico === 'radar' ? metricasRadar.includes(metrica) : (metricaX === metrica || metricaY === metrica))
                    ? 'bg-brand-yellow/10 border-brand-yellow text-brand-yellow' 
                    : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                {metrica.toUpperCase()}
                {(tipoGrafico === 'dispersao' && metricaX === metrica) && <span className="ml-2 text-white font-black">[X]</span>}
                {(tipoGrafico === 'dispersao' && metricaY === metrica) && <span className="ml-2 text-white font-black">[Y]</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* PAINEL LATERAL: FILTROS E SELEÇÃO */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Filtros de Base */}
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Filtros de Base</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-black text-slate-600 uppercase mb-2 block">Equipe</label>
                  <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-brand-yellow/50">
                    {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-600 uppercase mb-2 block">Minutagem Mínima</label>
                  <input type="number" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-brand-yellow/50" />
                </div>
              </div>
            </div>

            {/* Seleção de Jogadores */}
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800/50 h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Atletas ({jogadoresFiltrados.length}) <span className="text-brand-yellow ml-2">[Máx 8]</span></h3>
                <button onClick={() => setJogadoresSelecionados([])} className="text-[8px] font-black uppercase text-brand-yellow hover:underline">Limpar</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {jogadoresFiltrados.map((j, idx) => (
                  <button
                    key={j.Jogador}
                    onClick={() => {
                      if (jogadoresSelecionados.includes(j.Jogador)) setJogadoresSelecionados(jogadoresSelecionados.filter(n => n !== j.Jogador))
                      else if (jogadoresSelecionados.length < 8) setJogadoresSelecionados([...jogadoresSelecionados, j.Jogador])
                    }}
                    className={`w-full p-3 rounded-xl text-left transition-all border flex items-center justify-between group ${
                      jogadoresSelecionados.includes(j.Jogador) 
                        ? 'bg-brand-yellow border-brand-yellow text-slate-950' 
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black italic uppercase leading-none mb-1">{j.Jogador}</span>
                      <span className={`text-[8px] font-bold uppercase ${jogadoresSelecionados.includes(j.Jogador) ? 'text-slate-800' : 'text-slate-600'}`}>{j.Time}</span>
                    </div>
                    {jogadoresSelecionados.includes(j.Jogador) && (
                      <div className="w-4 h-4 rounded-full bg-slate-950/20 flex items-center justify-center">
                        <span className="text-[8px] font-black">{jogadoresSelecionados.indexOf(j.Jogador) + 1}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GRÁFICO PRINCIPAL */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800/50 h-full flex flex-col shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-yellow/20 to-transparent"></div>
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-brand-yellow rounded-full animate-pulse"></div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Visualização <span className="text-brand-yellow">Dinâmica</span></h2>
                </div>
                <div className="flex gap-4">
                  {jogadoresSelecionados.map((nome, idx) => (
                    <div key={nome} className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCorJogador(idx) }}></div>
                      <span className="text-[8px] font-black uppercase text-slate-400">{nome.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[600px]">
                {tipoGrafico === 'radar' ? (
                  radarData ? (
                    <Radar 
                      data={radarData} 
                      options={{
                        scales: {
                          r: {
                            min: 0, max: 2,
                            angleLines: { color: '#1e293b' },
                            grid: { color: '#1e293b' },
                            pointLabels: { color: '#64748b', font: { size: 10, weight: 'bold' } },
                            ticks: { display: false, stepSize: 0.5 }
                          }
                        },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: '#0f172a',
                            titleFont: { size: 12, weight: 'bold' },
                            bodyFont: { size: 11 },
                            padding: 12,
                            cornerRadius: 12,
                            borderColor: '#1e293b',
                            borderWidth: 1
                          }
                        },
                        maintainAspectRatio: false
                      }} 
                    />
                  ) : <div className="text-slate-700 font-black italic uppercase">Selecione Atletas e Métricas para o Radar</div>
                ) : (
                  <Scatter 
                    data={scatterData}
                    options={{
                      scales: {
                        x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' }, title: { display: true, text: metricaX.toUpperCase(), color: '#fbbf24', font: { size: 10, weight: 'bold' } } },
                        y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' }, title: { display: true, text: metricaY.toUpperCase(), color: '#fbbf24', font: { size: 10, weight: 'bold' } } }
                      },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => `${ctx.raw.jogador}: (${ctx.raw.x}, ${ctx.raw.y})`
                          }
                        }
                      },
                      maintainAspectRatio: false
                    }}
                  />
                )}
              </div>

              <div className="mt-8 flex items-center justify-between text-slate-600 border-t border-slate-800/50 pt-8">
                <div className="text-[9px] font-black uppercase tracking-widest">Metodologia: Normalização por Média do Grupo (1.0 = Média)</div>
                <div className="text-[9px] font-black uppercase tracking-widest">Grêmio Novorizontino • Inteligência de Dados</div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fbbf24; }
      `}</style>
    </div>
  )
}
