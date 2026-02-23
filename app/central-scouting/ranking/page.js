'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { getRankingByPerfil, getPerfisForPosicao, findSimilarPlayers } from '@/app/utils/ratingSystem';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTx73GpGdTLkIPTmBfkYujRILN3DmPV5FG2dH4-bbELYZJ4STAIYrOSJ7AOPDOTq_tB0ib_xFKHLiHZ/pub?output=csv';

function RankingPerfilContent() {
  const router = useRouter();

  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedPerfil, setSelectedPerfil] = useState('');
  const [minMinutos, setMinMinutos] = useState(450);
  const [allPerfis, setAllPerfis] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosicao, setSelectedPosicao] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedPais, setSelectedPais] = useState('');
  const [minIdade, setMinIdade] = useState('');
  const [maxIdade, setMaxIdade] = useState('');
  const [options, setOptions] = useState({ posicoes: [], times: [], paises: [] });

  const [sortConfig, setSortConfig] = useState({ key: 'notaPerfil', direction: 'desc' });
  const [comparisonModal, setComparisonModal] = useState({ open: false, player1: null, player2: null });
  const [similarModal, setSimilarModal] = useState({ open: false, targetPlayer: null, similar: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`);
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const cleaned = cleanData(results.data);
            setAtletas(cleaned);

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

            const perfisOrdenados = Array.from(perfisUnicos).sort();
            setAllPerfis(perfisOrdenados);
            setOptions({
              posicoes: Array.from(posicoes).sort(),
              times: Array.from(times).sort(),
              paises: Array.from(paises).sort(),
            });

            if (perfisOrdenados.length > 0) setSelectedPerfil(perfisOrdenados[0]);
            setLoading(false);
          },
        });
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const processedRanking = useMemo(() => {
    if (atletas.length === 0 || !selectedPerfil) return [];

    let ranking = getRankingByPerfil(atletas, selectedPerfil, minMinutos);

    ranking = ranking.filter(a => {
      const nomeMatch = a.Jogador.toLowerCase().includes(searchTerm.toLowerCase());
      const posicaoMatch = !selectedPosicao || (a.Posição || '').trim().toUpperCase() === selectedPosicao;
      const timeMatch = !selectedTime || a.Time === selectedTime;
      const paisMatch = !selectedPais || a.Nacionalidade === selectedPais;
      const idadeMatch =
        (!minIdade || parseInt(a.Idade) >= parseInt(minIdade)) &&
        (!maxIdade || parseInt(a.Idade) <= parseInt(maxIdade));
      return nomeMatch && posicaoMatch && timeMatch && paisMatch && idadeMatch;
    });

    ranking.sort((a, b) => {
      const aVal = safeParseFloat(a[sortConfig.key]);
      const bVal = safeParseFloat(b[sortConfig.key]);
      return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return ranking;
  }, [atletas, selectedPerfil, minMinutos, searchTerm, selectedPosicao, selectedTime, selectedPais, minIdade, maxIdade, sortConfig]);

  const getNotaColor = (nota) => {
    if (nota >= 75) return 'text-emerald-600 font-black';
    if (nota >= 55) return 'text-amber-600 font-black';
    return 'text-slate-500 font-black';
  };

  const getNotaBg = (nota) => {
    if (nota >= 75) return 'bg-emerald-50 border-emerald-200';
    if (nota >= 55) return 'bg-amber-50 border-amber-200';
    return 'bg-slate-50 border-slate-200';
  };

  const calcularSimilaridade = (p1, p2) => {
    const metricas = Object.keys(p1).filter(
      k => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'notaPerfil'].includes(k)
    );
    let diferenca = 0;
    metricas.forEach(m => {
      diferenca += Math.abs(safeParseFloat(p1[m]) - safeParseFloat(p2[m]));
    });
    return Math.round(Math.min(100, Math.max(0, 100 - (diferenca / (metricas.length || 1)) * 2)));
  };

  const handleSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
        : { key, direction: 'desc' }
    );
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="text-slate-500 ml-1">⇅</span>;
    return sortConfig.direction === 'desc'
      ? <span className="text-amber-500 ml-1">↓</span>
      : <span className="text-amber-500 ml-1">↑</span>;
  };

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFillColor(10, 12, 16);
    doc.rect(0, 0, 297, 30, 'F');
    doc.setTextColor(251, 191, 36);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RANKING DE PERFIL', 14, 14);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Perfil: ${selectedPerfil.toUpperCase()} · Mín. ${minMinutos}min · ${processedRanking.length} atletas · ${new Date().toLocaleDateString('pt-BR')}`, 14, 23);

    doc.autoTable({
      startY: 36,
      head: [['#', 'Atleta', 'Clube', 'Posição', 'Idade', 'Min.', 'Nota']],
      body: processedRanking.map((a, idx) => [
        `#${idx + 1}`, a.Jogador, a.Time || '-', a.Posição || '-', a.Idade || '-', a['Minutos jogados'] || '-', a.notaPerfil,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [251, 191, 36], textColor: [10, 12, 16], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 8 },
      columnStyles: { 6: { halign: 'center', fontStyle: 'bold' } },
    });
    doc.save(`ranking-${selectedPerfil.replace(/\s+/g, '-')}.pdf`);
  };

  const exportComparisonPDF = () => {
    try {
      const { player1, player2 } = comparisonModal;
      if (!player1 || !player2) return;
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFillColor(251, 191, 36);
      doc.rect(10, 10, 190, 20, 'F');
      doc.setTextColor(10, 12, 16);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPARAÇÃO DE ATLETAS', 15, 24);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${player1.Jogador} (${player1.Posição})  vs  ${player2.Jogador} (${player2.Posição})`, 15, 40);
      doc.text(`Similaridade: ${calcularSimilaridade(player1, player2)}%`, 15, 48);
      const metricas = Object.keys(player1).filter(k => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'notaPerfil'].includes(k));
      doc.autoTable({
        startY: 55,
        head: [['Métrica', player1.Jogador.substring(0, 20), player2.Jogador.substring(0, 20)]],
        body: metricas.map(m => {
          const v1 = safeParseFloat(player1[m]);
          const v2 = safeParseFloat(player2[m]);
          return [m, v1 === 0 ? '-' : v1.toString(), v2 === 0 ? '-' : v2.toString()];
        }),
        theme: 'striped',
        headStyles: { fillColor: [10, 12, 16], textColor: [251, 191, 36], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
      });
      doc.save(`comparacao-${player1.Jogador}-vs-${player2.Jogador}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Verifique o console.');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
      Processando Ranking de Perfil...
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans print:p-0 overflow-x-hidden">
      <style jsx global>{`
        @media print {
          @page { size: A3 landscape; margin: 0.5cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .table-scroll-wrapper { overflow: visible !important; }
          table { font-size: 8px !important; width: 100% !important; table-layout: auto; }
          th, td { padding: 3px 5px !important; word-break: break-word; white-space: nowrap; }
          thead tr { background-color: #0f172a !important; }
          thead th { color: white !important; }
          .avatar-initial { display: none !important; }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto print-container flex flex-col gap-4">

        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button
              onClick={() => router.push('/central-scouting')}
              className="no-print bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              ← VOLTAR
            </button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Ranking de Perfil
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              DATA: {new Date().toLocaleDateString('pt-BR')} · {processedRanking.length} ATLETAS
            </div>
          </div>
        </header>

        {/* FILTROS */}
        <div className="no-print flex flex-wrap gap-3 items-end">

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar atleta</span>
            <input
              type="text"
              placeholder="NOME DO JOGADOR..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border-2 border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-amber-500 w-52"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil técnico</span>
            <select
              value={selectedPerfil}
              onChange={e => setSelectedPerfil(e.target.value)}
              className="border-2 border-slate-200 hover:border-amber-500 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-amber-500 cursor-pointer transition-all"
            >
              {allPerfis.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Posição</span>
            <select
              value={selectedPosicao}
              onChange={e => setSelectedPosicao(e.target.value)}
              className="border-2 border-slate-200 hover:border-amber-500 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-amber-500 cursor-pointer transition-all"
            >
              <option value="">TODAS</option>
              {options.posicoes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Clube</span>
            <select
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
              className="border-2 border-slate-200 hover:border-amber-500 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-amber-500 cursor-pointer transition-all"
            >
              <option value="">TODOS</option>
              {options.times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">País</span>
            <select
              value={selectedPais}
              onChange={e => setSelectedPais(e.target.value)}
              className="border-2 border-slate-200 hover:border-amber-500 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-amber-500 cursor-pointer transition-all"
            >
              <option value="">TODOS</option>
              {options.paises.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Idade</span>
            <div className="flex gap-1">
              <input
                type="number"
                value={minIdade}
                onChange={e => setMinIdade(e.target.value)}
                placeholder="Mín"
                className="border-2 border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black outline-none focus:border-amber-500 w-16"
              />
              <input
                type="number"
                value={maxIdade}
                onChange={e => setMaxIdade(e.target.value)}
                placeholder="Máx"
                className="border-2 border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black outline-none focus:border-amber-500 w-16"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 min-w-[170px]">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Minutos mín.: <span className="text-amber-600">{minMinutos}min</span>
            </span>
            <input
              type="range"
              min="0" max="3000" step="90"
              value={minMinutos}
              onChange={e => setMinMinutos(parseInt(e.target.value))}
              className="w-full accent-amber-500 mt-1"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[9px] font-black text-slate-400 uppercase">{processedRanking.length} atletas no ranking</span>
          </div>
        </div>

        {/* TABELA */}
        <div className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
            Ranking de Perfil · {selectedPerfil} · {processedRanking.length} atletas exibidos
          </div>
          <div className="overflow-x-auto table-scroll-wrapper">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-900">
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 w-8">#</th>
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[160px] cursor-pointer hover:bg-slate-700 transition-colors select-none" onClick={() => handleSort('Jogador')}>
                    Atleta {sortIcon('Jogador')}
                  </th>
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[100px] cursor-pointer hover:bg-slate-700 transition-colors select-none" onClick={() => handleSort('Time')}>
                    Time {sortIcon('Time')}
                  </th>
                  <th className="px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[60px] cursor-pointer hover:bg-slate-700 transition-colors select-none" onClick={() => handleSort('Posição')}>
                    Pos {sortIcon('Posição')}
                  </th>
                  <th className="px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[50px] cursor-pointer hover:bg-slate-700 transition-colors select-none" onClick={() => handleSort('Idade')}>
                    Idade {sortIcon('Idade')}
                  </th>
                  <th className="px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[55px] cursor-pointer hover:bg-slate-700 transition-colors select-none" onClick={() => handleSort('Minutos jogados')}>
                    Min {sortIcon('Minutos jogados')}
                  </th>
                  <th className="px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest bg-amber-500 text-black min-w-[70px] cursor-pointer select-none" onClick={() => handleSort('notaPerfil')}>
                    Nota {sortIcon('notaPerfil')}
                  </th>
                  <th className="px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300 no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedRanking.map((atleta, idx) => (
                  <tr
                    key={`${atleta.Jogador}-${idx}`}
                    onClick={() => router.push(`/central-scouting/ranking/${encodeURIComponent(atleta.ID_ATLETA || atleta.Jogador)}`)}
                    className="hover:bg-amber-50/60 transition-colors group cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-[9px] font-black text-slate-400">#{idx + 1}</td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="avatar-initial no-print w-7 h-7 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 group-hover:bg-amber-100 transition-colors flex items-center justify-center">
                          <span className="text-[8px] font-black text-slate-500">
                            {(atleta.Jogador || '??').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-black uppercase italic tracking-tight text-[10px] group-hover:text-amber-600 transition-colors">
                            {atleta.Jogador}
                          </div>
                          <div className="text-[8px] text-slate-400 font-bold">{atleta.Idade} anos · {atleta.Nacionalidade}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-[9px] font-black uppercase text-slate-600">{atleta.Time}</td>

                    <td className="px-3 py-2.5 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-600">{atleta.Posição}</span>
                    </td>

                    <td className="px-3 py-2.5 text-center text-[9px] font-black">{atleta.Idade}</td>

                    <td className="px-3 py-2.5 text-center text-[9px] font-black tabular-nums">{atleta['Minutos jogados']}</td>

                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg border text-sm tabular-nums ${getNotaBg(atleta.notaPerfil)} ${getNotaColor(atleta.notaPerfil)}`}>
                        {atleta.notaPerfil}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-center no-print" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={e => { e.stopPropagation(); setComparisonModal({ open: true, player1: atleta, player2: null }); }}
                          className="p-1.5 border-2 border-slate-200 hover:border-amber-500 rounded-lg transition-all text-sm"
                          title="Comparar"
                        >⚔️</button>
                        <button
                          onClick={e => { e.stopPropagation(); setSimilarModal({ open: true, targetPlayer: atleta, similar: findSimilarPlayers(atleta, processedRanking) }); }}
                          className="p-1.5 border-2 border-slate-200 hover:border-amber-500 rounded-lg transition-all text-sm"
                          title="Similares"
                        >🔍</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {processedRanking.length === 0 && (
          <div className="border-2 border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-slate-500 font-bold text-sm">Nenhum atleta encontrado com os filtros selecionados.</p>
          </div>
        )}

        {/* FOOTER */}
        <footer className="no-print flex justify-between items-center border-t-2 border-slate-900 pt-3">
          <div className="flex gap-4">
            <button
              onClick={exportPDF}
              className="bg-slate-900 hover:bg-black text-white font-black px-8 py-3 rounded-2xl text-sm shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              EXPORTAR PDF
            </button>
            <button
              onClick={() => window.print()}
              className="border-2 border-slate-200 hover:border-amber-500 text-slate-700 hover:text-black font-black px-6 py-3 rounded-2xl text-sm transition-all"
            >
              🖨️ Imprimir
            </button>
            <button
              onClick={() => router.push('/central-scouting')}
              className="text-slate-500 hover:text-black text-sm font-black uppercase tracking-widest px-4 transition-colors"
            >
              Voltar
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>
      </div>

      {/* MODAL COMPARAÇÃO */}
      {comparisonModal.open && comparisonModal.player1 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b-4 border-amber-500">
              <h2 className="text-xl font-black uppercase tracking-tighter text-black">Comparação Técnica</h2>
              <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="text-slate-400 hover:text-black transition text-2xl font-black">✕</button>
            </div>

            {comparisonModal.player2 && (
              <div className="border-2 border-amber-500 rounded-xl p-4 mb-4 bg-amber-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Índice de Similaridade</p>
                    <p className="text-3xl font-black text-amber-600">{calcularSimilaridade(comparisonModal.player1, comparisonModal.player2)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Estilos de Jogo</p>
                    <p className="text-lg font-black text-black">
                      {calcularSimilaridade(comparisonModal.player1, comparisonModal.player2) > 75 ? 'Muito Similares' :
                       calcularSimilaridade(comparisonModal.player1, comparisonModal.player2) > 50 ? 'Similares' : 'Diferentes'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border-2 border-slate-200 rounded-xl p-4">
                <h3 className="text-base font-black uppercase italic text-amber-600 mb-1">{comparisonModal.player1.Jogador}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{comparisonModal.player1.Time} · {comparisonModal.player1.Posição}</p>
                <p className="text-[9px] text-slate-400">Idade: {comparisonModal.player1.Idade} | Min: {comparisonModal.player1['Minutos jogados']} | Nota: {comparisonModal.player1.notaPerfil}</p>
              </div>
              {comparisonModal.player2 ? (
                <div className="border-2 border-slate-200 rounded-xl p-4">
                  <h3 className="text-base font-black uppercase italic text-amber-600 mb-1">{comparisonModal.player2.Jogador}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{comparisonModal.player2.Time} · {comparisonModal.player2.Posição}</p>
                  <p className="text-[9px] text-slate-400">Idade: {comparisonModal.player2.Idade} | Min: {comparisonModal.player2['Minutos jogados']} | Nota: {comparisonModal.player2.notaPerfil}</p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center">
                  <p className="text-[10px] text-slate-400 font-black uppercase">Selecione um 2º atleta abaixo ↓</p>
                </div>
              )}
            </div>

            {!comparisonModal.player2 ? (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Selecione o segundo atleta para comparar</p>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {processedRanking.filter(p => p.Jogador !== comparisonModal.player1.Jogador).map(p => (
                    <button
                      key={p.Jogador}
                      onClick={() => setComparisonModal({ ...comparisonModal, player2: p })}
                      className="w-full p-3 border-2 border-slate-200 hover:border-amber-500 rounded-xl text-left transition-all text-[10px] font-black uppercase text-slate-700 hover:text-amber-600 flex justify-between items-center"
                    >
                      <span>{p.Jogador} <span className="text-slate-400 font-normal">· {p.Time} · {p.Posição}</span></span>
                      <span className="text-amber-600">{p.notaPerfil}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 border-2 border-slate-900 rounded-2xl overflow-hidden">
                  <div className="bg-slate-900 text-white text-center py-1.5 text-[9px] font-black uppercase tracking-widest">
                    Métricas comparadas · verde = superior
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-200 bg-slate-50">
                          <th className="px-4 py-2 text-left text-[8px] font-black uppercase tracking-widest text-slate-500">Métrica</th>
                          <th className="px-4 py-2 text-center text-[8px] font-black uppercase tracking-widest text-amber-600">{comparisonModal.player1.Jogador}</th>
                          <th className="px-4 py-2 text-center text-[8px] font-black uppercase tracking-widest text-amber-600">{comparisonModal.player2.Jogador}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.keys(comparisonModal.player1)
                          .filter(k => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'notaPerfil'].includes(k))
                          .map(metric => {
                            const val1 = safeParseFloat(comparisonModal.player1[metric]);
                            const val2 = safeParseFloat(comparisonModal.player2[metric]);
                            const menorEhMelhor = ['Faltas', 'Erros', 'Cartão', 'Bolas perdidas'].some(m => metric.toLowerCase().includes(m.toLowerCase()));
                            const p1Vence = menorEhMelhor ? val1 < val2 : val1 > val2;
                            return (
                              <tr key={metric} className="hover:bg-amber-50/50 transition-colors">
                                <td className="px-4 py-2 text-[9px] font-bold text-slate-600">{metric}</td>
                                <td className={`px-4 py-2 text-center font-black tabular-nums ${p1Vence && val1 !== val2 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                  {p1Vence && val1 !== val2 ? '● ' : ''}{val1}
                                </td>
                                <td className={`px-4 py-2 text-center font-black tabular-nums ${!p1Vence && val1 !== val2 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                  {!p1Vence && val1 !== val2 ? '● ' : ''}{val2}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={exportComparisonPDF} className="bg-slate-900 hover:bg-black text-white font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all">📄 Exportar PDF</button>
                  <button onClick={() => setComparisonModal({ ...comparisonModal, player2: null })} className="border-2 border-slate-200 hover:border-slate-400 text-slate-600 font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all">Trocar Atleta</button>
                  <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="border-2 border-slate-200 hover:border-slate-400 text-slate-600 font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all">Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL SIMILARES */}
      {similarModal.open && similarModal.targetPlayer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-900 rounded-2xl max-w-xl w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b-4 border-amber-500">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-black">Atletas Similares</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  Perfil próximo a: {similarModal.targetPlayer.Jogador}
                </p>
              </div>
              <button onClick={() => setSimilarModal({ open: false, targetPlayer: null, similar: [] })} className="text-slate-400 hover:text-black transition text-2xl font-black">✕</button>
            </div>

            {similarModal.similar.length === 0 ? (
              <p className="text-slate-500 font-bold text-sm text-center py-6">Nenhum atleta similar encontrado.</p>
            ) : (
              <div className="space-y-2">
                {similarModal.similar.map((p, idx) => (
                  <div key={p.Jogador} className="flex items-center justify-between p-3 border-2 border-slate-100 hover:border-amber-200 rounded-xl transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-slate-400 w-5">#{idx + 1}</span>
                      <div>
                        <div className="font-black uppercase italic tracking-tight text-[10px] text-black">{p.Jogador}</div>
                        <div className="text-[8px] text-slate-400 font-bold">{p.Time} · {p.Posição} · {p.Idade} anos</div>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-black text-amber-600">
                      {p.notaPerfil || '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={() => setSimilarModal({ open: false, targetPlayer: null, similar: [] })} className="border-2 border-slate-200 hover:border-slate-400 text-slate-600 font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RankingPerfil() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
        Carregando...
      </div>
    }>
      <RankingPerfilContent />
    </Suspense>
  );
}
