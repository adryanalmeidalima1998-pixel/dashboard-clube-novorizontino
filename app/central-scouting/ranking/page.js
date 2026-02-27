'use client';

import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { getRankingByPerfil, getPerfisForPosicao } from '@/app/utils/ratingSystem';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { useRouter } from 'next/navigation';
import { sheetUrl } from '@/app/datasources';

export default function RankingPerfil() {
  const router = useRouter();
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPerfil, setSelectedPerfil] = useState('');
  const [minMinutos, setMinMinutos] = useState(450);
  const [allPerfis, setAllPerfis] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosicao, setSelectedPosicao] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [minIdade, setMinIdade] = useState('');
  const [maxIdade, setMaxIdade] = useState('');
  const [options, setOptions] = useState({ posicoes: [], times: [] });
  const [sortConfig, setSortConfig] = useState({ key: 'notaPerfil', direction: 'desc' });
  const [comparisonModal, setComparisonModal] = useState({ open: false, player1: null, player2: null });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(sheetUrl('RANKING_PERFIL'));
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const cleaned = cleanData(results.data);
            setAtletas(cleaned);
            const perfisUnicos = new Set();
            const posicoes = new Set();
            const times = new Set();
            cleaned.forEach(a => {
              if (a.Posicao || a.Posição) {
                const pos = (a.Posicao || a.Posição).trim().toUpperCase();
                posicoes.add(pos);
                getPerfisForPosicao(a.Posicao || a.Posição).forEach(p => perfisUnicos.add(p));
              }
              if (a.Time) times.add(a.Time);
            });
            const sortedPerfis = Array.from(perfisUnicos).sort();
            setAllPerfis(sortedPerfis);
            setOptions({ posicoes: Array.from(posicoes).sort(), times: Array.from(times).sort() });
            if (sortedPerfis.length > 0) setSelectedPerfil(sortedPerfis[0]);
            setLoading(false);
          },
          error: (err) => { setError(err.message); setLoading(false); }
        });
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const processedRanking = useMemo(() => {
    if (atletas.length === 0 || !selectedPerfil) return [];
    let ranking = getRankingByPerfil(atletas, selectedPerfil, minMinutos);
    ranking = ranking.filter(a => {
      const nomeOk = (a.Jogador || '').toLowerCase().includes(searchTerm.toLowerCase());
      const posOk = !selectedPosicao || (a.Posicao || a.Posição || '').trim().toUpperCase() === selectedPosicao;
      const timeOk = !selectedTime || a.Time === selectedTime;
      const idMin = !minIdade || parseInt(a.Idade) >= parseInt(minIdade);
      const idMax = !maxIdade || parseInt(a.Idade) <= parseInt(maxIdade);
      return nomeOk && posOk && timeOk && idMin && idMax;
    });
    return ranking;
  }, [atletas, selectedPerfil, minMinutos, searchTerm, selectedPosicao, selectedTime, minIdade, maxIdade]);

  const calcSim = (p1, p2) => {
    const keys = Object.keys(p1).filter(k => !['Jogador','Time','Posicao','Posição','Idade','Nacionalidade','Minutos jogados','notaPerfil','ID_ATLETA'].includes(k));
    let diff = 0;
    keys.forEach(k => diff += Math.abs(safeParseFloat(p1[k]) - safeParseFloat(p2[k])));
    return Math.round(Math.min(100, Math.max(0, 100 - (diff / keys.length) * 2)));
  };

  const notaColor = (nota) => {
    const n = parseFloat(nota);
    if (n >= 80) return 'text-emerald-600';
    if (n >= 60) return 'text-amber-500';
    if (n >= 40) return 'text-orange-400';
    return 'text-red-500';
  };

  const navId = (a) => encodeURIComponent(a.ID_ATLETA || a.Jogador);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">Carregando Ranking...</div>;
  if (error) return <div className="min-h-screen bg-white flex items-center justify-center text-red-600 font-black text-lg">Erro: {error}</div>;

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-4">

        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="GN" className="h-16 w-auto" onError={e => e.target.style.display='none'} />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button onClick={() => router.push('/central-scouting')} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors">← VOLTAR</button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">Ranking de Perfil</div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">DATA: {new Date().toLocaleDateString('pt-BR')} · {processedRanking.length} ATLETAS</div>
          </div>
        </header>

        {/* FILTROS */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtros</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Perfil Tático</label>
              <select value={selectedPerfil} onChange={e => setSelectedPerfil(e.target.value)} className="w-full border-2 border-amber-500 rounded-xl p-2.5 text-[10px] font-black uppercase outline-none bg-white">
                {allPerfis.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Buscar atleta</label>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nome..." className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-[10px] font-black outline-none focus:border-amber-500 placeholder:text-slate-300" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Min. Min.</label>
              <input type="number" value={minMinutos} onChange={e => setMinMinutos(parseInt(e.target.value)||0)} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-[10px] font-black outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Posição</label>
              <select value={selectedPosicao} onChange={e => setSelectedPosicao(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-[10px] font-black uppercase outline-none focus:border-amber-500 bg-white">
                <option value="">Todas</option>
                {options.posicoes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Time</label>
              <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-[10px] font-black uppercase outline-none focus:border-amber-500 bg-white">
                <option value="">Todos</option>
                {options.times.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 max-w-xs">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Idade mín.</label>
              <input type="number" value={minIdade} onChange={e => setMinIdade(e.target.value)} placeholder="Ex: 18" className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-[10px] font-black outline-none focus:border-amber-500 placeholder:text-slate-300" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Idade máx.</label>
              <input type="number" value={maxIdade} onChange={e => setMaxIdade(e.target.value)} placeholder="Ex: 30" className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-[10px] font-black outline-none focus:border-amber-500 placeholder:text-slate-300" />
            </div>
          </div>
        </div>

        {/* TOP 3 */}
        {processedRanking.length >= 3 && (
          <div className="grid grid-cols-3 gap-3">
            {processedRanking.slice(0, 3).map((a, idx) => (
              <div key={a.Jogador} onClick={() => router.push(`/central-scouting/ranking/${navId(a)}`)}
                className="bg-white border-2 border-slate-900 rounded-2xl p-4 cursor-pointer hover:border-amber-500 hover:shadow-lg transition-all group flex items-center gap-3">
                <div className={`text-3xl font-black ${idx===0?'text-amber-500':idx===1?'text-slate-400':'text-amber-700'}`}>#{idx+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm uppercase italic truncate group-hover:text-amber-600 transition-colors">{a.Jogador}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">{a.Time} · {a.Posicao || a.Posição}</p>
                </div>
                <span className={`text-lg font-black ${notaColor(a.notaPerfil)}`}>{a.notaPerfil}</span>
              </div>
            ))}
          </div>
        )}

        {/* TABELA */}
        <div className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
            Ranking · {selectedPerfil} · {processedRanking.length} atletas
          </div>
          {processedRanking.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-black text-sm uppercase">Nenhum atleta encontrado com os filtros selecionados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-800">
                    {['#','Atleta','Time','Pos','Idade','Min'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300">{h}</th>
                    ))}
                    <th className="px-4 py-3 text-center text-[8px] font-black uppercase tracking-widest bg-amber-500 text-black">Nota</th>
                    <th className="px-4 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedRanking.map((a, idx) => (
                    <tr key={`${a.Jogador}-${idx}`} className="hover:bg-amber-50/60 transition-colors group">
                      <td className="px-4 py-2.5 text-slate-400 font-black text-[9px]">{idx+1}</td>
                      <td className="px-4 py-2.5 font-black uppercase italic group-hover:text-amber-600 transition-colors">{a.Jogador}</td>
                      <td className="px-4 py-2.5 text-[9px] font-black uppercase text-slate-600">{a.Time}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-600">{a.Posicao || a.Posição}</span></td>
                      <td className="px-4 py-2.5 text-center text-[9px] font-black">{a.Idade}</td>
                      <td className="px-4 py-2.5 text-center text-[9px] font-black tabular-nums">{a['Minutos jogados']}</td>
                      <td className="px-4 py-2.5 text-center"><span className={`text-sm font-black tabular-nums ${notaColor(a.notaPerfil)}`}>{a.notaPerfil}</span></td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex gap-1.5 justify-center">
                          <button onClick={() => router.push(`/central-scouting/ranking/${navId(a)}`)} className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-wider hover:bg-amber-500 hover:text-black transition-all">VER →</button>
                          <button onClick={() => setComparisonModal({ open: true, player1: a, player2: null })} className="px-2 py-1 border border-slate-200 hover:border-amber-500 rounded-lg transition-all text-sm" title="Comparar">⚔️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="flex justify-between items-center border-t-2 border-slate-200 pt-3 mt-2">
          <button onClick={() => router.push('/central-scouting')} className="text-slate-500 hover:text-black text-sm font-black uppercase tracking-widest px-4 transition-colors">← Voltar</button>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

        {/* MODAL COMPARAÇÃO */}
        {comparisonModal.open && comparisonModal.player1 && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4 pb-3 border-b-4 border-amber-500">
                <h2 className="text-xl font-black uppercase tracking-tighter text-black">Comparação Técnica</h2>
                <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="text-slate-400 hover:text-black text-2xl font-black">✕</button>
              </div>
              {comparisonModal.player2 && (
                <div className="border-2 border-amber-500 rounded-xl p-4 mb-4 bg-amber-50">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Índice de Similaridade</p>
                  <p className="text-3xl font-black text-amber-600">{calcSim(comparisonModal.player1, comparisonModal.player2)}%</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[comparisonModal.player1, comparisonModal.player2].map((p, i) => p ? (
                  <div key={i} className="border-2 border-slate-200 rounded-xl p-4">
                    <h3 className="text-base font-black uppercase italic text-amber-600 mb-1">{p.Jogador}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{p.Time} · {p.Posicao || p.Posição}</p>
                    <p className="text-[9px] text-slate-400">Nota: {p.notaPerfil} | Min: {p['Minutos jogados']}</p>
                  </div>
                ) : (
                  <div key={i} className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase text-center">Selecione abaixo</p>
                  </div>
                ))}
              </div>
              {!comparisonModal.player2 ? (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {processedRanking.filter(p => p.Jogador !== comparisonModal.player1.Jogador).map(p => (
                    <button key={p.Jogador} onClick={() => setComparisonModal({ ...comparisonModal, player2: p })}
                      className="w-full p-3 border-2 border-slate-200 hover:border-amber-500 rounded-xl text-left flex justify-between items-center text-[10px] font-black uppercase text-slate-700 hover:text-amber-600 transition-all">
                      <span>{p.Jogador} <span className="text-slate-400 font-bold">({p.Time})</span></span>
                      <span className={notaColor(p.notaPerfil)}>{p.notaPerfil}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 justify-end mt-4">
                  <button onClick={() => setComparisonModal({ ...comparisonModal, player2: null })} className="border-2 border-slate-200 hover:border-slate-400 text-slate-600 font-black px-6 py-2.5 rounded-xl text-[10px] uppercase transition-all">Trocar atleta</button>
                  <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="border-2 border-slate-200 text-slate-600 font-black px-6 py-2.5 rounded-xl text-[10px] uppercase transition-all">Fechar</button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}