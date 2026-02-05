"use client"
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      
      {/* CABEÇALHO ESTILO PERFORMANCE */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8 mb-20">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-900 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <Image 
            src="/club/escudonovorizontino.png" 
            alt="Grêmio Novorizontino" 
            width={100} 
            height={100}
            className="relative rounded-full bg-[#0a0c10] p-2"
          />
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
            Grêmio <span className="text-emerald-500">Novorizontino</span>
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-3 mt-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">Dashboard de Gestão Técnica • Temporada 2026</p>
          </div>
        </div>
      </header>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        
        {/* COMPETIÇÕES - DESIGN REFORMULADO */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-slate-800/50 flex flex-col shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Competições Ativas</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 flex-grow">
            {[
              { id: 'serie-b', name: 'Série B', color: 'slate' },
              { id: 'paulista', name: 'Paulistão', color: 'emerald' },
              { id: 'copa-brasil', name: 'Copa Brasil', color: 'slate' },
              { id: 'copa-sul-sudeste', name: 'Sul-Sudeste', color: 'slate' }
            ].map((comp) => (
              <Link 
                key={comp.id}
                href={`/competicoes/${comp.id}`} 
                className={`flex flex-col items-center justify-center p-5 bg-slate-950/50 hover:bg-slate-800/50 rounded-3xl transition-all border ${comp.color === 'emerald' ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-slate-800/50'} group/item`}
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-3 group-hover/item:scale-110 transition-transform duration-500 shadow-xl">
                  <Image src={`/competitions/${comp.id}/logo.png`} alt={comp.name} width={32} height={32} className="object-contain" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${comp.color === 'emerald' ? 'text-emerald-400' : 'text-slate-500'}`}>{comp.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* CARD AGENDA */}
        <Link href="/agenda" className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-slate-800/50 group hover:border-emerald-500/30 transition-all duration-500 flex flex-col justify-between overflow-hidden relative shadow-2xl">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all"></div>
          
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
              <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Calendário</h2>
            </div>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 bg-slate-950 rounded-[2rem] flex items-center justify-center border border-slate-800 group-hover:border-emerald-500/30 transition-all duration-500 shadow-inner">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <span className="block text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-emerald-400 transition-colors">Agenda</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resultados & Próximos</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 group-hover:bg-emerald-500 transition-all duration-500 flex items-center justify-between shadow-xl">
            <span className="text-xs font-black uppercase tracking-widest group-hover:text-slate-950">Acessar Agenda</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform group-hover:text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </div>
        </Link>

        {/* CARD ELENCO */}
        <Link href="/plantel" className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-slate-800/50 group hover:border-emerald-500/30 transition-all duration-500 flex flex-col justify-between overflow-hidden relative shadow-2xl">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all"></div>
          
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
              <h2 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Performance</h2>
            </div>
            
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 bg-slate-950 rounded-[2rem] flex items-center justify-center border border-slate-800 group-hover:border-emerald-500/30 transition-all duration-500 shadow-inner">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <span className="block text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-emerald-400 transition-colors">Plantel</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestão Técnica de Atletas</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 group-hover:bg-emerald-500 transition-all duration-500 flex items-center justify-between shadow-xl">
            <span className="text-xs font-black uppercase tracking-widest group-hover:text-slate-950">Ver Elenco Completo</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform group-hover:text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </div>
        </Link>

        {/* CENTRAL DE DADOS - FULL WIDTH DESIGN */}
        <Link href="/central-dados" className="bg-slate-900/40 backdrop-blur-md rounded-[3rem] p-10 border border-slate-800/50 lg:col-span-3 group hover:border-emerald-500/30 transition-all duration-700 overflow-hidden relative shadow-2xl">
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/[0.03] to-transparent"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-3xl"></div>
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
            <div className="flex-grow text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <h2 className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em]">Central de Inteligência</h2>
              </div>
              <h3 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white mb-4 group-hover:text-emerald-400 transition-colors duration-500">Análise de Dados <span className="text-slate-600 group-hover:text-white transition-colors">Avançada</span></h3>
              <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">Acesse o ecossistema completo de Big Data do clube. Métricas de performance, scouting avançado e indicadores técnicos integrados em tempo real.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-6 w-full lg:w-auto">
              {[
                { label: 'Métricas', val: '150+' },
                { label: 'Atletas', val: '250+' },
                { label: 'Análises', val: '14' }
              ].map((stat, i) => (
                <div key={i} className="bg-slate-950/80 p-6 rounded-[2rem] border border-slate-800 min-w-[140px] text-center shadow-inner group-hover:border-emerald-500/20 transition-all duration-500">
                  <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest block mb-2">{stat.label}</span>
                  <span className="text-3xl font-black text-white italic">{stat.val}</span>
                </div>
              ))}
            </div>
          </div>
        </Link>

      </div>

      {/* FOOTER DISCRETO */}
      <footer className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-900 flex justify-between items-center">
        <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest">© 2026 Grêmio Novorizontino</span>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest">Sistemas Ativos</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
