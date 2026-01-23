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
      iframe: `<iframe id="sofa-standings-embed-57411-86993" src="https://widgets.sofascore.com/pt-BR/embed/tournament/57411/season/86993/standings/Paulista%2C%20Serie%20A1%202026?widgetTitle=Paulista%2C%20Serie%20A1%202026&showCompetitionLogo=true" style="height:963px!important;max-width:768px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`
    },
    'serie-b': {
      nome: 'Série B',
      logo: '/competitions/serie-b/logo.png',
      iframe: null
    },
    'copa-brasil': {
      nome: 'Copa do Brasil',
      logo: '/competitions/copa-do-brasil/logo.png',
      iframe: null
    },
    'copa-sul-sudeste': {
      nome: 'Copa Sul-Sudeste',
      logo: '/competitions/copa-sul-sudeste/logo.png',
      iframe: null
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
          <p className="text-gray-400">Classificação</p>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
        {competicao.iframe ? (
          <div dangerouslySetInnerHTML={{ __html: competicao.iframe }} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-2">Competição ainda não iniciada</p>
            <p className="text-sm text-gray-500">A tabela será exibida quando a competição começar</p>
          </div>
        )}
      </div>

    </div>
  )
}