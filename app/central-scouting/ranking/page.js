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

  // Abrir modal de comparação
  const openComparison = (player1, player2 = null) => {
    setComparisonModal({ open: true, player1, player2 });
  };

  // Abrir modal de similaridade
  const openSimilarPlayers = (targetPlayer) => {
    const similar = findSimilarPlayers(targetPlayer, atletas, minMinutos, 5);
    setSimilarModal({ open: true, targetPlayer, similar });
  };

  // Exportar PDF
  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFillColor(10, 12, 16);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(251, 191, 36);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('RANKING DE PERFIL', 20, 20);
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Perfil: ${selectedPerfil.toUpperCase()}`, 20, 28);
    
    // Top 3
    let yPos = 45;
    doc.setTextColor(251, 191, 36);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('TOP 3 ATLETAS', 20, yPos);
    yPos += 12;
    
    processedRanking.slice(0, 3).forEach((atleta, idx) => {
      const nomeAtleta = atleta.Jogador ? atleta.Jogador.toUpperCase() : 'DESCONHECIDO';
      const nomeTime = atleta.Time ? atleta.Time : '-';
      const posicao = atleta.Posição ? atleta.Posição : '-';
      const nota = atleta.notaPerfil ? atleta.notaPerfil : 0;
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${idx + 1}. ${nomeAtleta} | ${nomeTime}`, 20, yPos);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`${posicao} - Nota: ${nota}`, 20, yPos + 5);
      yPos += 15;
    });
    
    // Tabela resumida
    yPos += 10;
    doc.setTextColor(251, 191, 36);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RANKING COMPLETO', 20, yPos);
    yPos += 8;
    
    const tableData = processedRanking.slice(0, 20).map((a, idx) => [
      idx + 1,
      a.Jogador.substring(0, 20),
      a.Time.substring(0, 15),
      a.Posição,
      a.notaPerfil
    ]);
    
    doc.autoTable({
      head: [['Pos', 'Atleta', 'Time', 'Pos', 'Nota']],
      body: tableData,
      startY: yPos,
      margin: { left: 20, right: 20 },
      headStyles: { fillColor: [251, 191, 36], textColor: [10, 12, 16], fontStyle: 'bold' },
      bodyStyles: { textColor: [100, 116, 139] },
      alternateRowStyles: { fillColor: [30, 41, 59] }
    });
    
    doc.save(`ranking_${selectedPerfil}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
    
    // Atletas
    let yPos = 45;
    
    // Jogador 1
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(nomeP1.toUpperCase(), 20, yPos);
    yPos += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${comparisonModal.player1.Time}`, 20, yPos);
    yPos += 6;
    doc.text(`${comparisonModal.player1.Posição} | Idade: ${comparisonModal.player1.Idade} | Minutos: ${comparisonModal.player1['Minutos jogados']}`, 20, yPos);
    yPos += 10;
    
    // Jogador 2
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(nomeP2.toUpperCase(), 20, yPos);
    yPos += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${comparisonModal.player2.Time}`, 20, yPos);
    yPos += 6;
    doc.text(`${comparisonModal.player2.Posição} | Idade: ${comparisonModal.player2.Idade} | Minutos: ${comparisonModal.player2['Minutos jogados']}`, 20, yPos);
    yPos += 15;
    
    // Tabela de comparação
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('ANÁLISE DE MÉTRICAS', 20, yPos);
    yPos += 10;
    
    const metricas = Object.keys(comparisonModal.player1)
      .filter(key => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'notaPerfil'].includes(key))
      .sort();
    
    const menorEhMelhor = ['Faltas', 'Erros graves', 'Falhas em gols', 'Bolas perdidas', 'Cartões', 'Cartão amarelo', 'Cartão vermelho', 'Chutes', 'Interceptações'];
    
    let p1Vitorias = 0;
    let p2Vitorias = 0;
    
    const tableData = metricas.map(metric => {
      const val1 = safeParseFloat(comparisonModal.player1[metric]);
      const val2 = safeParseFloat(comparisonModal.player2[metric]);
      
      let seta1 = '';
      let seta2 = '';
      
      if (val1 !== val2) {
        const isMenorMelhor = menorEhMelhor.some(m => metric.toLowerCase().includes(m.toLowerCase()));
        const p1Vence = isMenorMelhor ? val1 < val2 : val1 > val2;
        
        if (p1Vence) {
          seta1 = '▲';
          p1Vitorias++;
        } else {
          seta2 = '▲';
          p2Vitorias++;
        }
      }
      
      return [metric, seta1 + ' ' + val1.toString(), seta2 + ' ' + val2.toString()];
    });
    
    doc.autoTable({
      startY: yPos,
      head: [[
        'Métrica',
        nomeP1.substring(0, 15).toUpperCase(),
        nomeP2.substring(0, 15).toUpperCase()
      ]],
      body: tableData,
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255]
      },
      headStyles: { 
        fillColor: [251, 191, 36], 
        textColor: [10, 12, 16], 
        fontStyle: 'bold' 
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [200, 200, 200]
      },
      alternateRowStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0]
      },
      didDrawCell: (data) => {
        if (data.row.section === 'body') {
          const cellText = data.cell.text[0] || '';
          
          // Coluna do Atleta 1 (índice 1)
          if (data.column.index === 1 && cellText.includes('▲')) {
            data.cell.styles.textColor = [0, 150, 0];
            data.cell.styles.fontStyle = 'bold';
          }
          // Coluna do Atleta 2 (índice 2)
          else if (data.column.index === 2 && cellText.includes('▲')) {
            data.cell.styles.textColor = [0, 150, 0];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
    
    // Veredito Técnico
    yPos = doc.lastAutoTable.finalY + 15;
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('VEREDITO TÉCNICO', 20, yPos);
    yPos += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    const veredito = p1Vitorias > p2Vitorias 
      ? `${nomeP1.toUpperCase()} apresenta melhor desempenho técnico neste perfil, vencendo em ${p1Vitorias} métricas contra ${p2Vitorias} de ${nomeP2.toUpperCase()}. É o candidato mais adequado para este papel tático.`
      : p2Vitorias > p1Vitorias
      ? `${nomeP2.toUpperCase()} apresenta melhor desempenho técnico neste perfil, vencendo em ${p2Vitorias} métricas contra ${p1Vitorias} de ${nomeP1.toUpperCase()}. É o candidato mais adequado para este papel tático.`
      : `Ambos os atletas apresentam desempenho equilibrado neste perfil, com ${p1Vitorias} vitórias cada um. A escolha deve considerar outros fatores como experiência e adaptação ao grupo.`;
    
    const splitVeredito = doc.splitTextToSize(veredito, pageWidth - 40);
    doc.text(splitVeredito, 20, yPos);
    
    doc.save(`comparacao-${nomeP1}-vs-${nomeP2}.pdf`);
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

        {/* FILTROS E BUSCA */}
        <div className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-800/50 mb-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-yellow/20 to-transparent"></div>
          
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
                  <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                  <th className="p-8 text-[10px] font-black uppercase tracking-widest text-brand-yellow text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('notaPerfil')}>
                    Nota Final {sortConfig.key === 'notaPerfil' && (sortConfig.direction === 'desc' ? '▼' : '▲')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedRanking.map((j, idx) => {
                  const trend = getTrend(j);
                  return (
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
                      <td className="p-8">
                        <div className="flex gap-2">
                          <button onClick={() => openComparison(j)} className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[8px] font-black uppercase hover:border-brand-yellow transition-all" title="Comparar">
                            ⚔️
                          </button>
                          <button onClick={() => openSimilarPlayers(j)} className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[8px] font-black uppercase hover:border-brand-yellow transition-all" title="Similares">
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="p-8 text-right">
                        <div className="inline-flex items-center gap-4">
                          <div className="w-32 h-2 bg-slate-950 rounded-full overflow-hidden hidden lg:block border border-slate-800">
                            <div className="h-full bg-brand-yellow shadow-[0_0_10px_rgba(251,191,36,0.4)]" style={{ width: `${j.notaPerfil}%` }}></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black italic text-white min-w-[3rem]">{j.notaPerfil}</span>
                            <span className={`text-lg ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-600'}`}>
                              {trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* MODAL: COMPARAÇÃO HEAD-TO-HEAD */}
      {comparisonModal.open && comparisonModal.player1 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-brand-yellow">Comparação <span className="text-white">Head-to-Head</span></h2>
              <div className="flex gap-3">
                {comparisonModal.player2 && (
                  <button onClick={exportComparisonPDF} className="px-4 py-2 bg-brand-yellow text-slate-950 rounded-lg text-[10px] font-black uppercase hover:bg-brand-yellow/80 transition-all">
                    📄 Exportar PDF
                  </button>
                )}
                <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="text-slate-500 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              {/* Player 1 */}
              <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800">
                <h3 className="text-lg font-black italic uppercase text-white mb-4">{comparisonModal.player1.Jogador}</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-400"><strong className="text-slate-300">Time:</strong> {comparisonModal.player1.Time}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Posição:</strong> {comparisonModal.player1.Posição}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Idade:</strong> {comparisonModal.player1.Idade}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Minutos:</strong> {comparisonModal.player1['Minutos jogados']}</p>
                  <p className="text-brand-yellow mt-4"><strong>Nota Geral:</strong> {comparisonModal.player1.notaPerfil}</p>
                </div>
              </div>

              {/* Player 2 Selector */}
              {!comparisonModal.player2 ? (
                <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800 flex flex-col justify-center">
                  <p className="text-slate-500 text-center mb-6 font-black uppercase">Selecione um segundo atleta para comparar</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {processedRanking.filter(p => p.Jogador !== comparisonModal.player1.Jogador).map(p => (
                      <button key={p.Jogador} onClick={() => setComparisonModal({ ...comparisonModal, player2: p })} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-left hover:border-brand-yellow transition-all text-sm font-black uppercase text-slate-300 hover:text-brand-yellow">
                        {p.Jogador} ({p.notaPerfil})
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800">
                  <h3 className="text-lg font-black italic uppercase text-white mb-4">{comparisonModal.player2.Jogador}</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-400"><strong className="text-slate-300">Time:</strong> {comparisonModal.player2.Time}</p>
                    <p className="text-slate-400"><strong className="text-slate-300">Posição:</strong> {comparisonModal.player2.Posição}</p>
                    <p className="text-slate-400"><strong className="text-slate-300">Idade:</strong> {comparisonModal.player2.Idade}</p>
                    <p className="text-slate-400"><strong className="text-slate-300">Minutos:</strong> {comparisonModal.player2['Minutos jogados']}</p>
                    <p className="text-brand-yellow mt-4"><strong>Nota Geral:</strong> {comparisonModal.player2.notaPerfil}</p>
                  </div>
                  <button onClick={() => setComparisonModal({ ...comparisonModal, player2: null })} className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase transition-all">
                    Trocar Atleta
                  </button>
                </div>
              )}
            </div>

            {comparisonModal.player2 && (
              <div className="bg-slate-950/30 p-8 rounded-2xl border border-slate-800/50">
                <h4 className="text-brand-yellow font-black uppercase mb-6 text-lg">Análise Completa de Métricas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.keys(comparisonModal.player1)
                    .filter(key => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'notaPerfil'].includes(key))
                    .sort()
                    .map(metric => {
                      const val1 = safeParseFloat(comparisonModal.player1[metric]);
                      const val2 = safeParseFloat(comparisonModal.player2[metric]);
                      const winner = val1 > val2 ? 1 : val2 > val1 ? 2 : 0;
                      const menorEhMelhor = ['Faltas', 'Erros graves', 'Falhas em gols', 'Bolas perdidas'].includes(metric);
                      const winner_adjusted = menorEhMelhor ? (val1 < val2 ? 1 : val2 < val1 ? 2 : 0) : winner;
                      
                      return (
                        <div key={metric} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                          <p className="text-[9px] font-black uppercase text-slate-500 mb-3 tracking-widest">{metric}</p>
                          <div className="space-y-2">
                            <div className={`p-3 rounded-lg text-center text-sm font-black transition-all ${
                              winner_adjusted === 1 ? 'bg-green-900/40 text-green-300 border border-green-700/50' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {val1}
                            </div>
                            <div className="text-center text-[8px] text-slate-600 font-bold">vs</div>
                            <div className={`p-3 rounded-lg text-center text-sm font-black transition-all ${
                              winner_adjusted === 2 ? 'bg-green-900/40 text-green-300 border border-green-700/50' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {val2}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: JOGADORES SIMILARES */}
      {similarModal.open && similarModal.targetPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-brand-yellow">Jogadores <span className="text-white">Similares</span></h2>
                <p className="text-slate-500 text-[10px] font-black uppercase mt-2">Perfil técnico similar a {similarModal.targetPlayer.Jogador}</p>
              </div>
              <button onClick={() => setSimilarModal({ open: false, targetPlayer: null, similar: [] })} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              {similarModal.similar.length > 0 ? (
                similarModal.similar.map((player, idx) => (
                  <div key={player.Jogador} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 hover:border-brand-yellow/50 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-black italic uppercase text-white">{idx + 1}. {player.Jogador}</p>
                        <p className="text-[10px] font-bold text-slate-600 uppercase mt-2">{player.Time} • {player.Posição} • {player.Idade} anos</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black italic text-brand-yellow">{player.notaPerfil}</p>
                        <p className="text-[9px] font-black text-slate-600 uppercase mt-1">Nota Geral</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8 font-black uppercase">Nenhum jogador similar encontrado</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
