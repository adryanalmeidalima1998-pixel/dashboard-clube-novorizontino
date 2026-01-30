"use client"
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 relative">
      
      {/* CABEÇALHO */}
      <header className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-700">
        <Image 
          src="/club/escudonovorizontino.png" 
          alt="Grêmio Novorizontino" 
          width={70} 
          height={70}
          className="rounded-full"
        />
        <div>
          <h1 className="text-3xl font-bold">Grêmio Novorizontino</h1>
          <p className="text-slate-400 text-sm">Temporada 2026</p>
        </div>
      </header>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
        
        {/* COMPETIÇÕES */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-emerald-400 font-bold text-sm uppercase mb-4">Competições</h2>
          
          <div className="space-y-2">
            <Link 
              href="/competicoes/serie-b"
              className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Image src="/competitions/serie-b/logo.png" alt="Série B" width={28} height={28} />
              </div>
              <span className="text-sm">Série B</span>
            </Link>

            <Link 
              href="/competicoes/paulista"
              className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors border border-emerald-500/30"
            >
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Image src="/competitions/paulista/logo.png" alt="Paulistão" width={28} height={28} />
              </div>
              <span className="text-sm">Paulistão</span>
              <div className="ml-auto w-2 h-2 bg-emerald-400 rounded-full"></div>
            </Link>

            <Link 
              href="/competicoes/copa-brasil"
              className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Image src="/competitions/copa-do-brasil/logo.png" alt="Copa do Brasil" width={28} height={28} />
              </div>
              <span className="text-sm">Copa do Brasil</span>
            </Link>

            <Link 
              href="/competicoes/copa-sul-sudeste"
              className="flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Image src="/competitions/copa-sul-sudeste/logo.png" alt="Copa Sul-Sudeste" width={28} height={28} />
              </div>
              <span className="text-sm">Copa Sul-Sudeste</span>
            </Link>
          </div>
        </div>

        {/* BOTÃO AGENDA (Substituindo a Agenda completa) */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col justify-between">
          <div>
            <h2 className="text-emerald-400 font-bold text-sm uppercase mb-4">Agenda</h2>
            <p className="text-slate-400 text-sm mb-6">Confira os próximos jogos, resultados anteriores e escalações detalhadas.</p>
          </div>
          
          <Link 
            href="/agenda"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Acessar Agenda Completa
          </Link>
        </div>

        {/* PLANTEL PRINCIPAL */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-emerald-400 font-bold text-sm uppercase mb-4">Plantel Principal</h2>
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-bold px-1">
              <span>Jogador</span>
              <span>Index</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400">AA</div>
                  <span className="text-sm font-medium">Alexis Alvarino</span>
                </div>
                <span className="text-emerald-400 font-bold">186</span>
              </div>
            </div>
          </div>
          <Link 
            href="/plantel"
            className="block text-center text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-4"
          >
            Ver elenco completo
          </Link>
        </div>

        {/* CENTRAL DE DADOS */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-emerald-400 font-bold text-sm uppercase">Central de Dados</h2>
              <p className="text-slate-400 text-sm">Análise detalhada de performance e métricas avançadas.</p>
            </div>
            <Link 
              href="/central-dados"
              className="bg-slate-900 hover:bg-slate-700 px-6 py-2 rounded-lg text-sm font-bold transition-colors border border-slate-700"
            >
              Abrir Central
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Métricas</span>
              <span className="text-2xl font-black text-white">150+</span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Jogadores</span>
              <span className="text-2xl font-black text-white">250+</span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Categorias</span>
              <span className="text-2xl font-black text-white">14</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
