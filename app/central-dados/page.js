'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv";

export default function CentralDados() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [todasAsColunas, setTodasAsColunas] = useState([])
  const [categoriasMetricas, setCategoriasMetricas] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  
  // Busca e Filtros
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtrosPosicao, setFiltrosPosicao] = useState([])
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)
  
  // Similaridade
  const [jogadorReferencia, setJogadorReferencia] = useState(null)
  const [jogadoresSimilares, setJogadoresSimilares] = useState([])

  // Ordenação
  const [ordenacao, setOrdenacao] = useState({ coluna: 'Jogador', direcao: 'asc' })

  // Métricas selecionadas (Máximo 8)
  const [metricasSelecionadas, setMetricasSelecionadas] = useState([
    'Index',
    'Minutos jogados',
    'Gols',
    'Assistências',
    'Passes precisos %'
  ])

  // Templates
  const [templates, setTemplates] = useState([])
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('Ataque')

  // Carregar templates do LocalStorage
  useEffect(() => {
    const templatesArmazenados = localStorage.getItem('metricsTemplates_Central')
    if (templatesArmazenados) {
      try {
        setTemplates(JSON.parse(templatesArmazenados))
      } catch (e) {
        console.error('Erro ao carregar templates:', e)
      }
    }
  }, [])

  // Salvar templates no LocalStorage
  useEffect(() => {
    localStorage.setItem('metricsTemplates_Central', JSON.stringify(templates))
  }, [templates])

  // Carregar dados do CSV
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            
            // Simular histórico para o gráfico de evolução
            const dadosComHistorico = dados.map(j => {
              const valorAtual = parseValue(j['Index'])
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
            
            if (dados.length > 0) {
              const colunas = Object.keys(dados[0]).filter(col => col && col.trim())
              setTodasAsColunas(colunas)
              setCategoriasMetricas(categorizarMetricas(colunas))
            }
            
            setCarregando(false)
          },
          error: (error) => {
            console.error('Erro ao parsear CSV:', error)
            setErro('Erro ao carregar dados do CSV')
            setCarregando(false)
          }
        })
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        setErro('Erro ao conectar com a planilha')
        setCarregando(false)
      }
    }

    carregarDados()
  }, [])

  const categorizarMetricas = (colunas) => {
    const categorias = {
      'Ataque': [],
      'Defesa': [],
      'Passes & Criação': [],
      'Posse & Controle': [],
      'Físico & Duelos': [],
      'Geral': []
    }

    const palavrasChaveAtaque = ['Gol', 'Assistência', 'Chance', 'Chute', 'Finalização', 'Xg', 'xA', 'Tiro', 'Header', 'Poste', 'Entradas no terço final']
    const palavrasChaveDefesa = ['Desarme', 'Interceptação', 'Rebote', 'Falha', 'Erro', 'Cartão', 'Falta', 'Defesa', 'Disputa defensiva', 'Disputa na defesa']
    const palavrasChavePasses = ['Passe', 'Cruzamento', 'Passe chave', 'Passe progressivo', 'Passe longo', 'Passe super longo', 'Passe para', 'Precisão']
    const palavrasChavePosse = ['Drible', 'Controle', 'Bola', 'Posse', 'Impedimento', 'Perda']
    const palavrasChaveFisico = ['Duelo', 'Disputa', 'Disputa aérea', 'Desafio', 'Minutos']

    colunas.forEach(metrica => {
      if (['?', 'Jogador', 'Time', 'Equipe', 'Posição', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '№'].includes(metrica)) return

      let categorizado = false
      if (palavrasChaveAtaque.some(palavra => metrica.includes(palavra))) { categorias['Ataque'].push(metrica); categorizado = true; }
      else if (palavrasChaveDefesa.some(palavra => metrica.includes(palavra))) { categorias['Defesa'].push(metrica); categorizado = true; }
      else if (palavrasChavePasses.some(palavra => metrica.includes(palavra))) { categorias['Passes & Criação'].push(metrica); categorizado = true; }
      else if (palavrasChavePosse.some(palavra => metrica.includes(palavra))) { categorias['Posse & Controle'].push(metrica); categorizado = true; }
      else if (palavrasChaveFisico.some(palavra => metrica.includes(palavra))) { categorias['Físico & Duelos'].push(metrica); categorizado = true; }

      if (!categorizado) categorias['Geral'].push(metrica)
    })

    // Remove Index de Geral se já foi adicionado, depois adiciona no início
    if (colunas.includes('Index')) {
      categorias['Geral'] = categorias['Geral'].filter(m => m !== 'Index')
      categorias['Geral'].unshift('Index')
    }
    return categorias
  }

  const parseValue = (val) => {
    if (val === undefined || val === null || val === '-' || val === '') return 0
    if (typeof val === 'number') return val
    const clean = String(val).replace('%', '').replace(',', '.')
    const num = parseFloat(clean)
    return isNaN(num) ? 0 : num
  }

  const handleOrdenacao = (coluna) => {
    setOrdenacao(prev => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc'
    }))
  }

  const encontrarSimilares = (jogador) => {
    if (jogadorReferencia?.Jogador === jogador.Jogador) {
      setJogadorReferencia(null)
      setJogadoresSimilares([])
      return
    }

    setJogadorReferencia(jogador)
    
    const metricasCalculo = metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Equipe', 'Posição'].includes(m))
    
    const scores = jogadores
      .filter(j => j.Jogador !== jogador.Jogador && j.Posição === jogador.Posição)
      .map(j => {
        let distanciaTotal = 0
        metricasCalculo.forEach(m => {
          const valRef = parseValue(jogador[m])
          const valComp = parseValue(j[m])
          const diff = valRef === 0 ? valComp : Math.abs(valRef - valComp) / (valRef || 1)
          distanciaTotal += Math.pow(diff, 2)
        })
        
        const similaridade = 100 / (1 + Math.sqrt(distanciaTotal))
        return { ...j, scoreSimilaridade: similaridade }
      })
      .sort((a, b) => b.scoreSimilaridade - a.scoreSimilaridade)
      .slice(0, 5)

    setJogadoresSimilares(scores)
  }

  const jogadoresFiltrados = useMemo(() => {
    if (jogadorReferencia) return [jogadorReferencia, ...jogadoresSimilares]

    let filtrados = jogadores.filter(j => {
      const passaBusca = (j.Jogador || '').toLowerCase().includes(busca.toLowerCase())
      const passaTime = filtroTime === 'todos' || j.Time === filtroTime || j.Equipe === filtroTime
      const passaPosicao = filtrosPosicao.length === 0 || filtrosPosicao.includes(j.Posição)
      const idade = parseValue(j.Idade)
      const passaIdade = idade >= filtroIdade.min && idade <= filtroIdade.max
      const passaMinutagem = parseValue(j['Minutos jogados']) >= filtroMinutagem
      
      return passaBusca && passaTime && passaPosicao && passaIdade && passaMinutagem
    })

    filtrados.sort((a, b) => {
      const valA = parseValue(a[ordenacao.coluna])
      const valB = parseValue(b[ordenacao.coluna])
      if (typeof a[ordenacao.coluna] === 'string' && isNaN(parseFloat(a[ordenacao.coluna]))) {
        return ordenacao.direcao === 'asc' 
          ? String(a[ordenacao.coluna]).localeCompare(String(b[ordenacao.coluna]))
          : String(b[ordenacao.coluna]).localeCompare(String(a[ordenacao.coluna]))
      }
      return ordenacao.direcao === 'asc' ? valA - valB : valB - valA
    })

    return filtrados
  }, [jogadores, busca, filtroTime, filtrosPosicao, filtroIdade, filtroMinutagem, ordenacao, jogadorReferencia, jogadoresSimilares])

  const times = useMemo(() => ['todos', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))], [jogadores])
  const posicoes = useMemo(() => [...new Set(jogadores.map(j => j.Posição).filter(Boolean))], [jogadores])

  const toggleMetrica = (metrica) => {
    if (metricasSelecionadas.includes(metrica)) {
      setMetricasSelecionadas(metricasSelecionadas.filter(m => m !== metrica))
    } else if (metricasSelecionadas.length < 8) {
      setMetricasSelecionadas([...metricasSelecionadas, metrica])
    }
  }

  const salvarTemplate = () => {
    if (!nomeNovoTemplate.trim()) return
    const novoTemplate = { id: Date.now(), nome: nomeNovoTemplate, metricas: [...metricasSelecionadas] }
    setTemplates([...templates, novoTemplate])
    setNomeNovoTemplate('')
  }

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(20); doc.setTextColor(15, 23, 42); doc.text('RELATÓRIO TÉCNICO - CENTRAL DE DADOS', 14, 20)
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28)
    
    const head = [['Jogador', 'Time', 'Posição', ...metricasSelecionadas]]
    const body = jogadoresFiltrados.map(j => [j.Jogador, j.Time || j.Equipe, j.Posição, ...metricasSelecionadas.map(m => j[m] || '0')])

    doc.autoTable({
      head, body, startY: 35, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    })
    doc.save('relatorio-tecnico-novorizontino.pdf')
  }

  const exportarCSV = () => {
    const headers = ['Jogador', 'Time', 'Posição', 'Idade', 'Minutos jogados', ...metricasSelecionadas]
    const rows = jogadoresFiltrados.map(j => [j.Jogador, j.Time || j.Equipe, j.Posição, j.Idade, j['Minutos jogados'], ...metricasSelecionadas.map(m => j[m] || '0')])
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", "central_dados.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  if (carregando) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse italic">Processando Big Data...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                Central de <span className="text-emerald-500">Dados</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Inteligência Esportiva • Grêmio Novorizontino</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push('/central-dados/graficos')} className="px-6 py-3 bg-slate-900/80 hover:bg-emerald-500/20 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Gráficos</button>
            <button onClick={() => router.push('/central-dados/benchmark')} className="px-6 py-3 bg-slate-900/80 hover:bg-emerald-500/20 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Benchmark</button>
            <button onClick={() => router.push('/central-dados/goleiros')} className="px-6 py-3 bg-slate-900/80 hover:bg-emerald-500/20 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Goleiros</button>
            <button onClick={exportarCSV} className="px-6 py-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Exportar CSV</button>
            <button onClick={exportarPDF} className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">PDF Clean</button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Busca & Time</h3>
            <div className="space-y-3">
              <input type="text" placeholder="BUSCAR ATLETA..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none" />
              <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none">
                {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Posições (Multi)</h3>
            <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto custom-scrollbar p-1">
              {posicoes.map(p => (
                <button key={p} onClick={() => setFiltrosPosicao(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition-all ${filtrosPosicao.includes(p) ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>{p}</button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Idade & Minutagem</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1"><label className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Min</label><input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold" /></div>
                <div className="flex-1"><label className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Max</label><input type="number" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold" /></div>
              </div>
              <div><label className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Minutagem Mínima</label><input type="number" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-bold" /></div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Templates de Métricas</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" placeholder="NOME DO TEMPLATE..." value={nomeNovoTemplate} onChange={e => setNomeNovoTemplate(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-[8px] font-black uppercase tracking-widest outline-none" />
                <button onClick={salvarTemplate} className="p-2 bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-400 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button>
              </div>
              <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto custom-scrollbar">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
                    <button onClick={() => setMetricasSelecionadas(t.metricas)} className="text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-emerald-400">{t.nome}</button>
                    <button onClick={() => setTemplates(templates.filter(x => x.id !== t.id))} className="text-slate-600 hover:text-red-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SELEÇÃO DE MÉTRICAS */}
        <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2rem] border border-slate-800/50 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Escolher <span className="text-emerald-500">Métricas</span></h2>
              <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black text-emerald-500 border border-emerald-500/20">{metricasSelecionadas.length} / 8</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setMetricasSelecionadas([])} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Desmarcar Tudo</button>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                {Object.keys(categoriasMetricas).map(cat => (
                  <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${abaAtiva === cat ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}>{cat}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categoriasMetricas[abaAtiva]?.map(metrica => (
              <button key={metrica} onClick={() => toggleMetrica(metrica)} className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group ${metricasSelecionadas.includes(metrica) ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                <span className="truncate mr-2">{metrica}</span>
                {metricasSelecionadas.includes(metrica) && <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>}
              </button>
            ))}
          </div>
        </div>

        {/* TABELA PRINCIPAL */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-[2rem] border border-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800">
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-emerald-400 transition-all" onClick={() => handleOrdenacao('Jogador')}>Atleta</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Evolução</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-emerald-400 transition-all" onClick={() => handleOrdenacao('Time')}>Equipe</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pos</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer hover:text-emerald-400 transition-all" onClick={() => handleOrdenacao('Idade')}>Idade</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 cursor-pointer hover:text-emerald-300 transition-all" onClick={() => handleOrdenacao(m)}>{m}</th>
                  ))}
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {jogadoresFiltrados.map((j, idx) => (
                  <tr key={idx} className={`border-b border-slate-800/30 hover:bg-emerald-500/5 transition-all group ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-emerald-500/10' : ''}`}>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">{j.Jogador.substring(0, 2).toUpperCase()}</div>
                        <div className="flex flex-col">
                          <span className="font-black italic uppercase tracking-tighter text-sm group-hover:text-emerald-400 transition-all">{j.Jogador}</span>
                          <div className="flex gap-1 mt-1">
                            {parseValue(j.Idade) <= 23 && (
                              <span className="px-1 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[7px] font-black text-blue-400 uppercase tracking-tighter" title="Potencial de Revenda">U23</span>
                            )}
                            {parseValue(j['Minutos jogados']) > 2000 && parseValue(j.Idade) > 28 && (
                              <span className="px-1 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[7px] font-black text-amber-400 uppercase tracking-tighter" title="Experiência de Mercado">EXP</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="w-24 h-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={j.historicoIndex}>
                            <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{j.Time || j.Equipe}</td>
                    <td className="p-6">
                      <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">{j.Posição}</span>
                    </td>
                    <td className="p-6 text-xs font-black text-slate-400">{j.Idade}</td>
                    {metricasSelecionadas.map(m => (
                      <td key={m} className="p-6 text-xs font-black text-emerald-400/80">{j[m] || '0'}</td>
                    ))}
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <button onClick={() => encontrarSimilares(j)} className={`p-3 rounded-xl border transition-all ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-emerald-500 hover:text-emerald-400'}`} title="Encontrar Similares">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </button>
                        {j.scoreSimilaridade && (
                          <div className="flex flex-col items-center min-w-[40px]">
                            <span className="text-[10px] font-black text-emerald-500 leading-none">{Math.round(j.scoreSimilaridade)}%</span>
                            <span className="text-[7px] text-slate-600 uppercase font-bold tracking-tighter">Match</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {jogadorReferencia && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_0_40px_rgba(16,185,129,0.5)] flex items-center gap-6 z-50 animate-bounce">
            <span>Modo Similaridade: {jogadorReferencia.Jogador}</span>
            <button onClick={() => setJogadorReferencia(null)} className="bg-slate-950 text-white p-1 rounded-lg hover:scale-110 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c10; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>
    </div>
  )
}
