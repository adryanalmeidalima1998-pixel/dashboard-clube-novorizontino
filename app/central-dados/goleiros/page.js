
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

const GOLEIROS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlQGKcj7Dv6ziVn4MU-zs6PAJc5WFyjwr0aks9xNdG4rgRw4iwRNFws7lDGXtjNoQHGypQJ4ssSlqM/pub?output=csv";

export default function CentralGoleiros() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [todasAsColunas, setTodasAsColunas] = useState([])
  const [categoriasMetricas, setCategoriasMetricas] = useState({})
  const [carregando, setCarregando] = useState(true)
  
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtrosPosicao, setFiltrosPosicao] = useState([])
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)
  
  const [jogadorReferencia, setJogadorReferencia] = useState(null)
  const [jogadoresSimilares, setJogadoresSimilares] = useState([])
  const [ordenacao, setOrdenacao] = useState({ coluna: 'Jogador', direcao: 'asc' })
  const [metricasSelecionadas, setMetricasSelecionadas] = useState(['Index', 'Minutos jogados', 'Defesas', 'Gols sofridos', 'Clean sheets'])
  const [templates, setTemplates] = useState([])
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('Defesa')

  useEffect(() => {
    const templatesArmazenados = localStorage.getItem('metricsTemplates_Goleiros')
    if (templatesArmazenados) { try { setTemplates(JSON.parse(templatesArmazenados)) } catch (e) {} }
  }, [])

  useEffect(() => { localStorage.setItem('metricsTemplates_Goleiros', JSON.stringify(templates)) }, [templates])

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${GOLEIROS_CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            const dadosComHistorico = dados.map(j => {
              const valorAtual = parseValue(j['Index'])
              return { ...j, historicoIndex: [{ val: valorAtual * 0.9 }, { val: valorAtual * 1.1 }, { val: valorAtual * 0.95 }, { val: valorAtual * 1.05 }, { val: valorAtual }] }
            })
            setJogadores(dadosComHistorico)
            if (dados.length > 0) {
              const colunas = Object.keys(dados[0]).filter(col => col && col.trim())
              setTodasAsColunas(colunas)
              setCategoriasMetricas(categorizarMetricas(colunas))
            }
            setCarregando(false)
          }
        })
      } catch (error) { setCarregando(false) }
    }
    carregarDados()
  }, [])

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Defesa': [], 'Passes': [], 'Geral': [] }
    colunas.forEach(metrica => {
      if (['Jogador', 'Time', 'Equipe', 'Posição', 'Idade', '№'].includes(metrica)) return
      if (metrica.includes('Defesa') || metrica.includes('Gol') || metrica.includes('Clean')) categorias['Defesa'].push(metrica)
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

  const handleOrdenacao = (coluna) => setOrdenacao(prev => ({ coluna, direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc' }))

  const encontrarSimilares = (jogador) => {
    if (jogadorReferencia?.Jogador === jogador.Jogador) { setJogadorReferencia(null); setJogadoresSimilares([]); return; }
    setJogadorReferencia(jogador)
    const metricasCalculo = metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Equipe', 'Posição'].includes(m))
    const scores = jogadores.filter(j => j.Jogador !== jogador.Jogador && j.Posição === jogador.Posição).map(j => {
      let dist = 0; metricasCalculo.forEach(m => { const v1 = parseValue(jogador[m]), v2 = parseValue(j[m]); dist += Math.pow(v1 - v2, 2); })
      return { ...j, scoreSimilaridade: 100 / (1 + Math.sqrt(dist)) }
    }).sort((a, b) => b.scoreSimilaridade - a.scoreSimilaridade).slice(0, 5)
    setJogadoresSimilares(scores)
  }

  const jogadoresFiltrados = useMemo(() => {
    if (jogadorReferencia) return [jogadorReferencia, ...jogadoresSimilares]
    let filtrados = jogadores.filter(j => {
      const pB = (j.Jogador || '').toLowerCase().includes(busca.toLowerCase())
      const pT = filtroTime === 'todos' || j.Time === filtroTime || j.Equipe === filtroTime
      const pP = filtrosPosicao.length === 0 || filtrosPosicao.includes(j.Posição)
      const idade = parseValue(j.Idade), pI = idade >= filtroIdade.min && idade <= filtroIdade.max
      const pM = parseValue(j['Minutos jogados']) >= filtroMinutagem
      return pB && pT && pP && pI && pM
    })
    filtrados.sort((a, b) => {
      const vA = parseValue(a[ordenacao.coluna]), vB = parseValue(b[ordenacao.coluna])
      return ordenacao.direcao === 'asc' ? vA - vB : vB - vA
    })
    return filtrados
  }, [jogadores, busca, filtroTime, filtrosPosicao, filtroIdade, filtroMinutagem, ordenacao, jogadorReferencia, jogadoresSimilares])

  const times = useMemo(() => ['todos', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))], [jogadores])
  const posicoes = useMemo(() => [...new Set(jogadores.map(j => j.Posição).filter(Boolean))], [jogadores])

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); doc.text('RELATÓRIO TÉCNICO - GOLEIROS', 14, 20)
    const head = [['Jogador', 'Time', 'Posição', ...metricasSelecionadas]]
    const body = jogadoresFiltrados.map(j => [j.Jogador, j.Time || j.Equipe, j.Posição, ...metricasSelecionadas.map(m => j[m] || '0')])
    doc.autoTable({ head, body, startY: 30, theme: 'grid' }); doc.save('goleiros.pdf')
  }

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-emerald-500">Carregando Goleiros...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/central-dados')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group"><svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
            <div><h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">Central de <span className="text-emerald-500">Goleiros</span></h1></div>
          </div>
          <div className="flex gap-3">
            <button onClick={exportarPDF} className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all">PDF Clean</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Busca & Time</h3>
            <div className="space-y-3">
              <input type="text" placeholder="BUSCAR..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none" />
              <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none">{times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select>
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Posições (Multi)</h3>
            <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-1">
              {posicoes.map(p => <button key={p} onClick={() => setFiltrosPosicao(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition-all ${filtrosPosicao.includes(p) ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>{p}</button>)}
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Idade & Minutagem</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1"><input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold" /></div>
                <div className="flex-1"><input type="number" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold" /></div>
              </div>
              <input type="number" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold" />
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Templates</h3>
            <div className="flex gap-2 mb-2"><input type="text" placeholder="NOME..." value={nomeNovoTemplate} onChange={e => setNomeNovoTemplate(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-[8px] outline-none" /><button onClick={() => { if(nomeNovoTemplate) { setTemplates([...templates, {id: Date.now(), nome: nomeNovoTemplate, metricas: [...metricasSelecionadas]}]); setNomeNovoTemplate(''); } }} className="p-2 bg-emerald-500 text-slate-950 rounded-xl">+</button></div>
            <div className="flex flex-wrap gap-1">{templates.map(t => <button key={t.id} onClick={() => setMetricasSelecionadas(t.metricas)} className="text-[8px] font-black uppercase bg-slate-800 px-2 py-1 rounded hover:text-emerald-400">{t.nome}</button>)}</div>
          </div>
        </div>

        <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50 mb-8">
          <div className="flex justify-between mb-8">
            <h2 className="text-xl font-black italic uppercase">Escolher <span className="text-emerald-500">Métricas</span></h2>
            <div className="flex gap-4">
              <button onClick={() => setMetricasSelecionadas([])} className="text-[10px] font-black uppercase text-slate-500 hover:text-white">Desmarcar Tudo</button>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">{Object.keys(categoriasMetricas).map(cat => <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${abaAtiva === cat ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>{cat}</button>)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">{categoriasMetricas[abaAtiva]?.map(m => <button key={m} onClick={() => setMetricasSelecionadas(prev => prev.includes(m) ? prev.filter(x => x !== m) : (prev.length < 8 ? [...prev, m] : prev))} className={`p-3 rounded-xl border text-[9px] font-black uppercase transition-all text-left flex items-center justify-between ${metricasSelecionadas.includes(m) ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}><span>{m}</span>{metricasSelecionadas.includes(m) && <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>}</button>)}</div>
        </div>

        <div className="bg-slate-900/40 rounded-[2rem] border border-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 cursor-pointer" onClick={() => handleOrdenacao('Jogador')}>Atleta</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500">Evolução</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 cursor-pointer" onClick={() => handleOrdenacao('Time')}>Equipe</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500">Pos</th>
              {metricasSelecionadas.map(m => <th key={m} className="p-6 text-[10px] font-black uppercase text-emerald-500 cursor-pointer" onClick={() => handleOrdenacao(m)}>{m}</th>)}
              <th className="p-6 text-[10px] font-black uppercase text-slate-500">Ações</th>
            </tr></thead>
            <tbody>{jogadoresFiltrados.map((j, idx) => (
              <tr key={idx} className={`border-b border-slate-800/30 hover:bg-emerald-500/5 transition-all group ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-emerald-500/10' : ''}`}>
                <td className="p-6">
                  <div className="flex flex-col">
                    <span className="font-black italic uppercase text-sm group-hover:text-emerald-400">{j.Jogador}</span>
                    <div className="flex gap-1 mt-1">
                      {parseValue(j.Idade) <= 23 && (
                        <span className="px-1 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[7px] font-black text-blue-400 uppercase tracking-tighter" title="Potencial de Revenda">U23</span>
                      )}
                      {parseValue(j['Minutos jogados']) > 1500 && parseValue(j.Idade) > 28 && (
                        <span className="px-1 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[7px] font-black text-amber-400 uppercase tracking-tighter" title="Experiência de Mercado">EXP</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-6"><div className="w-24 h-10"><ResponsiveContainer width="100%" height="100%"><LineChart data={j.historicoIndex}><Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></td>
                <td className="p-6 text-[10px] font-black uppercase text-slate-400">{j.Time || j.Equipe}</td>
                <td className="p-6"><span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-black text-slate-500">{j.Posição}</span></td>
                {metricasSelecionadas.map(m => <td key={m} className="p-6 text-xs font-black text-emerald-400/80">{j[m] || '0'}</td>)}
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <button onClick={() => encontrarSimilares(j)} className={`p-3 rounded-xl border transition-all ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-500 hover:border-emerald-500'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></button>
                    {j.scoreSimilaridade && (
                      <div className="flex flex-col items-center min-w-[40px]">
                        <span className="text-[10px] font-black text-emerald-500 leading-none">{Math.round(j.scoreSimilaridade)}%</span>
                        <span className="text-[7px] text-slate-600 uppercase font-bold tracking-tighter">Match</span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      </div>
    </div>
  )
}
