'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getLogo, DEFAULT_LOGO } from '../logos'
import { cleanData, normalizeTeamName } from '../utils/dataCleaner'
import Papa from 'papaparse'

import { sheetUrl } from '../datasources'
const CSV_URL = sheetUrl('AGENDA', false)

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
            let dadosParaProcessar = cleanData(results.data);
            if (dadosParaProcessar.length === 0 && results.data.length > 0) {
              dadosParaProcessar = results.data.filter(r => r.Mandante || r.Visitante || r.Data);
            }

            const parsedJogos = dadosParaProcessar.map((data, index) => {
              const mandanteNorm = normalizeTeamName(data['Mandante'] || '')
              const visitanteNorm = normalizeTeamName(data['Visitante'] || '')
              const isMandante = mandanteNorm === 'Grêmio Novorizontino'
              const adversario = isMandante ? visitanteNorm : mandanteNorm
              
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

              const golsM = data['Gols Mandante']
              const golsV = data['Gols Visitante']
              const resultadoCSV = data['Resultado'] || ''
              const escalacaoCode = data['código escalação'] || ''
              
              let resultadoExibicao = resultadoCSV
              if (!resultadoExibicao && golsM !== undefined && golsV !== undefined && golsM !== '' && golsV !== '') {
                resultadoExibicao = `${golsM} - ${golsV}`
              }
              
              const isJogoPassado = resultadoExibicao !== '' || escalacaoCode !== '' || (golsM !== '' && golsV !== '')

              return {
                id: index,
                data: dataStr,
                hora: data['Horário'] || '--:--',
                mandante: mandanteNorm,
                visitante: visitanteNorm,
                adversario: adversario,
                logoAdversario: getLogo(adversario),
                local: data['Local'] === 'Jorjão' || isMandante ? 'C' : 'F',
                resultado: resultadoExibicao,
                golsM: golsM,
                golsV: golsV,
                isPassado: isJogoPassado,
                competicao: data['Competição'] || 'Competição',
                tv: data['TV'] || data['Transmissão'] || '',
                mesAno: mesAno,
                artilheirosMandante: data['Gols marcados mandante'] || '',
                artilheirosVisitante: data['Gols marcados VISITANTE'] || '',
                eventos: data['eventos'] || data['Eventos'] || '',
                escalacaoCode: escalacaoCode,
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
    <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
      A carregar Calendário...
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-4">

        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button onClick={() => router.push('/')} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors">
              ← VOLTAR
            </button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Calendário 2026
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              Tabela de Jogos e Detalhes Técnicos
            </div>
          </div>
        </header>

        {/* CONTEÚDO */}
        <div className="space-y-8">
          {Object.keys(jogosAgrupados).map(mes => (
            <div key={mes} className="space-y-3">
              <div className="flex items-center gap-4">
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">{mes}</h2>
                <div className="h-px bg-slate-200 flex-grow"></div>
              </div>

              <div className="border-2 border-slate-200 rounded-2xl overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* TABLE HEADER */}
                    <div className="grid grid-cols-[15%_10%_30%_8%_8%_14%_15%] bg-slate-900 px-6 py-3">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-300">Data</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-300 text-center">Hora</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-300">Adversário</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-300 text-center">TV</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-300 text-center">Local</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-300 text-center">Resultado</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-300">Competição</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {jogosAgrupados[mes].map((jogo) => (
                        <div key={jogo.id} className="group">
                          <div
                            onClick={() => toggleExpandir(jogo.id)}
                            className={`grid grid-cols-[15%_10%_30%_8%_8%_14%_15%] items-center px-6 py-4 hover:bg-amber-50/60 transition-colors cursor-pointer ${jogoExpandido === jogo.id ? 'bg-amber-50/40' : ''}`}
                          >
                            <div className="text-[11px] font-black italic text-slate-700 group-hover:text-amber-600 transition-colors">{jogo.data}</div>
                            <div className="text-[10px] font-bold text-slate-400 text-center">{jogo.hora}</div>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-6 h-6 bg-white rounded-lg p-1 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                <img src={jogo.logoAdversario} alt={jogo.adversario} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_LOGO; }} />
                              </div>
                              <span className="text-[11px] font-black uppercase italic tracking-tight text-black truncate">{jogo.adversario}</span>
                            </div>
                            <div className="flex justify-center">
                              {jogo.tv ? (
                                <svg className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              ) : <span className="text-slate-300">-</span>}
                            </div>
                            <div className="text-center">
                              <span className={`text-[10px] font-black rounded-md px-2 py-1 ${jogo.local === 'C' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                                {jogo.local}
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              {jogo.isPassado ? (
                                <>
                                  <div className={`w-2 h-2 rounded-full ${
                                    jogo.resultado.includes('V') || (jogo.resultado.includes('-') && parseInt(jogo.resultado.split('-')[0]) > parseInt(jogo.resultado.split('-')[1])) ? 'bg-emerald-500' :
                                    jogo.resultado.includes('D') || (jogo.resultado.includes('-') && parseInt(jogo.resultado.split('-')[0]) < parseInt(jogo.resultado.split('-')[1])) ? 'bg-red-500' :
                                    'bg-amber-400'
                                  }`}></div>
                                  <span className="text-xs font-black italic text-black tracking-widest">
                                    {jogo.resultado ? (jogo.resultado.length === 1 ? `${jogo.golsM} - ${jogo.golsV}` : jogo.resultado) : 'FIM'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[10px] font-black text-slate-400 italic uppercase">Agendado</span>
                              )}
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors truncate">{jogo.competicao}</div>
                          </div>

                          {jogoExpandido === jogo.id && (
                            <div className="bg-slate-50 border-t border-slate-200 px-8 py-8">
                              <div className="flex flex-col gap-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-slate-200 pb-8">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Gols {jogo.mandante}</h4>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-600 italic leading-relaxed whitespace-pre-line">
                                      {jogo.artilheirosMandante || 'Nenhum gol registrado'}
                                    </p>
                                  </div>
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Gols {jogo.visitante}</h4>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-600 italic leading-relaxed whitespace-pre-line">
                                      {jogo.artilheirosVisitante || 'Nenhum gol registrado'}
                                    </p>
                                  </div>
                                </div>

                                {jogo.escalacaoCode ? (
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Escalação e Estatísticas</h4>
                                    </div>
                                    <div className="w-full bg-white rounded-2xl overflow-hidden shadow border border-slate-200">
                                      <div
                                        className="sofascore-embed-container"
                                        dangerouslySetInnerHTML={{ __html: jogo.escalacaoCode.replace(/style=height:786px!important;max-width:800px!important;width:100%!important;/g, 'style="height:786px;width:100%;border:0;"') }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Escalação não disponível para esta partida</p>
                                  </div>
                                )}

                                {jogo.eventos && (
                                  <div className="pt-4">
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black">Observações</h4>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed">{jogo.eventos}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3 mt-4">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Vitória</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Empate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Derrota</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

      </div>
      <style jsx global>{`
        .sofascore-embed-container iframe {
          width: 100% !important;
          max-width: 100% !important;
        }
      `}</style>
    </div>
  )
}
