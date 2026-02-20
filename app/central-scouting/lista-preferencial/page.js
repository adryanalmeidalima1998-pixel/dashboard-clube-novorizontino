'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { EXTREMOS_PLAYERS } from '@/app/utils/extremosData';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';

export default function ListaPreferencial() {
  const router = useRouter();
  const [playersData, setPlayersData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const promises = EXTREMOS_PLAYERS.map(async (player) => {
          const response = await fetch(player.url);
          const csvText = await response.text();
          return new Promise((resolve) => {
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                const cleaned = cleanData(results.data);
                const latestData = cleaned[0] || {};
                resolve({
                  ...player,
                  ...latestData
                });
              }
            });
          });
        });

        const results = await Promise.all(promises);
        setPlayersData(results);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar dados dos extremos:", error);
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
        <p className="text-white text-lg font-black uppercase tracking-widest italic">Carregando Lista Preferencial...</p>
      </div>
    </div>
  );

  const nossos = playersData.filter(p => p.type === 'nosso');
  const alvos = playersData.filter(p => p.type === 'alvo');

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/central-scouting')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
              Lista <span className="text-brand-yellow">Preferencial</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 ml-1">Comparação de Extremos</p>
          </div>
        </div>

        {/* NOSSOS EXTREMOS */}
        <section className="mb-16">
          <h2 className="text-xl font-black uppercase italic text-brand-yellow mb-8 border-l-4 border-brand-yellow pl-4">Nossos Extremos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {nossos.map(player => (
              <PlayerCard key={player.id} player={player} onClick={() => router.push(`/central-scouting/lista-preferencial/${player.id}`)} isOwn />
            ))}
          </div>
        </section>

        {/* ALVOS DE MERCADO */}
        <section>
          <h2 className="text-xl font-black uppercase italic text-slate-400 mb-8 border-l-4 border-slate-700 pl-4">Alvos de Mercado</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {alvos.map(player => (
              <PlayerCard key={player.id} player={player} onClick={() => router.push(`/central-scouting/lista-preferencial/${player.id}`)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PlayerCard({ player, onClick, isOwn }) {
  return (
    <div 
      onClick={onClick}
      className={`group relative overflow-hidden bg-slate-900/40 border ${isOwn ? 'border-brand-yellow/30' : 'border-slate-800'} rounded-3xl p-6 cursor-pointer hover:border-brand-yellow transition-all duration-500 hover:translate-y-[-5px] shadow-xl`}
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-slate-700">
          <img 
            src={`/images/players/${player.id}.png`} 
            alt={player.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/150/1e293b/fbbf24?text=' + player.name.charAt(0); }}
          />
        </div>
        <div>
          <h3 className="text-lg font-black uppercase italic leading-tight group-hover:text-brand-yellow transition-colors">{player.name}</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{player.Time || 'Mercado'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
          <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Gols</p>
          <p className="text-lg font-black text-white">{player.Gols || '0'}</p>
        </div>
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
          <p className="text-[8px] text-slate-500 font-black uppercase mb-1">Dribles %</p>
          <p className="text-lg font-black text-brand-yellow">{player['Dribles com sucesso (%)'] || '0%'}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <span className="text-[9px] font-black text-slate-600 uppercase">Ver Análise</span>
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-brand-yellow group-hover:text-slate-950 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
