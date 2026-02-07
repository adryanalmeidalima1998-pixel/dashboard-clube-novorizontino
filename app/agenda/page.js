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
  const [jogoExpandido, setJogoExpandido] = useState(null)

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
                mandante: mandanteNorm,
                visitante: visitanteNorm,
                adversario: adversario,
                logoAdversario: getLogo(adversario),
                local: data['Local'] === 'Jorjão' || isMandante ? 'C' : 'F',
                resultado: data['Resultado'] || `${data['Gols Mandante'] || 0} - ${data['Gols Visitante'] || 0}`,
                competicao: data['Competição'] || 'Competição',
                tv: data['TV'] || data['Transmissão'] || '',
                mesAno: mesAno,
                artilheirosMandante: data['Gols marcados mandante'] || '',
                artilheirosVisitante: data['Gols marcados VISITANTE'] || '',
                eventos: data['eventos'] || data['Eventos'] || '',
                escalacaoCode: data['código escalação'] || '',
                timestamp: new Date(dataStr.split('/').reverse().join('-')).getTime() || 0
              }
            })
            
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

  const toggleExpandir = (id) => {
    setJogoExpandido(jogoExpandido === id ? null : id)
  }

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
            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1">Tabela de Jogos e Detalhes Técnicos</p>
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
                      <use key={jogo.id}>
                        <tr 
                          onClick={() => toggleExpandir(jogo.id)}
                          className={`border-b border-slate-800/30 hover:bg-white/[0.02] transition-colors group cursor-pointer ${jogoExpandido === jogo.id ? 'bg-white/[0.03]' : ''}`}
                        >
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
                              {jogo.resultado && jogo.resultado.includes('-') && !jogo.resultado.includes('NaN') ? (
                                <>
                                  <div className={`w-2 h-2 rounded-full ${parseInt(jogo.resultado.split('-')[0]) > parseInt(jogo.resultado.split('-')[1]) ? 'bg-emerald-500' : parseInt(jogo.resultado.split('-')[0]) < parseInt(jogo.resultado.split('-')[1]) ? 'bg-red-500' : 'bg-brand-yellow'}`}></div>
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
                        {jogoExpandido === jogo.id && (
                          <tr className="bg-slate-950/60 border-b border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-300">
                            <td colSpan="7" className="px-8 py-8">
                              <div className="flex flex-col gap-8">
                                {/* SEÇÃO DE GOLS - NOVO MODELO */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-slate-800/50 pb-8">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1 h-4 bg-brand-yellow rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Gols {jogo.mandante}</h4>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-300 italic leading-relaxed">
                                      {jogo.artilheirosMandante || 'Nenhum gol registrado'}
                                    </p>
                                  </div>
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1 h-4 bg-brand-yellow rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Gols {jogo.visitante}</h4>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-300 italic leading-relaxed">
                                      {jogo.artilheirosVisitante || 'Nenhum gol registrado'}
                                    </p>
                                  </div>
                                </div>

                                {/* SEÇÃO DE ESCALAÇÃO - IFRAME DO SOFASCORE */}
                                {jogo.escalacaoCode ? (
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1 h-4 bg-brand-yellow rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Escalação e Estatísticas</h4>
                                    </div>
                                    <div className="w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
                                      <div 
                                        className="sofascore-embed-container"
                                        dangerouslySetInnerHTML={{ __html: jogo.escalacaoCode.replace(/style=height:786px!important;max-width:800px!important;width:100%!important;/g, 'style="height:786px;width:100%;border:0;"') }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic">Escalação não disponível para esta partida</p>
                                  </div>
                                )}

                                {/* EVENTOS ADICIONAIS */}
                                {jogo.eventos && (
                                  <div className="pt-4">
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="w-1 h-4 bg-brand-yellow rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Observações</h4>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400 italic leading-relaxed">
                                      {jogo.eventos}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </use>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-12 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">© 2026 Grêmio Novorizontino • Departamento de Análise de Desempenho</p>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Vitória</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-yellow shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Empate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Derrota</span>
            </div>
          </div>
        </div>

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        @keyframes in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in { animation: in 0.3s ease-out fill-mode-forwards; }
        .sofascore-embed-container iframe {
          width: 100% !important;
          max-width: 100% !important;
        }
      `}</style>
    </div>
  )
}
