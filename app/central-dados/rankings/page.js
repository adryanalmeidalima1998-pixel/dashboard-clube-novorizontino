'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { cleanData } from '../../utils/dataCleaner'
import { getPlayerRating, getPlayerDominantPerfil } from '../../utils/ratingSystem'
import { PERFIL_WEIGHTS, POSICAO_TO_PERFIS, PERFIL_DESCRICOES } from '../../utils/perfilWeights'

export default function RankingsPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [perfilAtivo, setPerfilAtivo] = useState('Centroavante Finalizador')
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtroNacionalidades, setFiltroNacionalidades] = useState([])
  const [filtroPosicoes, setFiltroPosicoes] = useState([])
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)
  const [ordenacao, setOrdenacao] = useState({ coluna: 'nota', direcao: 'desc' })
  const [comparisonModal, setComparisonModal] = useState({ open: false, player1: null, player2: null })

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
  }, [])

  const posicoesCompativeis = useMemo(() => {
    return Object.entries(POSICAO_TO_PERFIS)
      .filter(([pos, perfis]) => perfis.includes(perfilAtivo))
      .map(([pos]) => pos)
  }, [perfilAtivo])

  // Inicializa as posições filtradas com as compatíveis do perfil ao trocar de perfil
  useEffect(() => {
    setFiltroPosicoes(posicoesCompativeis)
  }, [posicoesCompativeis])

  const metricasPerfil = useMemo(() => {
    return Object.keys(PERFIL_WEIGHTS[perfilAtivo] || {})
  }, [perfilAtivo])

  const pesosPerfil = useMemo(() => {
    return PERFIL_WEIGHTS[perfilAtivo] || {}
  }, [perfilAtivo])

  const jogadoresRankeados = useMemo(() => {
    const filtrados = jogadores.filter(j => {
      const pos = (j.Posição || '').trim().toUpperCase()
      const nacRaw = (j.Nacionalidade || '').split('/')[0].split(',')[0].split(' ')[0].trim()
      
      const matchPos = filtroPosicoes.length === 0 || filtroPosicoes.includes(pos)
      const matchNac = filtroNacionalidades.length === 0 || filtroNacionalidades.includes(nacRaw)
      const matchBusca = j.Jogador?.toLowerCase().includes(busca.toLowerCase())
      const matchTime = filtroTime === 'todos' || j.Time === filtroTime || j.Equipe === filtroTime
      const idade = parseInt(j.Idade) || 0
      const matchIdade = idade >= filtroIdade.min && idade <= filtroIdade.max
      const matchMinutos = (parseInt(j['MINUTOS JOGADOS']) || 0) >= filtroMinutagem
      
      return matchPos && matchNac && matchBusca && matchTime && matchIdade && matchMinutos
    })

    const rankeados = filtrados.map(j => ({
      ...j,
      nota: getPlayerRating(j, perfilAtivo, jogadores),
      perfilDominante: getPlayerDominantPerfil(j, jogadores)
    }))

    return rankeados.sort((a, b) => {
      const valA = a[ordenacao.coluna] || 0
      const valB = b[ordenacao.coluna] || 0
      return ordenacao.direcao === 'desc' ? valB - valA : valA - valB
    })
  }, [jogadores, perfilAtivo, busca, filtroTime, filtroNacionalidades, filtroPosicoes, filtroIdade, filtroMinutagem, ordenacao])

  const times = useMemo(() => {
    const uniqueTimes = new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))
    return ['todos', ...Array.from(uniqueTimes).sort()]
  }, [jogadores])

  const nacionalidadesDisponiveis = useMemo(() => {
    const nacs = new Set()
    jogadores.forEach(j => {
      if (j.Nacionalidade) {
        const principal = j.Nacionalidade.split('/')[0].split(',')[0].split(' ')[0].trim()
        if (principal && principal !== '-') nacs.add(principal)
      }
    })
    return Array.from(nacs).sort()
  }, [jogadores])

  const todasPosicoes = useMemo(() => {
    const pos = new Set()
    jogadores.forEach(j => {
      if (j.Posição) pos.add(j.Posição.trim().toUpperCase())
    })
    return Array.from(pos).sort()
  }, [jogadores])

  const perfisPorCategoria = {
    'Goleiros': POSICAO_TO_PERFIS['GOLEIRO'] || [],
    'Laterais': [...new Set([...(POSICAO_TO_PERFIS['LATERAL DIREITO'] || []), ...(POSICAO_TO_PERFIS['LATERAL ESQUERDO'] || [])])],
    'Zagueiros': POSICAO_TO_PERFIS['ZAGUEIRO'] || [],
    'Volantes': POSICAO_TO_PERFIS['VOLANTE'] || [],
    'Meias/Médios': [...new Set([...(POSICAO_TO_PERFIS['MÉDIO'] || []), ...(POSICAO_TO_PERFIS['MEIA'] || [])])],
    'Extremos': POSICAO_TO_PERFIS['EXTREMO'] || [],
    'Atacantes': [...new Set([...(POSICAO_TO_PERFIS['ATACANTE'] || []), ...(POSICAO_TO_PERFIS['SEGUNDO ATACANTE'] || [])])]
  }

  const handleOrdenacao = (coluna) => {
    setOrdenacao(prev => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc'
    }))
  }

  const toggleFiltro = (lista, setLista, item) => {
    if (lista.includes(item)) {
      setLista(lista.filter(i => i !== item))
    } else {
      setLista([...lista, item])
    }
  }

  const exportarPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4')
      doc.setFontSize(16)
      doc.text(`RANKING: ${perfilAtivo.toUpperCase()}`, 14, 20)
      doc.setFontSize(10)
      doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 28)
      
      const head = [['Pos', 'Jogador', 'Equipe', 'Idade', 'Nac', 'Nota', ...metricasPerfil]]
      const body = jogadoresRankeados.map((j, idx) => [
        idx + 1,
        j.Jogador,
        j.Time || j.Equipe,
        j.Idade,
        (j.Nacionalidade || '').split('/')[0].split(',')[0].split(' ')[0].trim(),
        j.nota.toFixed(1),
        ...metricasPerfil.map(m => j[m] || '0')
      ])

      doc.autoTable({
        head,
        body,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [251, 191, 36], textColor: [0, 0, 0] }
      })

      doc.save(`ranking-${perfilAtivo.toLowerCase().replace(/ /g, '-')}.pdf`)
    } catch (e) {
      console.error('Erro PDF:', e)
      alert('Erro ao gerar PDF')
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

      const metrics = metricasPerfil.length > 0 ? metricasPerfil : ['GOLS', 'ASSISTÊNCIAS', 'MINUTOS JOGADOS', 'XG', 'XA']
      
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

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-brand-yellow font-black italic uppercase animate-pulse">Processando Rankings...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/central-dados')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                <span className="text-brand-yellow">Rankings</span> por Perfil
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Inteligência de Scout baseada em Z-Score</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportarPDF} className="px-6 py-3 bg-brand-yellow text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all shadow-[0_0_20px_rgba(251,191,36,0.2)]">Exportar PDF</button>
          </div>
        </div>

        {/* SELETOR DE PERFIL */}
        <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 mb-8 shadow-xl">
          <h2 className="text-lg font-black italic uppercase mb-6 tracking-tighter">Selecionar <span className="text-brand-yellow">Perfil Técnico</span></h2>
          <div className="space-y-6">
            {Object.entries(perfisPorCategoria).map(([categoria, perfis]) => (
              <div key={categoria}>
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-3 ml-1">{categoria}</h3>
                <div className="flex flex-wrap gap-2">
                  {perfis.map(perfil => (
                    <button
                      key={perfil}
                      onClick={() => { setPerfilAtivo(perfil); setOrdenacao({ coluna: 'nota', direcao: 'desc' }); }}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${
                        perfilAtivo === perfil
                          ? 'bg-brand-yellow text-slate-950 border-brand-yellow shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                          : 'bg-slate-950/50 border-slate-800/50 text-slate-500 hover:border-brand-yellow/30 hover:text-brand-yellow'
                      }`}
                    >
                      {perfil}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INFO DO PERFIL SELECIONADO */}
        <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-brand-yellow/20 mb-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h3 className="text-3xl font-black italic uppercase text-brand-yellow tracking-tighter">{perfilAtivo}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-yellow rounded-full animate-pulse"></span>
                {jogadoresRankeados.length} atletas encontrados para este perfil
              </p>
              {PERFIL_DESCRICOES[perfilAtivo] && <p className="text-xs text-slate-400 mt-4 italic leading-relaxed">{PERFIL_DESCRICOES[perfilAtivo]}</p>}
            </div>
            <div className="flex flex-wrap gap-3">
              {metricasPerfil.map(m => (
                <div key={m} className="bg-slate-950 border border-brand-yellow/20 rounded-2xl px-6 py-4 flex flex-col items-center shadow-lg">
                  <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest mb-1">{m}</span>
                  <span className="text-brand-yellow font-black text-xl italic">{Math.round(pesosPerfil[m] * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FILTROS AVANÇADOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Busca e Time */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 text-center">Busca e Equipe</h3>
              <div className="space-y-4">
                <input type="text" placeholder="NOME DO ATLETA..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50 transition-all" />
                <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50 appearance-none">
                  {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 text-center">Idade e Minutagem</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black text-center outline-none focus:border-brand-yellow/50" />
                  <span className="text-slate-500 font-black">/</span>
                  <input type="number" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black text-center outline-none focus:border-brand-yellow/50" />
                </div>
                <input type="number" placeholder="MINUTOS MÍNIMOS" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black text-center outline-none focus:border-brand-yellow/50" />
              </div>
            </div>
          </div>

          {/* Nacionalidades Multi-seleção */}
          <div className="lg:col-span-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nacionalidades</h3>
              <button onClick={() => setFiltroNacionalidades([])} className="text-[8px] font-black uppercase text-brand-yellow hover:underline">Limpar</button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
              {nacionalidadesDisponiveis.map(nac => (
                <button
                  key={nac}
                  onClick={() => toggleFiltro(filtroNacionalidades, setFiltroNacionalidades, nac)}
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${
                    filtroNacionalidades.includes(nac)
                      ? 'bg-brand-yellow text-slate-950 border-brand-yellow'
                      : 'bg-slate-950/50 border-slate-800 text-slate-600 hover:border-brand-yellow/30'
                  }`}
                >
                  {nac}
                </button>
              ))}
            </div>
          </div>

          {/* Posições Multi-seleção */}
          <div className="lg:col-span-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Posições</h3>
              <button onClick={() => setFiltroPosicoes([])} className="text-[8px] font-black uppercase text-brand-yellow hover:underline">Limpar</button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
              {todasPosicoes.map(pos => (
                <button
                  key={pos}
                  onClick={() => toggleFiltro(filtroPosicoes, setFiltroPosicoes, pos)}
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${
                    filtroPosicoes.includes(pos)
                      ? 'bg-brand-yellow text-slate-950 border-brand-yellow'
                      : 'bg-slate-950/50 border-slate-800 text-slate-600 hover:border-brand-yellow/30'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TABELA DE RANKING */}
        <div className="bg-slate-900/20 rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800/50">
                  <th className="p-8 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Ranking</th>
                  <th className="p-8 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</th>
                  <th className="p-8 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Equipe</th>
                  <th className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Pos</th>
                  <th className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-brand-yellow cursor-pointer italic" onClick={() => handleOrdenacao('nota')}>Nota</th>
                  {metricasPerfil.map(m => (
                    <th key={m} className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-all" onClick={() => handleOrdenacao(m)}>{m}</th>
                  ))}
                  <th className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {jogadoresRankeados.map((j, idx) => (
                  <tr key={idx} className="group transition-all hover:bg-white/[0.02]">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <span className={`text-2xl font-black italic ${idx < 3 ? 'text-brand-yellow' : 'text-slate-800'}`}>
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col">
                          {idx === 0 && <span className="text-xl">🥇</span>}
                          {idx === 1 && <span className="text-xl">🥈</span>}
                          {idx === 2 && <span className="text-xl">🥉</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 group-hover:border-brand-yellow/30 transition-all uppercase shadow-inner">
                          {j.ID_ATLETA || j.Jogador?.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase italic tracking-tight text-white group-hover:text-brand-yellow transition-colors">{j.Jogador}</p>
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1 flex items-center gap-2">
                            <span>{j.Idade} anos</span>
                            <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                            <span>{(j.Nacionalidade || '').split('/')[0].split(',')[0].split(' ')[0].trim()}</span>
                            <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                            <span className="text-brand-yellow/60">{j.perfilDominante}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <span className="text-[11px] font-black uppercase italic text-slate-400">{j.Time || j.Equipe}</span>
                    </td>
                    <td className="p-8 text-center">
                      <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase">{j.Posição}</span>
                    </td>
                    <td className="p-8 text-center">
                      <div className={`inline-block px-4 py-2 rounded-xl font-black text-lg italic shadow-lg ${
                        j.nota >= 8 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        j.nota >= 6.5 ? 'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20' :
                        j.nota >= 5 ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {j.nota?.toFixed(1)}
                      </div>
                    </td>
                    {metricasPerfil.map(m => (
                      <td key={m} className="p-8 text-center text-sm font-black italic text-white">{j[m] || '0'}</td>
                    ))}
                    <td className="p-8 text-center">
                      <button onClick={() => setComparisonModal({ open: true, player1: j, player2: null })} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 hover:text-brand-yellow hover:border-brand-yellow/30 transition-all shadow-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-[10px] font-black uppercase tracking-[1em] text-slate-900">Novorizontino Scouting Intelligence • 2026</p>
        </div>
      </div>

      {/* MODAL DE COMPARAÇÃO */}
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
                  {(metricasPerfil.length > 0 ? metricasPerfil : ['GOLS', 'ASSISTÊNCIAS', 'XG']).map(m => {
                    const val1 = parseFloat(comparisonModal.player1[m]) || 0
                    const val2 = parseFloat(comparisonModal.player2[m]) || 0
                    const total = (val1 + val2) || 1
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
