'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

export default function PlantelPage() {
  const router = useRouter()
  const [elenco, setElenco] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState({ key: 'Index', direction: 'desc' })

  // Mapeamento exato das colunas do CSV para o objeto do Jogador
  const MAP_COLUMNS = {
    numero: '№',
    nome: 'Jogador',
    idade: 'Idade',
    altura: 'Altura',
    nacionalidade: 'Nacionalidade',
    posicao: 'Posição',
    index: 'Index',
    partidas: 'Partidas jogadas',
    gols: 'Gols',
    acoes_sucesso: 'Ações / com sucesso %',
    passes_precisos: 'Passes precisos %',
    dribles: 'Dribles bem sucedidos',
    desafios: 'Desafios vencidos, %',
    minutos: 'Minutos jogados'
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // URL do NOVO CSV (sempre forçando a versão mais recente)
        const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTmwbp8vD9bx7WhL_CMwZqwI_5k6Uol2qCGY_DiViTs-OdDTzMuWHeeGFwXARGGgvPzMZVuPgKwkXqm/pub?output=csv&t=${Date.now()}`
        const response = await fetch(url)
        const csvText = await response.text()

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data
              .filter(row => row[MAP_COLUMNS.nome] && row[MAP_COLUMNS.nome].trim() !== "")
              .map(row => ({
                numero: row[MAP_COLUMNS.numero] || '-',
                nome: row[MAP_COLUMNS.nome],
                idade: row[MAP_COLUMNS.idade] || '-',
                altura: row[MAP_COLUMNS.altura] || '-',
                nacionalidade: row[MAP_COLUMNS.nacionalidade] || 'BRA',
                posicao: row[MAP_COLUMNS.posicao] || '-',
                index: row[MAP_COLUMNS.index] || '-',
                partidas: row[MAP_COLUMNS.partidas] || '0',
                gols: row[MAP_COLUMNS.gols] || '0',
                acoes_sucesso: row[MAP_COLUMNS.acoes_sucesso] || '0%',
                passes_precisos: row[MAP_COLUMNS.passes_precisos] || '0%',
                dribles: row[MAP_COLUMNS.dribles] || '0',
                desafios: row[MAP_COLUMNS.desafios] || '0%',
                minutos: row[MAP_COLUMNS.minutos] || '0'
              }))
            setElenco(parsedData)
            setLoading(false)
          }
        })
      } catch (error) {
        console.error("Erro ao carregar elenco:", error)
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const parseNum = (val) => {
    if (!val || val === '-' || val === 'nan') return 0
    const clean = String(val).replace('%', '').replace(',', '.')
    return parseFloat(clean) || 0
  }

  const sortedElenco = useMemo(() => {
    let sortable = [...elenco]
    if (sortConfig.key) {
      sortable.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]

        const numericKeys = ['index', 'partidas', 'gols', 'acoes_sucesso', 'passes_precisos', 'dribles', 'desafios', 'minutos', 'idade', 'altura']
        if (numericKeys.includes(sortConfig.key)) {
          aVal = parseNum(aVal)
          bVal = parseNum(bVal)
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortable
  }, [elenco, sortConfig])

  const requestSort = (key) => {
    let direction = 'desc'
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  const getCategoria = (pos) => {
    const p = (pos || '').toUpperCase()
    if (p.includes('GK') || p.includes('GOL')) return 'Goleiros'
    if (p.includes('DEF') || p.includes('ZAG') || p.includes('LAT') || p.includes('LD') || p.includes('LE') || p.includes('DC') || p.includes('DR') || p.includes('DL') || p.includes('CD') || p.includes('RD') || p.includes('LCD') || p.includes('RCD')) return 'Defensores'
    if (p.includes('MEI') || p.includes('VOL') || p.includes('MC') || p.includes('DM') || p.includes('AM') || p.includes('CAM') || p.includes('CM') || p.includes('MID') || p.includes('RCDM') || p.includes('LCDM') || p.includes('LCM') || p.includes('RCM') || p.includes('RDM')) return 'Meio-Campistas'
    return 'Atacantes'
  }

  const grupos = useMemo(() => {
    const g = { 'Goleiros': [], 'Defensores': [], 'Meio-Campistas': [], 'Atacantes': [] }
    sortedElenco.forEach(j => {
      const cat = getCategoria(j.posicao)
      g[cat].push(j)
    })
    return g
  }, [sortedElenco])

  const medias = useMemo(() => {
    const keys = ['index', 'partidas', 'gols', 'acoes_sucesso', 'passes_precisos', 'dribles', 'desafios']
    const m = {}
    keys.forEach(k => {
      const vals = elenco.map(j => parseNum(j[k])).filter(v => v > 0)
      m[k] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
    })
    return m
  }, [elenco])

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-emerald-500 font-black tracking-widest uppercase text-xs italic">Sincronizando Dados...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Moderno */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
                Elenco <span className="text-emerald-500">2026</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Grêmio Novorizontino • Performance Hub
              </p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl p-6 px-10 rounded-[2rem] border border-slate-800 shadow-2xl text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Plantel Ativo</span>
            <span className="text-4xl font-black text-emerald-400 italic">{elenco.length} <span className="text-sm not-italic text-slate-600">ATLETAS</span></span>
          </div>
        </div>

        {/* Listagem por Grupos */}
        <div className="space-y-20">
          {Object.entries(grupos).map(([titulo, jogadores]) => (
            jogadores.length > 0 && (
              <div key={titulo} className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-10 w-2 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tight">{titulo}</h2>
                  <span className="text-slate-700 font-black text-4xl opacity-20 ml-auto">{jogadores.length}</span>
                </div>

                <div className="bg-slate-900/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-slate-800/50">
                          <th onClick={() => requestSort('nome')} className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest cursor-pointer hover:text-white transition-colors sticky left-0 bg-slate-950 z-10"># JOGADOR</th>
                          <th className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center">POS</th>
                          {['index', 'partidas', 'gols', 'acoes_sucesso', 'passes_precisos', 'dribles', 'desafios'].map(k => (
                            <th key={k} onClick={() => requestSort(k)} className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center cursor-pointer hover:text-white transition-colors">
                              <div className="flex flex-col items-center gap-1">
                                {k === 'acoes_sucesso' ? 'AÇÕES %' : k === 'passes_precisos' ? 'PASSES %' : k === 'desafios' ? 'DUELOS %' : k.toUpperCase()}
                                {sortConfig.key === k && <span className="text-emerald-400 text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {jogadores.map((j, idx) => (
                          <tr key={idx} className="hover:bg-emerald-500/[0.02] transition-all group">
                            <td className="p-6 sticky left-0 bg-[#0d1016] z-10 group-hover:bg-slate-900/90 transition-colors">
                              <div className="flex items-center gap-5">
                                <span className="text-slate-700 font-black italic text-xl w-8">{j.numero}</span>
                                <div>
                                  <span className="block font-black text-lg text-white group-hover:text-emerald-400 transition-colors leading-tight">{j.nome}</span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{j.nacionalidade} • {j.idade} ANOS • {j.altura}CM</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-6 text-center">
                              <span className="bg-slate-950 px-3 py-1.5 rounded-xl text-[10px] font-black border border-slate-800 text-emerald-500 shadow-inner">{j.posicao}</span>
                            </td>
                            {['index', 'partidas', 'gols', 'acoes_sucesso', 'passes_precisos', 'dribles', 'desafios'].map(k => {
                              const val = parseNum(j[k])
                              const media = medias[k]
                              const percent = (val / (media || 1)) * 100
                              const isGood = val >= media
                              return (
                                <td key={k} className="p-6">
                                  <div className="flex flex-col items-center gap-2">
                                    <span className={`text-base font-black ${isGood ? 'text-emerald-400' : 'text-slate-500'}`}>
                                      {j[k] === '0' || j[k] === '0%' || j[k] === '-' ? '-' : j[k]}
                                    </span>
                                    <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all duration-1000 ${isGood ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500/30'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                                    </div>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>

        {/* Legenda */}
        <div className="mt-20 flex flex-wrap items-center gap-10 bg-slate-900/20 p-8 rounded-[2.5rem] border border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Acima da Média</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-2 bg-red-500/30 rounded-full"></div>
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Abaixo da Média</span>
          </div>
          <div className="ml-auto text-[10px] text-slate-600 font-bold italic uppercase tracking-widest">
            * Dados sincronizados via Google Sheets API (CSV Engine)
          </div>
        </div>
      </div>
    </div>
  )
}
