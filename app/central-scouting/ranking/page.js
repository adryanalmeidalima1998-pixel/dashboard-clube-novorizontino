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
  
  const exportComparisonPDF = async () => {
    try {
      const { player1: selectedPlayer1, player2: selectedPlayer2 } = comparisonModal;
      if (!selectedPlayer1 || !selectedPlayer2) {
        alert('Selecione dois atletas para comparar')
        return
      }

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      
      // Cores
      const amarelo = [251, 191, 36]
      const preto = [10, 12, 16]
      const branco = [255, 255, 255]
      const cinza = [100, 116, 139]

      // Cabeçalho
      doc.setFillColor(...amarelo)
      doc.rect(10, 10, 190, 25, 'F')
      doc.setTextColor(...preto)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('COMPARAÇÃO DE ATLETAS', 15, 28)

      // Info dos atletas
      doc.setTextColor(...preto)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`${selectedPlayer1.Jogador} (${selectedPlayer1.Posição})`, 15, 45)
      doc.text(`${selectedPlayer2.Jogador} (${selectedPlayer2.Posição})`, 15, 52)

      // Tabela de métricas
      let yPos = 65
      const colWidth = 60
      const rowHeight = 8

      // Cabeçalho da tabela
      doc.setFillColor(...preto)
      doc.setTextColor(...branco)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      
      doc.rect(10, yPos - 5, colWidth, rowHeight, 'F')
      doc.text('MÉTRICA', 12, yPos)
      
      doc.rect(10 + colWidth, yPos - 5, colWidth, rowHeight, 'F')
      doc.text(selectedPlayer1.Jogador.substring(0, 15), 12 + colWidth, yPos)
      
      doc.rect(10 + colWidth * 2, yPos - 5, colWidth, rowHeight, 'F')
      doc.text(selectedPlayer2.Jogador.substring(0, 15), 12 + colWidth * 2, yPos)

      yPos += rowHeight + 2

      // Linhas de dados
      doc.setTextColor(...preto)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)

      const metricas = Object.keys(selectedPlayer1).filter(k => 
        !['Jogador', 'Posição', 'Time', 'Idade', 'Altura', 'Nacionalidade', 'Minutos jogados'].includes(k)
      )

      metricas.forEach((metrica) => {
        const val1 = safeParseFloat(selectedPlayer1[metrica])
        const val2 = safeParseFloat(selectedPlayer2[metrica])
        
        // Determinar o vencedor
        const isPositive = !['Falta', 'Erro', 'Cartão', 'Bola perdida'].some(w => metrica.toLowerCase().includes(w.toLowerCase()))
        const player1Wins = isPositive ? val1 > val2 : val1 < val2

        // Linha de métrica
        doc.setFillColor(240, 240, 240)
        doc.rect(10, yPos, colWidth, rowHeight, 'F')
        doc.setTextColor(...preto)
        doc.text(metrica.substring(0, 20), 12, yPos + 5)

        // Valor Player 1
        doc.setFillColor(...(player1Wins ? [220, 220, 100] : [255, 255, 255]))
        doc.rect(10 + colWidth, yPos, colWidth, rowHeight, 'F')
        doc.setTextColor(...preto)
        const displayVal1 = val1 === 0 ? '-' : val1.toFixed(2)
        doc.text(displayVal1, 12 + colWidth, yPos + 5)

        // Valor Player 2
        doc.setFillColor(...(!player1Wins && val2 > 0 ? [220, 220, 100] : [255, 255, 255]))
        doc.rect(10 + colWidth * 2, yPos, colWidth, rowHeight, 'F')
        doc.setTextColor(...preto)
        const displayVal2 = val2 === 0 ? '-' : val2.toFixed(2)
        doc.text(displayVal2, 12 + colWidth * 2, yPos + 5)

        yPos += rowHeight

        // Quebra de página se necessário
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
      })

      // Rodapé
      doc.setTextColor(...cinza)
      doc.setFontSize(8)
      doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`, 15, doc.internal.pageSize.getHeight() - 10)

      // Salvar
      doc.save(`comparacao-${selectedPlayer1.Jogador}-vs-${selectedPlayer2.Jogador}.pdf`)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Verifique o console.')
    }
  }
;


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
    <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
      Processando Inteligência...
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-4">

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
              onClick={() => router.push('/central-scouting')}
              className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
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
        <div className="border-2 border-slate-200 rounded-2xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Buscar Atleta</label>
              <input
                type="text"
                placeholder="NOME DO JOGADOR..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-amber-500 placeholder:text-slate-300 transition-all"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Perfil Técnico</label>
              <select value={selectedPerfil} onChange={e => setSelectedPerfil(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-amber-500 cursor-pointer">
                {allPerfis.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                Minutos mín.: <span className="text-amber-600">{minMinutos}min</span>
              </label>
              <input type="range" min="0" max="3000" step="90" value={minMinutos}
                onChange={e => setMinMinutos(parseInt(e.target.value))}
                className="w-full accent-amber-500 mt-2" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Posição</label>
              <select value={selectedPosicao} onChange={e => setSelectedPosicao(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-amber-500 cursor-pointer">
                <option value="">TODAS AS POSIÇÕES</option>
                {options.posicoes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Clube</label>
              <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-amber-500 cursor-pointer">
                <option value="">TODOS OS CLUBES</option>
                {options.times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">País</label>
              <select value={selectedPais} onChange={e => setSelectedPais(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-amber-500 cursor-pointer">
                <option value="">TODOS OS PAÍSES</option>
                {options.paises.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Idade Mín</label>
              <input type="number" value={minIdade} onChange={e => setMinIdade(e.target.value)} placeholder="Ex: 20"
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-amber-500 placeholder:text-slate-300 transition-all" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Idade Máx</label>
              <input type="number" value={maxIdade} onChange={e => setMaxIdade(e.target.value)} placeholder="Ex: 30"
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-amber-500 placeholder:text-slate-300 transition-all" />
            </div>
          </div>
        </div>

        {/* TABELA DE RANKING */}
        <div className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
            Ranking · Perfil: {selectedPerfil} · {processedRanking.length} atletas · Clique em ⚔️ para comparar
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-900">
                  <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => setSortConfig({ key: 'Jogador', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Atleta</th>
                  <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => setSortConfig({ key: 'Time', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Time</th>
                  <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => setSortConfig({ key: 'Posição', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Pos</th>
                  <th className="px-4 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300 cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => setSortConfig({ key: 'Idade', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Idade</th>
                  <th className="px-4 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300 cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => setSortConfig({ key: 'Minutos jogados', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Min</th>
                  <th className="px-4 py-3 text-center text-[8px] font-black uppercase tracking-widest bg-amber-500 text-black cursor-pointer" onClick={() => setSortConfig({ key: 'notaPerfil', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                    Nota {sortConfig.key === 'notaPerfil' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedRanking.map((atleta, idx) => (
                  <tr key={atleta.Jogador} className="hover:bg-amber-50/60 transition-colors cursor-pointer group">
                    <td className="px-4 py-2.5 text-[10px] font-black uppercase italic group-hover:text-amber-600 transition-colors">
                      <span className="text-slate-400 font-black mr-1">#{idx + 1}</span> {atleta.Jogador}
                    </td>
                    <td className="px-4 py-2.5 text-[9px] font-black uppercase text-slate-600">{atleta.Time}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-600">{atleta.Posição}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-[9px] font-black">{atleta.Idade}</td>
                    <td className="px-4 py-2.5 text-center text-[9px] font-black tabular-nums">{atleta['Minutos jogados']}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-sm font-black tabular-nums text-amber-600">{atleta.notaPerfil}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setComparisonModal({ open: true, player1: atleta, player2: null })}
                          className="p-1.5 border border-slate-200 hover:border-amber-500 rounded-lg transition-all text-sm" title="Comparar">⚔️</button>
                        <button onClick={() => setSimilarModal({ open: true, targetPlayer: atleta, similar: findSimilarPlayers(atleta, processedRanking, 5) })}
                          className="p-1.5 border border-slate-200 hover:border-amber-500 rounded-lg transition-all text-sm" title="Similares">🔍</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3">
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
              onClick={() => router.push('/central-scouting')}
              className="text-slate-500 hover:text-black text-sm font-black uppercase tracking-widest px-4 transition-colors"
            >
              Voltar
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

        {/* MODAL DE COMPARAÇÃO */}
        {comparisonModal.open && comparisonModal.player1 && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4 pb-3 border-b-4 border-amber-500">
                <h2 className="text-xl font-black uppercase tracking-tighter text-black">Comparação Técnica</h2>
                <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })}
                  className="text-slate-400 hover:text-black transition text-2xl font-black">✕</button>
              </div>

              {comparisonModal.player2 && (
                <div className="border-2 border-amber-500 rounded-xl p-4 mb-4 bg-amber-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Percentil de Similaridade</p>
                      <p className="text-3xl font-black text-amber-600">{calcularSimilaridade(comparisonModal.player1, comparisonModal.player2)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Estilos de Jogo</p>
                      <p className="text-lg font-black text-black">
                        {calcularSimilaridade(comparisonModal.player1, comparisonModal.player2) > 75 ? 'Muito Similares' : calcularSimilaridade(comparisonModal.player1, comparisonModal.player2) > 50 ? 'Similares' : 'Diferentes'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border-2 border-slate-200 rounded-xl p-4">
                  <h3 className="text-base font-black uppercase italic text-amber-600 mb-1">{comparisonModal.player1.Jogador}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{comparisonModal.player1.Time} · {comparisonModal.player1.Posição}</p>
                  <p className="text-[9px] text-slate-400">Idade: {comparisonModal.player1.Idade} | Min: {comparisonModal.player1['Minutos jogados']}</p>
                </div>
                {comparisonModal.player2 && (
                  <div className="border-2 border-slate-200 rounded-xl p-4">
                    <h3 className="text-base font-black uppercase italic text-amber-600 mb-1">{comparisonModal.player2.Jogador}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{comparisonModal.player2.Time} · {comparisonModal.player2.Posição}</p>
                    <p className="text-[9px] text-slate-400">Idade: {comparisonModal.player2.Idade} | Min: {comparisonModal.player2['Minutos jogados']}</p>
                  </div>
                )}
              </div>

              {!comparisonModal.player2 ? (
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Selecione um segundo atleta para comparar</p>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {processedRanking.filter(p => p.Jogador !== comparisonModal.player1.Jogador).map(p => (
                      <button key={p.Jogador} onClick={() => setComparisonModal({ ...comparisonModal, player2: p })}
                        className="w-full p-3 border-2 border-slate-200 hover:border-amber-500 rounded-xl text-left transition-all text-[10px] font-black uppercase text-slate-700 hover:text-amber-600">
                        {p.Jogador} <span className="text-slate-400">({p.notaPerfil})</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 border-2 border-slate-900 rounded-2xl overflow-hidden">
                    <div className="bg-slate-900 text-white text-center py-1.5 text-[9px] font-black uppercase tracking-widest">Métricas comparadas</div>
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
                    <button onClick={exportComparisonPDF} className="bg-slate-900 hover:bg-black text-white font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all">
                      📄 Exportar PDF
                    </button>
                    <button onClick={() => setComparisonModal({ ...comparisonModal, player2: null })}
                      className="border-2 border-slate-200 hover:border-slate-400 text-slate-600 font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all">
                      Trocar Atleta
                    </button>
                    <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })}
                      className="border-2 border-slate-200 hover:border-slate-400 text-slate-600 font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all">
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
