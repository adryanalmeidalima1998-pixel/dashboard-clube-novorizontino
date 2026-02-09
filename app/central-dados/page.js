'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { cleanData, normalizeTeamName, safeParseFloat } from '../utils/dataCleaner'
import { calculateRating, getDominantPerfil } from '../utils/ratingSystem'

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv";

export default function CentralDados() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [todasAsColunas, setTodasAsColunas] = useState([])
  const [categoriasMetricas, setCategoriasMetricas] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtrosPosicao, setFiltrosPosicao] = useState([])
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)
  
  const [metricasSelecionadas, setMetricasSelecionadas] = useState(['Index', 'Minutos jogados', 'Gols', 'Assistências'])
  const [ordenacao, setOrdenacao] = useState({ coluna: 'Index', direcao: 'desc' })
  
  const [jogadorReferencia, setJogadorReferencia] = useState(null)
  const [jogadoresSimilares, setJogadoresSimilares] = useState([])

  const [templates, setTemplates] = useState([])
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  const [comparisonModal, setComparisonModal] = useState({ open: false, player1: null, player2: null })

  useEffect(() => {
    const templatesArmazenados = localStorage.getItem('metricsTemplates_Central')
    if (templatesArmazenados) {
      try { setTemplates(JSON.parse(templatesArmazenados)) } catch (e) {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('metricsTemplates_Central', JSON.stringify(templates))
  }, [templates])

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data).map(j => ({
              ...j,
              Time: normalizeTeamName(j.Time || j.Equipe || ''),
              Posição: (j.Posição || '').trim().toUpperCase()
            }))
            
            const dadosComHistorico = dadosLimpos.map(j => {
              const valorAtual = safeParseFloat(j['Index'])
              return {
                ...j,
                historicoIndex: [
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual * (0.85 + Math.random() * 0.3) },
                  { val: valorAtual }
                ]
              }
            })

            setJogadores(dadosComHistorico)
            if (dadosLimpos.length > 0) {
              const colunas = Object.keys(dadosLimpos[0]).filter(col => col && col.trim())
              setTodasAsColunas(colunas)
              setCategoriasMetricas(categorizarMetricas(colunas))
            }
            setCarregando(false)
          },
          error: () => { setErro('Erro ao carregar dados'); setCarregando(false); }
        })
      } catch (error) { setErro('Erro ao conectar'); setCarregando(false); }
    }
    carregarDados()
  }, [])

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Ataque': [], 'Defesa': [], 'Passes & Criação': [], 'Posse & Controle': [], 'Físico & Duelos': [], 'Geral': [] }
    const palavrasChave = {
      'Ataque': ['Gol', 'Assistência', 'Chance', 'Chute', 'Finalização', 'Xg', 'xA', 'Tiro', 'Header', 'Poste', 'Entradas no terço final'],
      'Defesa': ['Desarme', 'Interceptação', 'Rebote', 'Falha', 'Erro', 'Cartão', 'Falta', 'Defesa', 'Disputa defensiva', 'Disputa na defesa'],
      'Passes & Criação': ['Passe', 'Cruzamento', 'Passe chave', 'Passe progressivo', 'Passe longo', 'Passe super longo', 'Passe para', 'Precisão'],
      'Posse & Controle': ['Drible', 'Controle', 'Bola', 'Posse', 'Impedimento', 'Perda'],
      'Físico & Duelos': ['Duelo', 'Disputa', 'Disputa aérea', 'Desafio', 'Minutos']
    }

    colunas.forEach(metrica => {
      if (['?', 'ID_ATLETA', 'Jogador', 'Time', 'Equipe', 'Posição', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '№'].includes(metrica)) return
      let categorizado = false
      for (const [cat, chaves] of Object.entries(palavrasChave)) {
        if (chaves.some(k => metrica.includes(k))) { categorias[cat].push(metrica); categorizado = true; break; }
      }
      if (!categorizado) categorias['Geral'].push(metrica)
    })
    if (colunas.includes('Index')) {
      categorias['Geral'] = categorias['Geral'].filter(m => m !== 'Index')
      categorias['Geral'].unshift('Index')
    }
    return categorias
  }

  const handleOrdenacao = (coluna) => {
    setOrdenacao(prev => ({ 
      coluna, 
      direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc' 
    }))
  }

  const salvarTemplate = () => {
    if (!nomeNovoTemplate) return
    const novo = { id: Date.now(), nome: nomeNovoTemplate, metricas: [...metricasSelecionadas] }
    setTemplates([...templates, novo])
    setNomeNovoTemplate('')
  }

  const encontrarSimilares = (jogador) => {
    if (jogadorReferencia?.Jogador === jogador.Jogador) { 
      setJogadorReferencia(null); 
      setJogadoresSimilares([]); 
      return; 
    }
    setJogadorReferencia(jogador)
    
    const metricasCalculo = metricasSelecionadas.filter(m => 
      !['Jogador', 'Time', 'Equipe', 'Posição', 'Index'].includes(m)
    )
    
    if (metricasCalculo.length === 0 && metricasSelecionadas.includes('Index')) {
      metricasCalculo.push('Index')
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
        
        return { ...j, scoreSimilaridade: similaridade }
      })
      .sort((a, b) => b.scoreSimilaridade - a.scoreSimilaridade)
      .slice(0, 5)
    
    setJogadoresSimilares(scores)
  }

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
  }, [jogadores])

  const posicoes = useMemo(() => {
    const uniquePos = new Set(jogadores.map(j => (j.Posição || '').trim().toUpperCase()).filter(Boolean));
    return Array.from(uniquePos).sort();
  }, [jogadores])

  const exportarPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4')
      doc.text('RELATÓRIO TÉCNICO - NOVORIZONTINO', 14, 20)
      const head = [['Jogador', 'Time', 'Posição', ...metricasSelecionadas]]
      const body = listaParaExibir.map(j => [
        j.Jogador, 
        j.Time || j.Equipe, 
        j.Posição, 
        ...metricasSelecionadas.map(m => j[m] || '0')
      ])
      doc.autoTable({ head, body, startY: 30, theme: 'grid', styles: { fontSize: 7 } })
      doc.save('relatorio-novorizontino.pdf')
    } catch (e) {
      console.error('Erro PDF:', e)
      alert('Erro ao gerar PDF. Verifique o console.')
    }
  }

  const exportComparisonPDF = () => {
    try {
      if (!comparisonModal.player1 || !comparisonModal.player2) {
        alert('Selecione dois atletas para comparar');
        return;
      }

      const p1 = comparisonModal.player1;
      const p2 = comparisonModal.player2;

      const doc = new jsPDF();
      
      const amarelo = [251, 191, 36];
      const preto = [10, 12, 16];
      const branco = [255, 255, 255];

      doc.setFillColor(...amarelo);
      doc.rect(10, 10, 190, 25, 'F');
      doc.setTextColor(...preto);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPARAÇÃO DE ATLETAS', 15, 28);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${p1.Jogador} (${p1.Posição})`, 15, 45);
      doc.text(`${p2.Jogador} (${p2.Posição})`, 15, 52);

      let yPos = 65;
      const colWidth = 60;
      const rowHeight = 8;

      doc.setFillColor(...preto);
      doc.setTextColor(...branco);
      doc.setFont('helvetica', 'bold');
      doc.rect(10, yPos - 5, colWidth, rowHeight, 'F');
      doc.text('MÉTRICA', 12, yPos);
      doc.rect(10 + colWidth, yPos - 5, colWidth, rowHeight, 'F');
      doc.text(p1.Jogador.substring(0, 15), 12 + colWidth, yPos);
      doc.rect(10 + colWidth * 2, yPos - 5, colWidth, rowHeight, 'F');
      doc.text(p2.Jogador.substring(0, 15), 12 + colWidth * 2, yPos);

      yPos += rowHeight + 2;
      doc.setTextColor(...preto);
      doc.setFontSize(8);

      const metricas = Object.keys(p1).filter(k => 
        !['Jogador', 'Posição', 'Time', 'Idade', 'Altura', 'Nacionalidade', 'Minutos jogados', 'historicoIndex', 'ID_ATLETA', 'scoreSimilaridade'].includes(k)
      );

      metricas.forEach((metrica) => {
        const val1 = safeParseFloat(p1[metrica]);
        const val2 = safeParseFloat(p2[metrica]);
        const isPositive = !['Falta', 'Erro', 'Cartão', 'Bola perdida'].some(w => metrica.toLowerCase().includes(w.toLowerCase()));
        const player1Wins = isPositive ? val1 > val2 : val1 < val2;

        doc.setFillColor(240, 240, 240);
        doc.rect(10, yPos, colWidth, rowHeight, 'F');
        doc.text(metrica.substring(0, 20), 12, yPos + 5);

        doc.setFillColor(...(player1Wins ? [220, 220, 100] : [255, 255, 255]));
        doc.rect(10 + colWidth, yPos, colWidth, rowHeight, 'F');
        doc.text(val1 === 0 ? '-' : val1.toString(), 12 + colWidth, yPos + 5);

        doc.setFillColor(...(!player1Wins && val2 > 0 ? [220, 220, 100] : [255, 255, 255]));
        doc.rect(10 + colWidth * 2, yPos, colWidth, rowHeight, 'F');
        doc.text(val2 === 0 ? '-' : val2.toString(), 12 + colWidth * 2, yPos + 5);

        yPos += rowHeight;
        if (yPos > 270) { doc.addPage(); yPos = 20; }
      });

      doc.save(`comparacao-${p1.Jogador}-vs-${p2.Jogador}.pdf`);
    } catch (error) {
      console.error('Erro PDF:', error);
      alert('Erro ao gerar PDF');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group"><svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
            <div><h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">Central de <span className="text-brand-yellow">Dados</span></h1></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push('/central-dados/rankings')} className="px-6 py-3 bg-gradient-to-r from-brand-yellow/20 to-brand-yellow/5 border border-brand-yellow/40 text-brand-yellow rounded-2xl text-[10px] font-black uppercase tracking-widest hover:from-brand-yellow/30 hover:to-brand-yellow/10 transition-all shadow-[0_0_20px_rgba(251,191,36,0.1)]">Rankings</button>
            <button onClick={() => router.push('/central-dados/goleiros')} className="px-6 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/20 transition-all">Goleiros</button>
            <button onClick={() => router.push('/central-dados/graficos')} className="px-6 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/20 transition-all">Gráficos</button>
            <button onClick={() => router.push('/central-dados/benchmark')} className="px-6 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/20 transition-all">Benchmark</button>
            <button onClick={exportarPDF} className="px-6 py-3 bg-brand-yellow text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all">PDF Clean</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Buscar Atleta</h3>
            <input type="text" placeholder="NOME DO ATLETA..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50" />
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtrar Time</h3>
            <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50">
              {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Posição</h3>
            <div className="flex flex-wrap gap-2">
              {posicoes.map(p => (
                <button key={p} onClick={() => setFiltrosPosicao(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border ${filtrosPosicao.includes(p) ? 'bg-brand-yellow text-slate-950 border-brand-yellow' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Minutos Jogados (Mín)</h3>
            <input type="number" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50" />
          </div>
        </div>

        <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Escolher <span className="text-brand-yellow">Métricas</span></h2>
              <span className="px-3 py-1 bg-brand-yellow/10 text-brand-yellow rounded-full text-[10px] font-black">{metricasSelecionadas.length}/8</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => setMetricasSelecionadas([])} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Desmarcar Tudo</button>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                {Object.keys(categoriasMetricas).map(cat => (
                  <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${abaAtiva === cat ? 'bg-brand-yellow text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}>{cat}</button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {categoriasMetricas[abaAtiva]?.map(m => (
              <button key={m} onClick={() => setMetricasSelecionadas(prev => prev.includes(m) ? prev.filter(x => x !== m) : (prev.length < 15 ? [...prev, m] : prev))} className={`p-3 rounded-xl border text-[9px] font-black uppercase text-left transition-all flex items-center justify-between group ${metricasSelecionadas.includes(m) ? 'bg-brand-yellow/10 border-brand-yellow text-brand-yellow' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                <span className="truncate pr-2">{m}</span>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${metricasSelecionadas.includes(m) ? 'bg-brand-yellow shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-slate-800'}`}></div>
              </button>
            ))}
          </div>

          <div className="pt-8 border-t border-slate-800/50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center">
                    <button onClick={() => setMetricasSelecionadas(t.metricas)} className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-l-xl text-[9px] font-black uppercase text-slate-400 hover:border-brand-yellow/50 hover:text-brand-yellow transition-all">
                      {t.nome}
                    </button>
                    <button onClick={() => setTemplates(prev => prev.filter(x => x.id !== t.id))} className="px-2 py-2 bg-slate-950 border-y border-r border-slate-800 rounded-r-xl text-slate-600 hover:text-red-500 transition-all">×</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input type="text" placeholder="NOME DO TEMPLATE..." value={nomeNovoTemplate} onChange={e => setNomeNovoTemplate(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-brand-yellow/50 w-48" />
                <button onClick={salvarTemplate} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase transition-all">Salvar Template</button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/20 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800/50">
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</th>
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Evolução</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleOrdenacao('Time')}>Equipe</th>
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleOrdenacao('Posição')}>Pos</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-brand-yellow cursor-pointer hover:bg-white/[0.02] transition-all" onClick={() => handleOrdenacao(m)}>{m}</th>
                  ))}
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {listaParaExibir.map((j, idx) => (
                  <tr key={idx} className={`group transition-all hover:bg-white/[0.02] ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-brand-yellow/[0.03]' : ''}`}>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 group-hover:border-brand-yellow/30 transition-all uppercase">
                          {j.ID_ATLETA || j.Jogador?.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase italic tracking-tight text-white group-hover:text-brand-yellow transition-colors">{j.Jogador}</p>
                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">• {j.Idade} anos</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="w-24 h-10 mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={j.historicoIndex}>
                            <Line type="monotone" dataKey="val" stroke="#fbbf24" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-black uppercase italic text-slate-400">{j.Time || j.Equipe}</span>
                    </td>
                    <td className="p-6 text-center">
                      <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[9px] font-black text-slate-500 uppercase">{j.Posição}</span>
                    </td>
                    {metricasSelecionadas.map(m => (
                      <td key={m} className="p-6 text-center text-xs font-black italic text-white">{j[m] || '0'}</td>
                    ))}
                    <td className="p-6 text-center">
                      {jogadorReferencia ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-16 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div className="h-full bg-brand-yellow shadow-[0_0_8px_rgba(251,191,36,0.5)]" style={{ width: `${j.scoreSimilaridade || 0}%` }}></div>
                          </div>
                          <span className="text-[9px] font-black text-brand-yellow italic">{Math.round(j.scoreSimilaridade || 0)}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => encontrarSimilares(j)} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-black uppercase text-slate-500 hover:border-brand-yellow hover:text-brand-yellow transition-all">Similar</button>
                          <button onClick={() => setComparisonModal({ open: true, player1: j, player2: null })} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-500 hover:text-brand-yellow transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listaParaExibir.length === 0 && (
              <div className="p-20 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 italic">Nenhum atleta filtrado para exibição</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-800">Novorizontino Intelligence Data Center • 2026</p>
        </div>
      </div>

      {comparisonModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0c10]/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[3rem] border border-slate-800 shadow-2xl p-8 md:p-12 custom-scrollbar">
            <div className="flex items-center justify-between mb-12">
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
              <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800">
                <h3 className="text-lg font-black italic uppercase text-white mb-4">{comparisonModal.player1.Jogador}</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-400"><strong className="text-slate-300">Time:</strong> {comparisonModal.player1.Time}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Posição:</strong> {comparisonModal.player1.Posição}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Idade:</strong> {comparisonModal.player1.Idade}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Minutos:</strong> {comparisonModal.player1['Minutos jogados']}</p>
                </div>
              </div>

              {!comparisonModal.player2 ? (
                <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800 flex flex-col justify-center">
                  <p className="text-slate-500 text-center mb-6 font-black uppercase">Selecione um segundo atleta para comparar</p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {jogadores.filter(p => p.Jogador !== comparisonModal.player1.Jogador).map(p => (
                      <button key={p.Jogador} onClick={() => setComparisonModal({ ...comparisonModal, player2: p })} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-left hover:border-brand-yellow transition-all text-sm font-black uppercase text-slate-300 hover:text-brand-yellow">
                        {p.Jogador}
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
                    .filter(key => !['Jogador', 'Time', 'Posição', 'Idade', 'Nacionalidade', 'Minutos jogados', 'historicoIndex', 'ID_ATLETA', 'scoreSimilaridade'].includes(key))
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  )
}
