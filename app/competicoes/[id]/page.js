'use client'

import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

export default function CompeticaoPage() {
  const params = useParams()
  const router = useRouter()

  const competicoes = {
    'paulista': {
      nome: 'Paulistão 2026',
      logo: '/competitions/paulista/logo.png',
      iframeTabela: `<iframe id="sofa-standings-embed-57411-86993" src="https://widgets.sofascore.com/pt-BR/embed/tournament/57411/season/86993/standings/Paulista%2C%20Serie%20A1%202026?widgetTitle=Paulista%2C%20Serie%20A1%202026&showCompetitionLogo=true" style="height:963px!important;max-width:768px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`,
      iframeSelecao: `<iframe id="sofa-totw-embed-372-86993-23741" width="100%" height="598" style="display:block;max-width:700px" src="https://widgets.sofascore.com/pt-BR/embed/unique-tournament/372/season/86993/round/23741/teamOfTheWeek?showCompetitionLogo=true&widgetTheme=light&widgetTitle=Paulista%20S%C3%A9rie%20A1" frameBorder="0" scrolling="no"></iframe>`,
      artilheiros: [
        { nome: 'Neto Pessoa', time: 'Novorizontino', gols: 5 },
        { nome: 'Flaco López', time: 'Palmeiras', gols: 4 },
        { nome: 'Yuri Alberto', time: 'Corinthians', gols: 3 },
        { nome: 'Rodolfo', time: 'Novorizontino', gols: 3 },
      ]
    },
    'serie-b': {
      nome: 'Série B',
      logo: '/competitions/serie-b/logo.png',
      iframeTabela: null,
      iframeSelecao: null,
      artilheiros: []
    },
    'copa-brasil': {
      nome: 'Copa do Brasil',
      logo: '/competitions/copa-do-brasil/logo.png',
      iframeTabela: null,
      iframeSelecao: null,
      artilheiros: []
    },
    'copa-sul-sudeste': {
      nome: 'Copa Sul-Sudeste',
      logo: '/competitions/copa-sul-sudeste/logo.png',
      iframeTabela: null,
      iframeSelecao: null,
      artilheiros: []
    }
  }

  const competicao = competicoes[params.id]

  if (!competicao) {
    return <div className="min-h-screen bg-gray-900 text-white p-6">Competição não encontrada</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      
      {/* BOTÃO VOLTAR */}
      <button 
        onClick={() => router.push('/')}
        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar
      </button>

      {/* CABEÇALHO DA COMPETIÇÃO */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center p-3">
          <Image 
            src={competicao.logo} 
            alt={competicao.nome} 
            width={60} 
            height={60}
            className="object-contain"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{competicao.nome}</h1>
          <p className="text-gray-400">Dados e Estatísticas</p>
        </div>
      </div>

      {competicao.iframeTabela ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* TABELA (Coluna maior) */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <h2 className="text-emerald-400 font-bold text-sm uppercase mb-4">Classificação</h2>
              <div dangerouslySetInnerHTML={{ __html: competicao.iframeTabela }} />
            </div>
          </div>

          {/* COLUNA LATERAL (Seleção e Artilheiros) */}
          <div className="space-y-6">
            {/* SELEÇÃO DA RODADA */}
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <h2 className="text-emerald-400 font-bold text-sm uppercase mb-4">Seleção da Rodada</h2>
              <div dangerouslySetInnerHTML={{ __html: competicao.iframeSelecao }} />
            </div>

            {/* ARTILHEIROS */}
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <h2 className="text-emerald-400 font-bold text-sm uppercase mb-4">Artilheiros</h2>
              <div className="space-y-3">
                {competicao.artilheiros.map((art, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700/50">
                    <div>
                      <span className="block text-sm font-bold">{art.nome}</span>
                      <span className="text-[10px] text-gray-500 uppercase">{art.time}</span>
                    </div>
                    <div className="text-emerald-400 font-black text-xl">
                      {art.gols}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-12 border border-gray-700 text-center">
          <p className="text-gray-400 mb-2">Competição ainda não iniciada</p>
          <p className="text-sm text-gray-500">Os dados serão exibidos quando a competição começar</p>
        </div>
      )}

    </div>
  )
}
