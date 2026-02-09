'use client';

import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { getRankingByPerfil, getPerfisForPosicao } from '@/app/utils/ratingSystem';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { useRouter } from 'next/navigation';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTx73GpGdTLkIPTmBfkYujRILN3DmPV5FG2dH4-bbELYZJ4STAIYrOSJ7AOPDOTq_tB0ib_xFKHLiHZ/pub?output=csv';

export default function RankingPerfil() {
  const router = useRouter();
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros principais
  const [selectedPerfil, setSelectedPerfil] = useState('');
  const [minMinutos, setMinMinutos] = useState(450);
  const [allPerfis, setAllPerfis] = useState([]);

  // Filtros avançados
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosicao, setSelectedPosicao] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedPais, setSelectedPais] = useState('');
  const [minIdade, setMinIdade] = useState('');
  const [maxIdade, setMaxIdade] = useState('');
  
  // Opções para os filtros
  const [options, setOptions] = useState({ posicoes: [], times: [], paises: [] });

  // Ordenação
  const [sortConfig, setSortConfig] = useState({ key: 'notaPerfil', direction: 'desc' });

  // Carregar dados
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
            
            // Extrair opções para filtros
            const perfisUnicos = new Set();
            const posicoes = new Set();
            const times = new Set();
            const paises = new Set();

            cleaned.forEach(a => {
              if (a.Posição) {
                posicoes.add(a.Posição.trim().toUpperCase());
                getPerfisForPosicao(a.Posição).forEach(p => perfisUnicos.add(p));
              }
              if (a.Time) times.add(a.Time);
              if (a.Nacionalidade) paises.add(a.Nacionalidade);
            });

            setAllPerfis(Array.from(perfisUnicos).sort());
            setOptions({
              posicoes: Array.from(posicoes).sort(),
              times: Array.from(times).sort(),
              paises: Array.from(paises).sort()
            });
            
            if (perfisUnicos.size > 0) {
              setSelectedPerfil(Array.from(perfisUnicos).sort()[0]);
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

  // Processar Ranking com filtros e ordenação
  const processedRanking = useMemo(() => {
    if (atletas.length === 0 || !selectedPerfil) return [];

    let ranking = getRankingByPerfil(atletas, selectedPerfil, minMinutos);

    return ranking.filter(a => {
      const matchNome = a.Jogador?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPosicao = !selectedPosicao || a.Posição?.trim().toUpperCase() === selectedPosicao;
      const matchTime = !selectedTime || a.Time === selectedTime;
      const matchPais = !selectedPais || a.Nacionalidade === selectedPais;
      
      const idade = safeParseFloat(a.Idade);
      const matchMinIdade = !minIdade || idade >= safeParseFloat(minIdade);
      const matchMaxIdade = !maxIdade || idade <= safeParseFloat(maxIdade);

      return matchNome && matchPosicao && matchTime && matchPais && matchMinIdade && matchMaxIdade;
    }).sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (['notaPerfil', 'Idade', 'Minutos jogados'].includes(sortConfig.key)) {
        aVal = safeParseFloat(aVal);
        bVal = safeParseFloat(bVal);
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [atletas, selectedPerfil, minMinutos, searchTerm, selectedPosicao, selectedTime, selectedPais, minIdade, maxIdade, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
        <p className="text-white text-lg font-black uppercase tracking-widest italic">Processando Inteligência...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/central-scouting')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                Ranking de <span className="text-brand-yellow">Perfil</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 ml-1">Algoritmo Estatístico de Alta Performance</p>
            </div>
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <div className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-800/50 mb-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-yellow/20 to-transparent"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Linha 1 */}
            <div className="md:col-span-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Buscar Atleta</label>
              <input 
                type="text" 
                placeholder="NOME DO JOGADOR..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white placeholder:text-slate-700 transition-all"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Perfil Técnico</label>
              <select value={selectedPerfil} onChange={e => setSelectedPerfil(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white appearance-none cursor-pointer">
                {allPerfis.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Minutos: <span className="text-brand-yellow">{minMinutos}min</span></label>
              <input type="range" min="0" max="3000" step="90" value={minMinutos} onChange={e => setMinMinutos(parseInt(e.target.value))} className="w-full accent-brand-yellow mt-3" />
            </div>

            {/* Linha 2 */}
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Posição</label>
              <select value={selectedPosicao} onChange={e => setSelectedPosicao(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white appearance-none cursor-pointer">
                <option value="">TODAS AS POSIÇÕES</option>
                {options.posicoes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Clube</label>
              <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white appearance-none cursor-pointer">
                <option value="">TODOS OS CLUBES</option>
                {options.times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">País</label>
              <select value={selectedPais} onChange={e => setSelectedPais(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white appearance-none cursor-pointer">
                <option value="">TODOS OS PAÍSES</option>
                {options.paises.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Idade Min</label>
                <input type="number" value={minIdade} onChange={e => setMinIdade(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Idade Max</label>
                <input type="number" value={maxIdade} onChange={e => setMaxIdade(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white" />
              </div>
            </div>

          </div>
        </div>

        {/* TABELA */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 bg-slate-950/50">
                  <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('notaPerfil')}>
                    Rank {sortConfig.key === 'notaPerfil' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                  </th>
                  <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('Jogador')}>
                    Atleta {sortConfig.key === 'Jogador' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                  </th>
                  <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('Time')}>
                    Equipe {sortConfig.key === 'Time' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                  </th>
                  <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('Nacionalidade')}>
                    País {sortConfig.key === 'Nacionalidade' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                  </th>
                  <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('Idade')}>
                    Idade {sortConfig.key === 'Idade' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                  </th>
                  <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('Minutos jogados')}>
                    Minutos {sortConfig.key === 'Minutos jogados' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                  </th>
                  <th className="p-8 text-[10px] font-black uppercase tracking-widest text-brand-yellow text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('notaPerfil')}>
                    Nota Final {sortConfig.key === 'notaPerfil' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedRanking.map((j, idx) => (
                  <tr key={idx} className="border-b border-slate-800/30 hover:bg-brand-yellow/5 transition-all group">
                    <td className="p-8">
                      <span className={`text-lg font-black italic ${idx < 3 ? 'text-brand-yellow' : 'text-slate-700'}`}>#{idx + 1}</span>
                    </td>
                    <td className="p-8">
                      <div className="font-black italic uppercase text-base group-hover:text-brand-yellow transition-colors text-white">{j.Jogador}</div>
                      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">{j.Posição}</div>
                    </td>
                    <td className="p-8 text-[11px] font-black uppercase text-slate-400">{j.Time}</td>
                    <td className="p-8 text-[11px] font-black uppercase text-slate-400">{j.Nacionalidade || '-'}</td>
                    <td className="p-8 text-[11px] font-black text-slate-500">{j.Idade || '-'}</td>
                    <td className="p-8 text-[11px] font-black text-slate-500">{j['Minutos jogados']}</td>
                    <td className="p-8 text-right">
                      <div className="inline-flex items-center gap-4">
                        <div className="w-32 h-2 bg-slate-950 rounded-full overflow-hidden hidden lg:block border border-slate-800">
                          <div className="h-full bg-brand-yellow shadow-[0_0_10px_rgba(251,191,36,0.4)]" style={{ width: `${j.notaPerfil}%` }}></div>
                        </div>
                        <span className="text-2xl font-black italic text-white min-w-[3rem]">{j.notaPerfil}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {processedRanking.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-slate-600 font-black uppercase tracking-[0.3em] italic">Nenhum atleta encontrado</p>
            </div>
          )}
        </div>

        {/* METODOLOGIA */}
        <div className="mt-20 bg-slate-950/50 p-12 rounded-[3.5rem] border border-slate-900 shadow-inner">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-16 h-16 bg-brand-yellow/10 rounded-[1.5rem] flex items-center justify-center text-brand-yellow border border-brand-yellow/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Entenda o <span className="text-brand-yellow">Algoritmo</span></h3>
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Metodologia Estatística de Elite</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="relative p-6 rounded-3xl bg-slate-900/20 border border-slate-800/30">
              <div className="text-brand-yellow font-black italic text-4xl absolute -top-6 -left-2 opacity-20">01</div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300 mb-4">Normalização Técnica</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Cada métrica bruta é processada para respeitar o contexto do jogo. Invertemos métricas negativas (como erros) para que maior performance sempre gere uma nota maior.
              </p>
            </div>
            <div className="relative p-6 rounded-3xl bg-slate-900/20 border border-slate-800/30">
              <div className="text-brand-yellow font-black italic text-4xl absolute -top-6 -left-2 opacity-20">02</div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300 mb-4">Cálculo de Percentil</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                O atleta é comparado <strong>apenas com seus pares de posição</strong>. A nota reflete a posição relativa: nota 95 indica que o jogador é superior a 95% da base de dados na função.
              </p>
            </div>
            <div className="relative p-6 rounded-3xl bg-slate-900/20 border border-slate-800/30">
              <div className="text-brand-yellow font-black italic text-4xl absolute -top-6 -left-2 opacity-20">03</div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300 mb-4">Ponderação de Perfil</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Aplicamos pesos táticos específicos para cada perfil (ex: Lateral Construtor foca em passes, Defensivo em duelos). O resultado é a média ponderada desses percentis.
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-20 p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-slate-900">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-brand-yellow rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Motor de Inteligência Ativo • Grêmio Novorizontino</span>
          </div>
          <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
            © 2026 • Departamento de Ciência de Dados & Scouting
          </div>
        </div>

      </div>
    </div>
  );
}
