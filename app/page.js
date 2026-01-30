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
          className="rounded-full shadow-lg shadow-yellow-500/10"
        />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grêmio Novorizontino</h1>
          <p className="text-slate-400 text-sm font-medium">Dashboard de Gestão Técnica • Temporada 2026</p>
        </div>
      </header>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
        
        {/* COMPETIÇÕES */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <h2 className="text-slate-300 font-bold text-xs uppercase tracking-widest">Competições</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3 flex-grow">
            <Link href="/competicoes/serie-b" className="flex flex-col items-center justify-center p-4 bg-slate-900/50 hover:bg-slate-700/50 rounded-xl transition-all border border-slate-700/50 group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Image src="/competitions/serie-b/logo.png" alt="Série B" width={24} height={24} />
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Série B</span>
            </Link>

            <Link href="/competicoes/paulista" className="flex flex-col items-center justify-center p-4 bg-slate-900/50 hover:bg-slate-700/50 rounded-xl transition-all border border-emerald-500/30 group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
                <Image src="/competitions/paulista/logo.png" alt="Paulistão" width={24} height={24} />
              </div>
              <span className="text-[10px] font-bold uppercase text-emerald-400">Paulistão</span>
            </Link>

            <Link href="/competicoes/copa-brasil" className="flex flex-col items-center justify-center p-4 bg-slate-900/50 hover:bg-slate-700/50 rounded-xl transition-all border border-slate-700/50 group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Image src="/competitions/copa-do-brasil/logo.png" alt="Copa do Brasil" width={24} height={24} />
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Copa do Brasil</span>
            </Link>

            <Link href="/competicoes/copa-sul-sudeste" className="flex flex-col items-center justify-center p-4 bg-slate-900/50 hover:bg-slate-700/50 rounded-xl transition-all border border-slate-700/50 group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Image src="/competitions/copa-sul-sudeste/logo.png" alt="Copa Sul-Sudeste" width={24} height={24} />
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Sul-Sudeste</span>
            </Link>
          </div>
        </div>

        {/* CARD AGENDA - REFORMULADO */}
        <Link href="/agenda" className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 group hover:border-emerald-500/50 transition-all flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <h2 className="text-slate-300 font-bold text-xs uppercase tracking-widest">Agenda de Jogos</h2>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-700 group-hover:border-emerald-500/30 transition-colors">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <span className="block text-xl font-bold text-white">Calendário</span>
                <span className="text-xs text-slate-400">Resultados e Próximos Jogos</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 group-hover:bg-emerald-600 transition-all flex items-center justify-between">
            <span className="text-sm font-bold">Acessar Agenda</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </div>
        </Link>

        {/* CARD ELENCO - REFORMULADO (SEM NOME DE JOGADOR) */}
        <Link href="/plantel" className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 group hover:border-yellow-500/50 transition-all flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-all"></div>
          
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <h2 className="text-slate-300 font-bold text-xs uppercase tracking-widest">Elenco Principal</h2>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-700 group-hover:border-yellow-500/30 transition-colors">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <span className="block text-xl font-bold text-white">Plantel</span>
                <span className="text-xs text-slate-400">Gestão Técnica de Atletas</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 group-hover:bg-yellow-600 transition-all flex items-center justify-between">
            <span className="text-sm font-bold">Ver Elenco Completo</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </div>
        </Link>

        {/* CENTRAL DE DADOS - FULL WIDTH */}
        <Link href="/central-dados" className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 lg:col-span-3 group hover:border-emerald-500/30 transition-all overflow-hidden relative">
          <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/5 to-transparent"></div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <h2 className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Central de Inteligência</h2>
              </div>
              <h3 className="text-3xl font-black text-white mb-2">Análise de Dados Avançada</h3>
              <p className="text-slate-400 max-w-xl">Acesse o banco de dados completo com métricas de performance, scouting e indicadores técnicos de toda a temporada.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700 min-w-[120px] text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Métricas</span>
                <span className="text-2xl font-black text-white">150+</span>
              </div>
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700 min-w-[120px] text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Atletas</span>
                <span className="text-2xl font-black text-white">250+</span>
              </div>
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700 min-w-[120px] text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Análises</span>
                <span className="text-2xl font-black text-white">14</span>
              </div>
            </div>
          </div>
        </Link>

      </div>
    </div>
  )
}
