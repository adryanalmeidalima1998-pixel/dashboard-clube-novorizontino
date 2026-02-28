'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { cleanData, normalizeTeamName, safeParseFloat } from '../utils/dataCleaner'
import { sheetUrl } from '../datasources'

export default function PlantelPage() {
  const router = useRouter()
  const [elenco, setElenco] = useState([])
  const [colunasMetricas, setColunasMetricas] = useState([])
  const [colunasFixas, setColunasFixas] = useState([])
  const [nomeColuna, setNomeColuna] = useState('Jogador')
  const [loading, setLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState({ key: 'Jogador', direction: 'asc' })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = sheetUrl('ELENCO')
        const response = await fetch(url)
        const csvText = await response.text()

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data)
            if (dadosLimpos.length > 0) {
              const primeiroJogador = dadosLimpos[0]
              let colunaNome = 'Jogador'
              if (primeiroJogador['Nome']) colunaNome = 'Nome'
              else if (primeiroJogador['Atleta']) colunaNome = 'Atleta'
              else if (primeiroJogador['Jogador']) colunaNome = 'Jogador'
              setNomeColuna(colunaNome)

              const dadosProcessados = dadosLimpos.map(j => ({
                ...j,
                Jogador: j[colunaNome] || '',
                Time: normalizeTeamName(j.Time || j.Equipe || 'Grêmio Novorizontino')
              }))
              const todasAsColunas = Object.keys(dadosProcessados[0])
              const colunasFixasComuns = ['Jogador', 'Nome', 'Atleta', 'Idade', 'Altura', 'Peso', 'Nacionalidade', 'Posição', 'Time', 'Equipe', 'Data de Nascimento', 'Naturalidade', 'Clubes Anteriores', 'Minutos jogados']
              const colunasFixasDetectadas = todasAsColunas.filter(col => colunasFixasComuns.includes(col))
              const metricas = todasAsColunas.filter(h => !colunasFixasDetectadas.includes(h) && h.trim() !== '')
              setColunasFixas(colunasFixasDetectadas)
              setColunasMetricas(metricas)
              setElenco(dadosProcessados)
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

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento || dataNascimento === '-' || dataNascimento === '') return '-'
    try {
      const partes = String(dataNascimento).split('/')
      if (partes.length !== 3) return '-'
      const dia = parseInt(partes[0], 10)
      const mes = parseInt(partes[1], 10)
      const ano = parseInt(partes[2], 10)
      if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return '-'
      const dataNasc = new Date(ano, mes - 1, dia)
      const dataAtual = new Date()
      let idade = dataAtual.getFullYear() - dataNasc.getFullYear()
      const mesAtual = dataAtual.getMonth()
      const mesNasc = dataNasc.getMonth()
      if (mesAtual < mesNasc || (mesAtual === mesNasc && dataAtual.getDate() < dia)) idade--
      return idade >= 0 ? idade : '-'
    } catch (e) {
      return '-'
    }
  }

  const sortedElenco = useMemo(() => {
    let sortable = [...elenco]
    if (sortConfig.key) {
      sortable.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]
        if (sortConfig.key === 'Idade') {
          aVal = calcularIdade(a['Data de Nascimento'])
          bVal = calcularIdade(b['Data de Nascimento'])
          aVal = aVal === '-' ? 0 : parseInt(aVal, 10)
          bVal = bVal === '-' ? 0 : parseInt(bVal, 10)
        } else {
          const isNumeric = colunasMetricas.includes(sortConfig.key) || ['Altura', 'Peso', 'Idade'].includes(sortConfig.key)
          if (isNumeric) { aVal = parseNum(aVal); bVal = parseNum(bVal) }
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
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc'
    setSortConfig({ key, direction })
  }

  const getCategoria = (pos) => {
    const p = (pos || '').toUpperCase()
    if (p.includes('GOLEIRO') || p.includes('GK') || p === 'GK') return 'Goleiros'
    if (p.includes('ZAGUEIRO') || p.includes('ZAG') || p.includes('DC')) return 'Zagueiros'
    if (p.includes('LATERAL') || p.includes('LD') || p.includes('LE') || p.includes('LAT')) return 'Laterais'
    if (p.includes('DEFENSOR') || p.includes('DEF')) return 'Defensores'
    if (p.includes('VOLANTE') || p.includes('MÉDIO') || p.includes('MEIA') || p.includes('ORGANIZADOR') || p.includes('VOL') || p.includes('MEI') || p.includes('MC') || p.includes('CM') || p.includes('DM') || p.includes('AM') || p.includes('CAM')) return 'Meio-Campistas'
    if (p.includes('ATACANTE') || p.includes('EXTREMO') || p.includes('FINALIZADOR') || p.includes('2º ATACANTE') || p.includes('SEGUNDO ATACANTE') || p.includes('ATK') || p.includes('EXT') || p.includes('ST') || p.includes('CF') || p.includes('RW') || p.includes('LW') || p.includes('FW')) return 'Atacantes'
    return 'Atacantes'
  }

  const grupos = useMemo(() => {
    const g = { 'Goleiros': [], 'Zagueiros': [], 'Laterais': [], 'Defensores': [], 'Meio-Campistas': [], 'Atacantes': [] }
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
    <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
      A carregar Elenco...
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans">
      <div className="max-w-[1800px] mx-auto flex flex-col gap-4">

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
              Elenco 2026
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              Plantel Ativo · {elenco.length} Atletas
            </div>
          </div>
        </header>

        {/* GRUPOS */}
        <div className="space-y-10">
          {['Goleiros', 'Zagueiros', 'Laterais', 'Defensores', 'Meio-Campistas', 'Atacantes'].map(titulo => {
            const jogadores = grupos[titulo]
            return jogadores.length > 0 && (
              <div key={titulo}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-8 w-1.5 bg-amber-500 rounded-full"></div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tight">{titulo}</h2>
                  <span className="text-slate-300 font-black text-3xl opacity-60 ml-auto">{jogadores.length}</span>
                </div>

                <div className="border-2 border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900">
                          <th onClick={() => requestSort('Jogador')} className="p-4 font-black text-slate-300 uppercase text-[9px] tracking-widest cursor-pointer hover:text-amber-400 transition-colors sticky left-0 bg-slate-900 z-10"># JOGADOR</th>
                          {['Posição', 'Data de Nascimento', 'Altura', 'Peso', 'Nacionalidade'].map(col => {
                            if (!colunasFixas.includes(col)) return null
                            return (
                              <th key={col} onClick={() => requestSort(col)} className="p-4 font-black text-slate-300 uppercase text-[9px] tracking-widest text-center cursor-pointer hover:text-amber-400 transition-colors">
                                <div className="flex flex-col items-center gap-1">
                                  {col.substring(0, 12).toUpperCase()}
                                  {sortConfig.key === col && <span className="text-amber-400 text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                                </div>
                              </th>
                            )
                          })}
                          {colunasFixas.includes('Data de Nascimento') && (
                            <th onClick={() => requestSort('Idade')} className="p-4 font-black text-slate-300 uppercase text-[9px] tracking-widest text-center cursor-pointer hover:text-amber-400 transition-colors">
                              <div className="flex flex-col items-center gap-1">
                                IDADE
                                {sortConfig.key === 'Idade' && <span className="text-amber-400 text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                              </div>
                            </th>
                          )}
                          {colunasMetricas.map(k => (
                            <th key={k} onClick={() => requestSort(k)} className="p-4 font-black text-slate-300 uppercase text-[9px] tracking-widest text-center cursor-pointer hover:text-amber-400 transition-colors">
                              <div className="flex flex-col items-center gap-1">
                                {k.substring(0, 8).toUpperCase()}
                                {sortConfig.key === k && <span className="text-amber-400 text-[8px]">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jogadores.map((j, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/60 transition-all group">
                            <td className="p-4 sticky left-0 bg-white z-10 group-hover:bg-amber-50/60 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-black italic text-slate-400 group-hover:bg-amber-100 transition-colors">
                                  {j['Jogador'] ? j['Jogador'].charAt(0) : '-'}
                                </div>
                                <div>
                                  <span className="block font-black text-sm text-black group-hover:text-amber-600 transition-colors leading-tight">{j['Jogador']}</span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{j['Time']}</span>
                                </div>
                              </div>
                            </td>
                            {['Posição', 'Data de Nascimento', 'Altura', 'Peso', 'Nacionalidade'].map(col => {
                              if (!colunasFixas.includes(col)) return null
                              return (
                                <td key={col} className="p-4 text-center text-slate-600 font-bold text-[10px]">
                                  {col === 'Posição' ? (
                                    <span className="bg-amber-50 px-3 py-1.5 rounded-lg text-[10px] font-black border border-amber-200 text-amber-700">{j[col]}</span>
                                  ) : j[col] || '-'}
                                </td>
                              )
                            })}
                            {colunasFixas.includes('Data de Nascimento') && (
                              <td className="p-4 text-center text-slate-600 font-bold">{calcularIdade(j['Data de Nascimento'])}</td>
                            )}
                            {colunasMetricas.map(k => {
                              const val = parseNum(j[k])
                              const media = medias[k]
                              const percent = (val / (media || 1)) * 100
                              const isGood = val >= media
                              return (
                                <td key={k} className="p-4">
                                  <div className="flex flex-col items-center gap-1.5">
                                    <span className={`text-sm font-black ${isGood ? 'text-amber-600' : 'text-slate-400'}`}>
                                      {j[k] === '0' || j[k] === '0%' || j[k] === '-' ? '-' : j[k]}
                                    </span>
                                    <div className="w-10 h-1 bg-slate-200 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all ${isGood ? 'bg-amber-500' : 'bg-slate-300'}`} style={{ width: `${Math.min(percent, 100)}%` }} />
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
          })}
        </div>

        {/* FOOTER */}
        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Grêmio Novorizontino · Performance Hub</span>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

      </div>
    </div>
  )
}
