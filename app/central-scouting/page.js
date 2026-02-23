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
    <div className="min-h-screen bg-white text-black p-4 font-sans">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6">

        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-3">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button
              onClick={() => router.push('/')}
              className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              ← VOLTAR
            </button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Central de Scouting
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              Inteligência de Mercado & Análise de Perfil
            </div>
          </div>
        </header>

        {/* GRID DE FERRAMENTAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ferramentas.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.rota)}
              className="group border-2 border-slate-200 hover:border-amber-500 bg-white p-8 rounded-2xl text-left transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="w-14 h-14 bg-slate-100 group-hover:bg-amber-500 rounded-xl flex items-center justify-center mb-6 transition-all duration-200 text-slate-500 group-hover:text-black">
                {item.icon}
              </div>
              <h2 className="text-lg font-black uppercase tracking-tighter mb-2 text-black group-hover:text-amber-600 transition-colors">
                {item.titulo}
              </h2>
              <p className="text-slate-500 text-xs leading-relaxed font-medium group-hover:text-slate-700 transition-colors">
                {item.descricao}
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 opacity-0 group-hover:opacity-100 transition-all">
                Acessar
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* FOOTER */}
        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Motor de Percentis Ativo (Laterais v1.0)</span>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

      </div>
    </div>
  )
}
