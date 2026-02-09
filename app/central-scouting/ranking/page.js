'use client';

import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { getRankingByPerfil, getPerfisForPosicao, findSimilarPlayers, getTrend, calculateRating } from '@/app/utils/ratingSystem';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';

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

  // Modais
  const [comparisonModal, setComparisonModal] = useState({ open: false, player1: null, player2: null });
  const [comparisonTab, setComparisonTab] = useState('Todos');
  const [similarModal, setSimilarModal] = useState({ open: false, targetPlayer: null, similar: [] });

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

    // Aplicar filtros
    ranking = ranking.filter(a => {
      const nomeMatch = a.Jogador.toLowerCase().includes(searchTerm.toLowerCase());
      const posicaoMatch = !selectedPosicao || a.Posição === selectedPosicao;
      const timeMatch = !selectedTime || a.Time === selectedTime;
      const paisMatch = !selectedPais || a.Nacionalidade === selectedPais;
      const idadeMatch = (!minIdade || parseInt(a.Idade) >= parseInt(minIdade)) && (!maxIdade || parseInt(a.Idade) <= parseInt(maxIdade));
      
      return nomeMatch && posicaoMatch && timeMatch && paisMatch && idadeMatch;
    });

    // Aplicar ordenação
    ranking.sort((a, b) => {
      const aVal = safeParseFloat(a[sortConfig.key]);
      const bVal = safeParseFloat(b[sortConfig.key]);
      return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return ranking;
  }, [atletas, selectedPerfil, minMinutos, searchTerm, selectedPosicao, selectedTime, selectedPais, minIdade, maxIdade, sortConfig]);

  // Funções auxiliares
  const calcularSimilaridade = (p1, p2) => {
    const metricas = Object.keys(p1).filter(k => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'notaPerfil'].includes(k));
    
    let diferenca = 0;
    metricas.forEach(m => {
      const v1 = safeParseFloat(p1[m]);
      const v2 = safeParseFloat(p2[m]);
      diferenca += Math.abs(v1 - v2);
    });
    
    const media = diferenca / metricas.length;
    const similaridade = Math.max(0, 100 - (media * 2));
    
    return Math.round(Math.min(100, similaridade));
  };

  // Exportar PDF do Ranking
  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(10, 12, 16);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(251, 191, 36);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('RANKING DE PERFIL', 20, 20);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Perfil: ${selectedPerfil.toUpperCase()}`, 20, 28);
    
    let yPos = 45;
    
    // TOP 3
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TOP 3 ATLETAS', 20, yPos);
    yPos += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    processedRanking.slice(0, 3).forEach((atleta, idx) => {
      doc.text(`${idx + 1}. ${atleta.Jogador} | ${atleta.Time}`, 20, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.text(`${atleta.Posição} - Nota: ${atleta.notaPerfil}`, 25, yPos);
      yPos += 6;
      doc.setFontSize(10);
    });
    
    yPos += 5;
    
    // Tabela
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('RANKING COMPLETO', 20, yPos);
    yPos += 8;
    
    const tableData = processedRanking.map(a => [
      processedRanking.indexOf(a) + 1,
      a.Jogador,
      a.Time,
      a.Posição,
      a.notaPerfil
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Pos', 'Atleta', 'Time', 'Pos', 'Nota']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [251, 191, 36], textColor: [10, 12, 16], fontStyle: 'bold' },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] }
    });
    
    doc.save(`ranking-${selectedPerfil}.pdf`);
  };

  // Exportar PDF da Comparação
  const exportComparisonPDF = () => {
    if (!comparisonModal.player1 || !comparisonModal.player2) return;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const nomeP1 = comparisonModal.player1.Jogador || 'DESCONHECIDO';
    const nomeP2 = comparisonModal.player2.Jogador || 'DESCONHECIDO';
    
    // Header
    doc.setFillColor(10, 12, 16);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(251, 191, 36);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('COMPARAÇÃO HEAD-TO-HEAD', 20, 20);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Perfil: ${selectedPerfil.toUpperCase()}`, 20, 28);
    
    let yPos = 45;
    
    // Atletas
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(nomeP1.toUpperCase(), 20, yPos);
    yPos += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${comparisonModal.player1.Time} | ${comparisonModal.player1.Posição}`, 20, yPos);
    yPos += 10;
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(nomeP2.toUpperCase(), 20, yPos);
    yPos += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${comparisonModal.player2.Time} | ${comparisonModal.player2.Posição}`, 20, yPos);
    yPos += 15;
    
    // Tabela
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('ANÁLISE DE MÉTRICAS', 20, yPos);
    yPos += 10;
    
    const metricas = Object.keys(comparisonModal.player1)
      .filter(key => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'notaPerfil'].includes(key))
      .sort();
    
    const menorEhMelhor = ['Faltas', 'Erros', 'Cartão', 'Bolas perdidas'];
    
    let p1Vitorias = 0;
    let p2Vitorias = 0;
    
    const tableData = metricas.map(metric => {
      const val1 = safeParseFloat(comparisonModal.player1[metric]);
      const val2 = safeParseFloat(comparisonModal.player2[metric]);
      
      let indicador = '';
      
      if (val1 !== val2) {
        const isMenorMelhor = menorEhMelhor.some(m => metric.toLowerCase().includes(m.toLowerCase()));
        const p1Vence = isMenorMelhor ? val1 < val2 : val1 > val2;
        
        if (p1Vence) {
          indicador = '●';
          p1Vitorias++;
        } else {
          indicador = '●';
          p2Vitorias++;
        }
      }
      
      return [metric, indicador + ' ' + val1.toString(), indicador + ' ' + val2.toString()];
    });
    
    doc.autoTable({
      startY: yPos,
      head: [['Métrica', nomeP1.substring(0, 15).toUpperCase(), nomeP2.substring(0, 15).toUpperCase()]],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, textColor: [0, 0, 0], fillColor: [255, 255, 255] },
      headStyles: { fillColor: [251, 191, 36], textColor: [10, 12, 16], fontStyle: 'bold' },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [200, 200, 200] }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Veredito
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('VEREDITO TÉCNICO', 20, yPos);
    yPos += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const veredito = p1Vitorias > p2Vitorias 
      ? `${nomeP1.toUpperCase()} apresenta melhor desempenho técnico, vencendo em ${p1Vitorias} métricas contra ${p2Vitorias} de ${nomeP2.toUpperCase()}.`
      : p2Vitorias > p1Vitorias
      ? `${nomeP2.toUpperCase()} apresenta melhor desempenho técnico, vencendo em ${p2Vitorias} métricas contra ${p1Vitorias} de ${nomeP1.toUpperCase()}.`
      : `Ambos apresentam desempenho equilibrado com ${p1Vitorias} vitórias cada.`;
    
    const splitVeredito = doc.splitTextToSize(veredito, pageWidth - 40);
    doc.text(splitVeredito, 20, yPos);
    
    doc.save(`comparacao-${nomeP1}-vs-${nomeP2}.pdf`);
  };


  // Categorizar métricas por tipo
  const categorizarMetricas = (metricas) => {
    const categorias = {
      'Todos': metricas,
      'Ataque': metricas.filter(m => ['Gol', 'Finalização', 'Chute', 'Chance', 'xG', 'Assistência', 'Passe chave', 'Cruzamento', 'Drible'].some(k => m.toLowerCase().includes(k.toLowerCase()))),
      'Defesa': metricas.filter(m => ['Falta', 'Cartão', 'Interceptação', 'Duelo', 'Bloqueio', 'Erro'].some(k => m.toLowerCase().includes(k.toLowerCase()))),
      'Construção': metricas.filter(m => ['Passe', 'Precisão', 'Bola', 'Progresso', 'Terço'].some(k => m.toLowerCase().includes(k.toLowerCase()))),
      'Físico': metricas.filter(m => ['Altura', 'Velocidade', 'Distância', 'Sprint', 'Aceleração'].some(k => m.toLowerCase().includes(k.toLowerCase())))
    };
    return categorias;
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
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 ml-1">Inteligência Avançada de Scouting</p>
            </div>
          </div>
          <button onClick={exportPDF} className="px-8 py-4 bg-brand-yellow text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all shadow-lg hover:shadow-brand-yellow/20">
            📄 Exportar PDF
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-800/50 mb-12 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Idade Mín</label>
              <input type="number" value={minIdade} onChange={e => setMinIdade(e.target.value)} placeholder="Ex: 20" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white placeholder:text-slate-700 transition-all" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Idade Máx</label>
              <input type="number" value={maxIdade} onChange={e => setMaxIdade(e.target.value)} placeholder="Ex: 30" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white placeholder:text-slate-700 transition-all" />
            </div>
          </div>
        </div>

        {/* TABELA DE RANKING */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => setSortConfig({ key: 'Jogador', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Atleta</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => setSortConfig({ key: 'Time', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Time</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => setSortConfig({ key: 'Posição', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Posição</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => setSortConfig({ key: 'Idade', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Idade</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => setSortConfig({ key: 'Minutos jogados', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Minutos</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => setSortConfig({ key: 'notaPerfil', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Nota</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-brand-yellow uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {processedRanking.map((atleta, idx) => (
                  <tr key={atleta.Jogador} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-black text-white">{idx + 1}. {atleta.Jogador}</td>
                    <td className="px-6 py-4 text-[11px] text-slate-400">{atleta.Time}</td>
                    <td className="px-6 py-4 text-[11px] text-slate-400">{atleta.Posição}</td>
                    <td className="px-6 py-4 text-[11px] text-slate-400">{atleta.Idade}</td>
                    <td className="px-6 py-4 text-[11px] text-slate-400">{atleta['Minutos jogados']}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1 bg-brand-yellow/20 border border-brand-yellow/50 rounded-lg text-[11px] font-black text-brand-yellow">
                        {atleta.notaPerfil}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setComparisonModal({ open: true, player1: atleta, player2: null })} className="p-2 bg-slate-800 hover:bg-brand-yellow/20 rounded-lg transition-all text-sm" title="Comparar">⚔️</button>
                        <button onClick={() => setSimilarModal({ open: true, targetPlayer: atleta, similar: findSimilarPlayers(atleta, processedRanking, 5) })} className="p-2 bg-slate-800 hover:bg-brand-yellow/20 rounded-lg transition-all text-sm" title="Similares">🔍</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE COMPARAÇÃO */}
        {comparisonModal.open && comparisonModal.player1 && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900/95 border border-brand-yellow/30 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-brand-yellow/20">
                <h2 className="text-2xl font-black italic text-brand-yellow">COMPARAÇÃO TÉCNICA</h2>
                <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="text-white hover:text-brand-yellow transition text-2xl">✕</button>
              </div>
              
              {/* Similaridade */}
              {comparisonModal.player2 && (
                <div className="bg-slate-800/50 border border-brand-yellow/20 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-slate-400">Percentil de Similaridade</p>
                      <p className="text-3xl font-bold text-brand-yellow">{calcularSimilaridade(comparisonModal.player1, comparisonModal.player2)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Estilos de Jogo</p>
                      <p className="text-lg font-bold text-white">
                        {calcularSimilaridade(comparisonModal.player1, comparisonModal.player2) > 75 ? 'Muito Similares' : calcularSimilaridade(comparisonModal.player1, comparisonModal.player2) > 50 ? 'Similares' : 'Diferentes'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Atletas Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 border border-brand-yellow/20 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-brand-yellow mb-2">{comparisonModal.player1.Jogador}</h3>
                  <p className="text-sm text-slate-400">{comparisonModal.player1.Time} • {comparisonModal.player1.Posição}</p>
                  <p className="text-xs text-slate-500">Idade: {comparisonModal.player1.Idade} | Minutos: {comparisonModal.player1['Minutos jogados']}</p>
                </div>
                {comparisonModal.player2 && (
                  <div className="bg-slate-800/50 border border-brand-yellow/20 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-brand-yellow mb-2">{comparisonModal.player2.Jogador}</h3>
                    <p className="text-sm text-slate-400">{comparisonModal.player2.Time} • {comparisonModal.player2.Posição}</p>
                    <p className="text-xs text-slate-500">Idade: {comparisonModal.player2.Idade} | Minutos: {comparisonModal.player2['Minutos jogados']}</p>
                  </div>
                )}
              </div>
              
              {/* Seletor de segundo atleta */}
              {!comparisonModal.player2 ? (
                <div className="mb-6">
                  <p className="text-slate-400 mb-4 font-black uppercase">Selecione um segundo atleta para comparar</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {processedRanking.filter(p => p.Jogador !== comparisonModal.player1.Jogador).map(p => (
                      <button key={p.Jogador} onClick={() => setComparisonModal({ ...comparisonModal, player2: p })} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-left hover:border-brand-yellow transition-all text-sm font-black uppercase text-slate-300 hover:text-brand-yellow">
                        {p.Jogador} ({p.notaPerfil})
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Tabela de Métricas */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-800 border-b border-brand-yellow/20">
                          <th className="px-4 py-2 text-left text-brand-yellow font-bold">Métrica</th>
                          <th className="px-4 py-2 text-center text-brand-yellow font-bold">{comparisonModal.player1.Jogador}</th>
                          <th className="px-4 py-2 text-center text-brand-yellow font-bold">{comparisonModal.player2.Jogador}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(comparisonModal.player1)
                          .filter(k => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'notaPerfil'].includes(k))
                          .map(metric => {
                            const val1 = safeParseFloat(comparisonModal.player1[metric]);
                            const val2 = safeParseFloat(comparisonModal.player2[metric]);
                            const menorEhMelhor = ['Faltas', 'Erros', 'Cartão', 'Bolas perdidas'].some(m => metric.toLowerCase().includes(m.toLowerCase()));
                            const p1Vence = menorEhMelhor ? val1 < val2 : val1 > val2;
                            
                            return (
                              <tr key={metric} className="border-b border-slate-700 hover:bg-slate-800/50">
                                <td className="px-4 py-2 text-white">{metric}</td>
                                <td className={`px-4 py-2 text-center font-bold ${p1Vence && val1 !== val2 ? 'text-green-400' : 'text-slate-300'}`}>
                                  {val1 !== val2 && p1Vence ? '● ' : ''}{val1}
                                </td>
                                <td className={`px-4 py-2 text-center font-bold ${!p1Vence && val1 !== val2 ? 'text-green-400' : 'text-slate-300'}`}>
                                  {val1 !== val2 && !p1Vence ? '● ' : ''}{val2}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Botões */}
                  <div className="flex gap-3 justify-end">
                    <button onClick={exportComparisonPDF} className="px-6 py-2 bg-brand-yellow text-black font-bold rounded-lg hover:bg-yellow-400 transition">
                      📄 Exportar PDF
                    </button>
                    <button onClick={() => setComparisonModal({ ...comparisonModal, player2: null })} className="px-6 py-2 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition">
                      Trocar Atleta
                    </button>
                    <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="px-6 py-2 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition">
                      Fechar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
