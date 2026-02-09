'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { cleanData, normalizeTeamName, safeParseFloat } from '../utils/dataCleaner'

export default function PlantelPage() {
  const router = useRouter()
  const [elenco, setElenco] = useState([])
  const [colunasMetricas, setColunasMetricas] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState({ key: 'Jogador', direction: 'asc' })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTx73GpGdTLkIPTmBfkYujRILN3DmPV5FG2dH4-bbELYZJ4STAIYrOSJ7AOPDOTq_tB0ib_xFKHLiHZ/pub?output=csv&t=${Date.now()}`
        const response = await fetch(url)
        const csvText = await response.text()

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data).map(j => ({
              ...j,
              Time: normalizeTeamName(j.Time || j.Equipe)
            }))
            
            if (dadosLimpos.length > 0) {
              const headers = Object.keys(dadosLimpos[0])
              const metaCols = ['Jogador', 'Idade', 'Altura', 'Nacionalidade', 'Posição', 'Time', 'Minutos jogados']
              const metricas = headers.filter(h => !metaCols.includes(h))
              setColunasMetricas(metricas)
              setElenco(dadosLimpos)
            }
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

        const isNumeric = colunasMetricas.includes(sortConfig.key) || ['Idade', 'Altura'].includes(sortConfig.key)
        if (isNumeric) {
          aVal = parseNum(aVal)
          bVal = parseNum(bVal)
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortable
  }, [elenco, sortConfig, colunasMetricas])

  const requestSort = (key) => {
    let direction = 'desc'
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  // Função melhorada para categorizar posições
  const getCategoria = (pos) => {
    const p = (pos || '').toUpperCase()
    
    // Goleiros
    if (p.includes('GOLEIRO') || p.includes('GK') || p === 'GK') return 'Goleiros'
    
    // Defensores (Laterais e Zagueiros)
    if (p.includes('LATERAL') || p.includes('ZAGUEIRO') || p.includes('DEFENSOR') ||
        p.includes('LD') || p.includes('LE') || p.includes('LAT') || p.includes('DC') || 
        p.includes('ZAG') || p.includes('DEF')) return 'Defensores'
    
    // Meio-Campistas (Volantes, Médios, Organizadores)
    if (p.includes('VOLANTE') || p.includes('MÉDIO') || p.includes('MEIA') || p.includes('ORGANIZADOR') ||
        p.includes('VOL') || p.includes('MEI') || p.includes('MC') || p.includes('CM') || 
        p.includes('DM') || p.includes('AM') || p.includes('CAM')) return 'Meio-Campistas'
    
    // Atacantes (Extremos, Atacantes, 2º Atacante, Finalizadores)
    if (p.includes('ATACANTE') || p.includes('EXTREMO') || p.includes('FINALIZADOR') || 
        p.includes('2º ATACANTE') || p.includes('SEGUNDO ATACANTE') ||
        p.includes('ATK') || p.includes('EXT') || p.includes('ST') || p.includes('CF') || 
        p.includes('RW') || p.includes('LW') || p.includes('FW')) return 'Atacantes'
    
    // Padrão: Atacantes
    return 'Atacantes'
  }

  const grupos = useMemo(() => {
    const g = { 'Goleiros': [], 'Defensores': [], 'Meio-Campistas': [], 'Atacantes': [] }
    sortedElenco.forEach(j => {
      const cat = getCategoria(j['Posição'])
      if (g[cat]) g[cat].push(j)
      else g['Atacantes'].push(j)
    })
    return g
  }, [sortedElenco])

  const medias = useMemo(() => {
    const m = {}
    colunasMetricas.forEach(k => {
      const vals = elenco.map(j => parseNum(j[k])).filter(v => v > 0)
      m[k] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
    })
    return m
  }, [elenco, colunasMetricas])

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin"></div>
        <p className="text-brand-yellow font-black tracking-widest uppercase text-xs italic">Sincronizando Elenco...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Moderno */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                Elenco <span className="text-brand-yellow">2026</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-brand-yellow rounded-full animate-pulse"></span>
                Grêmio Novorizontino • Performance Hub
              </p>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl p-6 px-10 rounded-[2rem] border border-brand-yellow/20 shadow-2xl text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Plantel Ativo</span>
            <span className="text-4xl font-black text-brand-yellow italic">{elenco.length} <span className="text-sm not-italic text-slate-600">ATLETAS</span></span>
          </div>
        </div>

        {/* Listagem por Grupos */}
        <div className="space-y-20">
          {Object.entries(grupos).map(([titulo, jogadores]) => (
            jogadores.length > 0 && (
              <div key={titulo} className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-10 w-2 bg-brand-yellow rounded-full shadow-[0_0_20px_rgba(251,191,36,0.4)]"></div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tight">{titulo}</h2>
                  <span className="text-slate-700 font-black text-4xl opacity-20 ml-auto">{jogadores.length}</span>
                </div>

                <div className="bg-slate-900/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden backdrop-blur-sm shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 border-b border-brand-yellow/20">
                          <th onClick={() => requestSort('Jogador')} className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest cursor-pointer hover:text-brand-yellow transition-colors sticky left-0 bg-slate-950 z-10"># JOGADOR</th>
                          <th className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center">POSIÇÃO</th>
                          <th className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center">IDADE</th>
                          <th className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center">ALTURA</th>
                          <th className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center">NACIONALIDADE</th>
                          {colunasMetricas.slice(0, 8).map(k => (
                            <th key={k} onClick={() => requestSort(k)} className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center cursor-pointer hover:text-brand-yellow transition-colors">
                              <div className="flex flex-col items-center gap-1">
                                {k.substring(0, 8).toUpperCase()}
                                {sortConfig.key === k && <span className="text-brand-yellow text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {jogadores.map((j, idx) => (
                          <tr key={idx} className="hover:bg-brand-yellow/[0.03] transition-all group">
                            <td className="p-6 sticky left-0 bg-[#0d1016] z-10 group-hover:bg-slate-900/90 transition-colors">
                              <div className="flex items-center gap-5">
                                <span className="text-slate-700 font-black italic text-xl w-8">{j['Jogador'] ? j['Jogador'].charAt(0) : '-'}</span>
                                <div>
                                  <span className="block font-black text-lg text-white group-hover:text-brand-yellow transition-colors leading-tight">{j['Jogador']}</span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{j['Time']}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-6 text-center">
                              <span className="bg-slate-950 px-3 py-1.5 rounded-xl text-[10px] font-black border border-brand-yellow/30 text-brand-yellow shadow-inner">{j['Posição']}</span>
                            </td>
                            <td className="p-6 text-center text-slate-400 font-bold">{j['Idade']}</td>
                            <td className="p-6 text-center text-slate-400 font-bold">{j['Altura']}</td>
                            <td className="p-6 text-center text-slate-400 font-bold text-[10px]">{j['Nacionalidade']}</td>
                            {colunasMetricas.slice(0, 8).map(k => {
                              const val = parseNum(j[k])
                              const media = medias[k]
                              const percent = (val / (media || 1)) * 100
                              const isGood = val >= media
                              return (
                                <td key={k} className="p-6">
                                  <div className="flex flex-col items-center gap-2">
                                    <span className={`text-base font-black ${isGood ? 'text-brand-yellow' : 'text-slate-500'}`}>
                                      {j[k] === '0' || j[k] === '0%' || j[k] === '-' ? '-' : j[k]}
                                    </span>
                                    <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all duration-1000 ${isGood ? 'bg-brand-yellow shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'bg-red-500/30'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
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
        <div className="mt-20 flex flex-wrap items-center gap-10 bg-slate-900/20 p-8 rounded-[2.5rem] border border-brand-yellow/20">
          <div className="flex items-center gap-3">
            <div className="w-5 h-2 bg-brand-yellow rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
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
