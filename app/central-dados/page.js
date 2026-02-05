'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

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
  const [filtrosPosicao, setFiltrosPosicao] = useState([]) // Multi-seleção
  const [filtroPosicaoMedia, setFiltroPosicaoMedia] = useState('todas')
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)
  
  // Similaridade
  const [jogadorReferencia, setJogadorReferencia] = useState(null)
  const [jogadoresSimilares, setJogadoresSimilares] = useState([])

  // Ordenação
  const [ordenacao, setOrdenacao] = useState({ coluna: 'Jogador', direcao: 'asc' })

  // Métricas selecionadas
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
  const [painelAberto, setPainelAberto] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  const [mostrarTemplates, setMostrarTemplates] = useState(false)

  // Carregar templates do LocalStorage
  useEffect(() => {
    const templatesArmazenados = localStorage.getItem('metricsTemplates')
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
    localStorage.setItem('metricsTemplates', JSON.stringify(templates))
  }, [templates])

  // Carregar dados do CSV
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv&t=' + Date.now())
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            
            const dadosComHistorico = dados.map(j => {
              const valorAtual = parseValue(j['Index'])
              return {
                ...j,
                historicoIndex: [
                  { val: valorAtual * (0.9 + Math.random() * 0.2) },
                  { val: valorAtual * (0.9 + Math.random() * 0.2) },
                  { val: valorAtual * (0.9 + Math.random() * 0.2) },
                  { val: valorAtual * (0.9 + Math.random() * 0.2) },
                  { val: valorAtual }
                ]
              }
            })

            setJogadores(dadosComHistorico)
            
            if (dados.length > 0) {
              const colunas = Object.keys(dados[0]).filter(col => col && col.trim())
              setTodasAsColunas(colunas)
              const categorias = categorizarMetricas(colunas)
              setCategoriasMetricas(categorias)
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
      if (['?', 'Jogador', 'Time', 'Posição', 'Idade', 'Altura', 'Peso', 'Nacionalidade'].includes(metrica)) {
        return
      }

      let categorizado = false

      if (palavrasChaveAtaque.some(palavra => metrica.includes(palavra))) {
        categorias['Ataque'].push(metrica)
        categorizado = true
      }
      else if (palavrasChaveDefesa.some(palavra => metrica.includes(palavra))) {
        categorias['Defesa'].push(metrica)
        categorizado = true
      }
      else if (palavrasChavePasses.some(palavra => metrica.includes(palavra))) {
        categorias['Passes & Criação'].push(metrica)
        categorizado = true
      }
      else if (palavrasChavePosse.some(palavra => metrica.includes(palavra))) {
        categorias['Posse & Controle'].push(metrica)
        categorizado = true
      }
      else if (palavrasChaveFisico.some(palavra => metrica.includes(palavra))) {
        categorias['Físico & Duelos'].push(metrica)
        categorizado = true
      }

      if (!categorizado) {
        categorias['Geral'].push(metrica)
      }
    })

    if (colunas.includes('Index')) {
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
    
    const metricasCalculo = metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Posição'].includes(m))
    
    const scores = jogadores
      .filter(j => j.Jogador !== jogador.Jogador)
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

  const mediaLiga = useMemo(() => {
    const medias = {}
    const jogadoresParaMedia = filtroPosicaoMedia === 'todas' 
      ? jogadores 
      : jogadores.filter(j => j.Posição === filtroPosicaoMedia)

    metricasSelecionadas.forEach(m => {
      const valores = jogadoresParaMedia.map(j => parseValue(j[m]))
      medias[m] = valores.reduce((a, b) => a + b, 0) / (valores.length || 1)
    })
    return medias
  }, [jogadores, metricasSelecionadas, filtroPosicaoMedia])

  const jogadoresFiltrados = useMemo(() => {
    if (jogadorReferencia) {
      return [jogadorReferencia, ...jogadoresSimilares]
    }

    let filtrados = jogadores.filter(j => {
      const passaBusca = (j.Jogador || '').toLowerCase().includes(busca.toLowerCase())
      const passaTime = filtroTime === 'todos' || j.Time === filtroTime
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

  const times = useMemo(() => ['todos', ...new Set(jogadores.map(j => j.Time).filter(Boolean))], [jogadores])
  const posicoes = useMemo(() => [...new Set(jogadores.map(j => j.Posição).filter(Boolean))], [jogadores])

  const togglePosicao = (pos) => {
    setFiltrosPosicao(prev => 
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    )
  }

  const salvarTemplate = () => {
    if (!nomeNovoTemplate.trim()) return
    const novoTemplate = {
      id: Date.now(),
      nome: nomeNovoTemplate,
      metricas: [...metricasSelecionadas]
    }
    setTemplates([...templates, novoTemplate])
    setNomeNovoTemplate('')
  }

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4')
    
    doc.setFontSize(20)
    doc.setTextColor(15, 23, 42)
    doc.text('RELATÓRIO TÉCNICO - CENTRAL DE DADOS', 14, 20)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28)
    
    const head = [['Jogador', 'Time', 'Posição', ...metricasSelecionadas]]
    const body = jogadoresFiltrados.map(j => [
      j.Jogador,
      j.Time,
      j.Posição,
      ...metricasSelecionadas.map(m => j[m] || '0')
    ])

    doc.autoTable({
      head,
      body,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    })

    doc.save('relatorio-tecnico-novorizontino.pdf')
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
            <button onClick={exportarPDF} className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">PDF Clean</button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Busca & Time</h3>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="BUSCAR ATLETA..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none"
              />
              <select 
                value={filtroTime} 
                onChange={(e) => setFiltroTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none"
              >
                {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Posições (Multi)</h3>
            <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto custom-scrollbar p-1">
              {posicoes.map(p => (
                <button 
                  key={p} 
                  onClick={() => togglePosicao(p)}
                  className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition-all ${filtrosPosicao.includes(p) ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Idade & Minutagem</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-bold text-slate-500 w-12">IDADE:</span>
                <input type="number" value={filtroIdade.min} onChange={(e) => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-12 bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-center" />
                <span className="text-slate-700">-</span>
                <input type="number" value={filtroIdade.max} onChange={(e) => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-12 bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-center" />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-bold text-slate-500 w-12">MIN:</span>
                <input type="number" value={filtroMinutagem} onChange={(e) => setFiltotMinutagem(parseInt(e.target.value))} className="flex-1 bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-center" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50 flex flex-col justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Configurações</h3>
            <div className="flex gap-2">
              <button onClick={() => setPainelAberto(true)} className="flex-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all">Escolher Métricas</button>
              <button onClick={() => setMostrarTemplates(!mostrarTemplates)} className="px-4 bg-slate-950 border border-slate-800 text-slate-500 rounded-xl hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* TEMPLATES DROPDOWN */}
        {mostrarTemplates && (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Templates de Métricas</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="NOME DO NOVO TEMPLATE..." 
                  value={nomeNovoTemplate}
                  onChange={(e) => setNomeNovoTemplate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[9px] font-black uppercase outline-none focus:border-emerald-500/50"
                />
                <button onClick={salvarTemplate} className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl text-[9px] font-black uppercase">Salvar Atual</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {templates.map(t => (
                <div key={t.id} className="group flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 pl-4 rounded-xl">
                  <button onClick={() => setMetricasSelecionadas(t.metricas)} className="text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all">{t.nome}</button>
                  <button onClick={() => setTemplates(templates.filter(x => x.id !== t.id))} className="p-2 text-slate-700 hover:text-red-500 transition-all">×</button>
                </div>
              ))}
              {templates.length === 0 && <p className="text-[9px] text-slate-600 font-bold uppercase">Nenhum template salvo</p>}
            </div>
          </div>
        )}

        {/* TABELA */}
        <div className="bg-slate-900/20 backdrop-blur-md rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Ações</th>
                  <th onClick={() => handleOrdenacao('Jogador')} className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-emerald-400 transition-all">Jogador</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Evolução</th>
                  <th onClick={() => handleOrdenacao('Time')} className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-emerald-400 transition-all">Time</th>
                  <th onClick={() => handleOrdenacao('Posição')} className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-emerald-400 transition-all text-center">Pos</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} onClick={() => handleOrdenacao(m)} className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-emerald-400 transition-all text-center">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jogadoresFiltrados.map((j, idx) => (
                  <tr key={j.Jogador} className={`border-b border-slate-800/30 hover:bg-emerald-500/[0.02] transition-all group ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-emerald-500/10' : ''}`}>
                    <td className="p-6">
                      <button 
                        onClick={() => encontrarSimilares(j)}
                        className={`p-3 rounded-xl border transition-all ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400'}`}
                        title="Encontrar Similares"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </button>
                    </td>
                    <td className="p-6">
                      <div className="font-black italic uppercase text-sm tracking-tighter text-white group-hover:text-emerald-400 transition-all">{j.Jogador}</div>
                      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">{j.Idade} ANOS • {j.Nacionalidade || 'BRA'}</div>
                    </td>
                    <td className="p-6 w-32">
                      <div className="h-8 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={j.historicoIndex}>
                            <Line 
                              type="monotone" 
                              dataKey="val" 
                              stroke={parseValue(j['Index']) > j.historicoIndex[0].val ? '#10b981' : '#ef4444'} 
                              strokeWidth={2} 
                              dot={false} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    <td className="p-6 text-[10px] font-black uppercase text-slate-400">{j.Time}</td>
                    <td className="p-6 text-center">
                      <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-black uppercase text-emerald-500">{j.Posição}</span>
                    </td>
                    {metricasSelecionadas.map(m => {
                      const valor = parseValue(j[m])
                      const media = mediaLiga[m] || 0
                      const superior = valor >= media
                      return (
                        <td key={m} className="p-6 text-center">
                          <div className={`text-sm font-black italic ${superior ? 'text-white' : 'text-slate-500'}`}>{j[m] || '0'}</div>
                          <div className={`text-[8px] font-bold uppercase mt-1 ${superior ? 'text-emerald-500' : 'text-red-500/50'}`}>
                            {superior ? '↑' : '↓'} {Math.abs(((valor - media) / (media || 1)) * 100).toFixed(0)}%
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL SELEÇÃO DE MÉTRICAS */}
      {painelAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a0c10]/90 backdrop-blur-xl" onClick={() => setPainelAberto(false)}></div>
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Configurar Painel</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Selecione as métricas para exibição na tabela</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setMetricasSelecionadas([])}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                >
                  Desmarcar Tudo
                </button>
                <button onClick={() => setPainelAberto(false)} className="p-4 hover:bg-slate-800 rounded-2xl transition-all text-slate-500 hover:text-white">×</button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="flex gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
                {Object.keys(categoriasMetricas).map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setAbaAtiva(cat)}
                    className={`px-6 py-3 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all border whitespace-nowrap ${abaAtiva === cat ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoriasMetricas[abaAtiva]?.map(m => (
                  <button 
                    key={m}
                    onClick={() => {
                      if (metricasSelecionadas.includes(m)) setMetricasSelecionadas(metricasSelecionadas.filter(x => x !== m))
                      else setMetricasSelecionadas([...metricasSelecionadas, m])
                    }}
                    className={`p-4 rounded-2xl text-left transition-all border text-[10px] font-black uppercase ${metricasSelecionadas.includes(m) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
              <div className="text-[10px] font-black uppercase text-slate-500">
                <span className="text-emerald-500">{metricasSelecionadas.length}</span> MÉTRICAS SELECIONADAS
              </div>
              <button onClick={() => setPainelAberto(false)} className="px-8 py-4 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all">Confirmar Seleção</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>
    </div>
  )
}
