'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

export default function CentralGoleirosPage() {
  const router = useRouter()
  const [goleiros, setGoleiros] = useState([])
  const [colunasMetricas, setColunasMetricas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('TODOS')
  const [sortConfig, setSortConfig] = useState({ key: 'Index', direction: 'desc' })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vQlQGKcj7Dv6ziVn4MU-zs6PAJc5WFyjwr0aks9xNdG4rgRw4iwRNFws7lDGXtjNoQHGypQJ4ssSlqM/pub?output=csv&t=${Date.now()}`
        const response = await fetch(url)
        const csvText = await response.text()

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data.length > 0) {
              const headers = Object.keys(results.data[0])
              const metaCols = ['№', 'Jogador', 'Time', 'Idade', 'Altura', 'Peso', 'Nacionalidade', 'Posição']
              const metricas = headers.filter(h => !metaCols.includes(h))
              setColunasMetricas(metricas)
              setGoleiros(results.data.filter(row => row['Jogador'] && row['Jogador'].trim() !== ""))
            }
            setLoading(false)
          }
        })
      } catch (error) {
        console.error("Erro ao carregar goleiros:", error)
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

  const times = useMemo(() => ['TODOS', ...new Set(goleiros.map(g => g.Time))].filter(Boolean).sort(), [goleiros])

  const goleirosFiltrados = useMemo(() => {
    return goleiros.filter(g => {
      const passaBusca = g.Jogador.toLowerCase().includes(busca.toLowerCase())
      const passaTime = filtroTime === 'TODOS' || g.Time === filtroTime
      return passaBusca && passaTime
    })
  }, [goleiros, busca, filtroTime])

  const sortedGoleiros = useMemo(() => {
    let sortable = [...goleirosFiltrados]
    if (sortConfig.key) {
      sortable.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]
        const isNumeric = colunasMetricas.includes(sortConfig.key) || ['Idade', 'Altura', '№'].includes(sortConfig.key)
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
  }, [goleirosFiltrados, sortConfig, colunasMetricas])

  const requestSort = (key) => {
    let direction = 'desc'
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  const medias = useMemo(() => {
    const m = {}
    colunasMetricas.forEach(k => {
      const vals = goleiros.map(g => parseNum(g[k])).filter(v => v > 0)
      m[k] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
    })
    return m
  }, [goleiros, colunasMetricas])

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-10 font-sans">
      <div className="max-w-[1800px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
                Central de <span className="text-emerald-500">Goleiros</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 italic">Análise Especializada de Performance Sob as Traves</p>
            </div>
          </div>

          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="BUSCAR GOLEIRO..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-slate-900/50 border border-slate-800 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none"
            />
            <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)} className="bg-slate-900/50 border border-slate-800 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none">
              {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-slate-900/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800/50">
                  <th onClick={() => requestSort('Jogador')} className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest cursor-pointer hover:text-white transition-colors sticky left-0 bg-slate-950 z-10">GOLEIRO</th>
                  <th onClick={() => requestSort('Time')} className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center cursor-pointer hover:text-white transition-colors">TIME</th>
                  {colunasMetricas.slice(0, 15).map(k => (
                    <th key={k} onClick={() => requestSort(k)} className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center cursor-pointer hover:text-white transition-colors">
                      <div className="flex flex-col items-center gap-1">
                        {k.toUpperCase()}
                        {sortConfig.key === k && <span className="text-emerald-400 text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {sortedGoleiros.map((g, idx) => (
                  <tr key={idx} className="hover:bg-emerald-500/[0.02] transition-all group">
                    <td className="p-6 sticky left-0 bg-[#0d1016] z-10 group-hover:bg-slate-900/90 transition-colors">
                      <div className="flex items-center gap-5">
                        <span className="text-slate-700 font-black italic text-xl w-8">{g['№'] || '-'}</span>
                        <div>
                          <span className="block font-black text-lg text-white group-hover:text-emerald-400 transition-colors leading-tight">{g['Jogador']}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{g['Idade']} ANOS • {g['Altura']}CM</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className="bg-slate-950 px-3 py-1.5 rounded-xl text-[10px] font-black border border-slate-800 text-slate-400">{g['Time']}</span>
                    </td>
                    {colunasMetricas.slice(0, 15).map(k => {
                      const val = parseNum(g[k])
                      const media = medias[k]
                      const percent = (val / (media || 1)) * 100
                      const isGood = val >= media
                      return (
                        <td key={k} className="p-6">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`text-base font-black ${isGood ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {g[k] === '0' || g[k] === '0%' || g[k] === '-' ? '-' : g[k]}
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
    </div>
  )
}
