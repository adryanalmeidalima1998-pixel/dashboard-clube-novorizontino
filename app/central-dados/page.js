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
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <span className="text-lg">Carregando dados da Central...</span>
      </div>
    </div>
  )

  if (erro) return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <span className="text-lg text-red-500">{erro}</span>
      </div>
    </div>
  )

  const abas = Object.keys(categoriasMetricas)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h1 className="text-3xl font-bold">Central de Dados</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/central-dados/graficos')} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Gráficos Avançados
          </button>
          <button onClick={exportarCSV} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold border border-slate-700 flex items-center gap-2 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar CSV
          </button>
          <button onClick={() => setMostrarTemplates(!mostrarTemplates)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            Templates ({templates.length})
          </button>
        </div>
      </div>

      {/* PAINEL DE TEMPLATES */}
      {mostrarTemplates && (
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-blue-700">
          <h3 className="text-lg font-bold mb-4">Meus Templates de Análise</h3>
          
          <div className="mb-6">
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                placeholder="Nome do novo template (ex: Análise de Zagueiros)" 
                value={nomeNovoTemplate}
                onChange={(e) => setNomeNovoTemplate(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button 
                onClick={salvarTemplate}
                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold transition-colors"
              >
                Salvar Template
              </button>
            </div>
            <p className="text-xs text-slate-400">O template atual ({metricasSelecionadas.length} métricas) será salvo com este nome</p>
          </div>

          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map(template => (
                <div key={template.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-white">{template.nome}</h4>
                      <p className="text-xs text-slate-400">{template.metricas.length} métricas</p>
                    </div>
                    <button 
                      onClick={() => excluirTemplate(template.id)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <button 
                    onClick={() => carregarTemplate(template)}
                    className="w-full bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded text-sm font-bold transition-colors mt-2"
                  >
                    Carregar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">Nenhum template salvo ainda. Selecione suas métricas e clique em "Salvar Template"!</p>
          )}
        </div>
      )}

      {/* BUSCA E FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Buscar jogador..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        <select 
          value={filtroTime}
          onChange={(e) => setFiltroTime(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="todos">Todos os Times</option>
          {times.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select 
          value={filtroPosicao}
          onChange={(e) => setFiltroPosicao(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="todas">Todas as Posições</option>
          {posicoes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button 
          onClick={() => router.push('/central-dados/benchmark')}
          className="bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-lg px-4 py-2 text-white font-bold transition-colors shadow-lg shadow-blue-900/20"
        >
          📊 Benchmark
        </button>
        <button 
          onClick={() => setPainelAberto(!painelAberto)}
          className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 rounded-lg px-4 py-2 text-white font-bold transition-colors shadow-lg shadow-emerald-900/20"
        >
          {painelAberto ? '✓ Fechar Métricas' : '+ Selecionar Métricas'}
        </button>
      </div>

      {/* PAINEL DE MÉTRICAS COM ABAS */}
      {painelAberto && (
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Métricas por Categoria</h3>
            <div className="flex gap-2">
              <button onClick={selecionarTodas} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-sm font-bold transition-colors">
                Selecionar Todas
              </button>
              <button onClick={() => setMetricasSelecionadas([])} className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-sm font-bold transition-colors">
                Desmarcar Todas
              </button>
              <button onClick={limparTodas} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-sm font-bold transition-colors">
                Limpar
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {abas.map(aba => (
              <button 
                key={aba}
                onClick={() => setAbaAtiva(aba)}
                className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${
                  abaAtiva === aba 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {aba} ({categoriasMetricas[aba]?.length || 0})
              </button>
            ))}
          </div>

          <div className="mb-4">
            <div className="flex gap-2 mb-3">
              <button 
                onClick={() => selecionarCategoria(abaAtiva)}
                className="bg-emerald-700 hover:bg-emerald-600 px-3 py-1 rounded text-sm font-bold transition-colors"
              >
                + Selecionar {abaAtiva}
              </button>
              <button 
                onClick={() => deselecionarCategoria(abaAtiva)}
                className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-sm font-bold transition-colors"
              >
                - Remover {abaAtiva}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
              {(categoriasMetricas[abaAtiva] || []).map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-2 rounded transition-colors">
                  <input 
                    type="checkbox" 
                    checked={metricasSelecionadas.includes(m)}
                    onChange={() => toggleMetrica(m)}
                    className="w-4 h-4 rounded border-slate-600 text-emerald-600 cursor-pointer"
                  />
                  <span className="text-sm">{m}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="mt-4 text-sm text-slate-400">
            Selecionadas: {metricasSelecionadas.length} de {todasAsColunas.filter(c => !['?', 'Jogador', 'Time', 'Posição', 'Idade', 'Altura', 'Peso', 'Nacionalidade'].includes(c)).length} métricas
          </div>
        </div>
      )}

      {/* TABELA */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700 sticky top-0">
              <tr>
                <th className="p-4 text-left font-bold text-slate-400 uppercase text-[10px] cursor-pointer hover:text-white transition-colors sticky left-0 bg-slate-900 z-20" onClick={() => handleOrdenacao('Jogador')}>
                  Jogador {ordenacao.coluna === 'Jogador' && (ordenacao.direcao === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 text-left font-bold text-slate-400 uppercase text-[10px] sticky left-32 bg-slate-900 z-20">Time</th>
                <th className="p-4 text-left font-bold text-slate-400 uppercase text-[10px] sticky left-48 bg-slate-900 z-20">Posição</th>
                {metricasSelecionadas.map(m => (
                  <th key={m} className="p-4 text-center font-bold text-slate-400 uppercase text-[10px] cursor-pointer hover:text-white transition-colors whitespace-nowrap" onClick={() => handleOrdenacao(m)}>
                    {m} {ordenacao.coluna === m && (ordenacao.direcao === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {jogadoresFiltrados.slice(0, 150).map((j, i) => (
                <tr key={i} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="p-4 font-bold text-white sticky left-0 bg-slate-800 group-hover:bg-slate-700/50 z-10">{j.Jogador}</td>
                  <td className="p-4 text-slate-300 sticky left-32 bg-slate-800 group-hover:bg-slate-700/50 z-10">{j.Time}</td>
                  <td className="p-4 sticky left-48 bg-slate-800 group-hover:bg-slate-700/50 z-10"><span className="bg-slate-900 px-2 py-1 rounded text-[10px] font-bold border border-slate-700 text-emerald-400">{j.Posição}</span></td>
                  {metricasSelecionadas.map(m => {
                    const val = parseValue(j[m])
                    const media = mediaLiga[m]
                    const acimaMedia = val >= media
                    return (
                      <td key={m} className="p-4 text-center whitespace-nowrap">
                        <span className={`font-bold text-sm ${acimaMedia && val > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {j[m] || '-'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-center text-slate-400 text-sm">
        Mostrando {Math.min(150, jogadoresFiltrados.length)} de {jogadoresFiltrados.length} jogadores • Total de {jogadores.length} na base de dados • {metricasSelecionadas.length} métricas visíveis
      </div>
    </div>
  )
}
