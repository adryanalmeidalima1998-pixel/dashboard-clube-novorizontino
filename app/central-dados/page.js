'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

export default function CentralDados() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [todasAsColunas, setTodasAsColunas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  
  // Busca e Filtros
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtroPosicao, setFiltroPosicao] = useState('todas')
  
  // Ordenação
  const [ordenacao, setOrdenacao] = useState({ coluna: 'Jogador', direcao: 'asc' })

  // Métricas selecionadas - começa com as principais
  const [metricasSelecionadas, setMetricasSelecionadas] = useState([
    'Index',
    'Minutos jogados',
    'Gols',
    'Assistências',
    'Passes precisos %'
  ])

  const [painelAberto, setPainelAberto] = useState(false)

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
            
            // Extrair todas as colunas disponíveis
            if (dados.length > 0) {
              const colunas = Object.keys(dados[0]).filter(col => col && col.trim())
              setTodasAsColunas(colunas)
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

  // Média da Liga
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

  const selecionarTodas = () => {
    const todasExcetoBasicas = todasAsColunas.filter(c => !['?', 'Jogador', 'Time', 'Posição'].includes(c))
    setMetricasSelecionadas(todasExcetoBasicas)
  }

  const limparTodas = () => {
    setMetricasSelecionadas(['Index', 'Minutos jogados', 'Gols'])
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
        <button onClick={exportarCSV} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold border border-slate-700 flex items-center gap-2 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Exportar CSV
        </button>
      </div>

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
          onClick={() => setPainelAberto(!painelAberto)}
          className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 rounded-lg px-4 py-2 text-white font-bold transition-colors shadow-lg shadow-emerald-900/20"
        >
          {painelAberto ? '✓ Fechar Métricas' : '+ Selecionar Métricas'}
        </button>
      </div>

      {/* PAINEL DE MÉTRICAS */}
      {painelAberto && (
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Todas as Métricas Disponíveis ({todasAsColunas.length})</h3>
            <div className="flex gap-2">
              <button onClick={selecionarTodas} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-sm font-bold transition-colors">
                Selecionar Todas
              </button>
              <button onClick={limparTodas} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-sm font-bold transition-colors">
                Limpar
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {todasAsColunas.filter(c => !['?'].includes(c)).map(m => (
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
          
          <div className="mt-4 text-sm text-slate-400">
            Selecionadas: {metricasSelecionadas.length} de {todasAsColunas.filter(c => !['?'].includes(c)).length} métricas
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
