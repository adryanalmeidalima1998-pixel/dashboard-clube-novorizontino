'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts'

import { sheetUrl } from '../../datasources';
const SCOUTING_CSV_URL = sheetUrl('RANKING_PERFIL', false);

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

  if (carregando) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
      Gerando Assinaturas...
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">

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
              Radar de Perfil
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              Assinatura Tática 0–100 (4 Eixos)
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* SELEÇÃO DE ATLETAS */}
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
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Atletas ({listaFiltrada.length}) <span className="text-slate-400 font-normal normal-case">— até 3</span></h3>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {listaFiltrada.map(j => (
                  <button
                    key={j.Jogador}
                    onClick={() => {
                      if (jogadoresSelecionados.includes(j.Jogador)) setJogadoresSelecionados(jogadoresSelecionados.filter(x => x !== j.Jogador))
                      else if (jogadoresSelecionados.length < 3) setJogadoresSelecionados([...jogadoresSelecionados, j.Jogador])
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

          {/* RADAR CHART */}
          <div className="lg:col-span-3 border-2 border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[600px]">
            {jogadoresSelecionados.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  {jogadoresSelecionados.map((nome, idx) => (
                    <Radar key={nome} name={nome} dataKey={nome} stroke={cores[idx]} fill={cores[idx]} fillOpacity={0.25} strokeWidth={2.5} />
                  ))}
                  <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 font-black uppercase tracking-widest text-sm">Selecione até 3 atletas para comparar</div>
            )}
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
