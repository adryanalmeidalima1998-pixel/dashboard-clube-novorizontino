'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { cleanData, safeParseFloat } from '../utils/dataCleaner'
import { columnMapping } from '../utils/column_mapping'

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
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv')
        const csv = await response.text()
        
        Papa.parse(csv, {
          header: true,
          complete: (results) => {
                        const cleaned = cleanData(results.data).map(player => {
              const newPlayer = {};
              for (const key in player) {
                newPlayer[key] = player[key];
              }
              // Apply safeParseFloat to all metric values using the columnMapping
              for (const metricKey in columnMapping) {
                const csvColumnName = columnMapping[metricKey];
                if (newPlayer[csvColumnName] !== undefined) {
                  newPlayer[metricKey] = safeParseFloat(newPlayer[csvColumnName], csvColumnName);
                }
              }
              return newPlayer;
            })
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
            const matchMinutos = (j['MINUTOS JOGADOS'] || 0) >= filtroMinutagem
      return matchBusca && matchTime && matchPos && matchIdade && matchMinutos
    }).map(j => {
      if (atletaReferencia) {
        let scoreTotal = 0
        let count = 0
        metricasSelecionadas.forEach(m => {
                    const valRef = atletaReferencia[m] || 0
                    const valAtleta = j[m] || 0
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
        ...      metricasSelecionadas.map(m => (j[m] !== undefined && j[m] !== null) ? j[m].toString() : '0')
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
                const val1 = player1[m] || 0
                const val2 = player2[m] || 0
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Busca & Time</h3>
            <div className="space-y-3">
              <input type="text" placeholder="BUSCAR ATLETA..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50" />
              <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50">
                {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 md:col-span-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Filtros de Contexto (Idade: {filtroIdade.min}-{filtroIdade.max} | Min: {filtroMinutagem})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <input type="range" min="15" max="45" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full accent-brand-yellow" />
                <input type="range" min="15" max="45" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-full accent-brand-yellow" />
              </div>
              <div className="space-y-4">
                <input type="range" min="0" max="3500" step="100" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value))} className="w-full accent-brand-yellow" />
                <div className="flex flex-wrap gap-1">
                  {posicoes.map(p => (
                    <button key={p} onClick={() => {
                      if (filtroPosicao.includes(p)) setFiltroPosicao(filtroPosicao.filter(pos => pos !== p))
                      else setFiltroPosicao([...filtroPosicao, p])
                    }} className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${filtroPosicao.includes(p) ? 'bg-brand-yellow text-slate-950' : 'bg-slate-950 text-slate-500 hover:text-white'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Templates</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" placeholder="NOME DO TEMPLATE..." value={novoTemplateNome} onChange={e => setNovoTemplateNome(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50" />
                <button onClick={handleSalvarTemplate} className="p-3 bg-brand-yellow text-slate-950 rounded-xl hover:bg-brand-yellow/80 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(templates).map(t => (
                  <button key={t} onClick={() => setMetricasSelecionadas(templates[t])} className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-black hover:border-brand-yellow transition-all uppercase tracking-tighter">{t}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS */}
        <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Escolher <span className="text-brand-yellow">Métricas</span></h2>
              <span className="px-3 py-1 bg-brand-yellow/10 text-brand-yellow rounded-full text-[10px] font-black">{metricasSelecionadas.length}/8</span>
            </div>
            <div className="flex gap-2">
              {Object.keys(CATEGORIAS).map(cat => (
                <button key={cat} onClick={() => setCategoriaAtiva(cat)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoriaAtiva === cat ? 'bg-brand-yellow text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-slate-950/50 text-slate-500 hover:text-white border border-slate-800'}`}>{cat}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIAS[categoriaAtiva].map(metrica => (
              <button key={metrica} onClick={() => handleToggleMetrica(metrica)} className={`group relative p-4 rounded-2xl border transition-all text-left overflow-hidden ${metricasSelecionadas.includes(metrica) ? 'bg-brand-yellow/10 border-brand-yellow/50 shadow-inner' : 'bg-slate-950/40 border-slate-800/50 hover:border-slate-700'}`}>
                <div className={`text-[9px] font-black uppercase tracking-tight leading-tight transition-colors ${metricasSelecionadas.includes(metrica) ? 'text-brand-yellow' : 'text-slate-500 group-hover:text-slate-300'}`}>{metrica}</div>
                {metricasSelecionadas.includes(metrica) && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-yellow rounded-full shadow-[0_0_8px_#fbbf24]" />}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div className="bg-slate-900/20 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50">
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Equipe</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Pos</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-brand-yellow/80">{m}</th>
                  ))}
                  <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {listaParaExibir.map((j, idx) => (
                  <tr key={idx} className={`group hover:bg-brand-yellow/[0.02] transition-colors ${atletaReferencia?.Jogador === j.Jogador ? 'bg-brand-yellow/[0.05]' : ''}`}>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-700 group-hover:border-brand-yellow/50 transition-all">{j.Jogador?.substring(0,2).toUpperCase()}</div>
                        <div>
                          <div className="text-sm font-black uppercase italic tracking-tighter group-hover:text-brand-yellow transition-colors">{j.Jogador}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{j.Idade} ANOS</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{j.Time || j.Equipe}</span></td>
                    <td className="p-6"><span className="px-3 py-1 bg-slate-950 rounded-lg text-[9px] font-black text-slate-500 border border-slate-800">{j.Posição}</span></td>
                    {metricasSelecionadas.map(m => (
                      <td key={m} className="p-6 text-center"><span className="text-sm font-black italic tabular-nums">{j[m] || '0'}</span></td>
                    ))}
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        {atletaReferencia && atletaReferencia.Jogador !== j.Jogador && (
                          <div className="flex items-center gap-3 mr-4">
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-yellow" style={{ width: `${j.similaridade}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-brand-yellow w-8">{Math.round(j.similaridade)}%</span>
                          </div>
                        )}
                        <button onClick={() => setAtletaReferencia(atletaReferencia?.Jogador === j.Jogador ? null : j)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${atletaReferencia?.Jogador === j.Jogador ? 'bg-brand-yellow text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800 hover:border-brand-yellow'}`}>
                          {atletaReferencia?.Jogador === j.Jogador ? 'ATIVO' : 'SIMILAR'}
                        </button>
                        <button 
                          onClick={() => {
                            if (atletaReferencia) {
                              setComparisonModal({ open: true, player1: atletaReferencia, player2: j })
                            } else {
                              alert('Selecione um atleta como referência primeiro!')
                            }
                          }}
                          className="px-4 py-2 bg-slate-900 text-slate-500 hover:text-brand-yellow border border-slate-800 hover:border-brand-yellow rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >VS</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE COMPARAÇÃO */}
      {comparisonModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-[#0d1117] border border-slate-800 w-full max-w-5xl rounded-[3rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Comparação <span className="text-brand-yellow">Head-to-Head</span></h2>
              <div className="flex gap-4">
                <button onClick={exportComparisonPDF} className="px-6 py-2 bg-brand-yellow text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all">Exportar PDF</button>
                <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="p-2 text-slate-500 hover:text-white transition-all"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <div className="w-24 h-24 bg-slate-800 rounded-3xl mx-auto mb-4 border-2 border-brand-yellow flex items-center justify-center text-2xl font-black text-slate-600 shadow-[0_0_30px_rgba(251,191,36,0.1)]">{comparisonModal.player1.Jogador.substring(0,2).toUpperCase()}</div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-brand-yellow">{comparisonModal.player1.Jogador}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{comparisonModal.player1.Time || comparisonModal.player1.Equipe}</p>
                </div>
                
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center text-xl font-black italic text-slate-700">VS</div>
                </div>

                <div className="text-center">
                  <div className="w-24 h-24 bg-slate-800 rounded-3xl mx-auto mb-4 border-2 border-slate-700 flex items-center justify-center text-2xl font-black text-slate-600">{comparisonModal.player2.Jogador.substring(0,2).toUpperCase()}</div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">{comparisonModal.player2.Jogador}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{comparisonModal.player2.Time || comparisonModal.player2.Equipe}</p>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                <div className="space-y-4">
                  {(metricasSelecionadas.length > 0 ? metricasSelecionadas : ['GOLS', 'ASSISTÊNCIAS', 'MINUTOS JOGADOS']).map(m => {
                    const v1 = comparisonModal.player1[m] || 0
                    const v2 = comparisonModal.player2[m] || 0
                    const total = v1 + v2 || 1
                    const p1 = (v1 / total) * 100
                    const p2 = (v2 / total) * 100

                    return (
                      <div key={m} className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-black italic tabular-nums text-brand-yellow">{v1}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m}</span>
                          <span className="text-sm font-black italic tabular-nums text-white">{v2}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-brand-yellow transition-all duration-1000" style={{ width: `${p1}%` }} />
                          <div className="h-full bg-slate-600 transition-all duration-1000" style={{ width: `${p2}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
