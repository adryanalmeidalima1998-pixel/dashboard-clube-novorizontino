
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const jogos = [
  {
    id: 1,
    data: '07/02/2026',
    hora: '18:30',
    adversario: 'São Bernardo',
    sigla: 'SBE',
    corAdversario: 'bg-yellow-600',
    campeonato: 'Paulista Série A1',
    local: 'Jorjão',
    status: 'proximo',
    mandante: 'Grêmio Novorizontino',
    visitante: 'São Bernardo',
    escalaçaoIframe: null,
    gols: []
  },
  {
    id: 2,
    data: '01/02/2026',
    hora: '18:30',
    adversario: 'Mirassol',
    sigla: 'MIR',
    corAdversario: 'bg-yellow-500',
    campeonato: 'Paulista Série A1',
    local: 'Mirassol',
    status: 'proximo',
    mandante: 'Mirassol',
    visitante: 'Grêmio Novorizontino',
    escalaçaoIframe: null,
    gols: []
  },
  {
    id: 3,
    data: '25/01/2026',
    hora: '18:30',
    adversario: 'Botafogo-SP',
    sigla: 'BOT',
    corAdversario: 'bg-red-600',
    campeonato: 'Paulista Série A1',
    local: 'Jorjão',
    status: 'passado',
    mandante: 'Grêmio Novorizontino',
    visitante: 'Botafogo-SP',
    placar: '2 - 0',
    resultado: 'vitoria',
    escalaçaoIframe: `<iframe id="sofa-lineups-embed-15176543" src="https://widgets.sofascore.com/pt-BR/embed/lineups?id=15176543&widgetTheme=light" style="height:786px!important;max-width:800px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`,
    gols: [
      { jogador: 'Robson', tempo: "85'", tipo: '⚽' },
      { jogador: 'Rômulo', tempo: "25' (Pen.)", tipo: '⚽' }
    ]
  },
  {
    id: 4,
    data: '20/01/2026',
    hora: '20:00',
    adversario: 'Palmeiras',
    sigla: 'PAL',
    corAdversario: 'bg-green-600',
    campeonato: 'Paulista Série A1',
    local: 'Jorjão',
    status: 'passado',
    mandante: 'Grêmio Novorizontino',
    visitante: 'Palmeiras',
    placar: '4 - 0',
    resultado: 'vitoria',
    escalaçaoIframe: `<iframe id="sofa-lineups-embed-11949174" src="https://widgets.sofascore.com/pt-BR/embed/event/11949174/lineups" style="height:600px!important;max-width:800px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`,
    gols: [
      { jogador: 'Hélio Borges', tempo: "72'", tipo: '⚽' },
      { jogador: 'Robson', tempo: "62'", tipo: '⚽' },
      { jogador: 'Robson', tempo: "42'", tipo: '⚽' },
      { jogador: 'Robson', tempo: "20'", tipo: '⚽' }
    ]
  },
  {
    id: 5,
    data: '17/01/2026',
    hora: '19:00',
    adversario: 'EC Primavera',
    sigla: 'PRI',
    corAdversario: 'bg-red-500',
    campeonato: 'Paulista Série A1',
    local: 'Indaiatuba',
    status: 'passado',
    mandante: 'EC Primavera',
    visitante: 'Grêmio Novorizontino',
    placar: '3 - 4',
    resultado: 'vitoria',
    escalaçaoIframe: `<iframe id="sofa-lineups-embed-11949132" src="https://widgets.sofascore.com/pt-BR/embed/event/11949132/lineups" style="height:600px!important;max-width:800px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`,
    gols: [
      { jogador: 'Jordi', tempo: "49' (OG)", tipo: '⚽' },
      { jogador: 'Renatinho', tempo: "20'", tipo: '⚽' },
      { jogador: 'Gabriel Poveda', tempo: "10'", tipo: '⚽' },
      { jogador: 'Robson', tempo: "90' +4", tipo: '⚽' },
      { jogador: 'Robson', tempo: "55'", tipo: '⚽' },
      { jogador: 'Maykon Jesus', tempo: "67'", tipo: '⚽' },
      { jogador: 'Rômulo', tempo: "34' (Pen.)", tipo: '⚽' }
    ]
  },
  {
    id: 6,
    data: '13/01/2026',
    hora: '18:30',
    adversario: 'Guarani',
    sigla: 'GUA',
    corAdversario: 'bg-green-700',
    campeonato: 'Paulista Série A1',
    local: 'Jorjão',
    status: 'passado',
    mandante: 'Grêmio Novorizontino',
    visitante: 'Guarani',
    placar: '2 - 0',
    resultado: 'vitoria',
    escalaçaoIframe: `<iframe id="sofa-lineups-embed-11949090" src="https://widgets.sofascore.com/pt-BR/embed/event/11949090/lineups" style="height:600px!important;max-width:800px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`,
    gols: [
      { jogador: 'Juninho', tempo: "71'", tipo: '⚽' },
      { jogador: 'Robson', tempo: "33'", tipo: '⚽' }
    ]
  },
  {
    id: 7,
    data: '10/01/2026',
    hora: '18:30',
    adversario: 'Santos',
    sigla: 'SAN',
    corAdversario: 'bg-white text-black',
    campeonato: 'Paulista Série A1',
    local: 'Santos',
    status: 'passado',
    mandante: 'Santos',
    visitante: 'Grêmio Novorizontino',
    placar: '2 - 1',
    resultado: 'derrota',
    escalaçaoIframe: `<iframe id="sofa-lineups-embed-11949048" src="https://widgets.sofascore.com/pt-BR/embed/event/11949048/lineups" style="height:600px!important;max-width:800px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`,
    gols: [
      { jogador: 'Thaciano', tempo: "89'", tipo: '⚽' },
      { jogador: 'Gabriel Barbosa', tempo: "52'", tipo: '⚽' },
      { jogador: 'Diego Galo', tempo: "26'", tipo: '⚽' }
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
                  <div className="text-center min-w-[100px]">
                    <span className="block text-emerald-400 font-bold text-sm">{jogo.data}</span>
                    <span className="text-slate-500 text-xs">{jogo.hora}</span>
                  </div>
                  
                  <div className="h-12 w-px bg-slate-700 hidden md:block"></div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${jogo.mandante === 'Grêmio Novorizontino' ? 'bg-yellow-500 text-black' : 'bg-slate-700'} rounded-full flex items-center justify-center font-bold text-xs`}>
                        {jogo.mandante === 'Grêmio Novorizontino' ? 'GN' : jogo.sigla}
                      </div>
                      <span className="font-bold text-sm">{jogo.mandante}</span>
                    </div>
                    
                    <div className="px-3 py-1 bg-slate-900 rounded text-xs font-bold text-slate-400">
                      {jogo.status === 'passado' ? jogo.placar : 'vs'}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${jogo.visitante === 'Grêmio Novorizontino' ? 'bg-yellow-500 text-black' : jogo.corAdversario} rounded-full flex items-center justify-center font-bold text-xs`}>
                        {jogo.visitante === 'Grêmio Novorizontino' ? 'GN' : jogo.sigla}
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
                    <div className={`w-16 h-16 ${jogoSelecionado.mandante === 'Grêmio Novorizontino' ? 'bg-yellow-500 text-black' : 'bg-slate-700'} rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-2`}>
                      {jogoSelecionado.mandante === 'Grêmio Novorizontino' ? 'GN' : jogoSelecionado.sigla}
                    </div>
                    <span className="font-bold block text-sm">{jogoSelecionado.mandante}</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-400">
                    {jogoSelecionado.status === 'passado' ? jogoSelecionado.placar : 'VS'}
                  </div>
                  <div className="text-center">
                    <div className={`w-16 h-16 ${jogoSelecionado.visitante === 'Grêmio Novorizontino' ? 'bg-yellow-500 text-black' : jogoSelecionado.corAdversario} rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-2`}>
                      {jogoSelecionado.visitante === 'Grêmio Novorizontino' ? 'GN' : jogoSelecionado.sigla}
                    </div>
                    <span className="font-bold block text-sm">{jogoSelecionado.visitante}</span>
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
                          <span className="font-medium text-sm">{gol.jogador}</span>
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
