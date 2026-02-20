'use client'

import { useRouter } from 'next/navigation'

export default function CentralScouting() {
  const router = useRouter()

  const ferramentas = [
    {
      id: 'lista-preferencial',
      titulo: 'Lista Preferencial',
      descricao: 'Análise de extremos do mercado. Compare alvos com nossos atletas usando radar, dispersão e mapas de calor.',
      rota: '/central-scouting/lista-preferencial',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'ranking',
      titulo: 'Ranking de Perfil',
      descricao: 'Quem se destaca em cada papel? Ordenação por notas de perfil (Construtor, Ofensivo, Defensivo, Equilibrado).',
      rota: '/central-scouting/ranking',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      id: 'radar-perfil',
      titulo: 'Radar de Perfil',
      descricao: 'Qual a assinatura tática do atleta? Visualização 0-100 dos 4 perfis principais em um radar de 4 eixos.',
      rota: '/central-scouting/radar-perfil',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      )
    },
    {
      id: 'percentil',
      titulo: 'Percentil & Radar',
      descricao: 'Raio-X neutro métrica a métrica. Comparação granular 0-100 sem pesos táticos.',
      rota: '/central-scouting/percentil-radar',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 mb-16">
          <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
              Central de <span className="text-brand-yellow">Scouting</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 ml-1">Inteligência de Mercado & Análise de Perfil</p>
          </div>
        </div>

        {/* GRID DE FERRAMENTAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {ferramentas.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.rota)}
              className="group relative bg-slate-900/40 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-800/50 text-left hover:border-brand-yellow/50 transition-all duration-500 overflow-hidden"
            >
              {/* Efeito de Glow no Hover */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-yellow/5 rounded-full blur-[80px] group-hover:bg-brand-yellow/10 transition-all duration-700"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 mb-8 group-hover:scale-110 group-hover:border-brand-yellow/30 transition-all duration-500 text-brand-yellow">
                  {item.icon}
                </div>
                
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-4 group-hover:text-brand-yellow transition-colors">
                  {item.titulo}
                </h2>
                
                <p className="text-slate-500 text-sm leading-relaxed font-medium group-hover:text-slate-300 transition-colors">
                  {item.descricao}
                </p>
                
                <div className="mt-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-yellow opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  Acessar Ferramenta
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* FOOTER INFO */}
        <div className="mt-20 p-8 bg-slate-950/50 rounded-[2.5rem] border border-slate-900 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-brand-yellow rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Motor de Percentis Ativo (Laterais v1.0)</span>
          </div>
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Última atualização: 19 de fevereiro</div>
        </div>
      </div>
    </div>
  )
}
