
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, normalizeTeamName, safeParseFloat } from '../utils/dataCleaner';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv";

export default function CentralDados() {
  const router = useRouter();
  const [jogadores, setJogadores] = useState([]);
  const [todasAsColunas, setTodasAsColunas] = useState([]);
  const [categoriasMetricas, setCategoriasMetricas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  
  const [busca, setBusca] = useState('');
  const [filtroTime, setFiltroTime] = useState('todos');
  const [filtrosPosicao, setFiltrosPosicao] = useState([]);
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 });
  const [filtroMinutagem, setFiltroMinutagem] = useState(0);
  
  const [metricasSelecionadas, setMetricasSelecionadas] = useState(['Index', 'Minutos jogados', 'Gols', 'Assistências']);
  const [ordenacao, setOrdenacao] = useState({ coluna: 'Index', direcao: 'desc' });
  
  const [jogadorReferencia, setJogadorReferencia] = useState(null);
  const [jogadoresSimilares, setJogadoresSimilares] = useState([]);

  const [templates, setTemplates] = useState([]);
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('Ataque');
  const [comparisonModal, setComparisonModal] = useState({ open: false, player1: null, player2: null });

  useEffect(() => {
    const templatesArmazenados = localStorage.getItem('metricsTemplates_Central');
    if (templatesArmazenados) {
      try { setTemplates(JSON.parse(templatesArmazenados)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('metricsTemplates_Central', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data).map(j => ({
              ...j,
              Time: normalizeTeamName(j.Time || j.Equipe || ''),
              Posição: (j.Posição || '').trim().toUpperCase()
            }));
            
            const dadosComHistorico = dadosLimpos.map(j => {
              const valorAtual = safeParseFloat(j['Index']);
              return {
                ...j,
                historicoIndex: [
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual }
                ]
              };
            });

            setJogadores(dadosComHistorico);
            if (dadosLimpos.length > 0) {
              const colunas = Object.keys(dadosLimpos[0]).filter(col => col && col.trim());
              setTodasAsColunas(colunas);
              setCategoriasMetricas(categorizarMetricas(colunas));
            }
            setCarregando(false);
          },
          error: () => { setErro('Erro ao carregar dados'); setCarregando(false); }
        });
      } catch (error) { setErro('Erro ao conectar'); setCarregando(false); }
    };
    carregarDados();
  }, []);

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Ataque': [], 'Defesa': [], 'Passes & Criação': [], 'Posse & Controle': [], 'Físico & Duelos': [], 'Geral': [] };
    const palavrasChave = {
      'Ataque': ['Gol', 'Assistência', 'Chance', 'Chute', 'Finalização', 'Xg', 'xA', 'Tiro', 'Header', 'Poste', 'Entradas no terço final'],
      'Defesa': ['Desarme', 'Interceptação', 'Rebote', 'Falha', 'Erro', 'Cartão', 'Falta', 'Defesa', 'Disputa defensiva', 'Disputa na defesa'],
      'Passes & Criação': ['Passe', 'Cruzamento', 'Passe chave', 'Passe progressivo', 'Passe longo', 'Passe super longo', 'Passe para', 'Precisão'],
      'Posse & Controle': ['Drible', 'Controle', 'Bola', 'Posse', 'Impedimento', 'Perda'],
      'Físico & Duelos': ['Duelo', 'Disputa', 'Disputa aérea', 'Desafio', 'Minutos']
    };

    colunas.forEach(metrica => {
      if (['?', 'ID_ATLETA', 'Jogador', 'Time', 'Equipe', 'Posição', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '№'].includes(metrica)) return;
      let categorizado = false;
      for (const [cat, chaves] of Object.entries(palavrasChave)) {
        if (chaves.some(k => metrica.includes(k))) { categorias[cat].push(metrica); categorizado = true; break; }
      }
      if (!categorizado) categorias['Geral'].push(metrica);
    });
    if (colunas.includes('Index')) {
      categorias['Geral'] = categorias['Geral'].filter(m => m !== 'Index');
      categorias['Geral'].unshift('Index');
    }
    return categorias;
  };

  const handleOrdenacao = (coluna) => {
    setOrdenacao(prev => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc'
    }));
  };

  const encontrarSimilares = (jogador) => {
    if (jogadorReferencia?.Jogador === jogador.Jogador) {
      setJogadorReferencia(null);
      setJogadoresSimilares([]);
      return;
    }
    setJogadorReferencia(jogador);
    
    const metricasCalculo = metricasSelecionadas.filter(m => 
      !['Jogador', 'Time', 'Equipe', 'Posição', 'Index'].includes(m)
    );
    
    if (metricasCalculo.length === 0 && metricasSelecionadas.includes('Index')) {
      metricasCalculo.push('Index');
    }
    
    const scores = jogadores
      .filter(j => j.Jogador !== jogador.Jogador && j.Posição === jogador.Posição)
      .map(j => {
        let somaDiferencasQuadradas = 0;
        metricasCalculo.forEach(m => {
          const v1 = safeParseFloat(jogador[m]);
          const v2 = safeParseFloat(j[m]);
          const diff = v1 === 0 ? v2 : Math.abs(v1 - v2) / (Math.abs(v1) || 1);
          somaDiferencasQuadradas += Math.pow(diff, 2);
        });
        
        const dist = metricasCalculo.length > 0 ? Math.sqrt(somaDiferencasQuadradas / metricasCalculo.length) : 0;
        const similaridade = Math.max(0, 100 - (dist * 50));
        
        return { ...j, scoreSimilaridade: similaridade };
      })
      .sort((a, b) => b.scoreSimilaridade - a.scoreSimilaridade)
      .slice(0, 5);
    
    setJogadoresSimilares(scores);
  };

  const listaParaExibir = useMemo(() => {
    if (jogadorReferencia) {
      const baseSimilaridade = [jogadorReferencia, ...jogadoresSimilares];
      return [...baseSimilaridade].sort((a, b) => {
        const vA = safeParseFloat(a[ordenacao.coluna]);
        const vB = safeParseFloat(b[ordenacao.coluna]);
        if (['Jogador', 'Time', 'Equipe', 'Posição'].includes(ordenacao.coluna)) {
          const sA = String(a[ordenacao.coluna] || '').toLowerCase();
          const sB = String(b[ordenacao.coluna] || '').toLowerCase();
          return ordenacao.direcao === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
        }
        return ordenacao.direcao === 'asc' ? vA - vB : vB - vA;
      });
    }

    const temCriterio = busca || filtroTime !== 'todos' || filtrosPosicao.length > 0 || filtroMinutagem > 0;
    if (!temCriterio) return [];

    let filtrados = jogadores.filter(j => {
      if (filtrosPosicao.length > 0) {
        const posJ = (j.Posição || '').trim().toUpperCase();
        if (!filtrosPosicao.includes(posJ)) return false;
      }
      if (busca && !(j.Jogador || '').toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroTime !== 'todos' && (j.Time || j.Equipe) !== filtroTime) return false;
      const idade = safeParseFloat(j.Idade);
      if (idade < filtroIdade.min || idade > filtroIdade.max) {
        if (idade === 0 && filtroIdade.min > 15) return false;
      }
      if (safeParseFloat(j['Minutos jogados']) < filtroMinutagem) return false;
      
      return true;
    });

    return filtrados.sort((a, b) => {
      const col = ordenacao.coluna;
      const dir = ordenacao.direcao;

      if (['Jogador', 'Time', 'Equipe', 'Posição'].includes(col)) {
        const valA = String(a[col] || '').toLowerCase();
        const valB = String(b[col] || '').toLowerCase();
        return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      const numA = safeParseFloat(a[col]);
      const numB = safeParseFloat(b[col]);
      return dir === 'asc' ? numA - numB : numB - numA;
    });
  }, [jogadores, busca, filtroTime, filtrosPosicao, filtroIdade, filtroMinutagem, ordenacao, jogadorReferencia, jogadoresSimilares]);

  const times = useMemo(() => {
    const uniqueTimes = new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean));
    return ['todos', ...Array.from(uniqueTimes).sort()];
  }, [jogadores]);

  const posicoes = useMemo(() => {
    const uniquePos = new Set(jogadores.map(j => (j.Posição || '').trim().toUpperCase()).filter(Boolean));
    return Array.from(uniquePos).sort();
  }, [jogadores]);

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text('RELATÓRIO TÉCNICO - NOVORIZONTINO', 14, 20);
    const head = [['Jogador', 'Time', 'Posição', ...metricasSelecionadas]];
    const body = listaParaExibir.map(j => [
      j.Jogador, 
      j.Time || j.Equipe, 
      j.Posição, 
      ...metricasSelecionadas.map(m => j[m] || '0')
    ]);
    doc.autoTable({ head, body, startY: 30, theme: 'grid', styles: { fontSize: 7 } });
    doc.save('relatorio-novorizontino.pdf');
  };

  const exportComparisonPDF = async () => {
    try {
      if (!comparisonModal.player1 || !comparisonModal.player2) {
        alert('Selecione dois atletas para comparar');
        return;
      }

      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const p1 = comparisonModal.player1;
      const p2 = comparisonModal.player2;
      const doc = new jsPDF();

      const AMARELO = [251, 191, 36];
      const PRETO = [10, 12, 16];
      const BRANCO = [255, 255, 255];
      const CINZA_CLARO = [240, 240, 240];
      const VERDE_VITORIA = [220, 255, 220];

      doc.setFillColor(...AMARELO);
      doc.rect(10, 10, 190, 25, 'F');
      doc.setTextColor(...PRETO);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('COMPARAÇÃO DE ATLETAS', doc.internal.pageSize.getWidth() / 2, 26, { align: 'center' });

      doc.setTextColor(...PRETO);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`${p1.Jogador} (${p1.Posição})`, 15, 45);
      doc.text(`${p2.Jogador} (${p2.Posição})`, 15, 52);

      const metricas = Object.keys(p1).filter(k => 
        !['Jogador', 'Time', 'Posição', 'Idade', 'Altura', 'Nacionalidade', 'Minutos jogados', 'historicoIndex'].includes(k)
      );

      const bodyData = [];
      metricas.forEach(metrica => {
        const val1 = safeParseFloat(p1[metrica]);
        const val2 = safeParseFloat(p2[metrica]);
        bodyData.push([metrica, val1.toFixed(2), val2.toFixed(2)]);
      });

      doc.autoTable({
        startY: 65,
        head: [['MÉTRICA', p1.Jogador.toUpperCase(), p2.Jogador.toUpperCase()]],
        body: bodyData,
        theme: 'grid',
        headStyles: { 
          fillColor: PRETO, 
          textColor: AMARELO, 
          fontStyle: 'bold', 
          halign: 'center' 
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            const metrica = data.row.raw[0];
            const val1 = parseFloat(data.row.raw[1]);
            const val2 = parseFloat(data.row.raw[2]);
            const isPositive = !['Falta', 'Erro', 'Cartão', 'Bola perdida'].some(w => metrica.toLowerCase().includes(w.toLowerCase()));

            if (data.column.index === 1 && (isPositive ? val1 > val2 : val1 < val2)) {
              doc.setFillColor(...VERDE_VITORIA);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            }
            if (data.column.index === 2 && (isPositive ? val2 > val1 : val2 < val1)) {
              doc.setFillColor(...VERDE_VITORIA);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            }
            doc.setTextColor(...PRETO);
            doc.text(data.cell.text, data.cell.x + 2, data.cell.y + data.cell.height / 2, { verticalAlign: 'middle' });
          }
        }
      });

      let finalY = doc.lastAutoTable.finalY + 15;
      if (finalY > 270) { doc.addPage(); finalY = 20; }

      doc.setTextColor(...PRETO);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('VEREDITO TÉCNICO', 15, finalY);
      finalY += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      let p1WinsCount = 0;
      metricas.forEach(metrica => {
          const val1 = safeParseFloat(p1[metrica]);
          const val2 = safeParseFloat(p2[metrica]);
          const isPositive = !['Falta', 'Erro', 'Cartão', 'Bola perdida'].some(w => metrica.toLowerCase().includes(w.toLowerCase()));
          if (isPositive ? val1 > val2 : val1 < val2) p1WinsCount++;
      });
      const p2WinsCount = metricas.length - p1WinsCount;

      let veredito = '';
      if (p1WinsCount > p2WinsCount) {
        veredito = `${p1.Jogador} apresenta vantagem na análise, superando ${p2.Jogador} em ${p1WinsCount} das ${metricas.length} métricas.`;
      } else if (p2WinsCount > p1WinsCount) {
        veredito = `${p2.Jogador} apresenta vantagem na análise, superando ${p1.Jogador} em ${p2WinsCount} das ${metricas.length} métricas.`;
      } else {
        veredito = 'Ambos os jogadores demonstram um perfil de desempenho muito equilibrado, com equivalência no número de vitórias em métricas.';
      }
      doc.text(veredito, 15, finalY, { maxWidth: 180 });

      doc.save(`comparacao-${p1.Jogador}-vs-${p2.Jogador}.pdf`);

    } catch (error) {
      console.error('Erro detalhado ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
    }
  };

  if (carregando) return (
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
                Central de <span className="text-brand-yellow">Dados</span>
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
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white placeholder:text-slate-700 transition-all"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Posição</label>
              <select value={filtrosPosicao[0] || ''} onChange={e => setFiltrosPosicao(e.target.value ? [e.target.value] : [])} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white appearance-none cursor-pointer">
                <option value="">TODAS AS POSIÇÕES</option>
                {posicoes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Minutos: <span className="text-brand-yellow">{filtroMinutagem}min</span></label>
              <input type="range" min="0" max="3000" step="90" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value))} className="w-full accent-brand-yellow mt-3" />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Clube</label>
              <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white appearance-none cursor-pointer">
                <option value="todos">TODOS OS CLUBES</option>
                {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Idade Mín</label>
              <input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({ ...filtroIdade, min: parseInt(e.target.value) || 0 })} placeholder="Ex: 18" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white placeholder:text-slate-700 transition-all" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">Idade Máx</label>
              <input type="number" value={filtroIdade.max} onChange={e => setFiltroIdade({ ...filtroIdade, max: parseInt(e.target.value) || 0 })} placeholder="Ex: 30" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-black uppercase outline-none focus:border-brand-yellow/50 text-white placeholder:text-slate-700 transition-all" />
            </div>
          </div>
        </div>

        {/* TABELA DE DADOS */}
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => handleOrdenacao('Jogador')}>Atleta</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => handleOrdenacao('Time')}>Time</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => handleOrdenacao('Posição')}>Posição</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => handleOrdenacao('Idade')}>Idade</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => handleOrdenacao('Minutos jogados')}>Minutos</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-brand-yellow uppercase tracking-widest cursor-pointer hover:bg-slate-800/50" onClick={() => handleOrdenacao('Index')}>Index</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-brand-yellow uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {listaParaExibir.map((jogador, idx) => (
                  <tr key={jogador.Jogador} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-black text-white">{idx + 1}. {jogador.Jogador}</td>
                    <td className="px-6 py-4 text-[11px] text-slate-400">{jogador.Time}</td>
                    <td className="px-6 py-4 text-[11px] text-slate-400">{jogador.Posição}</td>
                    <td className="px-6 py-4 text-[11px] text-slate-400">{jogador.Idade}</td>
                    <td className="px-6 py-4 text-[11px] text-slate-400">{jogador['Minutos jogados']}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1 bg-brand-yellow/20 border border-brand-yellow/50 rounded-lg text-[11px] font-black text-brand-yellow">
                        {jogador.Index}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setComparisonModal({ open: true, player1: jogador, player2: null })} className="p-2 bg-slate-800 hover:bg-brand-yellow/20 rounded-lg transition-all text-sm" title="Comparar">⚔️</button>
                        <button onClick={() => encontrarSimilares(jogador)} className="p-2 bg-slate-800 hover:bg-brand-yellow/20 rounded-lg transition-all text-sm" title="Similares">🔍</button>
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
            <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 relative">
              <button onClick={() => setComparisonModal({ open: false, player1: null, player2: null })} className="absolute top-4 right-4 text-slate-500 hover:text-brand-yellow transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-3xl font-black uppercase text-brand-yellow mb-6">Comparar Atletas</h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Player 1 Info */}
                <div className="bg-slate-950/30 p-8 rounded-2xl border border-slate-800/50">
                  <h4 className="text-white font-black uppercase mb-4 text-lg">{comparisonModal.player1.Jogador}</h4>
                  <p className="text-slate-400"><strong className="text-slate-300">Posição:</strong> {comparisonModal.player1.Posição}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Time:</strong> {comparisonModal.player1.Time}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Idade:</strong> {comparisonModal.player1.Idade}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Minutos:</strong> {comparisonModal.player1['Minutos jogados']}</p>
                  <button onClick={() => setComparisonModal({ ...comparisonModal, player1: null })} className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase transition-all">
                    Trocar Atleta
                  </button>
                </div>

                {/* Player 2 Selector / Info */}
                {!comparisonModal.player2 ? (
                  <div className="bg-slate-950/30 p-8 rounded-2xl border border-slate-800/50 lg:col-span-2 flex flex-col justify-center items-center">
                    <p className="text-slate-400 mb-4">Selecione um segundo atleta para comparar:</p>
                    <input 
                      type="text" 
                      placeholder="BUSCAR ATLETA..." 
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-yellow"
                      onChange={(e) => setBusca(e.target.value)} 
                      value={busca}
                    />
                    <div className="mt-4 w-full max-h-48 overflow-y-auto">
                      {listaParaExibir.filter(a => a.Jogador !== comparisonModal.player1.Jogador).map(atleta => (
                        <div 
                          key={atleta.Jogador} 
                          className="flex justify-between items-center p-2 hover:bg-slate-800 cursor-pointer rounded-md"
                          onClick={() => setComparisonModal({ ...comparisonModal, player2: atleta })}
                        >
                          <span className="text-white text-sm">{atleta.Jogador} ({atleta.Time})</span>
                          <span className="text-brand-yellow text-xs font-bold">{atleta.Index}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/30 p-8 rounded-2xl border border-slate-800/50">
                    <h4 className="text-white font-black uppercase mb-4 text-lg">{comparisonModal.player2.Jogador}</h4>
                    <p className="text-slate-400"><strong className="text-slate-300">Posição:</strong> {comparisonModal.player2.Posição}</p>
                    <p className="text-slate-400"><strong className="text-slate-300">Time:</strong> {comparisonModal.player2.Time}</p>
                    <p className="text-slate-400"><strong className="text-slate-300">Idade:</strong> {comparisonModal.player2.Idade}</p>
                    <p className="text-slate-400"><strong className="text-slate-300">Minutos:</strong> {comparisonModal.player2['Minutos jogados']}</p>
                    <button onClick={() => setComparisonModal({ ...comparisonModal, player2: null })} className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase transition-all">
                      Trocar Atleta
                    </button>
                  </div>
                )}

                {comparisonModal.player1 && comparisonModal.player2 && (
                  <div className="flex items-center justify-center">
                    <button onClick={exportComparisonPDF} className="px-8 py-4 bg-brand-yellow text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all shadow-lg hover:shadow-brand-yellow/20">
                      📄 Exportar Comparativo PDF
                    </button>
                  </div>
                )}
              </div>

              {comparisonModal.player2 && (
                <div className="bg-slate-950/30 p-8 rounded-2xl border border-slate-800/50">
                  <h4 className="text-brand-yellow font-black uppercase mb-6 text-lg">Análise Completa de Métricas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(comparisonModal.player1)
                      .filter(key => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'historicoIndex'].includes(key))
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

        {/* MODAL DE SIMILARIDADE */}
        {jogadorReferencia && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 relative">
              <button onClick={() => setJogadorReferencia(null)} className="absolute top-4 right-4 text-slate-500 hover:text-brand-yellow transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-3xl font-black uppercase text-brand-yellow mb-6">Atletas Similares a <span className="text-white">{jogadorReferencia.Jogador}</span></h3>
              
              <div className="space-y-4">
                {jogadoresSimilares.map(atleta => (
                  <div key={atleta.Jogador} className="flex items-center justify-between bg-slate-950/30 p-4 rounded-xl border border-slate-800/50">
                    <div>
                      <p className="text-white font-bold">{atleta.Jogador} ({atleta.Time})</p>
                      <p className="text-slate-400 text-sm">{atleta.Posição} - {atleta.Idade} anos</p>
                    </div>
                    <span className="px-3 py-1 bg-brand-yellow/20 border border-brand-yellow/50 rounded-lg text-[11px] font-black text-brand-yellow">
                      {atleta.scoreSimilaridade}% Similar
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
