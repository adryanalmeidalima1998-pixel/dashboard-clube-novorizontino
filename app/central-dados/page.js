'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

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
  const [filtroPosicao, setFiltroPosicao] = useState('todas')
  const [filtroPosicaoMedia, setFiltroPosicaoMedia] = useState('todas') // NOVO: Filtro para a média da liga
  
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
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv')
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            setJogadores(dados)
            
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

  const mediaLiga = useMemo(() => {
    const medias = {}
    // Filtrar jogadores para o cálculo da média baseado no novo filtro de posição
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
    let filtrados = jogadores.filter(j => {
      const passaBusca = (j.Jogador || '').toLowerCase().includes(busca.toLowerCase())
      const passaTime = filtroTime === 'todos' || j.Time === filtroTime
      const passaPosicao = filtroPosicao === 'todas' || j.Posição === filtroPosicao
      return passaBusca && passaTime && passaPosicao
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
  }, [jogadores, busca, filtroTime, filtroPosicao, ordenacao])

  const exportarCSV = () => {
    const headers = ['Jogador', 'Time', 'Posição', ...metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Posição'].includes(m))]
    const rows = jogadoresFiltrados.map(j => headers.map(h => j[h] || '-').join(','))
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "central_de_dados.csv")
    document.body.appendChild(link)
    link.click()
  }

  const toggleMetrica = (metrica) => {
    if (['Jogador', 'Time', 'Posição'].includes(metrica)) return
    if (metricasSelecionadas.includes(metrica)) {
      setMetricasSelecionadas(metricasSelecionadas.filter(m => m !== metrica))
    } else {
      setMetricasSelecionadas([...metricasSelecionadas, metrica])
    }
  }

  const selecionarCategoria = (categoria) => {
    const metricasCategoria = categoriasMetricas[categoria] || []
    const novasMetricas = [...new Set([...metricasSelecionadas, ...metricasCategoria])]
    setMetricasSelecionadas(novasMetricas)
  }

  const deselecionarCategoria = (categoria) => {
    const metricasCategoria = categoriasMetricas[categoria] || []
    const novasMetricas = metricasSelecionadas.filter(m => !metricasCategoria.includes(m))
    setMetricasSelecionadas(novasMetricas)
  }

  const selecionarTodas = () => {
    const todasExcetoBasicas = todasAsColunas.filter(c => !['?', 'Jogador', 'Time', 'Posição', 'Idade', 'Altura', 'Peso', 'Nacionalidade'].includes(c))
    setMetricasSelecionadas(todasExcetoBasicas)
  }

  const limparTodas = () => {
    setMetricasSelecionadas(['Index', 'Minutos jogados', 'Gols'])
  }

  // FUNÇÕES DE TEMPLATES
  const salvarTemplate = () => {
    if (!nomeNovoTemplate.trim()) {
      alert('Digite um nome para o template')
      return
    }

    const novoTemplate = {
      id: Date.now(),
      nome: nomeNovoTemplate,
      metricas: metricasSelecionadas
    }

    setTemplates([...templates, novoTemplate])
    setNomeNovoTemplate('')
    alert(`Template "${nomeNovoTemplate}" salvo com sucesso!`)
  }

  const carregarTemplate = (template) => {
    setMetricasSelecionadas(template.metricas)
    setMostrarTemplates(false)
  }

  const excluirTemplate = (id) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      setTemplates(templates.filter(t => t.id !== id))
    }
  }

  const times = [...new Set(jogadores.map(j => j.Time))].filter(Boolean).sort()
  const posicoes = [...new Set(jogadores.map(j => j.Posição))].filter(Boolean).sort()

  if (carregando) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <span className="text-slate-400 font-black tracking-widest uppercase text-xs animate-pulse italic">Sincronizando Big Data...</span>
      </div>
    </div>
  )

  if (erro) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center bg-slate-900/50 p-12 rounded-[3rem] border border-red-500/20">
        <div className="text-red-500 text-5xl mb-6">⚠️</div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Erro de Conexão</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{erro}</p>
        <button onClick={() => window.location.reload()} className="mt-8 px-8 py-4 bg-red-500 text-white font-black italic uppercase text-xs rounded-2xl hover:bg-red-600 transition-all">Tentar Novamente</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                Central de <span className="text-emerald-500">Dados</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Inteligência de Performance e Scouting</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push('/central-dados/graficos')} className="px-6 py-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all flex items-center gap-3 group">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Gráficos</span>
            </button>
            <button onClick={() => router.push('/central-dados/benchmark')} className="px-6 py-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all flex items-center gap-3 group">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Benchmark</span>
            </button>
            <button onClick={exportarCSV} className="px-6 py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black italic uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              Exportar CSV
            </button>
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="lg:col-span-1 relative group">
            <input 
              type="text" 
              placeholder="BUSCAR ATLETA..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all"
            />
            <svg className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)} className="bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all">
            <option value="todos">TODOS OS TIMES</option>
            {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>

          <select value={filtroPosicao} onChange={(e) => setFiltroPosicao(e.target.value)} className="bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all">
            <option value="todas">TODAS AS POSIÇÕES</option>
            {posicoes.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>

          {/* NOVO: Filtro de Posição para Média da Liga */}
          <div className="lg:col-span-1 flex flex-col">
            <select 
              value={filtroPosicaoMedia} 
              onChange={(e) => setFiltroPosicaoMedia(e.target.value)} 
              className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500 transition-all"
            >
              <option value="todas">MÉDIA: TODAS POSIÇÕES</option>
              {posicoes.map(p => <option key={p} value={p}>MÉDIA: {p.toUpperCase()}</option>)}
            </select>
          </div>

          <button 
            onClick={() => setPainelAberto(!painelAberto)}
            className={`px-6 py-4 rounded-2xl border font-black italic uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 ${painelAberto ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            Configurar Métricas
          </button>
        </div>

        {/* PAINEL DE CONFIGURAÇÃO DE MÉTRICAS */}
        {painelAberto && (
          <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-slate-800/50 mb-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {Object.keys(categoriasMetricas).map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setAbaAtiva(cat)}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${abaAtiva === cat ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                  {categoriasMetricas[abaAtiva]?.map(metrica => (
                    <button
                      key={metrica}
                      onClick={() => toggleMetrica(metrica)}
                      className={`p-4 rounded-2xl text-left border transition-all flex items-center justify-between group ${metricasSelecionadas.includes(metrica) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700'}`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-tighter leading-tight">{metrica}</span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${metricasSelecionadas.includes(metrica) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-800 group-hover:border-slate-600'}`}>
                        {metricasSelecionadas.includes(metrica) && <svg className="w-2 h-2 text-slate-950" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-slate-800/50">
                  <button onClick={() => selecionarCategoria(abaAtiva)} className="text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">Selecionar Categoria</button>
                  <button onClick={() => deselecionarCategoria(abaAtiva)} className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors">Limpar Categoria</button>
                  <button onClick={selecionarTodas} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Selecionar Todas</button>
                  <button onClick={limparTodas} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Resetar Padrão</button>
                </div>
              </div>

              <div className="lg:w-80 bg-slate-950 rounded-3xl p-6 border border-slate-800">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Templates Salvos</h3>
                <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {templates.length === 0 ? (
                    <p className="text-[9px] text-slate-700 font-bold uppercase italic">Nenhum template salvo</p>
                  ) : (
                    templates.map(t => (
                      <div key={t.id} className="flex items-center gap-2 group">
                        <button onClick={() => carregarTemplate(t)} className="flex-grow text-left p-3 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-all">{t.nome}</button>
                        <button onClick={() => excluirTemplate(t.id)} className="p-3 text-red-500/30 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="NOME DO TEMPLATE..." 
                    value={nomeNovoTemplate}
                    onChange={(e) => setNomeNovoTemplate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-widest focus:outline-none focus:border-emerald-500/50"
                  />
                  <button onClick={salvarTemplate} className="w-full py-3 bg-emerald-500 text-slate-950 rounded-xl font-black italic uppercase text-[9px] tracking-widest hover:bg-emerald-400 transition-all">Salvar Atual</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABELA DE DADOS */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-800/50 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800">
                  <th className="p-6 text-left sticky left-0 bg-[#0d1117] z-10">
                    <button onClick={() => handleOrdenacao('Jogador')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-emerald-500 transition-colors">
                      ATLETA {ordenacao.coluna === 'Jogador' && (ordenacao.direcao === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="p-6 text-left">
                    <button onClick={() => handleOrdenacao('Time')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-emerald-500 transition-colors">
                      TIME {ordenacao.coluna === 'Time' && (ordenacao.direcao === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="p-6 text-left">
                    <button onClick={() => handleOrdenacao('Posição')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-emerald-500 transition-colors">
                      POS {ordenacao.coluna === 'Posição' && (ordenacao.direcao === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} className="p-6 text-center">
                      <button onClick={() => handleOrdenacao(m)} className="flex flex-col items-center gap-1 mx-auto group">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-emerald-500 transition-colors">{m}</span>
                        <span className="text-[8px] text-slate-700 font-bold">{ordenacao.coluna === m && (ordenacao.direcao === 'asc' ? 'ASC' : 'DESC')}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jogadoresFiltrados.map((j, idx) => (
                  <tr key={idx} className="border-b border-slate-800/30 hover:bg-emerald-500/[0.02] transition-colors group">
                    <td className="p-6 sticky left-0 bg-[#0d1117] z-10 group-hover:bg-[#121821] transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-black italic uppercase tracking-tighter text-white group-hover:text-emerald-400 transition-colors">{j.Jogador}</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{j.Nacionalidade || 'BRASIL'}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{j.Time}</span>
                    </td>
                    <td className="p-6">
                      <span className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-black text-emerald-500 uppercase tracking-widest">{j.Posição}</span>
                    </td>
                    {metricasSelecionadas.map(m => {
                      const val = parseValue(j[m])
                      const media = mediaLiga[m] || 0
                      const diff = media === 0 ? 0 : ((val - media) / media) * 100
                      const isPositive = diff >= 0
                      
                      return (
                        <td key={m} className="p-6 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-black italic text-white">{typeof j[m] === 'string' && j[m].includes('%') ? j[m] : val.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                            <div className="flex items-center gap-1">
                              <div className={`w-1 h-1 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                              <span className={`text-[8px] font-black ${isPositive ? 'text-emerald-500/50' : 'text-red-500/50'}`}>
                                {isPositive ? '+' : ''}{diff.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {jogadoresFiltrados.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-slate-600 font-black italic uppercase tracking-[0.3em]">Nenhum atleta encontrado nos critérios</p>
            </div>
          )}

          <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Exibindo {jogadoresFiltrados.length} de {jogadores.length} atletas</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Base de Dados Sincronizada</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
