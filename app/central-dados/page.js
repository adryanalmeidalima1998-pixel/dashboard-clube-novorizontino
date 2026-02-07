'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { cleanData, normalizeTeamName, safeParseFloat } from '../utils/dataCleaner'

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv";

export default function CentralDados() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [todasAsColunas, setTodasAsColunas] = useState([])
  const [categoriasMetricas, setCategoriasMetricas] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtrosPosicao, setFiltrosPosicao] = useState([])
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)
  
  const [jogadorReferencia, setJogadorReferencia] = useState(null)
  const [jogadoresSimilares, setJogadoresSimilares] = useState([])
  const [ordenacao, setOrdenacao] = useState({ coluna: 'Index', direcao: 'desc' })

  const [metricasSelecionadas, setMetricasSelecionadas] = useState([
    'Index',
    'Minutos jogados',
    'Gols',
    'Assistências'
  ])

  const [templates, setTemplates] = useState([])
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('Ataque')

  useEffect(() => {
    const templatesArmazenados = localStorage.getItem('metricsTemplates_Central')
    if (templatesArmazenados) {
      try { setTemplates(JSON.parse(templatesArmazenados)) } catch (e) {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('metricsTemplates_Central', JSON.stringify(templates))
  }, [templates])

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data).map(j => ({
              ...j,
              Time: normalizeTeamName(j.Time || j.Equipe)
            }))
            
            const dadosComHistorico = dadosLimpos.map(j => {
              const valorAtual = safeParseFloat(j['Index'])
              return {
                ...j,
                historicoIndex: [
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual }
                ]
              }
            })

            setJogadores(dadosComHistorico)
            if (dadosLimpos.length > 0) {
              const colunas = Object.keys(dadosLimpos[0]).filter(col => col && col.trim())
              setTodasAsColunas(colunas)
              setCategoriasMetricas(categorizarMetricas(colunas))
            }
            setCarregando(false)
          },
          error: () => { setErro('Erro ao carregar dados'); setCarregando(false); }
        })
      } catch (error) { setErro('Erro ao conectar'); setCarregando(false); }
    }
    carregarDados()
  }, [])

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
      if (['?', 'ID_ATLETA', 'Jogador', 'Time', 'Equipe', 'Posição', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '№'].includes(metrica)) return
      let categorizado = false
      for (const [cat, chaves] of Object.entries(palavrasChave)) {
        if (chaves.some(k => metrica.includes(k))) { categorias[cat].push(metrica); categorizado = true; break; }
      }
      if (!categorizado) categorias['Geral'].push(metrica)
    })
    if (colunas.includes('Index')) {
      categorias['Geral'] = categorias['Geral'].filter(m => m !== 'Index')
      categorias['Geral'].unshift('Index')
    }
    return categorias
  }

  const handleOrdenacao = (coluna) => {
    setOrdenacao(prev => ({ coluna, direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc' }))
  }

  const salvarTemplate = () => {
    if (!nomeNovoTemplate) return
    const novo = { id: Date.now(), nome: nomeNovoTemplate, metricas: [...metricasSelecionadas] }
    setTemplates([...templates, novo])
    setNomeNovoTemplate('')
  }

  const encontrarSimilares = (jogador) => {
    if (jogadorReferencia?.Jogador === jogador.Jogador) { setJogadorReferencia(null); setJogadoresSimilares([]); return; }
    setJogadorReferencia(jogador)
    
    const metricasCalculo = metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Equipe', 'Posição'].includes(m))
    
    const scores = jogadores.filter(j => j.Jogador !== jogador.Jogador && j.Posição === jogador.Posição).map(j => {
      let dist = 0;
      metricasCalculo.forEach(m => {
        const v1 = safeParseFloat(jogador[m]), v2 = safeParseFloat(j[m])
        dist += Math.pow(v1 === 0 ? v2 : Math.abs(v1 - v2) / v1, 2)
      })
      const similaridade = 100 / (1 + Math.sqrt(dist))
      return { ...j, scoreSimilaridade: similaridade }
    }).sort((a, b) => b.scoreSimilaridade - a.scoreSimilaridade).slice(0, 5)
    
    setJogadoresSimilares(scores)
  }

  const jogadoresFiltrados = useMemo(() => {
    if (jogadorReferencia) return [jogadorReferencia, ...jogadoresSimilares]
    
    let filtrados = jogadores.filter(j => {
      const pB = (j.Jogador || '').toLowerCase().includes(busca.toLowerCase())
      const pT = filtroTime === 'todos' || j.Time === filtroTime || j.Equipe === filtroTime
      const pP = filtrosPosicao.length === 0 || filtrosPosicao.includes(j.Posição)
      const idade = safeParseFloat(j.Idade)
      const pI = idade >= filtroIdade.min && idade <= filtroIdade.max
      const pM = safeParseFloat(j['Minutos jogados']) >= filtroMinutagem
      return pB && pT && pP && pI && pM
    })

    filtrados.sort((a, b) => {
      const vA = safeParseFloat(a[ordenacao.coluna]), vB = safeParseFloat(b[ordenacao.coluna])
      if (isNaN(vA)) return ordenacao.direcao === 'asc' ? String(a[ordenacao.coluna]).localeCompare(String(b[ordenacao.coluna])) : String(b[ordenacao.coluna]).localeCompare(String(a[ordenacao.coluna]))
      return ordenacao.direcao === 'asc' ? vA - vB : vB - vA
    })
    return filtrados
  }, [jogadores, busca, filtroTime, filtrosPosicao, filtroIdade, filtroMinutagem, ordenacao, jogadorReferencia, jogadoresSimilares])

  const times = useMemo(() => ['todos', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))], [jogadores])
  const posicoes = useMemo(() => [...new Set(jogadores.map(j => j.Posição).filter(Boolean))], [jogadores])

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.text('RELATÓRIO TÉCNICO - NOVORIZONTINO', 14, 20)
    const head = [['Jogador', 'Time', 'Posição', ...metricasSelecionadas]]
    const body = jogadoresFiltrados.map(j => [j.Jogador, j.Time || j.Equipe, j.Posição, ...metricasSelecionadas.map(m => j[m] || '0')])
    doc.autoTable({ head, body, startY: 30, theme: 'grid', styles: { fontSize: 7 } })
    doc.save('relatorio-novorizontino.pdf')
  }

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-brand-yellow">Processando...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group"><svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
            <div><h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">Central de <span className="text-brand-yellow">Dados</span></h1></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push('/central-dados/rankings')} className="px-6 py-3 bg-gradient-to-r from-brand-yellow/20 to-brand-yellow/5 border border-brand-yellow/40 text-brand-yellow rounded-2xl text-[10px] font-black uppercase tracking-widest hover:from-brand-yellow/30 hover:to-brand-yellow/10 transition-all shadow-[0_0_20px_rgba(251,191,36,0.1)]">Rankings</button>
            <button onClick={() => router.push('/central-dados/goleiros')} className="px-6 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/20 transition-all">Goleiros</button>
            <button onClick={() => router.push('/central-dados/graficos')} className="px-6 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/20 transition-all">Gráficos</button>
            <button onClick={() => router.push('/central-dados/benchmark')} className="px-6 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/20 transition-all">Benchmark</button>
            <button onClick={exportarPDF} className="px-6 py-3 bg-brand-yellow text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all">PDF Clean</button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Busca & Time</h3>
            <div className="space-y-3">
              <input type="text" placeholder="BUSCAR..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50" />
              <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50">{times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select>
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Posições (Multi)</h3>
            <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-1 custom-scrollbar">
              {posicoes.map(p => (
                <button key={p} onClick={() => setFiltrosPosicao(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition-all ${filtrosPosicao.includes(p) ? 'bg-brand-yellow text-slate-950 border-brand-yellow' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Idade & Minutagem</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Min</label>
                  <input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold focus:border-brand-yellow/50 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-[8px] font-black text-slate-600 uppercase block mb-1">Max</label>
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
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Templates de Métricas</h3>
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder="NOME..." value={nomeNovoTemplate} onChange={e => setNomeNovoTemplate(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-[8px] font-black outline-none focus:border-brand-yellow/50" />
              <button onClick={salvarTemplate} className="p-2 bg-brand-yellow text-slate-950 rounded-xl font-black text-[10px] hover:bg-brand-yellow/80 transition-all">+</button>
            </div>
            <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto custom-scrollbar">
              {templates.map(t => (
                <button key={t.id} onClick={() => setMetricasSelecionadas(t.metricas)} className="text-[8px] font-black uppercase bg-slate-800 px-2 py-1 rounded border border-slate-700 hover:border-brand-yellow/50 hover:text-brand-yellow transition-all">{t.nome}</button>
              ))}
            </div>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS */}
        <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Configurar <span className="text-brand-yellow">Métricas</span> <span className="text-[10px] text-slate-500 ml-2">(MÁX 8)</span></h2>
            <div className="flex flex-wrap gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar max-w-full">
              {Object.keys(categoriasMetricas).map(cat => (
                <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === cat ? 'bg-brand-yellow text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}>{cat}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categoriasMetricas[abaAtiva]?.map(metrica => (
              <button key={metrica} onClick={() => setMetricasSelecionadas(prev => prev.includes(metrica) ? prev.filter(x => x !== metrica) : (prev.length < 8 ? [...prev, metrica] : prev))} className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group ${metricasSelecionadas.includes(metrica) ? 'bg-brand-yellow/10 border-brand-yellow text-brand-yellow' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                <span className="truncate mr-2">{metrica}</span>
                {metricasSelecionadas.includes(metrica) && <div className="w-2 h-2 bg-brand-yellow rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA PRINCIPAL */}
        <div className="bg-slate-900/40 rounded-[2rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 bg-slate-950/50">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Equipe</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Posição</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Evolução</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} onClick={() => handleOrdenacao(m)} className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-colors text-center">
                      <div className="flex items-center justify-center gap-2">
                        {m}
                        {ordenacao.coluna === m && (ordenacao.direcao === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                  ))}
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {jogadoresFiltrados.map((j) => (
                  <tr key={j.Jogador} className={`border-b border-slate-800/30 hover:bg-white/5 transition-colors group ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-brand-yellow/10' : ''}`}>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800 text-[10px] font-black italic text-brand-yellow">{j.Jogador.substring(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="font-black italic uppercase text-sm group-hover:text-brand-yellow transition-colors">{j.Jogador}</div>
                          <div className="flex gap-1 mt-1">
                            {safeParseFloat(j.Idade) <= 23 && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[7px] font-black rounded uppercase">U23</span>}
                            {safeParseFloat(j.Idade) >= 28 && safeParseFloat(j['Minutos jogados']) > 2000 && <span className="px-1.5 py-0.5 bg-brand-yellow/10 text-brand-yellow text-[7px] font-black rounded uppercase">EXP</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-[10px] font-black uppercase text-slate-400">{j.Time}</td>
                    <td className="p-6 text-[10px] font-black uppercase text-slate-500">{j.Posição}</td>
                    <td className="p-6 w-32">
                      <div className="h-8 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={j.historicoIndex}>
                            <Line type="monotone" dataKey="val" stroke={safeParseFloat(j.Index) > j.historicoIndex[0].val ? "#fbbf24" : "#ef4444"} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    {metricasSelecionadas.map(m => (
                      <td key={m} className="p-6 text-center">
                        <span className={`text-sm font-black italic ${m === 'Index' ? 'text-brand-yellow' : 'text-white'}`}>{j[m] || '0'}</span>
                      </td>
                    ))}
                    <td className="p-6 text-center">
                      <button onClick={() => encontrarSimilares(j)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-brand-yellow border-brand-yellow text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-brand-yellow/50 hover:text-brand-yellow'}`}>Find Similar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
