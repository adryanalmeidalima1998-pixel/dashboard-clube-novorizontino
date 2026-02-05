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
  const [filtroPosicaoMedia, setFiltroPosicaoMedia] = useState('todas')
  
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
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse italic">Sincronizando Big Data...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-10 font-sans selection:bg-emerald-500/30">
      <div className="max-w-[1800px] mx-auto">
        
        {/* HEADER COM NAVEGAÇÃO */}
        <div className="flex flex-col lg:flex-row items-center justify-between mb-12 gap-8">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                Central de <span className="text-emerald-500">Dados</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 italic">Ecossistema de Inteligência e Performance</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => router.push('/central-dados/graficos')} className="px-6 py-3 bg-slate-900/50 hover:bg-emerald-500/10 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0a2 2 0 002 2h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6z" /></svg>
              Gráficos
            </button>
            <button onClick={() => router.push('/central-dados/benchmark')} className="px-6 py-3 bg-slate-900/50 hover:bg-emerald-500/10 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Benchmark
            </button>
            <button onClick={() => router.push('/central-dados/goleiros')} className="px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Goleiros
            </button>
          </div>
        </div>

        {/* PAINEL DE FILTROS E CONFIGURAÇÃO */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
          
          {/* BUSCA E FILTROS BÁSICOS */}
          <div className="xl:col-span-3 bg-slate-900/30 rounded-[2.5rem] p-8 border border-slate-800/50 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Busca Rápida</label>
                <input 
                  type="text" 
                  placeholder="NOME DO ATLETA..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Filtrar por Time</label>
                <select 
                  value={filtroTime} 
                  onChange={(e) => setFiltroTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none appearance-none cursor-pointer"
                >
                  <option value="todos">TODOS OS TIMES</option>
                  {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-2">Filtrar por Posição</label>
                <select 
                  value={filtroPosicao} 
                  onChange={(e) => setFiltroPosicao(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none appearance-none cursor-pointer"
                >
                  <option value="todas">TODAS AS POSIÇÕES</option>
                  {posicoes.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* AÇÕES RÁPIDAS */}
          <div className="bg-slate-900/30 rounded-[2.5rem] p-8 border border-slate-800/50 backdrop-blur-sm flex flex-col justify-center gap-4">
            <button 
              onClick={() => setPainelAberto(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black italic uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              Configurar Métricas
            </button>
            <button 
              onClick={exportarCSV}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-black italic uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all"
            >
              Exportar Relatório
            </button>
          </div>
        </div>

        {/* TABELA DE DADOS */}
        <div className="bg-slate-900/30 rounded-[3rem] border border-slate-800/50 overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800/50">
                  <th className="p-8 sticky left-0 bg-slate-950 z-20 min-w-[280px]">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atleta</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Média:</span>
                          <select 
                            value={filtroPosicaoMedia} 
                            onChange={(e) => setFiltroPosicaoMedia(e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-emerald-500 font-black italic uppercase text-[9px] rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="todas">LIGA</option>
                            {posicoes.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                          </select>
                        </div>
                      </div>
                      <button onClick={() => handleOrdenacao('Jogador')} className="flex items-center gap-2 group">
                        <span className="text-xs font-black italic uppercase tracking-tighter group-hover:text-emerald-400 transition-colors">Nome do Jogador</span>
                        {ordenacao.coluna === 'Jogador' && <span className="text-emerald-500 text-[10px]">{ordenacao.direcao === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    </div>
                  </th>
                  <th onClick={() => handleOrdenacao('Time')} className="p-8 cursor-pointer hover:bg-slate-900/50 transition-colors min-w-[150px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Equipe</span>
                      {ordenacao.coluna === 'Time' && <span className="text-emerald-500 text-[10px]">{ordenacao.direcao === 'asc' ? '▲' : '▼'}</span>}
                    </div>
                  </th>
                  <th onClick={() => handleOrdenacao('Posição')} className="p-8 cursor-pointer hover:bg-slate-900/50 transition-colors min-w-[120px]">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pos</span>
                      {ordenacao.coluna === 'Posição' && <span className="text-emerald-500 text-[10px]">{ordenacao.direcao === 'asc' ? '▲' : '▼'}</span>}
                    </div>
                  </th>
                  {metricasSelecionadas.map(metrica => (
                    <th 
                      key={metrica} 
                      onClick={() => handleOrdenacao(metrica)}
                      className="p-8 cursor-pointer hover:bg-slate-900/50 transition-colors text-center min-w-[140px]"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center leading-tight h-8 flex items-center">{metrica}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-700">MED: {mediaLiga[metrica]?.toFixed(2)}</span>
                          {ordenacao.coluna === metrica && <span className="text-emerald-500 text-[10px]">{ordenacao.direcao === 'asc' ? '▲' : '▼'}</span>}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {jogadoresFiltrados.map((j, idx) => (
                  <tr key={idx} className="hover:bg-emerald-500/[0.02] transition-all group">
                    <td className="p-8 sticky left-0 bg-[#0d1016] z-10 group-hover:bg-slate-900/90 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-1 h-8 bg-slate-800 group-hover:bg-emerald-500 rounded-full transition-all"></div>
                        <div>
                          <span className="block font-black text-lg text-white group-hover:text-emerald-400 transition-colors leading-tight italic uppercase tracking-tighter">{j.Jogador}</span>
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{j.Nacionalidade || 'N/A'} • {j.Idade} ANOS</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <span className="bg-slate-950 px-4 py-2 rounded-xl text-[10px] font-black border border-slate-800 text-slate-400 uppercase tracking-widest">{j.Time}</span>
                    </td>
                    <td className="p-8">
                      <span className="text-emerald-500/80 font-black italic text-xs uppercase">{j.Posição}</span>
                    </td>
                    {metricasSelecionadas.map(m => {
                      const val = parseValue(j[m])
                      const media = mediaLiga[m]
                      const percent = (val / (media || 1)) * 100
                      const isGood = val >= media
                      return (
                        <td key={m} className="p-8">
                          <div className="flex flex-col items-center gap-3">
                            <span className={`text-base font-black italic ${isGood ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {j[m] === '0' || j[m] === '0%' || j[m] === '-' ? '-' : j[m]}
                            </span>
                            <div className="w-16 h-1 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${isGood ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500/30'}`}
                                style={{ width: `${Math.min(Math.max(percent, 5), 100)}%` }}
                              ></div>
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

        {/* MODAL DE CONFIGURAÇÃO DE MÉTRICAS */}
        {painelAberto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <div className="absolute inset-0 bg-[#0a0c10]/95 backdrop-blur-xl" onClick={() => setPainelAberto(false)}></div>
            <div className="relative w-full max-w-6xl bg-slate-900 rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-10 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Configurar <span className="text-emerald-500">Métricas</span></h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Selecione os indicadores para o seu relatório</p>
                </div>
                <button onClick={() => setPainelAberto(false)} className="p-4 hover:bg-red-500/10 rounded-2xl transition-all group">
                  <svg className="w-6 h-6 text-slate-500 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-grow overflow-hidden flex flex-col lg:flex-row">
                {/* Categorias */}
                <div className="w-full lg:w-64 bg-slate-950/30 border-r border-slate-800 p-6 space-y-2 overflow-y-auto">
                  {Object.keys(categoriasMetricas).map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => setAbaAtiva(cat)}
                      className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === cat ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:bg-slate-800'}`}
                    >
                      {cat}
                    </button>
                  ))}
                  <div className="pt-6 mt-6 border-t border-slate-800 space-y-2">
                    <button onClick={selecionarTodas} className="w-full text-left px-6 py-3 text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all">Selecionar Todas</button>
                    <button onClick={limparTodas} className="w-full text-left px-6 py-3 text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-xl transition-all">Limpar Seleção</button>
                  </div>
                </div>

                {/* Lista de Métricas */}
                <div className="flex-grow p-10 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">{abaAtiva}</h3>
                    <div className="flex gap-3">
                      <button onClick={() => selecionarCategoria(abaAtiva)} className="text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:underline">Selecionar Grupo</button>
                      <span className="text-slate-800">|</span>
                      <button onClick={() => deselecionarCategoria(abaAtiva)} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:underline">Remover Grupo</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {categoriasMetricas[abaAtiva]?.map(metrica => (
                      <button 
                        key={metrica}
                        onClick={() => toggleMetrica(metrica)}
                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${metricasSelecionadas.includes(metrica) ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700'}`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-left leading-tight">{metrica}</span>
                        {metricasSelecionadas.includes(metrica) && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-10 border-t border-slate-800 bg-slate-950/50 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <input 
                    type="text" 
                    placeholder="NOME DO TEMPLATE..." 
                    value={nomeNovoTemplate}
                    onChange={(e) => setNomeNovoTemplate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none w-full md:w-64"
                  />
                  <button onClick={salvarTemplate} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Salvar</button>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setMostrarTemplates(!mostrarTemplates)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Meus Templates ({templates.length})</button>
                  <button onClick={() => setPainelAberto(false)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl">Aplicar Configurações</button>
                </div>
              </div>

              {/* Sub-modal de Templates */}
              {mostrarTemplates && (
                <div className="absolute inset-0 z-[110] bg-slate-950 p-10 overflow-y-auto">
                  <div className="flex items-center justify-between mb-12">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Meus <span className="text-emerald-500">Templates</span></h3>
                    <button onClick={() => setMostrarTemplates(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">Voltar</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(t => (
                      <div key={t.id} className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 group hover:border-emerald-500/30 transition-all">
                        <h4 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">{t.nome}</h4>
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-6">{t.metricas.length} Métricas Salvas</p>
                        <div className="flex gap-3">
                          <button onClick={() => carregarTemplate(t)} className="flex-grow bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Carregar</button>
                          <button onClick={() => excluirTemplate(t.id)} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
