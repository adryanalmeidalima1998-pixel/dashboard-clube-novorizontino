'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLogo, DEFAULT_LOGO } from '../logos'
import { cleanData, normalizeTeamName } from '../utils/dataCleaner'
import Papa from 'papaparse'

const LOGOS_CAMPEONATOS = {
  'PAULISTA SÉRIE A1': '/competitions/paulista/logo.png',
  'PAULISTÃO': '/competitions/paulista/logo.png',
  'BRASILEIRÃO SÉRIE B': '/competitions/serie-b/logo.png',
  'SÉRIE B': '/competitions/serie-b/logo.png',
  'COPA DO BRASIL': '/competitions/copa-do-brasil/logo.png',
  'SUL-SUDESTE': '/competitions/copa-sul-sudeste/logo.png',
}

const getLogoCampeonato = (campeonato) => {
  if (!campeonato) return null
  const chave = Object.keys(LOGOS_CAMPEONATOS).find(key => campeonato.toUpperCase().includes(key))
  return chave ? LOGOS_CAMPEONATOS[chave] : null
}

export default function AgendaPage() {
  const router = useRouter()
  const [jogos, setJogos] = useState([])
  const [loading, setLoading] = useState(true)
  const [jogoSelecionado, setJogoSelecionado] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTx9m5RGrJDNka8hpPUh2k1iTTSSs6lDOyDqNoDFOjBJDG7xCsIcEhdEutK2lKGmc5LgCmcsFcGZBY/pub?output=csv&t=" + Date.now()
        const response = await fetch(url)
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data)
            
            const parsedJogos = dadosLimpos.map((data, index) => {
              const mandanteNorm = normalizeTeamName(data['Mandante'])
              const visitanteNorm = normalizeTeamName(data['Visitante'])
              const isMandante = mandanteNorm === 'Grêmio Novorizontino'
              
              return {
                id: index,
                data: data['Data'],
                hora: data['Horário'],
                mandante: mandanteNorm,
                visitante: visitanteNorm,
                golsMandanteNum: data['Gols Mandante'] || '0',
                golsVisitanteNum: data['Gols Visitante'] || '0',
                status: data['Resultado'] ? 'passado' : 'proximo',
                campeonato: data['Competição'],
                local: data['Local'] || (isMandante ? 'Jorjão' : 'Fora'),
                escalaçaoIframe: data['código escalação'] || null,
                golsMandante: data['Gols marcados mandante'] || "",
                golsVisitante: data['Gols marcados VISITANTE'] || "",
                logoMandante: getLogo(mandanteNorm),
                logoVisitante: getLogo(visitanteNorm),
                logoCampeonato: getLogoCampeonato(data['Competição'])
              }
            })
            setJogos(parsedJogos)
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

  const handleImageError = (e) => { e.target.src = DEFAULT_LOGO }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse italic">Sincronizando Calendário...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER ESTILO PERFORMANCE */}
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
              Agenda de <span className="text-emerald-500">Jogos</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{jogos.length} Partidas Registradas</p>
            </div>
          </div>
        </div>

        {/* LISTA DE JOGOS */}
        <div className="space-y-6">
          {jogos.map((jogo) => (
            <div 
              key={jogo.id}
              onClick={() => setJogoSelecionado(jogo)}
              className="group relative bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-6 md:p-8 border border-slate-800/50 hover:border-emerald-500/30 transition-all duration-500 cursor-pointer overflow-hidden shadow-2xl"
            >
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/[0.02] rounded-full blur-3xl group-hover:bg-emerald-500/5 transition-all"></div>
              
              <div className="relative flex flex-col gap-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  
                  {/* DATA E HORA */}
                  <div className="flex flex-col items-center md:items-start min-w-[120px]">
                    <span className="text-emerald-500 font-black italic text-2xl tracking-tighter">{jogo.data}</span>
                    <span className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] mt-1">{jogo.hora || 'A DEFINIR'}</span>
                  </div>

                  {/* CONFRONTO */}
                  <div className="flex-grow flex items-center justify-center gap-4 md:gap-12">
                    {/* MANDANTE */}
                    <div className="flex flex-col md:flex-row items-center gap-4 flex-1 justify-end">
                      <span className="font-black italic uppercase text-sm md:text-lg text-right text-white group-hover:text-emerald-400 transition-colors hidden sm:block">
                        {jogo.mandante}
                      </span>
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-950 rounded-[2rem] p-3 border border-slate-800 group-hover:border-emerald-500/20 transition-all shadow-inner flex items-center justify-center">
                        <img src={jogo.logoMandante} alt={jogo.mandante} className="w-full h-full object-contain" onError={handleImageError} />
                      </div>
                    </div>

                    {/* PLACAR / VS */}
                    <div className="flex-shrink-0">
                      {jogo.status === 'passado' ? (
                        <div className="flex items-center gap-4 bg-slate-950 rounded-2xl px-6 py-3 border border-slate-800 shadow-inner">
                          <span className="text-2xl md:text-4xl font-black italic text-white">{jogo.golsMandanteNum}</span>
                          <span className="text-slate-700 font-black text-xl">-</span>
                          <span className="text-2xl md:text-4xl font-black italic text-white">{jogo.golsVisitanteNum}</span>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                          <span className="text-emerald-500 font-black italic text-xl">VS</span>
                        </div>
                      )}
                    </div>

                    {/* VISITANTE */}
                    <div className="flex flex-col md:flex-row-reverse items-center gap-4 flex-1 justify-end">
                      <span className="font-black italic uppercase text-sm md:text-lg text-left text-white group-hover:text-emerald-400 transition-colors hidden sm:block">
                        {jogo.visitante}
                      </span>
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-950 rounded-[2rem] p-3 border border-slate-800 group-hover:border-emerald-500/20 transition-all shadow-inner flex items-center justify-center">
                        <img src={jogo.logoVisitante} alt={jogo.visitante} className="w-full h-full object-contain" onError={handleImageError} />
                      </div>
                    </div>
                  </div>

                  {/* INFO EXTRA */}
                  <div className="flex flex-col items-center md:items-end min-w-[150px]">
                    <div className="flex items-center gap-2 mb-2">
                      {jogo.logoCampeonato && (
                        <img src={jogo.logoCampeonato} alt={jogo.campeonato} className="w-5 h-5 object-contain" />
                      )}
                      <span className="bg-slate-950 px-3 py-1 rounded-lg text-[9px] font-black border border-slate-800 text-emerald-500 uppercase tracking-widest">
                        {jogo.campeonato}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                      <span className="text-[10px] font-black uppercase tracking-widest">{jogo.local}</span>
                    </div>
                  </div>
                </div>

                {/* ARTILHEIROS DA PARTIDA */}
                {jogo.status === 'passado' && (jogo.golsMandante || jogo.golsVisitante) && (
                  <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Gols {jogo.mandante}</p>
                      <p className="text-xs font-bold text-emerald-400 italic">{jogo.golsMandante || '-'}</p>
                    </div>
                    <div className="hidden md:block w-px bg-slate-800/50"></div>
                    <div className="flex-1 text-left">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Gols {jogo.visitante}</p>
                      <p className="text-xs font-bold text-emerald-400 italic">{jogo.golsVisitante || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DE DETALHES (IFRAME) */}
        {jogoSelecionado && jogoSelecionado.escalaçaoIframe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setJogoSelecionado(null)}></div>
            <div className="relative bg-[#0d1016] w-full max-w-4xl max-h-[90vh] rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Detalhes da <span className="text-emerald-500">Partida</span></h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{jogoSelecionado.mandante} vs {jogoSelecionado.visitante}</p>
                </div>
                <button onClick={() => setJogoSelecionado(null)} className="p-4 bg-slate-900 hover:bg-red-500/20 rounded-2xl border border-slate-800 transition-all group">
                  <svg className="w-6 h-6 text-slate-500 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-4 bg-white">
                <div className="w-full h-full min-h-[600px]" dangerouslySetInnerHTML={{ __html: jogoSelecionado.escalaçaoIframe.replace(/height=".*?"/i, 'height="600"') }} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
