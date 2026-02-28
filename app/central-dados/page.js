'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { sheetUrl } from '../datasources'
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
        const response = await fetch(sheetUrl('CENTRAL_DADOS'))
        const csv = await response.text()
        Papa.parse(csv, {
          header: true,
          complete: (results) => {
            const cleaned = cleanData(results.data).map(player => {
              const newPlayer = {}
              for (const key in player) newPlayer[key] = player[key]
              for (const metricKey in columnMapping) {
                const csvColumnName = columnMapping[metricKey]
                if (newPlayer[csvColumnName] !== undefined) {
                  newPlayer[metricKey] = safeParseFloat(newPlayer[csvColumnName], csvColumnName)
                }
              }
              return newPlayer
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
      if (metricasSelecionadas.length < 8) setMetricasSelecionadas([...metricasSelecionadas, metrica])
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
        let scoreTotal = 0; let count = 0
        metricasSelecionadas.forEach(m => {
          const valRef = atletaReferencia[m] || 0
          const valAtleta = j[m] || 0
          if (valRef > 0) { const diff = 1 - Math.abs(valRef - valAtleta) / valRef; scoreTotal += Math.max(0, diff); count++ }
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
    return Array.from(uniquePos).sort()
  }, [jogadores])

  const exportarPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4')
      doc.setFontSize(16)
      doc.text('RELATÓRIO TÉCNICO - NOVORIZONTINO', 14, 20)
      doc.setFontSize(10)
      doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 28)
      const head = [['Jogador', 'Equipe', 'Posição', ...metricasSelecionadas]]
      const body = listaParaExibir.map(j => [j.Jogador, j.Time || j.Equipe, j.Posição, ...metricasSelecionadas.map(m => (j[m] !== undefined && j[m] !== null) ? j[m].toString() : '0')])
      doc.autoTable({ head, body, startY: 35, theme: 'grid', styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [15, 23, 42] } })
      doc.save('relatorio-novorizontino.pdf')
    } catch (e) { console.error('Erro PDF:', e); alert('Erro ao gerar PDF.') }
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
      const body = metrics.map(m => [m, (player1[m] || 0).toString(), (player2[m] || 0).toString()])
      doc.autoTable({ head, body, startY: 40, theme: 'striped', headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0] }, styles: { fontSize: 10, cellPadding: 5 } })
      doc.save(`comparacao-${player1.Jogador}-${player2.Jogador}.pdf`)
    } catch (e) { console.error('Erro PDF Comparação:', e); alert('Erro ao gerar PDF de comparação.') }
  }

  if (carregando) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
      A carregar Central de Dados...
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-4">

        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button onClick={() => router.push('/')} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors">
              ← VOLTAR
            </button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Central de Dados
            </div>
            <div className="flex gap-2 mt-1">
              <button onClick={() => router.push('/central-dados/rankings')} className="bg-amber-500 text-black px-3 py-1 rounded-md text-[10px] font-black uppercase hover:bg-amber-600 transition-colors">Rankings</button>
              <button onClick={() => router.push('/central-dados/goleiros')} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-[10px] font-black uppercase hover:bg-slate-300 transition-colors">Goleiros</button>
              <button onClick={() => router.push('/central-dados/graficos')} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-[10px] font-black uppercase hover:bg-slate-300 transition-colors">Gráficos</button>
              <button onClick={() => router.push('/central-dados/benchmark')} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-[10px] font-black uppercase hover:bg-slate-300 transition-colors">Benchmark</button>
              <button onClick={exportarPDF} className="bg-slate-900 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase hover:bg-black transition-colors">PDF</button>
            </div>
          </div>
        </header>

        {/* FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border-2 border-slate-200 rounded-2xl p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Busca & Time</h3>
            <div className="space-y-3">
              <input type="text" placeholder="BUSCAR ATLETA..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-amber-500" />
              <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-amber-500">
                {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="border-2 border-slate-200 rounded-2xl p-5 md:col-span-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Filtros de Contexto (Idade: {filtroIdade.min}-{filtroIdade.max} | Min: {filtroMinutagem})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <input type="range" min="15" max="45" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full accent-amber-500" />
                <input type="range" min="15" max="45" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-full accent-amber-500" />
              </div>
              <div className="space-y-3">
                <input type="range" min="0" max="3500" step="100" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value))} className="w-full accent-amber-500" />
                <div className="flex flex-wrap gap-1">
                  {posicoes.map(p => (
                    <button key={p} onClick={() => {
                      if (filtroPosicao.includes(p)) setFiltroPosicao(filtroPosicao.filter(pos => pos !== p))
                      else setFiltroPosicao([...filtroPosicao, p])
                    }} className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${filtroPosicao.includes(p) ? 'bg-amber-500 text-black' : 'border-2 border-slate-200 text-slate-500 hover:border-amber-400'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-2 border-slate-200 rounded-2xl p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Templates</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" placeholder="NOME DO TEMPLATE..." value={novoTemplateNome} onChange={e => setNovoTemplateNome(e.target.value)} className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black outline-none focus:border-amber-500" />
                <button onClick={handleSalvarTemplate} className="p-2 bg-amber-500 text-black rounded-xl hover:bg-amber-600 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(templates).map(t => (
                  <button key={t} onClick={() => setMetricasSelecionadas(templates[t])} className="px-3 py-1 border-2 border-slate-200 rounded-lg text-[9px] font-black hover:border-amber-400 transition-all uppercase">{t}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS */}
        <div className="border-2 border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
              <h2 className="text-lg font-black italic uppercase tracking-tighter">Escolher Métricas</h2>
              <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-black">{metricasSelecionadas.length}/8</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(CATEGORIAS).map(cat => (
                <button key={cat} onClick={() => setCategoriaAtiva(cat)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${categoriaAtiva === cat ? 'bg-amber-500 text-black' : 'border-2 border-slate-200 text-slate-500 hover:border-amber-400'}`}>{cat}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {CATEGORIAS[categoriaAtiva].map(metrica => (
              <button key={metrica} onClick={() => handleToggleMetrica(metrica)} className={`group relative p-3 rounded-xl border-2 transition-all text-left ${metricasSelecionadas.includes(metrica) ? 'bg-amber-50 border-amber-400' : 'border-slate-200 hover:border-amber-300'}`}>
                <div className={`text-[9px] font-black uppercase tracking-tight leading-tight ${metricasSelecionadas.includes(metrica) ? 'text-amber-700' : 'text-slate-500 group-hover:text-slate-700'}`}>{metrica}</div>
                {metricasSelecionadas.includes(metrica) && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full" />}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA */}
        <div className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
            Central de Dados · {listaParaExibir.length} Atletas
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-900">
                  <th className="p-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-300">Atleta</th>
                  <th className="p-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-300">Equipe</th>
                  <th className="p-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-300">Pos</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} className="p-4 text-center text-[9px] font-black uppercase tracking-widest text-amber-400">{m}</th>
                  ))}
                  <th className="p-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listaParaExibir.map((j, idx) => (
                  <tr key={idx} className={`group hover:bg-amber-50/60 transition-colors ${atletaReferencia?.Jogador === j.Jogador ? 'bg-amber-50/40' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 group-hover:bg-amber-100 transition-colors">{j.Jogador?.substring(0,2).toUpperCase()}</div>
                        <div>
                          <div className="font-black uppercase italic tracking-tight text-[10px] group-hover:text-amber-600 transition-colors">{j.Jogador}</div>
                          <div className="text-[8px] text-slate-400 font-bold">{j.Idade} ANOS</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{j.Time || j.Equipe}</span></td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-amber-50 rounded-lg text-[9px] font-black border border-amber-200 text-amber-700">{j.Posição}</span>
                    </td>
                    {metricasSelecionadas.map(m => (
                      <td key={m} className="p-4 text-center"><span className="text-sm font-black italic tabular-nums">{j[m] || '0'}</span></td>
                    ))}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {atletaReferencia && atletaReferencia.Jogador !== j.Jogador && (
                          <div className="flex items-center gap-2 mr-2">
                            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: `${j.similaridade}%` }} />
                            </div>
                            <span className="text-[9px] font-black text-amber-600 w-8">{Math.round(j.similaridade)}%</span>
                          </div>
                        )}
                        <button onClick={() => setAtletaReferencia(atletaReferencia?.Jogador === j.Jogador ? null : j)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${atletaReferencia?.Jogador === j.Jogador ? 'bg-amber-500 text-black' : 'border-2 border-slate-200 text-slate-500 hover:border-amber-400'}`}>
                          {atletaReferencia?.Jogador === j.Jogador ? 'ATIVO' : 'SIMILAR'}
                        </button>
                        <button onClick={() => {
                          if (atletaReferencia) setComparisonModal({ open: true, player1: atletaReferencia, player2: j })
                          else alert('Selecione um atleta como referência primeiro!')
                        }} className="px-3 py-1 border-2 border-slate-200 text-slate-500 hover:border-amber-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">VS</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Motor de Dados Ativo</span>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

      </div>

      {/* MODAL DE COMPARAÇÃO */}
      {comparisonModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border-2 border-slate-900 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-6 flex justify-between items-center">
              <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Comparação <span className="text-amber-400">Head-to-Head</span></h2>
              <div className="flex gap-3">
                <button onClick={exportComparisonPDF} className="px-4 py-2 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all">Exportar PDF</button>
                <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="p-2 text-slate-400 hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-amber-50 rounded-2xl mx-auto mb-3 border-2 border-amber-400 flex items-center justify-center text-2xl font-black text-amber-600">{comparisonModal.player1.Jogador.substring(0,2).toUpperCase()}</div>
                  <h3 className="text-lg font-black uppercase italic text-amber-600">{comparisonModal.player1.Jogador}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{comparisonModal.player1.Time || comparisonModal.player1.Equipe}</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-lg font-black italic text-white">VS</div>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl mx-auto mb-3 border-2 border-slate-300 flex items-center justify-center text-2xl font-black text-slate-500">{comparisonModal.player2.Jogador.substring(0,2).toUpperCase()}</div>
                  <h3 className="text-lg font-black uppercase italic text-black">{comparisonModal.player2.Jogador}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{comparisonModal.player2.Time || comparisonModal.player2.Equipe}</p>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                {(metricasSelecionadas.length > 0 ? metricasSelecionadas : ['GOLS', 'ASSISTÊNCIAS', 'MINUTOS JOGADOS']).map(m => {
                  const v1 = comparisonModal.player1[m] || 0
                  const v2 = comparisonModal.player2[m] || 0
                  const total = v1 + v2 || 1
                  const p1 = (v1 / total) * 100
                  return (
                    <div key={m} className="border-2 border-slate-200 p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-black italic tabular-nums text-amber-600">{v1}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m}</span>
                        <span className="text-sm font-black italic tabular-nums text-black">{v2}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${p1}%` }} />
                        <div className="h-full bg-slate-300 transition-all duration-700" style={{ width: `${100 - p1}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
