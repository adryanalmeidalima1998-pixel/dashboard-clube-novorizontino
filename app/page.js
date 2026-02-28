"use client"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
        A carregar...
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">

        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-3">
          <div className="flex items-center gap-4">
            <Image
              src="/club/escudonovorizontino.png"
              alt="Grêmio Novorizontino"
              width={64}
              height={64}
              className="h-16 w-auto"
            />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Dashboard de Gestão Técnica</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Temporada 2026
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              {session?.user?.name || 'Comissão Técnica'} · {new Date().toLocaleDateString('pt-PT')}
            </div>
          </div>
        </header>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* COMPETIÇÕES */}
          <div className="border-2 border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm hover:border-amber-500 transition-all group">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
              <h2 className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Competições Ativas</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-grow">
              {[
                { id: 'serie-b', name: 'Série B' },
                { id: 'paulista', name: 'Paulistão' },
                { id: 'copa-do-brasil', name: 'Copa Brasil' },
                { id: 'copa-sul-sudeste', name: 'Sul-Sudeste' }
              ].map((comp) => (
                <Link
                  key={comp.id}
                  href={`/competicoes/${comp.id}`}
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-amber-50 rounded-xl transition-all border-2 border-slate-100 hover:border-amber-400 group/item"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-2 border border-slate-200 group-hover/item:border-amber-300 transition-all shadow-sm">
                    <Image src={`/competitions/${comp.id}/logo.png`} alt={comp.name} width={32} height={32} className="object-contain" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover/item:text-amber-600 transition-colors">{comp.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* AGENDA */}
          <Link href="/agenda" className="border-2 border-slate-200 rounded-2xl p-6 group hover:border-amber-500 transition-all flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
                <h2 className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Calendário</h2>
              </div>
              <div className="flex items-center gap-5 mb-5">
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-slate-200 group-hover:border-amber-400 transition-all text-amber-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <span className="block text-2xl font-black italic uppercase tracking-tighter text-black group-hover:text-amber-600 transition-colors">Agenda</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resultados & Próximos</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 group-hover:bg-amber-500 text-white group-hover:text-black p-4 rounded-xl flex items-center justify-between transition-all shadow">
              <span className="text-xs font-black uppercase tracking-widest">Acessar Agenda</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </div>
          </Link>

          {/* PLANTEL */}
          <Link href="/plantel" className="border-2 border-slate-200 rounded-2xl p-6 group hover:border-amber-500 transition-all flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
                <h2 className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Performance</h2>
              </div>
              <div className="flex items-center gap-5 mb-5">
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-slate-200 group-hover:border-amber-400 transition-all text-amber-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <span className="block text-2xl font-black italic uppercase tracking-tighter text-black group-hover:text-amber-600 transition-colors">Plantel</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestão Técnica de Atletas</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 group-hover:bg-amber-500 text-white group-hover:text-black p-4 rounded-xl flex items-center justify-between transition-all shadow">
              <span className="text-xs font-black uppercase tracking-widest">Ver Elenco Completo</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </div>
          </Link>

          {/* SCOUTING */}
          <Link href="/central-scouting" className="border-2 border-slate-200 rounded-2xl p-6 group hover:border-amber-500 transition-all flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
                <h2 className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Mercado & Perfis</h2>
              </div>
              <div className="flex items-center gap-5 mb-5">
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-slate-200 group-hover:border-amber-400 transition-all text-amber-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div>
                  <span className="block text-2xl font-black italic uppercase tracking-tighter text-black group-hover:text-amber-600 transition-colors">Scouting</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Análise de Perfil & Percentil</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 group-hover:bg-amber-500 text-white group-hover:text-black p-4 rounded-xl flex items-center justify-between transition-all shadow">
              <span className="text-xs font-black uppercase tracking-widest">Central de Scouting</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </div>
          </Link>

          {/* CENTRAL DE DADOS - span 2 */}
          <Link href="/central-dados" className="border-2 border-slate-200 rounded-2xl p-6 lg:col-span-2 group hover:border-amber-500 transition-all overflow-hidden relative shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex-grow text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                  <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div>
                  <h2 className="text-amber-600 font-black text-[10px] uppercase tracking-widest">Central de Inteligência</h2>
                </div>
                <h3 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-black mb-3 group-hover:text-amber-600 transition-colors">
                  Análise de Dados <span className="text-slate-400 group-hover:text-black transition-colors">Avançada</span>
                </h3>
                <p className="text-slate-500 font-medium max-w-2xl text-sm leading-relaxed">
                  Acesse o ecossistema completo de dados do clube. Métricas de performance, scouting avançado e indicadores técnicos integrados.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full lg:w-auto">
                {[
                  { label: 'Métricas', val: '150+' },
                  { label: 'Atletas', val: '250+' },
                  { label: 'Análises', val: '14' }
                ].map((stat, i) => (
                  <div key={i} className="border-2 border-slate-200 group-hover:border-amber-300 p-5 rounded-xl min-w-[120px] text-center transition-all">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">{stat.label}</span>
                    <span className="text-3xl font-black text-black italic">{stat.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>

        </div>

        {/* FOOTER */}
        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sistemas Ativos · Temporada 2026</span>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

      </div>
    </div>
  )
}
