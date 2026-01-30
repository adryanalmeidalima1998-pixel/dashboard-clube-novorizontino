'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { elencoReal } from './dados_elenco'
import { jogadores as todosJogadores } from '../central-dados/dados'

export default function PlantelPage() {
  const router = useRouter()
  
  // Métricas principais para o elenco
  const metricasPrincipais = [
    'Partidas',
    'Gols',
    'Nota_Media',
    'Acoes_Sucesso',
    'Passes_Precisos',
    'Dribles',
    'Desafios'
  ]

  // Calcular média da liga para comparação (usando a base da central de dados)
  const mediaLiga = useMemo(() => {
    const medias = {}
    const metricasMapeadas = {
      'Partidas': 'Partidas jogadas',
      'Gols': 'Gols',
      'Acoes_Sucesso': 'Ações / com sucesso %',
      'Passes_Precisos': 'Passes precisos %',
      'Dribles': 'Dribles bem sucedidos',
      'Desafios': 'Desafios vencidos, %'
    }

    Object.entries(metricasMapeadas).forEach(([key, m]) => {
      const valores = todosJogadores.map(j => {
        const val = j[m]
        if (!val || val === '-') return 0
        const clean = String(val).replace('%', '').replace(',', '.')
        return parseFloat(clean) || 0
      })
      medias[key] = valores.reduce((a, b) => a + b, 0) / (valores.length || 1)
    })
    
    medias['Nota_Media'] = 6.8 // Média fixa da liga para nota
    return medias
  }, [])

  const parseValue = (val) => {
    if (!val || val === '-') return 0
    const clean = String(val).replace('%', '').replace(',', '.')
    return parseFloat(clean) || 0
  }

  const getLabel = (m) => {
    const labels = {
      'Partidas': 'PJ',
      'Gols': 'Gols',
      'Nota_Media': 'Nota',
      'Acoes_Sucesso': 'Ações %',
      'Passes_Precisos': 'Passes %',
      'Dribles': 'Dribles',
      'Desafios': 'Duelos %'
    }
    return labels[m] || m
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold">Elenco Real 2026</h1>
            <p className="text-slate-400 text-sm">Grêmio Novorizontino • Dados Sincronizados</p>
          </div>
        </div>

        {/* TABELA DO ELENCO */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700">
                  <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider sticky left-0 bg-slate-900 z-10"># Jogador</th>
                  <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Pos</th>
                  {metricasPrincipais.map(m => (
                    <th key={m} className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-center">{getLabel(m)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {elencoReal.map((j, i) => (
                  <tr key={i} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="p-4 sticky left-0 bg-slate-800/90 backdrop-blur z-10 group-hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-mono w-4">{j.Numero !== 'nan' ? j.Numero : '-'}</span>
                        <div>
                          <span className="block font-bold text-white">{j.Jogador}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{j.Nacionalidade} • {j.Idade} anos • {j.Altura}cm</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-900 px-2 py-1 rounded text-[10px] font-bold border border-slate-700 text-emerald-400">{j.Posicao}</span>
                    </td>
                    {metricasPrincipais.map(m => {
                      const val = parseValue(j[m])
                      const media = mediaLiga[m]
                      const percentual = (val / (media || 1)) * 100
                      const acimaMedia = val > media

                      return (
                        <td key={m} className="p-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`font-bold ${m === 'Nota_Media' ? 'text-yellow-400' : acimaMedia ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {j[m] === '0' || j[m] === '0%' ? '-' : j[m]}
                            </span>
                            <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${acimaMedia ? 'bg-emerald-500' : 'bg-red-500/50'}`}
                                style={{ width: `${Math.min(percentual, 100)}%` }}
                              ></div>
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

        {/* LEGENDA */}
        <div className="mt-6 flex flex-wrap items-center gap-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-emerald-500 rounded-full"></div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Acima da Média da Liga</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-red-500/50 rounded-full"></div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Abaixo da Média da Liga</span>
          </div>
          <div className="ml-auto text-[10px] text-slate-500 italic">
            * Notas e métricas sincronizadas com a base de dados da Central e SofaScore.
          </div>
        </div>
      </div>
    </div>
  )
}
