'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { getRankingByPerfil, getPerfisForPosicao } from '@/app/utils/ratingSystem';
import { cleanData } from '@/app/utils/dataCleaner';
import { useRouter } from 'next/navigation';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTx73GpGdTLkIPTmBfkYujRILN3DmPV5FG2dH4-bbELYZJ4STAIYrOSJ7AOPDOTq_tB0ib_xFKHLiHZ/pub?output=csv';

export default function RankingPerfil() {
  const router = useRouter();
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPerfil, setSelectedPerfil] = useState('');
  const [ranking, setRanking] = useState([]);
  const [minMinutos, setMinMinutos] = useState(0);
  const [posicoesFiltradas, setPosicoesFiltradas] = useState([]);
  const [selectedPosicao, setSelectedPosicao] = useState('');
  const [allPerfis, setAllPerfis] = useState([]);

  // Carregar dados do CSV
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(CSV_URL);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleaned = cleanData(results.data);
            setAtletas(cleaned);
            
            // Extrair todos os perfis únicos
            const perfisUnicos = new Set();
            cleaned.forEach(atleta => {
              const pos = (atleta.Posição || '').trim().toUpperCase();
              const perfis = getPerfisForPosicao(pos);
              perfis.forEach(p => perfisUnicos.add(p));
            });
            setAllPerfis(Array.from(perfisUnicos).sort());
            
            // Definir primeiro perfil como padrão
            if (perfisUnicos.size > 0) {
              const firstPerfil = Array.from(perfisUnicos).sort()[0];
              setSelectedPerfil(firstPerfil);
            }
            
            setLoading(false);
          },
          error: (err) => {
            setError(`Erro ao carregar CSV: ${err.message}`);
            setLoading(false);
          }
        });
      } catch (err) {
        setError(`Erro ao buscar dados: ${err.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Atualizar ranking quando perfil ou minutos mudam
  useEffect(() => {
    if (atletas.length > 0 && selectedPerfil) {
      const newRanking = getRankingByPerfil(atletas, selectedPerfil, minMinutos);
      setRanking(newRanking);
      
      // Extrair posições do ranking
      const posicoes = [...new Set(newRanking.map(a => (a.Posição || '').trim().toUpperCase()))].sort();
      setPosicoesFiltradas(posicoes);
      setSelectedPosicao('');
    }
  }, [atletas, selectedPerfil, minMinutos]);

  // Filtrar ranking por posição se selecionada
  const rankingFinal = selectedPosicao 
    ? ranking.filter(a => (a.Posição || '').trim().toUpperCase() === selectedPosicao)
    : ranking;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0c10]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-white text-lg font-black uppercase tracking-widest italic">Calculando Rankings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0c10]">
        <div className="bg-red-900/20 border border-red-700/50 text-red-100 px-6 py-4 rounded-2xl max-w-md">
          <h2 className="font-black uppercase tracking-widest italic mb-2">Erro ao carregar dados</h2>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/central-scouting')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Ranking de <span className="text-emerald-500">Perfil</span></h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Análise por Percentil de Métricas Específicas</p>
            </div>
          </div>
        </div>

        {/* CONTROLES / FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">Perfil Técnico</label>
            <select 
              value={selectedPerfil} 
              onChange={e => setSelectedPerfil(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-emerald-500/50 text-white"
            >
              {allPerfis.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">Posição (Filtro)</label>
            <select 
              value={selectedPosicao} 
              onChange={e => setSelectedPosicao(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-emerald-500/50 text-white"
            >
              <option value="">TODAS AS POSIÇÕES</option>
              {posicoesFiltradas.map(pos => <option key={pos} value={pos}>{pos}</option>)}
            </select>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">Minutos Mínimos: {minMinutos}min</label>
            <input 
              type="range" 
              min="0" 
              max="3000" 
              step="90" 
              value={minMinutos} 
              onChange={e => setMinMinutos(parseInt(e.target.value))} 
              className="w-full accent-emerald-500" 
            />
          </div>
        </div>

        {/* INFO BAR */}
        <div className="mb-6 flex items-center gap-4">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              {rankingFinal.length} Atletas Elegíveis
            </p>
          </div>
          {selectedPerfil && (
            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                Perfil: {selectedPerfil}
              </p>
            </div>
          )}
        </div>

        {/* TABELA DE RANKING */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 bg-slate-950/50">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Pos</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Equipe</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Idade</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Minutos</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Nota (0-100)</th>
                </tr>
              </thead>
              <tbody>
                {rankingFinal.map((j, idx) => (
                  <tr key={idx} className="border-b border-slate-800/30 hover:bg-emerald-500/5 transition-colors group">
                    <td className="p-6">
                      <span className={`text-sm font-black italic ${idx < 3 ? 'text-emerald-500' : 'text-slate-600'}`}>#{idx + 1}</span>
                    </td>
                    <td className="p-6">
                      <div className="font-black italic uppercase text-sm group-hover:text-emerald-400 transition-colors text-white">{j.Jogador}</div>
                      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{j.Posição}</div>
                    </td>
                    <td className="p-6 text-[10px] font-black uppercase text-slate-400">{j.Time}</td>
                    <td className="p-6 text-[10px] font-bold text-slate-500">{j.Idade || '-'}</td>
                    <td className="p-6 text-[10px] font-bold text-slate-500">{j['Minutos jogados']}</td>
                    <td className="p-6 text-right">
                      <div className="inline-flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden md:block">
                          <div className="h-full bg-emerald-500" style={{ width: `${j.notaPerfil}%` }}></div>
                        </div>
                        <span className="text-lg font-black italic text-white">{j.notaPerfil}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-8 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">Metodologia de Cálculo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200 uppercase tracking-tighter italic mr-2">Nivelamento por Percentil:</strong>
                As notas não são médias simples, mas sim a posição relativa do atleta em relação a todos os outros jogadores da mesma posição no banco de dados. Um score de 90 significa que o atleta é superior a 90% da amostra naquela métrica específica.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200 uppercase tracking-tighter italic mr-2">Ponderação Tática:</strong>
                Cada perfil (ex: Lateral Construtor vs Lateral Ofensivo) utiliza um conjunto diferente de métricas e pesos, priorizando as ações que definem aquele papel em campo.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
