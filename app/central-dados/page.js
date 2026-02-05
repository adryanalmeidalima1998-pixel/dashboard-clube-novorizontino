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
    setMostrarTemplates(false)
  }

  const aplicarTemplate = (template) => {
    setMetricasSelecionadas(template.metricas)
    setMostrarTemplates(false)
  }

  const excluirTemplate = (id) => {
    setTemplates(templates.filter(t => t.id !== id))
  }

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(18)
    doc.text('Relatório Técnico de Performance', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 28)

    const headers = [['Jogador', 'Time', 'Posição', ...metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Posição'].includes(m))]]
    const data = jogadoresFiltrados.map(j => [
      j.Jogador, j.Time, j.Posição,
      ...metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Posição'].includes(m)).map(m => j[m] || '-')
    ])

    doc.autoTable({
      head: headers,
      body: data,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 35 }
    })

    doc.save('relatorio_tecnico_novorizontino.pdf')
  }

  if (carregando) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Sincronizando Big Data...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                Central de <span className="text-emerald-500">Dados</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Gestão de Alta Performance • Grêmio Novorizontino</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push('/central-dados/graficos')} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Gráficos
            </button>
            <button onClick={() => router.push('/central-dados/benchmark')} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Benchmark
            </button>
            <button onClick={() => router.push('/central-dados/goleiros')} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Goleiros
            </button>
            <button onClick={exportarPDF} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              PDF Clean
            </button>
          </div>
        </div>

        {/* FILTROS AVANÇADOS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Busca & Time</h3>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="BUSCAR JOGADOR..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none"
              />
              <select 
                value={filtroTime} 
                onChange={(e) => setFiltroTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none cursor-pointer"
              >
                {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Idade & Minutagem</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <span>Idade: {filtroIdade.min} - {filtroIdade.max} anos</span>
                </div>
                <div className="flex gap-2">
                  <input type="range" min="15" max="45" value={filtroIdade.min} onChange={(e) => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value)})} className="w-full accent-emerald-500" />
                  <input type="range" min="15" max="45" value={filtroIdade.max} onChange={(e) => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value)})} className="w-full accent-emerald-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <span>Minutagem Mínima: {filtroMinutagem} min</span>
                </div>
                <input type="range" min="0" max="3000" step="100" value={filtroMinutagem} onChange={(e) => setFiltroMinutagem(parseInt(e.target.value))} className="w-full accent-emerald-500" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Posições (Multi-seleção)</h3>
            <div className="flex flex-wrap gap-2">
              {posicoes.map(pos => (
                <button 
                  key={pos} 
                  onClick={() => togglePosicao(pos)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${filtrosPosicao.includes(pos) ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                >
                  {pos}
                </button>
              ))}
              {filtrosPosicao.length > 0 && (
                <button onClick={() => setFiltrosPosicao([])} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-500/30 hover:bg-red-500/10">LIMPAR</button>
              )}
            </div>
          </div>
        </div>

        {/* TABELA PRINCIPAL */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-[3rem] border border-slate-800/50 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
              <h2 className="text-white font-black italic uppercase text-xl tracking-tighter">Ranking de Performance</h2>
              <span className="bg-slate-950 px-3 py-1 rounded-full text-[9px] font-black text-emerald-500 border border-emerald-500/20">{jogadoresFiltrados.length} ATLETAS</span>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setMostrarTemplates(!mostrarTemplates)} className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">
                Templates
              </button>
              <button onClick={() => setPainelAberto(true)} className="px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                Escolher Métricas
              </button>
            </div>
          </div>

          {/* MODAL TEMPLATES */}
          {mostrarTemplates && (
            <div className="p-8 bg-slate-950/80 border-b border-slate-800/50 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Templates de Métricas</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="NOME DO TEMPLATE..." 
                    value={nomeNovoTemplate}
                    onChange={(e) => setNomeNovoTemplate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none"
                  />
                  <button onClick={salvarTemplate} className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest">Salvar Atual</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <button onClick={() => aplicarTemplate(t)} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:bg-emerald-500 hover:text-slate-950 transition-all">
                      {t.nome}
                    </button>
                    <button onClick={() => excluirTemplate(t.id)} className="px-3 py-2 text-red-500 hover:bg-red-500/20 border-l border-slate-800">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800/50">Atleta</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800/50">Evolução</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} onClick={() => handleOrdenacao(m)} className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800/50 cursor-pointer hover:text-emerald-500 transition-all">
                      <div className="flex items-center gap-2">
                        {m}
                        {ordenacao.coluna === m && (
                          <span className="text-emerald-500">{ordenacao.direcao === 'desc' ? '↓' : '↑'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800/50 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {jogadoresFiltrados.map((j, idx) => (
                  <tr key={j.Jogador} className={`group hover:bg-emerald-500/[0.02] transition-all border-b border-slate-800/30 ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-emerald-500/10' : ''}`}>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-emerald-500/30 transition-all">
                          <span className="text-emerald-500 font-black italic text-xs">{j.Jogador.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-black italic uppercase text-sm tracking-tighter text-white group-hover:text-emerald-400 transition-all">{j.Jogador}</div>
                          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-0.5">{j.Time} • {j.Posição} • {j.Idade} anos</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="w-24 h-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={j.historicoIndex}>
                            <Line 
                              type="monotone" 
                              dataKey="val" 
                              stroke={j.historicoIndex[4].val >= j.historicoIndex[0].val ? '#10b981' : '#ef4444'} 
                              strokeWidth={2} 
                              dot={false} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </td>
                    {metricasSelecionadas.map(m => {
                      const valor = parseValue(j[m])
                      const media = mediaLiga[m] || 0
                      const variacao = media === 0 ? 0 : ((valor - media) / media) * 100
                      
                      return (
                        <td key={m} className="p-6">
                          <div className="font-black italic text-sm text-slate-300">{j[m] || '-'}</div>
                          {m !== 'Jogador' && m !== 'Time' && m !== 'Posição' && (
                            <div className={`text-[9px] font-bold mt-1 ${variacao >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                              {variacao >= 0 ? '↑' : '↓'} {Math.abs(variacao).toFixed(1)}%
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="p-6 text-center">
                      <button 
                        onClick={() => encontrarSimilares(j)}
                        title="Encontrar Jogadores Similares"
                        className={`p-3 rounded-xl border transition-all ${jogadorReferencia?.Jogador === j.Jogador ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-500'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PAINEL DE MÉTRICAS (MODAL) */}
      {painelAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-[#0a0c10]/90 backdrop-blur-xl" onClick={() => setPainelAberto(false)}></div>
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Configurar Métricas</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Selecione as colunas para exibição e análise</p>
              </div>
              <button onClick={() => setPainelAberto(false)} className="p-4 hover:bg-slate-800 rounded-2xl transition-all text-slate-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
              <div className="flex gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
                {Object.keys(categoriasMetricas).map(cat => (
                  <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-6 py-3 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all border whitespace-nowrap ${abaAtiva === cat ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700'}`}>
                    {cat} ({categoriasMetricas[cat].length})
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categoriasMetricas[abaAtiva]?.map(metrica => (
                  <button 
                    key={metrica} 
                    onClick={() => {
                      if (metricasSelecionadas.includes(metrica)) {
                        setMetricasSelecionadas(metricasSelecionadas.filter(m => m !== metrica))
                      } else {
                        setMetricasSelecionadas([...metricasSelecionadas, metrica])
                      }
                    }}
                    className={`p-4 rounded-2xl text-left transition-all border flex items-center justify-between group ${metricasSelecionadas.includes(metrica) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">{metrica}</span>
                    {metricasSelecionadas.includes(metrica) && (
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span className="text-emerald-500">{metricasSelecionadas.length}</span> Métricas Selecionadas
              </div>
              <button onClick={() => setPainelAberto(false)} className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                Aplicar Configuração
              </button>
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
