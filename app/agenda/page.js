
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AgendaPage() {
  const router = useRouter()
  const [jogos, setJogos] = useState([])
  const [loading, setLoading] = useState(true)
  const [jogoSelecionado, setJogoSelecionado] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTx9m5RGrJDNka8hpPUh2k1iTTSSs6lDOyDqNoDFOjBJDG7xCsIcEhdEutK2lKGmc5LgCmcsFcGZBY/pub?output=csv"
        const response = await fetch(url)
        const csvText = await response.text()
        
        // Simple CSV parser
        const lines = csvText.split('\n').filter(line => line.trim() !== '')
        const headers = lines[0].split(',')
        
        const parsedJogos = lines.slice(1).map((line, index) => {
          const values = line.split(',')
          const data = {}
          headers.forEach((header, i) => {
            data[header.trim()] = values[i]?.trim()
          })

          // Mapeamento de cores e siglas baseado no adversário
          const isMandante = data['Mandante'] === 'Grêmio Novorizontino'
          const adversario = isMandante ? data['Visitante'] : data['Mandante']
          
          return {
            id: index,
            data: data['Data'],
            hora: data['Horário'],
            adversario: adversario,
            mandante: data['Mandante'],
            visitante: data['Visitante'],
            placar: `${data['Gols Mandante']} - ${data['Gols Visitante']}`,
            status: data['Resultado'] ? 'passado' : 'proximo',
            campeonato: data['Competição'],
            local: data['Local'] || (isMandante ? 'Jorjão' : 'Fora'),
            escalaçaoIframe: data['código escalação'] || null,
            golsRaw: data['Gols marcados mandante'] + " " + data['Gols marcados VISITANTE']
          }
        })

        setJogos(parsedJogos)
      } catch (error) {
        console.error("Erro ao carregar agenda:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando Agenda...</div>

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h1 className="text-3xl font-bold">Agenda de Jogos (Realtime)</h1>
        </div>

        <div className="space-y-4">
          {jogos.map((jogo) => (
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
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${jogo.mandante === 'Grêmio Novorizontino' ? 'bg-yellow-500 text-black' : 'bg-slate-700'} rounded-full flex items-center justify-center font-bold text-xs`}>
                        {jogo.mandante === 'Grêmio Novorizontino' ? 'GN' : 'ADV'}
                      </div>
                      <span className="font-bold text-sm">{jogo.mandante}</span>
                    </div>
                    <div className="px-3 py-1 bg-slate-900 rounded text-xs font-bold text-slate-400">
                      {jogo.status === 'passado' ? jogo.placar : 'vs'}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${jogo.visitante === 'Grêmio Novorizontino' ? 'bg-yellow-500 text-black' : 'bg-slate-700'} rounded-full flex items-center justify-center font-bold text-xs`}>
                        {jogo.visitante === 'Grêmio Novorizontino' ? 'GN' : 'ADV'}
                      </div>
                      <span className="font-bold text-sm">{jogo.visitante}</span>
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
                  <div className="text-center">
                    <div className={`w-16 h-16 ${jogoSelecionado.mandante === 'Grêmio Novorizontino' ? 'bg-yellow-500 text-black' : 'bg-slate-700'} rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-2`}>
                      {jogoSelecionado.mandante === 'Grêmio Novorizontino' ? 'GN' : 'ADV'}
                    </div>
                    <span className="font-bold block text-sm">{jogoSelecionado.mandante}</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    {jogoSelecionado.status === 'passado' ? jogoSelecionado.placar : 'VS'}
                  </div>
                  <div className="text-center">
                    <div className={`w-16 h-16 ${jogoSelecionado.visitante === 'Grêmio Novorizontino' ? 'bg-yellow-500 text-black' : 'bg-slate-700'} rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-2`}>
                      {jogoSelecionado.visitante === 'Grêmio Novorizontino' ? 'GN' : 'ADV'}
                    </div>
                    <span className="font-bold block text-sm">{jogoSelecionado.visitante}</span>
                  </div>
                </div>
                <div className="mb-8">
                  <h3 className="text-emerald-400 font-bold text-sm uppercase mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                    Gols e Eventos
                  </h3>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-sm text-slate-300 whitespace-pre-line">
                    {jogoSelecionado.golsRaw || "Nenhum dado de gol disponível."}
                  </div>
                </div>
                <div>
                  <h3 className="text-emerald-400 font-bold text-sm uppercase mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                    Escalação (SofaScore)
                  </h3>
                  {jogoSelecionado.escalaçaoIframe ? (
                    <div className="bg-white rounded-xl overflow-hidden min-h-[400px]" dangerouslySetInnerHTML={{ __html: jogoSelecionado.escalaçaoIframe }} />
                  ) : (
                    <div className="bg-slate-900 p-12 rounded-xl border border-slate-700 text-center text-slate-500">
                      Escalação não disponível para este jogo
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
