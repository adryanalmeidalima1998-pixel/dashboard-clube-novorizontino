"use client"
import Image from 'next/image'
import Link from 'next/link'

// DADOS DOS JOGADORES (Apenas preview)
const jogadoresPreview = [
  { "Jogador": "Alexis Ivan Alvarino", "Index": "186" }
];

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

        {/* AGENDA */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-emerald-400 font-bold text-sm uppercase">Agenda</h2>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Próximo: 25/01</span>
          </div>
          
          <div className="space-y-4">
            
            {/* Próximo Jogo - Destaque */}
            <div className="bg-slate-900 rounded-xl p-4 border border-emerald-500/30 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Próximo Jogo</span>
                <span className="text-xs text-slate-400">Dom, 25/01 • 18:30</span>
              </div>
              
              <div className="flex items-center justify-between px-2 mb-3">
                {/* Mandante */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-sm shadow-md border-2 border-slate-800">GN</div>
                  <span className="text-xs font-bold text-center">Novorizontino</span>
                </div>
                
                {/* VS */}
                <div className="flex flex-col items-center justify-center w-1/3">
                  <span className="text-slate-500 text-lg font-bold mb-1">vs</span>
                </div>

                {/* Visitante */}
                <div className="flex flex-col items-center gap-2 w-1/3">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-slate-800">BOT</div>
                  <span className="text-xs font-bold text-center">Botafogo-SP</span>
                </div>
              </div>

              {/* Local do Jogo (Separado para não sobrepor) */}
              <div className="flex justify-center pt-2 border-t border-slate-800/50">
                 <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-400 border border-slate-700">
                    🏟️ Jorjão • Paulistão
                 </span>
              </div>
            </div>

            {/* Resultados Recentes */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Resultados Recentes</h3>
              
              {/* Palmeiras */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 grid grid-cols-[1fr_auto_auto] items-center gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 w-[45%] justify-end">
                    <span className="text-xs font-bold text-white truncate">GN</span>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                  </div>
                  <div className="bg-slate-800 px-2 py-1 rounded text-center min-w-[40px]">
                    <span className="text-xs font-bold text-white">4</span>
                    <span className="text-[10px] text-slate-500 mx-1">-</span>
                    <span className="text-xs font-bold text-white">0</span>
                  </div>
                  <div className="flex items-center gap-2 w-[45%] justify-start">
                    <div className="w-2 h-2 bg-green-600 rounded-full shrink-0"></div>
                    <span className="text-xs text-slate-400 truncate">PAL</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-700"></div>
                <div className="text-right min-w-[50px]">
                  <span className="text-[9px] text-emerald-400 font-bold block">VITÓRIA</span>
                  <span className="text-[9px] text-slate-500">20/01</span>
                </div>
              </div>

              {/* Primavera */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 grid grid-cols-[1fr_auto_auto] items-center gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 w-[45%] justify-end">
                    <span className="text-xs text-slate-400 truncate">PRI</span>
                    <div className="w-2 h-2 bg-red-500 rounded-full shrink-0"></div>
                  </div>
                  <div className="bg-slate-800 px-2 py-1 rounded text-center min-w-[40px]">
                    <span className="text-xs font-bold text-white">3</span>
                    <span className="text-[10px] text-slate-500 mx-1">-</span>
                    <span className="text-xs font-bold text-white">4</span>
                  </div>
                  <div className="flex items-center gap-2 w-[45%] justify-start">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                    <span className="text-xs font-bold text-white truncate">GN</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-700"></div>
                <div className="text-right min-w-[50px]">
                  <span className="text-[9px] text-emerald-400 font-bold block">VITÓRIA</span>
                  <span className="text-[9px] text-slate-500">17/01</span>
                </div>
              </div>

              {/* Guarani */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 grid grid-cols-[1fr_auto_auto] items-center gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 w-[45%] justify-end">
                    <span className="text-xs font-bold text-white truncate">GN</span>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                  </div>
                  <div className="bg-slate-800 px-2 py-1 rounded text-center min-w-[40px]">
                    <span className="text-xs font-bold text-white">2</span>
                    <span className="text-[10px] text-slate-500 mx-1">-</span>
                    <span className="text-xs font-bold text-white">0</span>
                  </div>
                  <div className="flex items-center gap-2 w-[45%] justify-start">
                    <div className="w-2 h-2 bg-green-700 rounded-full shrink-0"></div>
                    <span className="text-xs text-slate-400 truncate">GUA</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-700"></div>
                <div className="text-right min-w-[50px]">
                  <span className="text-[9px] text-emerald-400 font-bold block">VITÓRIA</span>
                  <span className="text-[9px] text-slate-500">13/01</span>
                </div>
              </div>

              {/* Santos */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 grid grid-cols-[1fr_auto_auto] items-center gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 w-[45%] justify-end">
                    <span className="text-xs text-slate-400 truncate">SAN</span>
                    <div className="w-2 h-2 bg-white rounded-full shrink-0"></div>
                  </div>
                  <div className="bg-slate-800 px-2 py-1 rounded text-center min-w-[40px]">
                    <span className="text-xs font-bold text-white">2</span>
                    <span className="text-[10px] text-slate-500 mx-1">-</span>
                    <span className="text-xs font-bold text-white">1</span>
                  </div>
                  <div className="flex items-center gap-2 w-[45%] justify-start">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                    <span className="text-xs font-bold text-white truncate">GN</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-700"></div>
                <div className="text-right min-w-[50px]">
                  <span className="text-[9px] text-red-400 font-bold block">DERROTA</span>
                  <span className="text-[9px] text-slate-500">10/01</span>
                </div>
              </div>
            </div>

            {/* Próximos Jogos Lista */}
            <div className="space-y-3 pt-2 border-t border-slate-700">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 pt-2">Em Breve</h3>
              
              {/* Mirassol */}
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/30 grid grid-cols-[1fr_auto] items-center gap-3 hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24">
                    <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>
                    <span className="text-xs text-slate-300 truncate">Mirassol</span>
                  </div>
                  <span className="text-[10px] text-slate-500">vs</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                    <span className="text-xs font-bold text-white truncate">GN</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] block text-slate-400">01/02</span>
                  <span className="text-xs text-white font-bold">18:30</span>
                </div>
              </div>

              {/* São Bernardo */}
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/30 grid grid-cols-[1fr_auto] items-center gap-3 hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                    <span className="text-xs font-bold text-white truncate">GN</span>
                  </div>
                  <span className="text-[10px] text-slate-500">vs</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full shrink-0"></div>
                    <span className="text-xs text-slate-300 truncate">S. Bernardo</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] block text-slate-400">07/02</span>
                  <span className="text-xs text-white font-bold">18:30</span>
                </div>
              </div>

              {/* Bragantino */}
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/30 grid grid-cols-[1fr_auto] items-center gap-3 hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-24">
                    <div className="w-2 h-2 bg-white rounded-full shrink-0"></div>
                    <span className="text-xs text-slate-300 truncate">Bragantino</span>
                  </div>
                  <span className="text-[10px] text-slate-500">vs</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                    <span className="text-xs font-bold text-white truncate">GN</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] block text-slate-400">15/02</span>
                  <span className="text-xs text-white font-bold">20:30</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* COLUNA DIREITA (PLANTEL + CENTRAL DE DADOS) */}
        <div className="space-y-6">
          
          {/* PLANTEL - Agora link para página dedicada */}
          <Link 
            href="/plantel"
            className="block w-full text-left bg-slate-800 rounded-xl p-6 border border-slate-700 cursor-pointer hover:border-emerald-500 transition shadow-lg group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-emerald-400 font-bold text-sm uppercase">Plantel Principal</h2>
              <svg className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-xs text-slate-500 pb-2 border-b border-slate-700">
                <span className="w-12">Nome</span>
                <span className="flex-1"></span>
                <span className="w-8 text-center">Cla</span>
              </div>
              {/* Mostra apenas o primeiro jogador como preview */}
              {jogadoresPreview.map((jogador, idx) => (
                <div key={idx} className="flex items-center py-2">
                  <span className="text-emerald-400 w-6 text-xs">1</span>
                  <span className="flex-1 text-sm">{jogador.Jogador}</span>
                  <span className="w-8 text-center text-sm">{jogador.Index}</span>
                </div>
              ))}
              <div className="pt-2 text-center">
                <span className="text-xs text-slate-400 group-hover:text-white transition">Ver elenco completo (23 jogadores)</span>
              </div>
            </div>
          </Link>

          {/* CENTRAL DE DADOS */}
          <Link 
            href="/central-dados"
            className="block bg-slate-800/60 backdrop-blur rounded-xl p-6 border border-slate-700 cursor-pointer hover:border-emerald-500 transition shadow-lg"
          >
            <h2 className="text-emerald-400 font-semibold text-lg mb-4">Central de Dados</h2>
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full mx-auto mb-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Análise de métricas</p>
            </div>
          </Link>

        </div> {/* Fim da coluna lateral */}

      </div> {/* Fim do Grid principal */}

    </div> /* Fim da div min-h-screen */
  )
}
