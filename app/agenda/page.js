
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const jogos = [
  {
    id: 1,
    data: '25/01',
    hora: '18:30',
    adversario: 'Botafogo-SP',
    sigla: 'BOT',
    corAdversario: 'bg-red-600',
    campeonato: 'Paulistão',
    local: 'Jorjão',
    status: 'proximo',
    escalaçaoIframe: `<iframe id="sofa-lineups-embed-15176543" src="https://widgets.sofascore.com/pt-BR/embed/lineups?id=15176543&widgetTheme=light" style="height:786px!important;max-width:800px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`,
    gols: []
  },
  {
    id: 2,
    data: '20/01',
    hora: '20:00',
    adversario: 'Palmeiras',
    sigla: 'PAL',
    corAdversario: 'bg-green-600',
    campeonato: 'Paulistão',
    local: 'Allianz Parque',
    status: 'passado',
    placar: '4 - 0',
    resultado: 'vitoria',
    escalaçaoIframe: `<iframe id="sofa-lineups-embed-11949174" src="https://widgets.sofascore.com/pt-BR/embed/event/11949174/lineups" style="height:600px!important;max-width:800px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`,
    gols: [
      { jogador: 'Neto Pessoa', tempo: "12'", tipo: '⚽' },
      { jogador: 'Rodolfo', tempo: "34'", tipo: '⚽' },
      { jogador: 'Neto Pessoa', tempo: "56'", tipo: '⚽' },
      { jogador: 'Waguininho', tempo: "88'", tipo: '⚽' }
    ]
  },
  {
    id: 3,
    data: '17/01',
    hora: '19:00',
    adversario: 'Primavera',
    sigla: 'PRI',
    corAdversario: 'bg-red-500',
    campeonato: 'Amistoso',
    local: 'Indaiatuba',
    status: 'passado',
    placar: '3 - 4',
    resultado: 'vitoria',
    escalaçaoIframe: null,
    gols: [
      { jogador: 'Lucca', tempo: "10'", tipo: '⚽' },
      { jogador: 'Eduardo', tempo: "25'", tipo: '⚽' },
      { jogador: 'Léo Tocantins', tempo: "60'", tipo: '⚽' },
      { jogador: 'Rodolfo', tempo: "75'", tipo: '⚽' }
    ]
  }
]

export default function AgendaPage() {
  const router = useRouter()
  const [jogoSelecionado, setJogoSelecionado] = useState(null)

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h1 className="text-3xl font-bold">Agenda de Jogos</h1>
        </div>

        {/* LISTA DE JOGOS */}
        <div className="space-y-4">
          {jogos.map((jogo) => (
            <div 
              key={jogo.id}
              onClick={() => setJogoSelecionado(jogo)}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-emerald-500/50 transition-all cursor-pointer group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="text-center min-w-[60px]">
                    <span className="block text-emerald-400 font-bold text-lg">{jogo.data}</span>
                    <span className="text-slate-500 text-xs">{jogo.hora}</span>
                  </div>
                  
                  <div className="h-12 w-px bg-slate-700 hidden md:block"></div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-xs">GN</div>
                      <span className="font-bold">Novorizontino</span>
                    </div>
                    
                    <div className="px-3 py-1 bg-slate-900 rounded text-xs font-bold text-slate-400">
                      {jogo.status === 'passado' ? jogo.placar : 'vs'}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${jogo.corAdversario} rounded-full flex items-center justify-center text-white font-bold text-xs`}>{jogo.sigla}</div>
                      <span className="font-bold">{jogo.adversario}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-700 pt-4 md:pt-0">
                  <div className="text-right">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{jogo.campeonato}</span>
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

        {/* MODAL DE DETALHES */}
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
                    <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-xl mx-auto mb-2">GN</div>
                    <span className="font-bold block">Novorizontino</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    {jogoSelecionado.status === 'passado' ? jogoSelecionado.placar : 'VS'}
                  </div>
                  <div className="text-center">
                    <div className={`w-16 h-16 ${jogoSelecionado.corAdversario} rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2`}>{jogoSelecionado.sigla}</div>
                    <span className="font-bold block">{jogoSelecionado.adversario}</span>
                  </div>
                </div>

                {/* GOLS */}
                {jogoSelecionado.gols.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-emerald-400 font-bold text-sm uppercase mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                      Gols da Partida
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {jogoSelecionado.gols.map((gol, i) => (
                        <div key={i} className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                          <span className="font-medium">{gol.jogador}</span>
                          <span className="text-emerald-400 text-xs font-bold">{gol.tipo} {gol.tempo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ESCALAÇÃO (IFRAME SOFASCORE) */}
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
