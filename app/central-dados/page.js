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
    metricasSelecionadas.forEach(m => {
      const valores = jogadores.map(j => parseValue(j[m]))
      medias[m] = valores.reduce((a, b) => a + b, 0) / (valores.length || 1)
    })
    return medias
  }, [jogadores, metricasSelecionadas])

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
      <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-3xl text-center max-w-md">
        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span className="text-lg font-black italic uppercase text-red-500">{erro}</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER ESTILO PERFORMANCE */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-12 gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                Central de <span className="text-emerald-500">Inteligência</span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Análise de Performance em Tempo Real</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button onClick={() => router.push('/central-dados/graficos')} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black italic uppercase text-xs transition-all border border-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Gráficos
            </button>
            <button onClick={() => router.push('/central-dados/benchmark')} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black italic uppercase text-xs transition-all border border-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Benchmark
            </button>
            <button onClick={() => setPainelAberto(!painelAberto)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3 rounded-2xl font-black italic uppercase text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Configurar Métricas
            </button>
            <button onClick={exportarCSV} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black italic uppercase text-xs transition-all border border-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* FILTROS RÁPIDOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="BUSCAR ATLETA..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all group-hover:bg-slate-900"
            />
            <svg className="w-5 h-5 text-slate-600 absolute right-6 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select 
            value={filtroTime}
            onChange={(e) => setFiltroTime(e.target.value)}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
          >
            <option value="todos">TODOS OS TIMES</option>
            {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
          <select 
            value={filtroPosicao}
            onChange={(e) => setFiltroPosicao(e.target.value)}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
          >
            <option value="todas">TODAS AS POSIÇÕES</option>
            {posicoes.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
        </div>

        {/* TABELA DE DADOS */}
        <div className="bg-slate-900/30 backdrop-blur-md rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800/50">
                  <th onClick={() => handleOrdenacao('Jogador')} className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest cursor-pointer hover:text-white transition-colors sticky left-0 bg-slate-950 z-10">
                    ATLETA {ordenacao.coluna === 'Jogador' && (ordenacao.direcao === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center">TIME / POS</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} onClick={() => handleOrdenacao(m)} className="p-6 font-black text-slate-500 uppercase text-[10px] tracking-widest text-center cursor-pointer hover:text-white transition-colors">
                      <div className="flex flex-col items-center gap-1">
                        {m.toUpperCase()}
                        {ordenacao.coluna === m && <span className="text-emerald-400 text-[8px]">{ordenacao.direcao === 'asc' ? '▲' : '▼'}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {jogadoresFiltrados.map((j, idx) => (
                  <tr key={idx} className="hover:bg-emerald-500/[0.02] transition-all group">
                    <td className="p-6 sticky left-0 bg-[#0d1016] z-10 group-hover:bg-slate-900/90 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 font-black italic text-slate-600 group-hover:text-emerald-500 transition-colors">
                          {j.Jogador.charAt(0)}
                        </div>
                        <div>
                          <span className="block font-black text-base text-white group-hover:text-emerald-400 transition-colors leading-tight">{j.Jogador}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{j.Nacionalidade || 'BRA'} • {j.Idade} ANOS</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{j.Time}</span>
                        <span className="bg-slate-950 px-2 py-1 rounded-lg text-[9px] font-black border border-slate-800 text-emerald-500 shadow-inner">{j.Posição}</span>
                      </div>
                    </td>
                    {metricasSelecionadas.map(m => {
                      const val = parseValue(j[m])
                      const media = mediaLiga[m]
                      const percent = (val / (media || 1)) * 100
                      const isGood = val >= media
                      return (
                        <td key={m} className="p-6">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`text-base font-black ${isGood ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {j[m] || '-'}
                            </span>
                            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-1000 ${isGood ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-red-500/30'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
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
        </div>

        {/* PAINEL DE CONFIGURAÇÃO (MODAL) */}
        {painelAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setPainelAberto(false)}></div>
            <div className="relative bg-[#0d1016] w-full max-w-5xl max-h-[90vh] rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter">Configurar <span className="text-emerald-500">Métricas</span></h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Selecione os indicadores para análise</p>
                </div>
                <button onClick={() => setPainelAberto(false)} className="p-4 bg-slate-900 hover:bg-red-500/20 rounded-2xl border border-slate-800 transition-all group">
                  <svg className="w-6 h-6 text-slate-500 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8">
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                  {Object.keys(categoriasMetricas).map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setAbaAtiva(cat)}
                      className={`px-6 py-3 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all whitespace-nowrap border ${abaAtiva === cat ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categoriasMetricas[abaAtiva]?.map(m => (
                    <button 
                      key={m}
                      onClick={() => toggleMetrica(m)}
                      className={`p-4 rounded-2xl text-left transition-all border flex items-center justify-between group ${metricasSelecionadas.includes(m) ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-tight leading-tight ${metricasSelecionadas.includes(m) ? 'text-emerald-400' : 'text-slate-500'}`}>{m}</span>
                      {metricasSelecionadas.includes(m) && <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-3">
                  <button onClick={selecionarTodas} className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">Selecionar Todas</button>
                  <button onClick={limparTodas} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors">Limpar Seleção</button>
                </div>
                <button onClick={() => setPainelAberto(false)} className="bg-emerald-500 text-slate-950 px-10 py-4 rounded-2xl font-black italic uppercase text-xs shadow-xl hover:scale-105 transition-all">Aplicar Filtros</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
