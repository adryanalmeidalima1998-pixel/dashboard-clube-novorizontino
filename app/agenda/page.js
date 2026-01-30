
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

export default function AgendaPage() {
  const router = useRouter()
  const [jogos, setJogos] = useState([])
  const [loading, setLoading] = useState(true)
  const [jogoSelecionado, setJogoSelecionado] = useState(null)

  const LOGO_NOVORIZONTINO = "https://www.sofascore.com/static/images/team-logo/football/41555.png"

  useEffect(() => {
    async function loadData() {
      try {
        const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTx9m5RGrJDNka8hpPUh2k1iTTSSs6lDOyDqNoDFOjBJDG7xCsIcEhdEutK2lKGmc5LgCmcsFcGZBY/pub?output=csv"
        const response = await fetch(url)
        const csvText = await response.text()
        
        // Usando PapaParse para processar o CSV corretamente ignorando vírgulas dentro de aspas
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedJogos = results.data.map((data, index) => {
              const isMandante = data['Mandante'] === 'Grêmio Novorizontino'
              
              return {
                id: index,
                data: data['Data'],
                hora: data['Horário'],
                mandante: data['Mandante'],
                visitante: data['Visitante'],
                placar: `${data['Gols Mandante'] || 0} - ${data['Gols Visitante'] || 0}`,
                status: data['Resultado'] ? 'passado' : 'proximo',
                campeonato: data['Competição'],
                local: data['Local'] || (isMandante ? 'Jorjão' : 'Fora'),
                escalaçaoIframe: data['código escalação'] || null,
                golsMandante: data['Gols marcados mandante'] || "",
                golsVisitante: data['Gols marcados VISITANTE'] || "",
                logoMandante: isMandante ? LOGO_NOVORIZONTINO : (data['logo'] || ""),
                logoVisitante: !isMandante ? LOGO_NOVORIZONTINO : (data['logo'] || "")
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

  const renderIframe = (iframeString) => {
    if (!iframeString) return null;
    // Garante que o iframe ocupe o espaço correto e limpa possíveis erros de escape
    const cleanIframe = iframeString.replace(/style="[^"]*"/, 'style="width:100%; height:600px; border:none;"');
    return <div className="bg-white rounded-xl overflow-hidden min-h-[600px]" dangerouslySetInnerHTML={{ __html: cleanIframe }} />;
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-medium">Sincronizando com Google Sheets...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h1 className="text-3xl font-bold">Agenda de Jogos</h1>
        </div>

        <div className="space-y-4">
          {jogos.length === 0 ? (
            <div className="bg-slate-800 p-12 rounded-xl border border-slate-700 text-center text-slate-500">
              Nenhum jogo encontrado na planilha.
            </div>
          ) : jogos.map((jogo) => (
            <div 
              key={jogo.id}
              onClick={() => setJogoSelecionado(jogo)}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="text-center min-w-[100px]">
                    <span className="block text-emerald-400 font-bold text-sm">{jogo.data}</span>
                    <span className="text-slate-500 text-xs">{jogo.hora}</span>
                  </div>
                  <div className="h-12 w-px bg-slate-700 hidden md:block"></div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-2 w-24">
                      {jogo.logoMandante ? (
                        <img src={jogo.logoMandante} alt={jogo.mandante} className="w-10 h-10 object-contain" onError={(e) => e.target.style.display='none'} />
                      ) : (
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold">ADV</div>
                      )}
                      <span className="font-bold text-[10px] text-center line-clamp-1">{jogo.mandante}</span>
                    </div>
                    <div className="px-3 py-1 bg-slate-900 rounded text-xs font-bold text-slate-400">
                      {jogo.status === 'passado' ? jogo.placar : 'vs'}
                    </div>
                    <div className="flex flex-col items-center gap-2 w-24">
                      {jogo.logoVisitante ? (
                        <img src={jogo.logoVisitante} alt={jogo.visitante} className="w-10 h-10 object-contain" onError={(e) => e.target.style.display='none'} />
                      ) : (
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold">ADV</div>
                      )}
                      <span className="font-bold text-[10px] text-center line-clamp-1">{jogo.visitante}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-700 pt-4 md:pt-0">
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{jogo.campeonato}</span>
                    <span className="text-[10px] text-slate-500">🏟️ {jogo.local}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {jogoSelecionado && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
                <h2 className="text-xl font-bold">Detalhes da Partida</h2>
                <button onClick={() => setJogoSelecionado(null)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center gap-8 mb-8 bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                  <div className="text-center flex flex-col items-center">
                    <img src={jogoSelecionado.logoMandante} alt={jogoSelecionado.mandante} className="w-16 h-16 object-contain mb-2" onError={(e) => e.target.style.display='none'} />
                    <span className="font-bold block text-sm">{jogoSelecionado.mandante}</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    {jogoSelecionado.status === 'passado' ? jogoSelecionado.placar : 'VS'}
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <img src={jogoSelecionado.logoVisitante} alt={jogoSelecionado.visitante} className="w-16 h-16 object-contain mb-2" onError={(e) => e.target.style.display='none'} />
                    <span className="font-bold block text-sm">{jogoSelecionado.visitante}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase">Gols {jogoSelecionado.mandante}</h4>
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 min-h-[60px] whitespace-pre-line">
                      {jogoSelecionado.golsMandante || "-"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase text-right">Gols {jogoSelecionado.visitante}</h4>
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 min-h-[60px] text-right whitespace-pre-line">
                      {jogoSelecionado.golsVisitante || "-"}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-emerald-400 font-bold text-sm uppercase mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                    Escalação (SofaScore)
                  </h3>
                  {renderIframe(jogoSelecionado.escalaçaoIframe) || (
                    <div className="bg-slate-900 p-12 rounded-xl border border-slate-700 text-center text-slate-500">
                      Escalação ainda não disponível para este jogo
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
