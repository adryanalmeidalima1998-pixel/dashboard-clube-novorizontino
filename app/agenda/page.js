'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getLogo, DEFAULT_LOGO } from '../logos'
import { cleanData, normalizeTeamName } from '../utils/dataCleaner'
import Papa from 'papaparse'

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTx9m5RGrJDNka8hpPUh2k1iTTSSs6lDOyDqNoDFOjBJDG7xCsIcEhdEutK2lKGmc5LgCmcsFcGZBY/pub?output=csv";

export default function AgendaPage() {
  const router = useRouter()
  const [jogos, setJogos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data)
            
            const parsedJogos = dadosLimpos.map((data, index) => {
              const mandanteNorm = normalizeTeamName(data['Mandante'] || '')
              const visitanteNorm = normalizeTeamName(data['Visitante'] || '')
              const isMandante = mandanteNorm === 'Grêmio Novorizontino'
              const adversario = isMandante ? visitanteNorm : mandanteNorm
              
              // Extrair mês e ano para agrupamento
              const dataStr = data['Data'] || ''
              let mesAno = 'OUTROS'
              if (dataStr.includes('/')) {
                const parts = dataStr.split('/')
                if (parts.length >= 2) {
                  const mesNum = parseInt(parts[1])
                  const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']
                  mesAno = `${meses[mesNum - 1]} DE ${parts[2] || new Date().getFullYear()}`
                }
              }

              return {
                id: index,
                data: dataStr,
                hora: data['Horário'] || '--:--',
                adversario: adversario,
                logoAdversario: getLogo(adversario),
                local: data['Local'] === 'Jorjão' || isMandante ? 'C' : 'F',
                resultado: data['Resultado'] || `${data['Gols Mandante'] || 0} - ${data['Gols Visitante'] || 0}`,
                competicao: data['Competição'] || 'Competição',
                tv: data['TV'] || data['Transmissão'] || '',
                mesAno: mesAno,
                timestamp: new Date(dataStr.split('/').reverse().join('-')).getTime() || 0
              }
            })
            
            // Ordenar por data
            setJogos(parsedJogos.sort((a, b) => a.timestamp - b.timestamp))
          }
        })
      } catch (error) {
        console.error("Erro ao carregar agenda:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const jogosAgrupados = useMemo(() => {
    const grupos = {}
    jogos.forEach(jogo => {
      if (!grupos[jogo.mesAno]) grupos[jogo.mesAno] = []
      grupos[jogo.mesAno].push(jogo)
    })
    return grupos
  }, [jogos])

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Sincronizando Calendário...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER MINIMALISTA */}
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/')} className="p-3 bg-slate-900/50 hover:bg-brand-yellow/10 rounded-xl border border-slate-800 transition-all group">
            <svg className="w-5 h-5 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Calendário <span className="text-brand-yellow">2026</span></h1>
            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1">Tabela de Jogos e Resultados</p>
          </div>
        </div>

        {/* TABELA POR MESES */}
        <div className="space-y-12">
          {Object.keys(jogosAgrupados).map(mes => (
            <div key={mes} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">{mes}</h2>
                <div className="h-px bg-slate-800/50 flex-grow"></div>
              </div>

              <div className="bg-slate-900/20 rounded-3xl border border-slate-800/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 border-b border-slate-800/50">
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 w-[15%]">Data</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 w-[10%]">Hora</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 w-[30%]">Adversário</th>
                      <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center w-[5%]">TV</th>
                      <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center w-[5%]">Local</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center w-[15%]">Resultado</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 w-[20%]">Competição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jogosAgrupados[mes].map((jogo) => (
                      <tr key={jogo.id} className="border-b border-slate-800/30 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-black italic text-slate-300 group-hover:text-brand-yellow transition-colors">{jogo.data}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-500">{jogo.hora}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-slate-950 rounded-lg p-1 border border-slate-800 flex items-center justify-center shadow-inner">
                              <img src={jogo.logoAdversario} alt={jogo.adversario} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_LOGO; }} />
                            </div>
                            <span className="text-[11px] font-black uppercase italic tracking-tight text-white">{jogo.adversario}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {jogo.tv ? (
                            <div className="flex justify-center">
                              <svg className="w-4 h-4 text-slate-600 group-hover:text-brand-yellow transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-[10px] font-black rounded-md px-2 py-1 ${jogo.local === 'C' ? 'text-emerald-500 bg-emerald-500/5' : 'text-slate-500 bg-slate-500/5'}`}>
                            {jogo.local}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {jogo.resultado.includes('-') ? (
                              <>
                                <div className={`w-2 h-2 rounded-full ${jogo.resultado.split('-')[0] > jogo.resultado.split('-')[1] ? 'bg-emerald-500' : jogo.resultado.split('-')[0] < jogo.resultado.split('-')[1] ? 'bg-red-500' : 'bg-brand-yellow'}`}></div>
                                <span className="text-xs font-black italic text-white tracking-widest">{jogo.resultado}</span>
                              </>
                            ) : (
                              <span className="text-[10px] font-black text-slate-600 italic uppercase">Agendado</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">{jogo.competicao}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-12 pt-8 border-t border-slate-800/50 flex justify-between items-center">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">© 2026 Grêmio Novorizontino • Departamento de Análise</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[8px] font-black uppercase text-slate-500">Vitória</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-yellow"></div>
              <span className="text-[8px] font-black uppercase text-slate-500">Empate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-[8px] font-black uppercase text-slate-500">Derrota</span>
            </div>
          </div>
        </div>

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  )
}
