'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { cleanData } from '../utils/dataCleaner'

export default function CentralDados() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtroPosicao, setFiltroPosicao] = useState([])
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)
  const [metricasSelecionadas, setMetricasSelecionadas] = useState(['MINUTOS JOGADOS', 'GOLS', 'ASSISTÊNCIAS'])
  const [templates, setTemplates] = useState({})
  const [novoTemplateNome, setNovoTemplateNome] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState('ATAQUE')
  const [atletaReferencia, setAtletaReferencia] = useState(null)
  const [comparisonModal, setComparisonModal] = useState({ open: false, player1: null, player2: null })

  const CATEGORIAS = {
    'ATAQUE': ['GOLS', 'ASSISTÊNCIAS', 'CHANCES DE GOL', 'CHANCES COM SUCESSO', 'CHANCES C/ SUCESSO, %', 'CHANCES CRIADAS', 'CHUTES', 'CHUTES/GOL', 'XG', 'CHUTES NO GOL, %', 'CHUTES/FORA', 'HEADER', 'TIROS / POSTE', 'ENTRADAS NO TERÇO FINAL', 'ENTRADAS NO TERÇO FINAL ATRAVÉS DE PASSES', 'ENTRADAS NO TERÇO FINAL ATRAVÉS DE PASSE, % DO TOTAL', 'ENTRADAS NO TERÇO FINAL CARREGANDO A BOLA', 'ENTRADAS NO TERÇO FINAL CARREGANDO A BOLA, % DO TOTAL', 'XA'],
    'DEFESA': ['DUELOS DEFENSIVOS', 'DUELOS DEFENSIVOS GANHOS', 'DUELOS DEFENSIVOS GANHOS, %', 'DUELOS AÉREOS', 'DUELOS AÉREOS GANHOS', 'DUELOS AÉREOS GANHOS, %', 'DESARMES', 'DESARMES COM SUCESSO', 'DESARMES BEM SUCEDIDOS, %', 'INTERCEPTAÇÕES', 'BLOQUEIOS', 'CORTES', 'RECUPERAÇÕES DE BOLA', 'RECUPERAÇÕES DE BOLA NO CAMPO ADVERSÁRIO', 'FALTAS COMETIDAS', 'CARTÕES AMARELOS', 'CARTÕES VERMELHOS'],
    'PASSES & CRIAÇÃO': ['PASSES', 'PASSES CERTOS', 'PASSES CERTOS, %', 'PASSES LONGOS', 'PASSES LONGOS CERTOS', 'PASSES LONGOS CERTOS, %', 'PASSES PARA O TERÇO FINAL', 'PASSES PARA O TERÇO FINAL CERTOS', 'PASSES PARA O TERÇO FINAL CERTOS, %', 'PASSES PARA A ÁREA', 'PASSES PARA A ÁREA CERTOS', 'PASSES PARA A ÁREA CERTOS, %', 'PASSES PROGRESSIVOS', 'PASSES PROGRESSIVOS CERTOS', 'PASSES PROGRESSIVOS CERTOS, %', 'CRUZAMENTOS', 'CRUZAMENTOS CERTOS', 'CRUZAMENTOS CERTOS, %'],
    'POSSE & CONTROLE': ['TOQUES NA BOLA', 'DRIBLE', 'DRIBLE COM SUCESSO', 'DRIBLE COM SUCESSO, %', 'PERDAS DE BOLA', 'PERDAS DE BOLA NO PRÓPRIO CAMPO', 'CORRIDAS PROGRESSIVAS', 'FALTAS SOFRIDAS', 'OFFSIDES'],
    'FÍSICO & DUELOS': ['DUELOS TOTAIS', 'DUELOS GANHOS', 'DUELOS GANHOS, %', 'ACELERAÇÕES', 'DISTÂNCIA PERCORRIDA', 'SPRINTS'],
    'GERAL': ['IDADE', 'MINUTOS JOGADOS', 'PARTIDAS JOGADAS', 'TITULARIDADES', 'SUBSTITUIÇÕES', 'VALOR DE MERCADO', 'CONTRATO ATÉ', 'ID_ATLETA']
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vS6y_t067m-f-p0M7r_9XmO5eYp-o0E_3m5Wv0E_o0E_o0E_o0E_o0E_o0E_o0E_o0E_o0E_o0E_o0E/pub?output=csv')
        const reader = response.body.getReader()
        const result = await reader.read()
        const decoder = new TextDecoder('utf-8')
        const csv = decoder.decode(result.value)
        
        Papa.parse(csv, {
          header: true,
          complete: (results) => {
            const cleaned = cleanData(results.data)
            setJogadores(cleaned)
            setCarregando(false)
          }
        })
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        setCarregando(false)
      }
    }
    fetchData()

    const savedTemplates = localStorage.getItem('metricasTemplates')
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates))
  }, [])

  const handleSalvarTemplate = () => {
    if (!novoTemplateNome.trim()) return
    const updated = { ...templates, [novoTemplateNome]: metricasSelecionadas }
    setTemplates(updated)
    localStorage.setItem('metricasTemplates', JSON.stringify(updated))
    setNovoTemplateNome('')
  }

  const handleToggleMetrica = (metrica) => {
    if (metricasSelecionadas.includes(metrica)) {
      setMetricasSelecionadas(metricasSelecionadas.filter(m => m !== metrica))
    } else {
      if (metricasSelecionadas.length < 8) {
        setMetricasSelecionadas([...metricasSelecionadas, metrica])
      }
    }
  }

  const listaParaExibir = useMemo(() => {
    return jogadores.filter(j => {
      const matchBusca = j.Jogador?.toLowerCase().includes(busca.toLowerCase())
      const matchTime = filtroTime === 'todos' || j.Time === filtroTime || j.Equipe === filtroTime
      const matchPos = filtroPosicao.length === 0 || filtroPosicao.includes(j.Posição?.trim().toUpperCase())
      const idade = parseInt(j.Idade) || 0
      const matchIdade = idade >= filtroIdade.min && idade <= filtroIdade.max
      const matchMinutos = (parseInt(j['MINUTOS JOGADOS']) || 0) >= filtroMinutagem
      return matchBusca && matchTime && matchPos && matchIdade && matchMinutos
    }).map(j => {
      if (atletaReferencia) {
        let scoreTotal = 0
        let count = 0
        metricasSelecionadas.forEach(m => {
          const valRef = parseFloat(atletaReferencia[m]) || 0
          const valAtleta = parseFloat(j[m]) || 0
          if (valRef > 0) {
            const diff = 1 - Math.abs(valRef - valAtleta) / valRef
            scoreTotal += Math.max(0, diff)
            count++
          }
        })
        return { ...j, similaridade: count > 0 ? (scoreTotal / count) * 100 : 0 }
      }
      return j
    }).sort((a, b) => (atletaReferencia ? b.similaridade - a.similaridade : 0))
  }, [jogadores, busca, filtroTime, filtroPosicao, filtroIdade, filtroMinutagem, atletaReferencia, metricasSelecionadas])

  const times = useMemo(() => {
    const uniqueTimes = new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))
    return ['todos', ...Array.from(uniqueTimes).sort()]
  }, [jogadores])

  const posicoes = useMemo(() => {
    const uniquePos = new Set(jogadores.map(j => (j.Posição || '').trim().toUpperCase()).filter(Boolean))
    return Array.from(uniquePos).sort();
  }, [jogadores])

  const exportarPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4')
      doc.setFontSize(16)
      doc.text('RELATÓRIO TÉCNICO - NOVORIZONTINO', 14, 20)
      doc.setFontSize(10)
      doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 28)
      
      const head = [['Jogador', 'Equipe', 'Posição', ...metricasSelecionadas]]
      const body = listaParaExibir.map(j => [
        j.Jogador, 
        j.Time || j.Equipe, 
        j.Posição, 
        ...metricasSelecionadas.map(m => j[m] || '0')
      ])
      
      doc.autoTable({ 
        head, 
        body, 
        startY: 35, 
        theme: 'grid', 
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [20, 20, 20] }
      })
      doc.save('relatorio-novorizontino.pdf')
    } catch (e) {
      console.error('Erro PDF:', e)
      alert('Erro ao gerar PDF. Verifique o console.')
    }
  }

  const exportComparisonPDF = () => {
    try {
      const { player1, player2 } = comparisonModal
      if (!player1 || !player2) return

      const doc = new jsPDF('p', 'mm', 'a4')
      doc.setFontSize(18)
      doc.text('COMPARAÇÃO HEAD-TO-HEAD', 105, 20, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text(`${player1.Jogador} vs ${player2.Jogador}`, 105, 30, { align: 'center' })

      const metrics = metricasSelecionadas.length > 0 ? metricasSelecionadas : ['GOLS', 'ASSISTÊNCIAS', 'MINUTOS JOGADOS', 'XG', 'XA']
      
      const head = [['Métrica', player1.Jogador, player2.Jogador]]
      const body = metrics.map(m => {
        const val1 = parseFloat(player1[m]) || 0
        const val2 = parseFloat(player2[m]) || 0
        return [m, val1.toString(), val2.toString()]
      })

      doc.autoTable({
        head,
        body,
        startY: 40,
        theme: 'striped',
        headStyles: { fillColor: [251, 191, 36], textColor: [0, 0, 0] },
        styles: { fontSize: 10, cellPadding: 5 }
      })

      doc.save(`comparacao-${player1.Jogador}-${player2.Jogador}.pdf`)
    } catch (e) {
      console.error('Erro PDF Comparação:', e)
      alert('Erro ao gerar PDF de comparação.')
    }
  }

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-brand-yellow font-black italic uppercase animate-pulse">Carregando Inteligência de Dados...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">Central de <span className="text-brand-yellow">Dados</span></h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push('/central-dados/rankings')} className="px-6 py-3 bg-brand-yellow text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all border-2 border-brand-yellow shadow-[0_0_20px_rgba(251,191,36,0.2)]">Rankings</button>
            <button onClick={() => router.push('/central-dados/goleiros')} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-800 hover:border-brand-yellow transition-all">Goleiros</button>
            <button onClick={() => router.push('/central-dados/graficos')} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-800 hover:border-brand-yellow transition-all">Gráficos</button>
            <button onClick={() => router.push('/central-dados/benchmark')} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-800 hover:border-brand-yellow transition-all">Benchmark</button>
            <button onClick={exportarPDF} className="px-6 py-3 bg-slate-100 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">PDF Clean</button>
          </div>
        </div>

        {/* FILTROS PRINCIPAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Buscar Atleta</h3>
            <input type="text" placeholder="NOME DO ATLETA..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50 transition-all" />
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtrar Time</h3>
            <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50 transition-all appearance-none">
              {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 lg:col-span-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Posição</h3>
            <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto custom-scrollbar p-1">
              {posicoes.map(p => (
                <button key={p} onClick={() => setFiltroPosicao(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${filtroPosicao.includes(p) ? 'bg-brand-yellow text-slate-950 border-brand-yellow' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-brand-yellow/30'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 text-center">Idade</h3>
              <div className="flex items-center gap-2">
                <input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[10px] font-black text-center outline-none focus:border-brand-yellow/50" />
                <span className="text-slate-600">/</span>
                <input type="number" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[10px] font-black text-center outline-none focus:border-brand-yellow/50" />
              </div>
            </div>
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 text-center">Minutos Jogados (Mín)</h3>
              <input type="number" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[10px] font-black text-center outline-none focus:border-brand-yellow/50" />
            </div>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS */}
        <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 mb-8 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Escolher <span className="text-brand-yellow">Métricas</span></h2>
              <span className="px-3 py-1 bg-brand-yellow/10 text-brand-yellow rounded-full text-[10px] font-black">{metricasSelecionadas.length}/8</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setMetricasSelecionadas([])} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-yellow transition-colors">Desmarcar Tudo</button>
              <div className="h-4 w-px bg-slate-800"></div>
              <div className="flex items-center gap-2">
                {Object.keys(CATEGORIAS).map(cat => (
                  <button key={cat} onClick={() => setCategoriaAtiva(cat)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${categoriaAtiva === cat ? 'bg-brand-yellow text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-500 hover:border-brand-yellow/30'}`}>{cat}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {CATEGORIAS[categoriaAtiva].map(m => (
              <button key={m} onClick={() => handleToggleMetrica(m)} className={`p-4 rounded-2xl text-[9px] font-black uppercase tracking-tight text-left transition-all border-2 ${metricasSelecionadas.includes(m) ? 'bg-brand-yellow/10 border-brand-yellow text-brand-yellow' : 'bg-slate-950/50 border-slate-800/50 text-slate-500 hover:border-brand-yellow/30'}`}>{m}</button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-800/50">
            <input type="text" placeholder="NOME DO TEMPLATE..." value={novoTemplateNome} onChange={e => setNovoTemplateNome(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-brand-yellow/50 w-64" />
            <button onClick={handleSalvarTemplate} className="px-6 py-2 bg-slate-100 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">Salvar Template</button>
            <div className="flex gap-2">
              {Object.keys(templates).map(t => (
                <button key={t} onClick={() => setMetricasSelecionadas(templates[t])} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-brand-yellow transition-all">{t}</button>
              ))}
            </div>
          </div>
        </div>

        {/* TABELA PRINCIPAL */}
        <div className="bg-slate-900/20 rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800/50">
                  <th className="p-8 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</th>
                  <th className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Evolução</th>
                  <th className="p-8 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Equipe</th>
                  <th className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Pos</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-brand-yellow italic">{m}</th>
                  ))}
                  <th className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {listaParaExibir.length > 0 ? listaParaExibir.map((j, idx) => (
                  <tr key={idx} className="group transition-all hover:bg-white/[0.02]">
                    <td className="p-8">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 group-hover:border-brand-yellow/30 transition-all uppercase">
                          {j.ID_ATLETA || j.Jogador?.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase italic tracking-tight text-white group-hover:text-brand-yellow transition-colors">{j.Jogador}</p>
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">• {j.Idade} anos</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex justify-center">
                        <svg className="w-24 h-8 text-brand-yellow/40 group-hover:text-brand-yellow transition-all" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={`M0 25 Q 25 ${10 + Math.random() * 15}, 50 ${15 + Math.random() * 10} T 100 ${5 + Math.random() * 20}`} strokeLinecap="round" />
                        </svg>
                      </div>
                    </td>
                    <td className="p-8">
                      <span className="text-[11px] font-black uppercase italic text-slate-400">{j.Time || j.Equipe}</span>
                    </td>
                    <td className="p-8 text-center">
                      <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase">{j.Posição}</span>
                    </td>
                    {metricasSelecionadas.map(m => (
                      <td key={m} className="p-8 text-center text-sm font-black italic text-white">{j[m] || '0'}</td>
                    ))}
                    <td className="p-8">
                      <div className="flex items-center justify-center gap-3">
                        {atletaReferencia ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-24 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div className="h-full bg-brand-yellow transition-all duration-1000" style={{ width: `${j.similaridade}%` }}></div>
                            </div>
                            <span className="text-[9px] font-black text-brand-yellow">{j.similaridade.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <button onClick={() => setAtletaReferencia(j)} className="px-4 py-2 bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 rounded-xl text-[10px] font-black uppercase hover:bg-brand-yellow hover:text-slate-950 transition-all">Ativo</button>
                        )}
                        <button onClick={() => setComparisonModal({ open: true, player1: j, player2: null })} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-brand-yellow transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} className="p-20 text-center text-slate-600 font-black uppercase italic tracking-widest">Nenhum atleta filtrado para exibição</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-[10px] font-black uppercase tracking-[1em] text-slate-800">Novorizontino Intelligence Data Center • 2026</p>
        </div>
      </div>

      {/* MODAL DE COMPARAÇÃO - UNIFICADO */}
      {comparisonModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0c10]/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[3rem] border border-slate-800 shadow-2xl p-8 md:p-12 custom-scrollbar">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-brand-yellow">Comparação <span className="text-white">Head-to-Head</span></h2>
              <div className="flex gap-3">
                {comparisonModal.player2 && (
                  <button onClick={exportComparisonPDF} className="px-4 py-2 bg-brand-yellow text-slate-950 rounded-lg text-[10px] font-black uppercase hover:bg-brand-yellow/80 transition-all">
                    📄 Exportar PDF
                  </button>
                )}
                <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="text-slate-500 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              {/* JOGADOR 1 */}
              <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="text-8xl font-black italic">{comparisonModal.player1.ID_ATLETA || '01'}</span>
                </div>
                <h3 className="text-2xl font-black italic uppercase text-white mb-6 relative z-10">{comparisonModal.player1.Jogador}</h3>
                <div className="space-y-3 text-[11px] font-bold uppercase tracking-widest relative z-10">
                  <p className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Time:</span> <span className="text-slate-300">{comparisonModal.player1.Time || comparisonModal.player1.Equipe}</span></p>
                  <p className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Posição:</span> <span className="text-slate-300">{comparisonModal.player1.Posição}</span></p>
                  <p className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Idade:</span> <span className="text-slate-300">{comparisonModal.player1.Idade} anos</span></p>
                  <p className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Minutos:</span> <span className="text-slate-300">{comparisonModal.player1['MINUTOS JOGADOS']}</span></p>
                </div>
              </div>

              {/* JOGADOR 2 */}
              <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800 relative overflow-hidden group min-h-[250px] flex flex-col justify-center">
                {comparisonModal.player2 ? (
                  <>
                    <button onClick={() => setComparisonModal(prev => ({ ...prev, player2: null }))} className="absolute top-4 right-4 text-[9px] font-black uppercase text-slate-600 hover:text-brand-yellow transition-colors">Trocar Atleta</button>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="text-8xl font-black italic">{comparisonModal.player2.ID_ATLETA || '02'}</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase text-white mb-6 relative z-10">{comparisonModal.player2.Jogador}</h3>
                    <div className="space-y-3 text-[11px] font-bold uppercase tracking-widest relative z-10">
                      <p className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Time:</span> <span className="text-slate-300">{comparisonModal.player2.Time || comparisonModal.player2.Equipe}</span></p>
                      <p className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Posição:</span> <span className="text-slate-300">{comparisonModal.player2.Posição}</span></p>
                      <p className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Idade:</span> <span className="text-slate-300">{comparisonModal.player2.Idade} anos</span></p>
                      <p className="flex justify-between border-b border-slate-800/50 pb-2"><span className="text-slate-500">Minutos:</span> <span className="text-slate-300">{comparisonModal.player2['MINUTOS JOGADOS']}</span></p>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-6">Selecione um segundo atleta para comparar</p>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {jogadores.filter(j => j.Jogador !== comparisonModal.player1.Jogador).slice(0, 50).map(j => (
                        <button key={j.Jogador} onClick={() => setComparisonModal(prev => ({ ...prev, player2: j }))} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-brand-yellow hover:text-brand-yellow transition-all text-left flex justify-between">
                          <span>{j.Jogador}</span>
                          <span className="text-slate-600">{j.Time || j.Equipe}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {comparisonModal.player2 && (
              <div className="mt-12 animate-in slide-in-from-bottom duration-500">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-yellow mb-8 text-center">Análise Completa de Métricas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(metricasSelecionadas.length > 0 ? metricasSelecionadas : ['GOLS', 'ASSISTÊNCIAS', 'XG']).map(m => {
                    const val1 = parseFloat(comparisonModal.player1[m]) || 0
                    const val2 = parseFloat(comparisonModal.player2[m]) || 0
                    const total = val1 + val2 || 1
                    const p1 = (val1 / total) * 100
                    const p2 = (val2 / total) * 100
                    
                    return (
                      <div key={m} className="bg-slate-950/30 p-6 rounded-2xl border border-slate-800/50">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4 text-center">{m}</p>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-lg font-black italic ${val1 >= val2 ? 'text-brand-yellow' : 'text-white'}`}>{val1}</span>
                          <span className={`text-lg font-black italic ${val2 >= val1 ? 'text-brand-yellow' : 'text-white'}`}>{val2}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                          <div className="h-full bg-brand-yellow transition-all duration-1000" style={{ width: `${p1}%` }}></div>
                          <div className="h-full bg-slate-700 transition-all duration-1000" style={{ width: `${p2}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fbbf24; }
      `}</style>
    </div>
  )
}
