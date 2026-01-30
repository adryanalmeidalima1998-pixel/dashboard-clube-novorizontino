'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { elencoReal } from './dados_elenco'

export default function PlantelPage() {
  const router = useRouter()
  const [sortConfig, setSortConfig] = useState({ key: 'Index', direction: 'desc' })
  
  // Métricas extraídas diretamente da nova planilha mestre
  const metricasPrincipais = [
    'Index',
    'Partidas',
    'Gols',
    'Acoes_Sucesso',
    'Passes_Precisos',
    'Dribles',
    'Desafios'
  ]

  const parseValue = (val) => {
    if (!val || val === '-' || val === 'nan') return 0
    const clean = String(val).replace('%', '').replace(',', '.')
    return parseFloat(clean) || 0
  }

  const getLabel = (m) => {
    const labels = {
      'Index': 'Index',
      'Partidas': 'PJ',
      'Gols': 'Gols',
      'Acoes_Sucesso': 'Ações %',
      'Passes_Precisos': 'Passes %',
      'Dribles': 'Dribles',
      'Desafios': 'Duelos %'
    }
    return labels[m] || m
  }

  const sortedJogadores = (jogadores) => {
    const sortableItems = [...jogadores]
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]

        // Tratamento para métricas numéricas
        if (metricasPrincipais.includes(sortConfig.key) || sortConfig.key === 'Idade' || sortConfig.key === 'Altura') {
          aVal = parseValue(aVal)
          bVal = parseValue(bVal)
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }

  const requestSort = (key) => {
    let direction = 'desc'
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  const getCategoria = (jogador) => {
    const pos = (jogador.Posicao || '').toUpperCase();
    if (pos.includes('GK') || pos.includes('GOL')) return 'Goleiros';
    if (pos.includes('DEF') || pos.includes('ZAG') || pos.includes('LAT') || pos.includes('LD') || pos.includes('LE') || pos.includes('DC') || pos.includes('DR') || pos.includes('DL') || pos.includes('CD') || pos.includes('RD')) return 'Defensores';
    if (pos.includes('MEI') || pos.includes('VOL') || pos.includes('MC') || pos.includes('DM') || pos.includes('AM') || pos.includes('CAM') || pos.includes('CM') || pos.includes('MID') || pos.includes('RCDM') || pos.includes('LCDM')) return 'Meio-Campistas';
    if (pos.includes('ATA') || pos.includes('PON') || pos.includes('CEN') || pos.includes('CF') || pos.includes('ST') || pos.includes('RW') || pos.includes('LW') || pos.includes('FORW') || pos.includes('RAM') || pos.includes('LAM')) return 'Atacantes';
    return 'Atacantes';
  }

  // Média de referência baseada nos próprios dados da planilha para as barras de progresso
  const mediasElenco = useMemo(() => {
    const medias = {}
    metricasPrincipais.forEach(m => {
      const valores = elencoReal.map(j => parseValue(j[m])).filter(v => v > 0)
      medias[m] = valores.reduce((a, b) => a + b, 0) / (valores.length || 1)
    })
    return medias
  }, [])

  const renderTabelaPosicao = (titulo, jogadores) => {
    if (jogadores.length === 0) return null
    const jogadoresOrdenados = sortedJogadores(jogadores)

    return (
      <div className="mb-12" key={titulo}>
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">{titulo}</h2>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400 border border-slate-700">
            {jogadores.length} Atletas
          </span>
        </div>
        
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-700">
                  <th onClick={() => requestSort('Jogador')} className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider sticky left-0 bg-slate-900 z-10 cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-2"># Jogador {sortConfig.key === 'Jogador' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                  </th>
                  <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Pos</th>
                  {metricasPrincipais.map(m => (
                    <th key={m} onClick={() => requestSort(m)} className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-center cursor-pointer hover:text-white transition-colors">
                      <div className="flex flex-col items-center gap-1">
                        {getLabel(m)} 
                        {sortConfig.key === m && <span className="text-emerald-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {jogadoresOrdenados.map((j, i) => (
                  <tr key={i} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="p-4 sticky left-0 bg-slate-800/90 backdrop-blur z-10 group-hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-mono w-4">{j.Numero && j.Numero !== 'nan' ? j.Numero : '-'}</span>
                        <div>
                          <span className="block font-bold text-white">{j.Jogador}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{j.Nacionalidade} • {j.Idade} anos • {j.Altura}cm</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-900 px-2 py-1 rounded text-[10px] font-bold border border-slate-700 text-emerald-400">{j.Posicao || '-'}</span>
                    </td>
                    {metricasPrincipais.map(m => {
                      const val = parseValue(j[m])
                      const media = mediasElenco[m]
                      const percentual = (val / (media || 1)) * 100
                      const acimaMedia = val >= media
                      return (
                        <td key={m} className="p-4">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`font-bold ${m === 'Index' ? 'text-emerald-400' : acimaMedia ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {j[m] === '0' || j[m] === '0%' || j[m] === '-' ? '-' : j[m]}
                            </span>
                            <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${acimaMedia ? 'bg-emerald-500' : 'bg-red-500/50'}`} style={{ width: `${Math.min(percentual, 100)}%` }}></div>
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
  }

  const grupos = useMemo(() => {
    const g = { 'Goleiros': [], 'Defensores': [], 'Meio-Campistas': [], 'Atacantes': [] };
    elencoReal.forEach(j => {
      const cat = getCategoria(j);
      g[cat].push(j);
    });
    return g;
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold">Elenco Principal 2026</h1>
              <p className="text-slate-400 text-sm">Grêmio Novorizontino • Gestão de Alta Performance</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 bg-slate-800/50 p-2 rounded-xl border border-slate-700">
            <div className="text-right">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">Total do Elenco</span>
              <span className="text-xl font-black text-emerald-400">{elencoReal.length} Atletas</span>
            </div>
          </div>
        </div>

        {Object.entries(grupos).map(([titulo, jogadores]) => renderTabelaPosicao(titulo, jogadores))}

        <div className="mt-6 flex flex-wrap items-center gap-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2"><div className="w-3 h-1 bg-emerald-500 rounded-full"></div><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Acima da Média do Grupo</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-1 bg-red-500/50 rounded-full"></div><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Abaixo da Média do Grupo</span></div>
          <div className="ml-auto text-[10px] text-slate-500 italic">* Dados extraídos integralmente da Planilha Mestre de Elenco 2026.</div>
        </div>
      </div>
    </div>
  )
}
