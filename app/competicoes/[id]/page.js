'use client'

import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { cleanData } from '../../utils/dataCleaner'

export default function CompeticaoPage() {
  const params = useParams()
  const router = useRouter()
  const [artilheiros, setArtilheiros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadArtilheiros() {
      if (params.id !== 'paulista') { setLoading(false); return }
      try {
        const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQeJZkq2YXHN6uFADcOqHJwcBm6aUOIaHhMvJP1E6g82iobqFesgLhLK46zWBd_xfFm7ZHEV72AvL_D/pub?output=csv"
        const response = await fetch(url)
        const csvText = await response.text()
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data)
            const parsed = dadosLimpos.map(row => {
              const keys = Object.keys(row)
              return { nome: row[keys[1]] || 'N/A', gols: parseInt(row[keys[2]]) || 0 }
            }).sort((a, b) => b.gols - a.gols)
            setArtilheiros(parsed)
          }
        })
      } catch (error) {
        console.error("Erro ao carregar artilheiros:", error)
      } finally {
        setLoading(false)
      }
    }
    loadArtilheiros()
  }, [params.id])

  const competicoes = {
    'paulista': {
      nome: 'Paulistão 2026',
      logo: '/competitions/paulista/logo.png',
      iframeTabela: `<iframe id="sofa-standings-embed-57411-86993" src="https://widgets.sofascore.com/pt-BR/embed/tournament/57411/season/86993/standings/Paulista%2C%20Serie%20A1%202026?widgetTitle=Paulista%2C%20Serie%20A1%202026&showCompetitionLogo=true" style="height:963px!important;max-width:768px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`,
      iframeSelecao: `<iframe id="sofa-cupTree-embed-372-86993-10847645" src="https://widgets.sofascore.com/pt-BR/embed/unique-tournament/372/season/86993/cuptree/10847645?widgetTitle=Paulista, Serie A1 2026, Playoffs&showCompetitionLogo=true&widgetTheme=light" style="height:480px!important;max-width:700px!important;width:100%!important;" frameborder="0" scrolling="yes"></iframe>`,
    },
    'serie-b': { nome: 'Série B', logo: '/competitions/serie-b/logo.png', iframeTabela: `<iframe id="sofa-standings-embed-1449-89840" src="https://widgets.sofascore.com/pt-BR/embed/tournament/1449/season/89840/standings/Brasileiro%20Serie%20B%202026?widgetTitle=Brasileiro%20Serie%20B%202026&showCompetitionLogo=true" style="height:1123px!important;max-width:768px!important;width:100%!important;" frameborder="0" scrolling="no"></iframe>`, iframeSelecao: null },
    'copa-brasil': { nome: 'Copa do Brasil', logo: '/competitions/copa-do-brasil/logo.png', iframeTabela: `<iframe id="sofa-cupTree-embed-373-89353-10846948" src="https://widgets.sofascore.com/pt-BR/embed/unique-tournament/373/season/89353/cuptree/10846948?widgetTitle=Copa do Brasil 2026&showCompetitionLogo=true&widgetTheme=light" style="height:480px!important;max-width:700px!important;width:100%!important;" frameborder="0" scrolling="yes"></iframe>`, iframeSelecao: null },
    'copa-sul-sudeste': { nome: 'Copa Sul-Sudeste', logo: '/competitions/copa-sul-sudeste/logo.png', iframeTabela: null, iframeSelecao: null }
  }

  const competicao = competicoes[params.id]

  if (!competicao) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-black">
      <div className="text-center">
        <h1 className="text-2xl font-black italic uppercase text-red-500">Competição não encontrada</h1>
        <button onClick={() => router.push('/')} className="mt-4 text-amber-600 font-bold uppercase text-xs tracking-widest">← Voltar ao Início</button>
      </div>
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
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
                <Image src={competicao.logo} alt={competicao.nome} width={24} height={24} className="object-contain" />
              </div>
              {competicao.nome}
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              Dados e Estatísticas em Tempo Real
            </div>
          </div>
        </header>

        {/* CONTEÚDO */}
        {competicao.iframeTabela ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="border-2 border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
                  <h2 className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
                    {params.id === 'copa-brasil' || params.id === 'paulista' ? 'Chaveamento' : 'Classificação Oficial'}
                  </h2>
                </div>
                <div className="rounded-xl overflow-hidden" dangerouslySetInnerHTML={{ __html: competicao.iframeTabela }} />
              </div>
            </div>

            <div className="space-y-6">
              {competicao.iframeSelecao && (
                <div className="border-2 border-slate-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
                    <h2 className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
                      {params.id === 'paulista' ? 'Playoffs' : 'Seleção da Rodada'}
                    </h2>
                  </div>
                  <div className="rounded-xl overflow-hidden" dangerouslySetInnerHTML={{ __html: competicao.iframeSelecao }} />
                </div>
              )}

              {params.id === 'paulista' && (
                <div className="border-2 border-slate-200 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
                    <h2 className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Artilharia Real</h2>
                  </div>
                  {loading ? (
                    <div className="flex flex-col items-center py-10 gap-3">
                      <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Sincronizando...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {artilheiros.map((art, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border-2 border-slate-100 hover:border-amber-300 transition-all group">
                          <div>
                            <span className="block text-sm font-black italic uppercase text-black group-hover:text-amber-600 transition-colors">{art.nome}</span>
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Gols Marcados</span>
                          </div>
                          <div className="text-amber-500 font-black text-2xl italic">{art.gols}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="border-2 border-slate-200 rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-slate-400 font-black italic uppercase tracking-widest">Competição ainda não iniciada</p>
          </div>
        )}

        {/* FOOTER */}
        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Dados em Tempo Real</span>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

      </div>
    </div>
  )
}
