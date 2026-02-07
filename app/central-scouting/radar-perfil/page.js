'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts'

const SCOUTING_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlQGKcj7Dv6ziVn4MU-zs6PAJc5WFyjwr0aks9xNdG4rgRw4iwRNFws7lDGXtjNoQHGypQJ4ssSlqM/pub?output=csv";

export default function RadarPerfil() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [jogadoresSelecionados, setJogadoresSelecionados] = useState([])
  const [filtroTime, setFiltroTime] = useState('Todos')
  const [busca, setBusca] = useState('')

  const pesosPerfis = {
    'Construtor': { 'Passes progressivos/90': 0.25, 'Passes p/ terço final/90': 0.20, 'Passes inteligentes/90': 0.20, 'Passes chave/90': 0.15, 'xA/90': 0.10, 'Acurácia de cruzamentos %': 0.10 },
    'Ofensivo': { 'Ações atacantes c/ êxito/90': 0.25, 'Dribles/90': 0.20, 'Cruzamentos/90': 0.15, 'Acurácia de cruzamentos %': 0.10, 'xA/90': 0.15, 'Assist. p/ remate/90': 0.15 },
    'Defensivo': { 'Ações defensivas c/ êxito/90': 0.25, 'Duelos defensivos/90': 0.15, '% duelos defensivos ganhos': 0.20, 'Interseções/90': 0.20, 'Duelos aéreos/90': 0.10, '% duelos aéreos ganhos': 0.10 }
  }

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

  const radarData = useMemo(() => {
    if (jogadores.length === 0 || jogadoresSelecionados.length === 0) return []

    // 1. Calcular Percentis (Base 0-100)
    const metricasNecessarias = new Set()
    Object.values(pesosPerfis).forEach(p => Object.keys(p).forEach(m => metricasNecessarias.add(m)))
    
    const percentisPorMetrica = {}
    metricasNecessarias.forEach(metrica => {
      const valores = jogadores.map(j => parseValue(j[metrica])).sort((a, b) => a - b)
      percentisPorMetrica[metrica] = jogadores.map(j => {
        const val = parseValue(j[metrica])
        const index = valores.lastIndexOf(val)
        return { jogador: j.Jogador, p: (index / (valores.length - 1)) * 100 }
      })
    })

    // 2. Calcular Scores de Perfil para os Selecionados
    const perfis = ['Construtor', 'Ofensivo', 'Defensivo', 'Equilibrado']
    return perfis.map(perfil => {
      const dataPoint = { subject: perfil.toUpperCase() }
      
      jogadoresSelecionados.forEach(nome => {
        const j = jogadores.find(x => x.Jogador === nome)
        let score = 0
        if (perfil === 'Equilibrado') {
          ['Construtor', 'Ofensivo', 'Defensivo'].forEach(p => {
            let s = 0
            Object.entries(pesosPerfis[p]).forEach(([m, w]) => {
              const pObj = percentisPorMetrica[m]?.find(px => px.jogador === nome)
              s += (pObj?.p || 0) * w
            })
            score += s
          })
          score = score / 3
        } else {
          Object.entries(pesosPerfis[perfil]).forEach(([m, w]) => {
            const pObj = percentisPorMetrica[m]?.find(px => px.jogador === nome)
            score += (pObj?.p || 0) * w
          })
        }
        dataPoint[nome] = score
      })
      return dataPoint
    })
  }, [jogadores, jogadoresSelecionados])

  const times = useMemo(() => ['Todos', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))].sort(), [jogadores])
  const listaFiltrada = useMemo(() => {
    return jogadores.filter(j => {
      const pT = filtroTime === 'Todos' || (j.Time || j.Equipe) === filtroTime
      const pB = j.Jogador.toLowerCase().includes(busca.toLowerCase())
      return pT && pB
    })
  }, [jogadores, filtroTime, busca])

  const cores = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-emerald-500 font-black italic uppercase tracking-widest">Gerando Assinaturas...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/central-scouting')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Radar de <span className="text-emerald-500">Perfil</span></h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Assinatura Tática 0-100 (4 Eixos)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SELEÇÃO DE ATLETAS */}
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
                      else if (jogadoresSelecionados.length < 3) setJogadoresSelecionados([...jogadoresSelecionados, j.Jogador])
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

          {/* RADAR CHART */}
          <div className="lg:col-span-3 bg-slate-900/40 rounded-[3rem] p-10 border border-slate-800/50 shadow-2xl flex flex-col items-center justify-center min-h-[600px]">
            {jogadoresSelecionados.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  {jogadoresSelecionados.map((nome, idx) => (
                    <Radar
                      key={nome}
                      name={nome}
                      dataKey={nome}
                      stroke={cores[idx]}
                      fill={cores[idx]}
                      fillOpacity={0.3}
                      strokeWidth={3}
                    />
                  ))}
                  <Legend wrapperStyle={{ paddingTop: '40px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-600 font-black italic uppercase tracking-widest">Selecione até 3 atletas para comparar</div>
            )}
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
