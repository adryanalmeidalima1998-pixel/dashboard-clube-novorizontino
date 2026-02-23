'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts'

const SCOUTING_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlQGKcj7Dv6ziVn4MU-zs6PAJc5WFyjwr0aks9xNdG4rgRw4iwRNFws7lDGXtjNoQHGypQJ4ssSlqM/pub?output=csv";

export default function PercentilRadar() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [jogadoresSelecionados, setJogadoresSelecionados] = useState([])
  const [filtroTime, setFiltroTime] = useState('Todos')
  const [busca, setBusca] = useState('')

  // Métricas Neutras (Baseado no documento)
  const metricasNeutras = [
    'Ações atacantes c/ êxito/90', 'Dribles/90', 'Cruzamentos/90', 'Acurácia de cruzamentos %', 
    'xA/90', 'Assist. p/ remate/90', 'Passes progressivos/90', 'Passes p/ terço final/90', 
    'Passes inteligentes/90', 'Passes chave/90', 'Ações defensivas c/ êxito/90', 
    'Duelos defensivos/90', '% duelos defensivos ganhos', 'Interseções/90'
  ]

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${SCOUTING_CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            setJogadores(dados)
            if (dados.length > 0) setJogadoresSelecionados([dados[0].Jogador])
            setCarregando(false)
          }
        })
      } catch (error) { setCarregando(false) }
    }
    carregarDados()
  }, [])

  const parseValue = (val) => {
    if (!val || val === '-' || val === 'nan') return 0
    return parseFloat(String(val).replace('%', '').replace(',', '.')) || 0
  }

  const percentilData = useMemo(() => {
    if (jogadores.length === 0 || jogadoresSelecionados.length === 0) return []

    const data = metricasNeutras.map(metrica => {
      const valores = jogadores.map(j => parseValue(j[metrica])).sort((a, b) => a - b)
      const dataPoint = { subject: metrica.replace('/90', '').replace('Acurácia de ', '').toUpperCase() }
      
      jogadoresSelecionados.forEach(nome => {
        const j = jogadores.find(x => x.Jogador === nome)
        const val = parseValue(j[metrica])
        const index = valores.lastIndexOf(val)
        dataPoint[nome] = (index / (valores.length - 1)) * 100
      })
      return dataPoint
    })
    return data
  }, [jogadores, jogadoresSelecionados])

  const times = useMemo(() => ['Todos', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))].sort(), [jogadores])
  const listaFiltrada = useMemo(() => {
    return jogadores.filter(j => {
      const pT = filtroTime === 'Todos' || (j.Time || j.Equipe) === filtroTime
      const pB = j.Jogador.toLowerCase().includes(busca.toLowerCase())
      return pT && pB
    })
  }, [jogadores, filtroTime, busca])

  const cores = ['#10b981', '#3b82f6', '#f59e0b']

  if (carregando) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
      Calculando Percentis...
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">

        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-3">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button
              onClick={() => router.push('/central-scouting')}
              className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              ← VOLTAR
            </button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Percentil & Radar
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              Raio-X Neutro Métrica a Métrica (0–100)
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* SIDEBAR SELEÇÃO */}
          <div className="lg:col-span-1 space-y-4">
            <div className="border-2 border-slate-200 p-5 rounded-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Filtros</h3>
              <input type="text" placeholder="BUSCAR..." value={busca} onChange={e => setBusca(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-amber-500 mb-3" />
              <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-amber-500">
                {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="border-2 border-slate-200 p-5 rounded-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Atletas ({listaFiltrada.length}) <span className="text-slate-400 font-normal normal-case">— até 2</span></h3>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {listaFiltrada.map(j => (
                  <button
                    key={j.Jogador}
                    onClick={() => {
                      if (jogadoresSelecionados.includes(j.Jogador)) setJogadoresSelecionados(jogadoresSelecionados.filter(x => x !== j.Jogador))
                      else if (jogadoresSelecionados.length < 2) setJogadoresSelecionados([...jogadoresSelecionados, j.Jogador])
                    }}
                    className={`w-full p-3 rounded-xl text-left transition-all border-2 ${jogadoresSelecionados.includes(j.Jogador) ? 'bg-amber-500 border-amber-500 text-black' : 'border-slate-200 text-slate-600 hover:border-amber-400'}`}
                  >
                    <div className="font-black uppercase text-[10px] tracking-tighter">{j.Jogador}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-0.5">{j.Time || j.Equipe}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RADAR E TABELA */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border-2 border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[500px]">
              {jogadoresSelecionados.length > 0 ? (
                <ResponsiveContainer width="100%" height={500}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={percentilData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 8, fontWeight: 900 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    {jogadoresSelecionados.map((nome, idx) => (
                      <Radar key={nome} name={nome} dataKey={nome} stroke={cores[idx]} fill={cores[idx]} fillOpacity={0.25} strokeWidth={2.5} />
                    ))}
                    <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 font-black uppercase tracking-widest text-center text-sm">Selecione até 2 atletas para comparar o raio-x</div>
              )}
            </div>

            {/* TABELA DE PERCENTIS */}
            <div className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
                Percentis por Métrica (0–100) · Base: todos os atletas carregados
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b-2 border-slate-900 bg-slate-900">
                      <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-slate-300">Métrica</th>
                      {jogadoresSelecionados.map((nome, idx) => (
                        <th key={nome} className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-center" style={{ color: cores[idx] }}>{nome}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {percentilData.map((row) => (
                      <tr key={row.subject} className="hover:bg-amber-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-[9px] font-black uppercase text-slate-600">{row.subject}</td>
                        {jogadoresSelecionados.map((nome) => {
                          const v = row[nome] ?? 0
                          const isTop = v >= 85
                          const isMid = v >= 65 && v < 85
                          return (
                            <td key={nome} className="px-4 py-2.5 text-center">
                              <span className={`tabular-nums font-black text-[11px] ${isTop ? 'text-emerald-600' : isMid ? 'text-amber-500' : 'text-slate-500'}`}>
                                {v.toFixed(0)}
                              </span>
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

        {/* FOOTER */}
        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3">
          <button
            onClick={() => router.push('/central-scouting')}
            className="text-slate-500 hover:text-black text-sm font-black uppercase tracking-widest px-4 transition-colors"
          >
            Voltar
          </button>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

      </div>
    </div>
  )
}
