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

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-emerald-500 font-black italic uppercase tracking-widest">Calculando Percentis...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/central-scouting')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Percentil & <span className="text-emerald-500">Radar</span></h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Raio-X Neutro Métrica a Métrica (0-100)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SIDEBAR SELEÇÃO */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtros</h3>
              <input type="text" placeholder="BUSCAR..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none mb-3" />
              <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none">
                {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Atletas ({listaFiltrada.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {listaFiltrada.map(j => (
                  <button 
                    key={j.Jogador}
                    onClick={() => {
                      if (jogadoresSelecionados.includes(j.Jogador)) setJogadoresSelecionados(jogadoresSelecionados.filter(x => x !== j.Jogador))
                      else if (jogadoresSelecionados.length < 2) setJogadoresSelecionados([...jogadoresSelecionados, j.Jogador])
                    }}
                    className={`w-full p-4 rounded-2xl text-left transition-all border ${jogadoresSelecionados.includes(j.Jogador) ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    <div className="font-black italic uppercase text-[11px] tracking-tighter">{j.Jogador}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">{j.Time || j.Equipe}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RADAR E TABELA */}
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-slate-900/40 rounded-[3rem] p-10 border border-slate-800/50 shadow-2xl flex flex-col items-center justify-center min-h-[500px]">
              {jogadoresSelecionados.length > 0 ? (
                <ResponsiveContainer width="100%" height={500}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={percentilData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 900 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    {jogadoresSelecionados.map((nome, idx) => (
                      <Radar key={nome} name={nome} dataKey={nome} stroke={cores[idx]} fill={cores[idx]} fillOpacity={0.3} strokeWidth={3} />
                    ))}
                    <Legend wrapperStyle={{ paddingTop: '40px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-600 font-black italic uppercase tracking-widest text-center">Selecione até 2 atletas para comparar o raio-x</div>
              )}
            </div>

            {/* TABELA DE PERCENTIS */}
            <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 bg-slate-950/50">
                      <th className="p-6 text-[9px] font-black uppercase tracking-widest text-slate-500">Métrica</th>
                      {jogadoresSelecionados.map((nome, idx) => (
                        <th key={nome} className="p-6 text-[9px] font-black uppercase tracking-widest text-center" style={{ color: cores[idx] }}>{nome}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {percentilData.map((row) => (
                      <tr key={row.subject} className="border-b border-slate-800/30 hover:bg-white/5 transition-colors">
                        <td className="p-6 text-[10px] font-black uppercase text-slate-400">{row.subject}</td>
                        {jogadoresSelecionados.map((nome) => (
                          <td key={nome} className="p-6 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 text-sm font-black italic">
                              {row[nome]?.toFixed(0)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c10; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>
    </div>
  )
}
