'use client';

import { useRouter } from 'next/navigation';

export default function CapaRelatorio() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-0 font-sans overflow-hidden print:bg-white print:text-black">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .capa-container { background: white !important; color: black !important; }
          .capa-header { background: linear-gradient(135deg, #1e293b 0%, #1e3a8a 100%) !important; color: white !important; }
          .capa-title { color: black !important; }
          .capa-subtitle { color: #666 !important; }
          .capa-accent { color: #fbbf24 !important; }
          .capa-footer { border-top-color: #e5e7eb !important; color: #666 !important; }
        }
      `}</style>

      <div className="capa-container min-h-screen flex flex-col justify-between items-center p-8 relative overflow-hidden">
        {/* BACKGROUND DECORATIVO */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>

        {/* HEADER COM ESCUDO */}
        <div className="capa-header relative z-10 flex flex-col items-center justify-center gap-6 mb-12">
          <img src="/club/escudonovorizontino.png" alt="Escudo Grêmio Novorizontino" className="h-32 w-auto drop-shadow-2xl animate-pulse" />
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase mb-2 leading-none capa-title">Grêmio Novorizontino</h1>
            <p className="text-lg font-bold tracking-widest text-amber-500 uppercase capa-accent">Departamento de Scouting</p>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="relative z-10 text-center max-w-3xl mx-auto flex flex-col gap-8">
          <div className="border-t-4 border-b-4 border-amber-500 py-12 px-8">
            <h2 className="text-6xl font-black text-amber-500 uppercase mb-6 tracking-tighter capa-accent">Relatório Estratégico</h2>
            <p className="text-4xl font-black text-white uppercase mb-4 leading-tight capa-title">de Prospecção</p>
            <p className="text-xl font-bold text-slate-300 tracking-widest uppercase">Análise de Mercado - Série B 2026</p>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-8">
            <div className="bg-slate-800/50 border-2 border-amber-500/50 rounded-2xl p-6 backdrop-blur-sm">
              <div className="text-4xl font-black text-amber-500 mb-2 capa-accent">15+</div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Atletas Analisados</p>
            </div>
            <div className="bg-slate-800/50 border-2 border-amber-500/50 rounded-2xl p-6 backdrop-blur-sm">
              <div className="text-4xl font-black text-amber-500 mb-2 capa-accent">5</div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Métricas Avançadas</p>
            </div>
            <div className="bg-slate-800/50 border-2 border-amber-500/50 rounded-2xl p-6 backdrop-blur-sm">
              <div className="text-4xl font-black text-amber-500 mb-2 capa-accent">100%</div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Dados Normalizados</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="capa-footer relative z-10 w-full border-t-2 border-slate-700 pt-8 mt-12 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Relatório Confidencial</p>
          <p className="text-xs text-slate-500 font-black">
            Emitido em {new Date().toLocaleDateString('pt-BR')} | Departamento de Scouting GN
          </p>
          <p className="text-xs text-slate-600 font-bold mt-4 italic">
            © 2026 Grêmio Novorizontino - Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO - NÃO IMPRIME */}
      <div className="no-print fixed bottom-8 left-8 flex gap-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-amber-500 hover:bg-amber-400 text-black font-black px-8 py-3 rounded-2xl text-sm shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          EXPORTAR PDF
        </button>
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white text-sm font-black uppercase tracking-widest px-4 transition-colors"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
