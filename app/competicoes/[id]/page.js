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
      if (params.id !== 'paulista') {
        setLoading(false)
        return
      }
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
              // Pegar o segundo e terceiro campos independentemente do nome da coluna se necessário, 
              // mas PapaParse com header:true usará os nomes das colunas.
              // Como o código original usava índices, vamos garantir a compatibilidade.
              const keys = Object.keys(row)
              return {
                nome: row[keys[1]] || 'N/A',
                gols: parseInt(row[keys[2]]) || 0,
                time: 'Competição'
              }
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
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-black italic uppercase text-red-500">Competição não encontrada</h1>
        <button onClick={() => router.push('/')} className="mt-4 text-emerald-500 font-bold uppercase text-xs tracking-widest">Voltar ao Início</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER ESTILO PERFORMANCE */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center p-4 shadow-2xl">
                <Image src={competicao.logo} alt={competicao.nome} width={60} height={60} className="object-contain" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                  {competicao.nome}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Dados e Estatísticas em Tempo Real</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {competicao.iframeTabela ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-slate-800/50 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                  <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">{params.id === 'copa-brasil' || params.id === 'paulista' ? 'Chaveamento' : 'Classificação Oficial'}</h2>
                </div>
                <div className="rounded-3xl overflow-hidden bg-white/5 p-1" dangerouslySetInnerHTML={{ __html: competicao.iframeTabela }} />
              </div>
            </div>

            <div className="space-y-8">
              {competicao.iframeSelecao && (
                <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-slate-800/50 shadow-2xl">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">{params.id === 'paulista' ? 'Playoffs' : 'Seleção da Rodada'}</h2>
                  </div>
                  <div className="rounded-3xl overflow-hidden bg-white/5 p-1" dangerouslySetInnerHTML={{ __html: competicao.iframeSelecao }} />
                </div>
              )}

              {params.id === 'paulista' && (
                <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-slate-800/50 shadow-2xl">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Artilharia Real</h2>
                  </div>
                  {loading ? (
                    <div className="flex flex-col items-center py-10 gap-4">
                      <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Sincronizando...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {artilheiros.map((art, i) => (
                        <div key={i} className="flex items-center justify-between p-5 bg-slate-950/80 rounded-2xl border border-slate-800 group hover:border-emerald-500/30 transition-all">
                          <div>
                            <span className="block text-base font-black italic uppercase text-white group-hover:text-emerald-400 transition-colors">{art.nome}</span>
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Gols Marcados</span>
                          </div>
                          <div className="text-emerald-500 font-black text-3xl italic">{art.gols}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 backdrop-blur-md rounded-[3rem] p-20 border border-slate-800/50 text-center shadow-2xl">
            <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
              <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-slate-500 font-black italic uppercase tracking-widest">Competição ainda não iniciada</p>
          </div>
        )}
      </div>
    </div>
  )
}
