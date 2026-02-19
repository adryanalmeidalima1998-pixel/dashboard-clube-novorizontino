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
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv')
        const csv = await response.text()
        
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
      // Pega apenas a nacionalidade principal (antes de / ou ,)
      const nacRaw = (j.Nacionalidade || '').split('/')[0].split(',')[0].trim()
      
      const matchPos = filtroPosicoes.length === 0 || filtroPosicoes.includes(pos)
      const matchNac = filtroNacionalidades.length === 0 || filtroNacionalidades.includes(nacRaw)
      const matchBusca = j.Jogador?.toLowerCase().includes(busca.toLowerCase())
      const matchTime = filtroTime === 'todos' || j.Time === filtroTime || j.Equipe === filtroTime
      const idade = parseInt(j.Idade) || 0
      const matchIdade = idade >= filtroIdade.min && idade <= filtroIdade.max
      const matchMinutos = (parseInt(j['Minutos jogados']) || 0) >= filtroMinutagem
      
      return matchPos && matchNac && matchBusca && matchTime && matchIdade && matchMinutos
    })

    const rankeados = filtrados.map(j => ({
      ...j,
      nota: getPlayerRating(j, jogadores, perfilAtivo),
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
        const principal = j.Nacionalidade.split('/')[0].split(',')[0].trim()
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
        (j.Nacionalidade || '').split('/')[0].split(',')[0].trim(),
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
                    <button key={perfil} onClick={() => setPerfilAtivo(perfil)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${perfilAtivo === perfil ? 'bg-brand-yellow text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-slate-950/50 text-slate-500 hover:text-white border border-slate-800'}`}>{perfil}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTROS AVANÇADOS */}
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
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Contexto (Idade: {filtroIdade.min}-{filtroIdade.max} | Minutos: {filtroMinutagem})</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <input type="range" min="15" max="45" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full accent-brand-yellow" />
                <input type="range" min="15" max="45" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-full accent-brand-yellow" />
              </div>
              <div className="space-y-4">
                <input type="range" min="0" max="3500" step="100" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value))} className="w-full accent-brand-yellow" />
                <div className="flex flex-wrap gap-1">
                  {todasPosicoes.map(p => (
                    <button key={p} onClick={() => toggleFiltro(filtroPosicoes, setFiltroPosicoes, p)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${filtroPosicoes.includes(p) ? 'bg-brand-yellow text-slate-950' : 'bg-slate-950 text-slate-500 hover:text-white border border-slate-800'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 overflow-hidden">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Nacionalidades</h3>
            <div className="max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex flex-wrap gap-1">
                {nacionalidadesDisponiveis.map(nac => (
                  <button key={nac} onClick={() => toggleFiltro(filtroNacionalidades, setFiltroNacionalidades, nac)} className={`px-2 py-1 rounded-md text-[8px] font-black transition-all ${filtroNacionalidades.includes(nac) ? 'bg-brand-yellow text-slate-950' : 'bg-slate-950 text-slate-500 hover:text-white border border-slate-800'}`}>{nac}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* INFO PERFIL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-brand-yellow/10 rounded-2xl flex items-center justify-center text-brand-yellow"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <h3 className="text-sm font-black uppercase italic tracking-tighter">O que é um <span className="text-brand-yellow">{perfilAtivo}</span>?</h3>
            </div>
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase">{PERFIL_DESCRICOES[perfilAtivo] || 'Descrição técnica do perfil selecionado.'}</p>
          </div>

          <div className="lg:col-span-2 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 overflow-hidden">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 ml-1">Métricas do Perfil & Pesos (%)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(pesosPerfil).map(([metrica, peso]) => (
                <div key={metrica} className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 group hover:border-brand-yellow/30 transition-all">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-brand-yellow transition-colors">{metrica}</div>
                  <div className="flex items-end justify-between">
                    <div className="text-xl font-black italic text-white leading-none">{(peso * 100).toFixed(0)}<span className="text-[10px] ml-0.5 text-brand-yellow">%</span></div>
                    <div className="w-1.5 h-6 bg-slate-800 rounded-full overflow-hidden"><div className="w-full bg-brand-yellow" style={{ height: `${peso * 100}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABELA RANKING */}
        <div className="bg-slate-900/20 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50">
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Rank</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" onClick={() => handleOrdenacao('Jogador')}>Atleta</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Equipe</th>
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" onClick={() => handleOrdenacao('Idade')}>Idade</th>
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Nac</th>
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-brand-yellow cursor-pointer" onClick={() => handleOrdenacao('nota')}>Nota Perfil</th>
                  {metricasPerfil.map(m => (
                    <th key={m} className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">{m}</th>
                  ))}
                  <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {jogadoresRankeados.map((j, idx) => (
                  <tr key={idx} className="group hover:bg-brand-yellow/[0.02] transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        {idx < 3 ? (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-black ${idx === 0 ? 'bg-brand-yellow text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'}`}>
                            {idx + 1}
                          </div>
                        ) : (
                          <span className="text-[12px] font-black text-slate-600 ml-3">{idx + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-700 group-hover:border-brand-yellow/50 transition-all">{j.Jogador?.substring(0,2).toUpperCase()}</div>
                        <div>
                          <div className="text-sm font-black uppercase italic tracking-tighter group-hover:text-brand-yellow transition-colors leading-none mb-1">{j.Jogador}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ID: {j.ID_ATLETA || '-'}</span>
                            <span className="px-1.5 py-0.5 bg-slate-900 rounded text-[8px] font-black text-brand-yellow/70 border border-slate-800 uppercase tracking-tighter">{j.perfilDominante?.perfil}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{j.Time || j.Equipe}</span></td>
                    <td className="p-6 text-center font-black italic text-slate-400">{j.Idade}</td>
                    <td className="p-6 text-center font-black text-[10px] uppercase text-slate-500">{(j.Nacionalidade || '').split('/')[0].split(',')[0].trim()}</td>
                    <td className="p-6 text-center">
                      <div className={`inline-block px-4 py-2 rounded-xl text-sm font-black italic shadow-lg ${j.nota >= 8 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : j.nota >= 6.5 ? 'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20' : j.nota >= 5 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {j.nota.toFixed(1)}
                      </div>
                    </td>
                    {metricasPerfil.map(m => (
                      <td key={m} className="p-6 text-center"><span className="text-sm font-black italic tabular-nums text-slate-400 group-hover:text-white transition-colors">{j[m] || '0'}</span></td>
                    ))}
                    <td className="p-6 text-right">
                      <button 
                        onClick={() => {
                          const p2 = jogadoresRankeados.find(atleta => atleta.Jogador !== j.Jogador);
                          if (p2) setComparisonModal({ open: true, player1: j, player2: p2 });
                        }}
                        className="px-4 py-2 bg-slate-900 text-slate-500 hover:text-brand-yellow border border-slate-800 hover:border-brand-yellow rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                      >VS</button>
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
                  {metricasPerfil.map(m => {
                    const v1 = parseFloat(comparisonModal.player1[m]) || 0
                    const v2 = parseFloat(comparisonModal.player2[m]) || 0
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
