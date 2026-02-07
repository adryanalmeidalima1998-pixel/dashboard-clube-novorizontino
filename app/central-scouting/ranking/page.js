'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

// URL temporária ou placeholder até que a planilha final seja fornecida
const SCOUTING_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlQGKcj7Dv6ziVn4MU-zs6PAJc5WFyjwr0aks9xNdG4rgRw4iwRNFws7lDGXtjNoQHGypQJ4ssSlqM/pub?output=csv";

export default function RankingPerfil() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [perfilAtivo, setPerfilAtivo] = useState('Construtor')
  const [filtroTime, setFiltroTime] = useState('Todos')
  const [minutosMinimos, setMinutosMinimos] = useState(450)

  // Definição de Pesos (Baseado no documento)
  const pesosPerfis = {
    'Construtor': {
      'Passes progressivos/90': 0.25,
      'Passes p/ terço final/90': 0.20,
      'Passes inteligentes/90': 0.20,
      'Passes chave/90': 0.15,
      'xA/90': 0.10,
      'Acurácia de cruzamentos %': 0.10
    },
    'Ofensivo': {
      'Ações atacantes c/ êxito/90': 0.25,
      'Dribles/90': 0.20,
      'Cruzamentos/90': 0.15,
      'Acurácia de cruzamentos %': 0.10,
      'xA/90': 0.15,
      'Assist. p/ remate/90': 0.15
    },
    'Defensivo': {
      'Ações defensivas c/ êxito/90': 0.25,
      'Duelos defensivos/90': 0.15,
      '% duelos defensivos ganhos': 0.20,
      'Interseções/90': 0.20,
      'Duelos aéreos/90': 0.10,
      '% duelos aéreos ganhos': 0.10
    }
  }

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${SCOUTING_CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            setJogadores(dados)
            setCarregando(false)
          }
        })
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        setCarregando(false)
      }
    }
    carregarDados()
  }, [])

  const parseValue = (val) => {
    if (!val || val === '-' || val === 'nan') return 0
    return parseFloat(String(val).replace('%', '').replace(',', '.')) || 0
  }

  // Lógica de Cálculo de Percentil e Score de Perfil
  const rankingProcessado = useMemo(() => {
    if (jogadores.length === 0) return []

    // 1. Filtrar por minutos mínimos
    const elegiveis = jogadores.filter(j => parseValue(j['Minutos jogados']) >= minutosMinimos)

    // 2. Calcular Percentis para cada métrica necessária
    const metricasNecessarias = new Set()
    Object.values(pesosPerfis).forEach(p => Object.keys(p).forEach(m => metricasNecessarias.add(m)))
    
    const percentisPorMetrica = {}
    metricasNecessarias.forEach(metrica => {
      const valores = elegiveis.map(j => parseValue(j[metrica])).sort((a, b) => a - b)
      percentisPorMetrica[metrica] = elegiveis.map(j => {
        const val = parseValue(j[metrica])
        const index = valores.lastIndexOf(val)
        return { jogador: j.Jogador, p: (index / (valores.length - 1)) * 100 }
      })
    })

    // 3. Calcular Score Final por Perfil
    const pesos = pesosPerfis[perfilAtivo] || {}
    const resultado = elegiveis.map(j => {
      let score = 0
      Object.entries(pesos).forEach(([metrica, peso]) => {
        const pObj = percentisPorMetrica[metrica]?.find(p => p.jogador === j.Jogador)
        score += (pObj?.p || 0) * peso
      })

      // Adicionar Equilibrado (Média dos 3)
      let scoreEquilibrado = 0
      if (perfilAtivo === 'Equilibrado') {
        ['Construtor', 'Ofensivo', 'Defensivo'].forEach(p => {
          let s = 0
          Object.entries(pesosPerfis[p]).forEach(([m, w]) => {
            const pObj = percentisPorMetrica[m]?.find(px => px.jogador === j.Jogador)
            s += (pObj?.p || 0) * w
          })
          scoreEquilibrado += s
        })
        score = scoreEquilibrado / 3
      }

      return {
        ...j,
        scoreFinal: score,
        time: j.Time || j.Equipe
      }
    })

    // 4. Filtrar por Time e Ordenar
    return resultado
      .filter(j => filtroTime === 'Todos' || j.time === filtroTime)
      .sort((a, b) => b.scoreFinal - a.scoreFinal)

  }, [jogadores, perfilAtivo, filtroTime, minutosMinimos])

  const times = useMemo(() => ['Todos', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))].sort(), [jogadores])

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-emerald-500 font-black italic uppercase tracking-widest">Calculando Rankings...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/central-scouting')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Ranking de <span className="text-emerald-500">Perfil</span></h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Ordenação por Score de Papel Tático (0-100)</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {['Construtor', 'Ofensivo', 'Defensivo', 'Equilibrado'].map(p => (
              <button 
                key={p} 
                onClick={() => setPerfilAtivo(p)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${perfilAtivo === p ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* FILTROS RÁPIDOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">Filtrar por Equipe</label>
            <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-emerald-500/50">
              {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">Minutagem Mínima: {minutosMinimos}min</label>
            <input type="range" min="0" max="2000" step="50" value={minutosMinimos} onChange={e => setMinutosMinimos(parseInt(e.target.value))} className="w-full accent-emerald-500" />
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-black italic text-emerald-500 leading-none">{rankingProcessado.length}</div>
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Atletas Elegíveis</div>
            </div>
          </div>
        </div>

        {/* TABELA DE RANKING */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 bg-slate-950/50">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Pos</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Equipe</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Minutos</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Score {perfilAtivo}</th>
                </tr>
              </thead>
              <tbody>
                {rankingProcessado.map((j, idx) => (
                  <tr key={j.Jogador} className="border-b border-slate-800/30 hover:bg-emerald-500/5 transition-colors group">
                    <td className="p-6">
                      <span className={`text-sm font-black italic ${idx < 3 ? 'text-emerald-500' : 'text-slate-600'}`}>#{idx + 1}</span>
                    </td>
                    <td className="p-6">
                      <div className="font-black italic uppercase text-sm group-hover:text-emerald-400 transition-colors">{j.Jogador}</div>
                      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{j.Posição}</div>
                    </td>
                    <td className="p-6 text-[10px] font-black uppercase text-slate-400">{j.time}</td>
                    <td className="p-6 text-[10px] font-bold text-slate-500">{j['Minutos jogados']}</td>
                    <td className="p-6 text-right">
                      <div className="inline-flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden md:block">
                          <div className="h-full bg-emerald-500" style={{ width: `${j.scoreFinal}%` }}></div>
                        </div>
                        <span className="text-lg font-black italic text-white">{j.scoreFinal.toFixed(1)}</span>
                      </div>
                    </td>
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
