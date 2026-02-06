'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { cleanData, normalizeTeamName, safeParseFloat } from '../../utils/dataCleaner'
import { calculateRating, getPerfisForPosicao, getDominantPerfil } from '../../utils/ratingSystem'
import { PERFIL_WEIGHTS, POSICAO_TO_PERFIS } from '../../utils/perfilWeights'

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv";

export default function RankingsPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)
  const [perfilAtivo, setPerfilAtivo] = useState(Object.keys(PERFIL_WEIGHTS)[0])
  const [ordenacao, setOrdenacao] = useState({ coluna: 'nota', direcao: 'desc' })

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
            setJogadores(dadosLimpos)
            setCarregando(false)
          },
          error: () => { setCarregando(false); }
        })
      } catch (error) { setCarregando(false); }
    }
    carregarDados()
  }, [])

  // Posições compatíveis com o perfil selecionado
  const posicoesCompativeis = useMemo(() => {
    return Object.entries(POSICAO_TO_PERFIS)
      .filter(([pos, perfis]) => perfis.includes(perfilAtivo))
      .map(([pos]) => pos)
  }, [perfilAtivo])

  // Métricas do perfil selecionado (para exibir na tabela)
  const metricasPerfil = useMemo(() => {
    return Object.keys(PERFIL_WEIGHTS[perfilAtivo] || {})
  }, [perfilAtivo])

  // Pesos do perfil selecionado
  const pesosPerfil = useMemo(() => {
    return PERFIL_WEIGHTS[perfilAtivo] || {}
  }, [perfilAtivo])

  // Jogadores filtrados, com nota calculada e ordenados
  const jogadoresRankeados = useMemo(() => {
    let filtrados = jogadores.filter(j => {
      const pB = (j.Jogador || '').toLowerCase().includes(busca.toLowerCase())
      const pT = filtroTime === 'todos' || j.Time === filtroTime || j.Equipe === filtroTime
      const pP = posicoesCompativeis.includes(j.Posição)
      const idade = safeParseFloat(j.Idade)
      const pI = idade >= filtroIdade.min && idade <= filtroIdade.max
      const pM = safeParseFloat(j['Minutos jogados']) >= filtroMinutagem
      return pB && pT && pP && pI && pM
    })

    const comNota = filtrados.map(j => {
      const nota = calculateRating(j, jogadores, perfilAtivo)
      const dominant = getDominantPerfil(j, jogadores)
      return {
        ...j,
        nota,
        perfilDominante: dominant.perfil,
        notaDominante: dominant.nota
      }
    })

    comNota.sort((a, b) => {
      if (ordenacao.coluna === 'nota') {
        return ordenacao.direcao === 'desc' ? b.nota - a.nota : a.nota - b.nota
      }
      const vA = safeParseFloat(a[ordenacao.coluna]), vB = safeParseFloat(b[ordenacao.coluna])
      if (isNaN(vA)) return ordenacao.direcao === 'asc' ? String(a[ordenacao.coluna]).localeCompare(String(b[ordenacao.coluna])) : String(b[ordenacao.coluna]).localeCompare(String(a[ordenacao.coluna]))
      return ordenacao.direcao === 'asc' ? vA - vB : vB - vA
    })

    return comNota
  }, [jogadores, busca, filtroTime, filtroIdade, filtroMinutagem, perfilAtivo, posicoesCompativeis, ordenacao])

  const times = useMemo(() => ['todos', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))], [jogadores])

  const handleOrdenacao = (coluna) => {
    setOrdenacao(prev => ({ coluna, direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc' }))
  }

  // Agrupar perfis por categoria
  const perfisPorCategoria = useMemo(() => {
    const categorias = {}
    Object.keys(PERFIL_WEIGHTS).forEach(perfil => {
      const cat = perfil.split(' ')[0] // Ex: "Lateral", "Zagueiro", etc.
      if (!categorias[cat]) categorias[cat] = []
      categorias[cat].push(perfil)
    })
    return categorias
  }, [])

  const getNotaColor = (nota) => {
    if (nota >= 8) return 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
    if (nota >= 6.5) return 'bg-blue-500/20 border-blue-500 text-blue-400'
    if (nota >= 5) return 'bg-amber-500/20 border-amber-500 text-amber-400'
    return 'bg-slate-800 border-slate-700 text-slate-500'
  }

  const getNotaLabel = (nota) => {
    if (nota >= 8) return 'ELITE'
    if (nota >= 6.5) return 'BOM'
    if (nota >= 5) return 'REGULAR'
    return 'ABAIXO'
  }

  const getRankBadge = (idx) => {
    if (idx === 0) return 'bg-amber-500 text-slate-950'
    if (idx === 1) return 'bg-slate-400 text-slate-950'
    if (idx === 2) return 'bg-amber-700 text-white'
    return 'bg-slate-800 text-slate-500'
  }

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.text(`RANKING - ${perfilAtivo.toUpperCase()}`, 14, 20)
    const head = [['#', 'Jogador', 'Time', 'Posição', 'Nota', ...metricasPerfil]]
    const body = jogadoresRankeados.map((j, idx) => [
      idx + 1, j.Jogador, j.Time || j.Equipe, j.Posição, j.nota,
      ...metricasPerfil.map(m => j[m] || '0')
    ])
    doc.autoTable({ head, body, startY: 30, theme: 'grid', styles: { fontSize: 7 } })
    doc.save(`ranking-${perfilAtivo.toLowerCase().replace(/\s/g, '-')}.pdf`)
  }

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-emerald-500">Processando Rankings...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/central-dados')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group"><svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
            <div>
              <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                <span className="text-emerald-500">Rankings</span> por Perfil
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Inteligência de Scout baseada em Z-Score</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportarPDF} className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all">Exportar PDF</button>
          </div>
        </div>

        {/* SELETOR DE PERFIL */}
        <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50 mb-8">
          <h2 className="text-lg font-black italic uppercase mb-6">Selecionar <span className="text-emerald-500">Perfil Técnico</span></h2>
          <div className="space-y-4">
            {Object.entries(perfisPorCategoria).map(([categoria, perfis]) => (
              <div key={categoria}>
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">{categoria}s</h3>
                <div className="flex flex-wrap gap-2">
                  {perfis.map(perfil => (
                    <button
                      key={perfil}
                      onClick={() => { setPerfilAtivo(perfil); setOrdenacao({ coluna: 'nota', direcao: 'desc' }); }}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border ${
                        perfilAtivo === perfil
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                          : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-emerald-500/30 hover:text-emerald-400'
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
        <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-emerald-500/20 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black italic uppercase text-emerald-400">{perfilAtivo}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                Posições compatíveis: {posicoesCompativeis.join(', ')} | {jogadoresRankeados.length} atletas encontrados
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {metricasPerfil.map(m => (
                <div key={m} className="bg-slate-950 border border-emerald-500/30 rounded-xl px-4 py-2 flex flex-col items-center">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{m}</span>
                  <span className="text-emerald-400 font-black text-lg">{Math.round(pesosPerfil[m] * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Buscar Atleta</h3>
            <input type="text" placeholder="NOME DO ATLETA..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none" />
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtrar Time</h3>
            <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none">{times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Idade (Min - Max)</h3>
            <div className="flex gap-4">
              <input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold" />
              <input type="number" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold" />
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Minutagem Mínima</h3>
            <input type="number" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold" />
          </div>
        </div>

        {/* TABELA DE RANKING */}
        <div className="bg-slate-900/40 rounded-[2rem] border border-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="p-5 text-[10px] font-black uppercase text-slate-500 w-12">#</th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500 cursor-pointer" onClick={() => handleOrdenacao('Jogador')}>Atleta</th>
              <th className="p-5 text-[10px] font-black uppercase text-emerald-500 cursor-pointer" onClick={() => handleOrdenacao('nota')}>
                Nota {ordenacao.coluna === 'nota' ? (ordenacao.direcao === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500">Nível</th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500 cursor-pointer" onClick={() => handleOrdenacao('Time')}>Equipe</th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500">Pos</th>
              <th className="p-5 text-[10px] font-black uppercase text-slate-500">Perfil Dominante</th>
              {metricasPerfil.map(m => (
                <th key={m} className="p-5 text-[10px] font-black uppercase text-slate-500 hover:text-white cursor-pointer transition-all" onClick={() => handleOrdenacao(m)}>
                  {m} <span className="text-emerald-500/50">({Math.round(pesosPerfil[m] * 100)}%)</span>
                </th>
              ))}
            </tr></thead>
            <tbody>{jogadoresRankeados.map((j, idx) => (
              <tr key={idx} className="border-b border-slate-800/30 hover:bg-emerald-500/5 transition-all group">
                <td className="p-5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${getRankBadge(idx)}`}>
                    {idx + 1}
                  </div>
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-600 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">{j.Jogador.substring(0, 2).toUpperCase()}</div>
                    <div className="flex flex-col">
                      <span className="font-black italic uppercase text-sm group-hover:text-emerald-400 transition-colors">{j.Jogador}</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">• {j.Idade} ANOS</span>
                    </div>
                  </div>
                </td>
                <td className="p-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black italic text-lg border ${getNotaColor(j.nota)}`}>
                    {j.nota}
                  </div>
                </td>
                <td className="p-5">
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${getNotaColor(j.nota)}`}>
                    {getNotaLabel(j.nota)}
                  </span>
                </td>
                <td className="p-5 text-[10px] font-black uppercase text-slate-400">{j.Time || j.Equipe}</td>
                <td className="p-5"><span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-black text-slate-500">{j.Posição}</span></td>
                <td className="p-5">
                  <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${j.perfilDominante === perfilAtivo ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border border-slate-700 text-slate-500'}`}>
                    {j.perfilDominante}
                  </span>
                </td>
                {metricasPerfil.map(m => (
                  <td key={m} className="p-5">
                    <span className="text-xs font-black text-slate-400">{j[m] || '0'}</span>
                  </td>
                ))}
              </tr>
            ))}</tbody>
          </table></div>
        </div>

        {/* LEGENDA */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500"></div><span className="text-[9px] font-black uppercase text-slate-500">Elite (8+)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500"></div><span className="text-[9px] font-black uppercase text-slate-500">Bom (6.5-8)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500"></div><span className="text-[9px] font-black uppercase text-slate-500">Regular (5-6.5)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-700 border border-slate-600"></div><span className="text-[9px] font-black uppercase text-slate-500">Abaixo (&lt;5)</span></div>
        </div>

      </div>
    </div>
  )
}
