'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { jogadores as dadosJogadores } from './dados'

export default function CentralDados() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  // Busca e Filtros
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtroPosicao, setFiltroPosicao] = useState('todas')
  
  // Ordenação
  const [ordenacao, setOrdenacao] = useState({ coluna: 'Jogador', direcao: 'asc' })

  // Métricas selecionadas
  const [metricasSelecionadas, setMetricasSelecionadas] = useState([
    'Minutos jogados',
    'Gols',
    'Assistências',
    'Passes precisos %',
    'Dribles bem sucedidos',
    '% de desarmes bem sucedidos',
    'Interceptações',
    'xG'
  ])

  const [painelAberto, setPainelAberto] = useState(false)

  const categorias = {
    'IDENTIFICAÇÃO': ['Jogador', 'Time', 'Idade', 'Altura', 'Peso', 'Nacionalidade', 'Posição'],
    'CONTEXTO / UTILIZAÇÃO': ['Index', 'Minutos jogados', 'Partidas jogadas', 'Escalações no time titular', 'Foi substituído', 'Substituindo'],
    'ÍNDICES E AÇÕES GERAIS': ['Ações totais', 'Ações / com sucesso', 'Ações / com sucesso %', 'Ações mal sucedidas'],
    'PRODUÇÃO OFENSIVA': ['Gols', 'Assistências', 'Participação em ataques de pontuação', 'Chances de gol', 'Chances com sucesso', 'Chances c/ sucesso, %', 'Chances criadas'],
    'FINALIZAÇÕES': ['Chutes', 'Chutes/gol', 'Chutes no gol, %', 'Chutes/fora', 'Finalizações bloqueadas', 'Header', 'Tiros / poste'],
    'PASSES – GERAL': ['Passes', 'Passes precisos', 'Passes precisos %'],
    'PASSES – CHAVE': ['Passes chave', 'Passes chave precisos', 'Passes chave precisos,%', 'Passes para finalização'],
    'PASSES – PROGRESSÃO': ['Passes progressivos', 'Passes progressivos precisos', 'Passes progressivos precisos,%', 'Progressive open passes'],
    'PASSES – LONGOS': ['Passes longos', 'Passes longos - precisos', 'Passes longos, precisos, %', 'Passes super longos', 'Passes super longos precisos', 'Passes super longos precisos, %'],
    'TERÇO FINAL / ÁREA': ['Passa para o terço final', 'Passa para frente (ângulo de captura - 120 graus) até o terço final, precisos', 'Passa para frente (ângulo de captura - 120 graus) até o terço final, preciso, %', 'Entradas no terço final', 'Entradas no terço final através de passes', 'Entradas no terço final através de passe, % do total', 'Entradas no terço final carregando a bola', 'Entradas no terço final carregando a bola, % do total', 'Passes dentro da área', 'Passes dentro da área / precisos', 'Passes dentro da área / precisos, %', 'Ações na área adv.', 'Ações na área adversária bem-sucedidas', 'Ações na caixa adversária bem-sucedidas, %'],
    'DRIBLES': ['Dribles', 'Dribles bem sucedidos', '% de dribles com sucesso', 'Dribles no último terço do campo', 'Dribles no último terço do campo com sucesso', 'Dribles no último terço do campo com sucesso, %', 'Dribles sem êxito'],
    'DUELOS E DISPUTAS': ['Desafios', 'Desafios vencidos', 'Desafios vencidos, %', 'Desafios mal sucedidos', 'Disputas na defesa', 'Disputas defensivas ganhas', 'Disputas defensivas ganhas, %', 'Disputas na defesa / com sucesso', 'Disputas no ataque', 'Disputas ofensivas ganhas', 'Disputas ofensivas ganhas, %', 'Disputas de bola no ataque / com sucesso', 'Disputas aéreas', 'Desafios aéreos vencidos', 'Desafios aéreos vencidos, %', 'Disputas de bolas aéreas / com sucesso'],
    'DEFESA': ['Desarmes', 'Desarmes bem sucedidos', '% de desarmes bem sucedidos', 'Interceptações', 'Rebotes', 'Bolas recuperadas', 'Bolas recuperadas no campo do adversário'],
    'PERDAS / ERROS': ['Bolas perdidas', 'Bolas perdidas / no próprio campo', 'Bolas perdidas após passes', 'Perdas individuais', 'Controle de bola ruim', 'Impedimentos', 'Falhas em gols', 'Erros graves'],
    'DISCIPLINA': ['Cartões amarelos', 'Cartões vermelhos', 'Faltas', 'Faltas sofridas'],
    'MÉTRICAS ESPERADAS (xG / xA)': ['xG', 'xA', 'xG por finalização', 'xG por gol', 'xG conversão', 'xGT', 'xGOPP', 'NxG', 'xGDPS']
  }

  useEffect(() => {
    setJogadores(dadosJogadores)
    setCarregando(false)
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

  // Média da Liga (Simulada para comparação)
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
      const passaBusca = j.Jogador.toLowerCase().includes(busca.toLowerCase())
      const passaTime = filtroTime === 'todos' || j.Time === filtroTime
      const passaPosicao = filtroPosicao === 'todas' || j['Posição'] === filtroPosicao
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
    } else if (metricasSelecionadas.length < 12) {
      setMetricasSelecionadas([...metricasSelecionadas, metrica])
    }
  }

  const times = [...new Set(jogadores.map(j => j.Time))].filter(Boolean).sort()
  const posicoes = [...new Set(jogadores.map(j => j['Posição']))].filter(Boolean).sort()

  if (carregando) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Carregando...</div>

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
        <div className="flex items-center gap-2">
          <button onClick={exportarCSV} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold border border-slate-700 flex items-center gap-2 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* BUSCA E FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-800/60 rounded-xl p-4 lg:col-span-2">
          <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Buscar Jogador</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Nome do jogador..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-10 py-2 text-sm focus:border-emerald-500 outline-none transition-all"
            />
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4">
          <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Time</label>
          <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500">
            <option value="todos">Todos os times</option>
            {times.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4">
          <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Posição</label>
          <select value={filtroPosicao} onChange={(e) => setFiltroPosicao(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500">
            <option value="todas">Todas as posições</option>
            {posicoes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4">
          <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Métricas</label>
          <button onClick={() => setPainelAberto(!painelAberto)} className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-lg px-4 py-2 text-sm font-bold transition flex items-center justify-between">
            <span>({metricasSelecionadas.length}/12)</span>
            <svg className={`w-4 h-4 transition-transform ${painelAberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </div>

      {/* PAINEL MÉTRICAS */}
      {painelAberto && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 max-h-[500px] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
            <h3 className="font-bold text-emerald-400 uppercase text-sm tracking-wider">Selecione até 12 métricas</h3>
            <button onClick={() => setMetricasSelecionadas(['Jogador', 'Time', 'Posição'])} className="text-xs text-slate-500 hover:text-white transition-colors">Limpar Tudo</button>
          </div>
          <div className="space-y-8">
            {Object.entries(categorias).map(([cat, mets]) => (
              <div key={cat}>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{cat}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {mets.map(m => {
                    const isId = ['Jogador', 'Time', 'Posição'].includes(m)
                    const isSel = metricasSelecionadas.includes(m)
                    const isDis = !isSel && metricasSelecionadas.length >= 12 && !isId
                    return (
                      <label key={m} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${isId ? 'opacity-30' : isSel ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : isDis ? 'opacity-20 grayscale' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                        <input type="checkbox" checked={isSel} onChange={() => toggleMetrica(m)} disabled={isId || isDis} className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900" />
                        <span className="text-xs font-medium truncate">{m}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABELA */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700">
                <th 
                  onClick={() => handleOrdenacao('Jogador')}
                  className="p-4 font-bold text-slate-400 uppercase text-[10px] tracking-wider sticky left-0 bg-slate-900 z-10 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Jogador
                    {ordenacao.coluna === 'Jogador' && (ordenacao.direcao === 'asc' ? '↑' : '↓')}
                  </div>
                </th>
                <th className="p-4 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Time</th>
                <th className="p-4 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Pos</th>
                {metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Posição'].includes(m)).map(m => (
                  <th 
                    key={m} 
                    onClick={() => handleOrdenacao(m)}
                    className="p-4 font-bold text-slate-400 uppercase text-[10px] tracking-wider text-center cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex flex-col items-center gap-1">
                      {m}
                      <span className="text-[8px] text-slate-600">
                        {ordenacao.coluna === m ? (ordenacao.direcao === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {jogadoresFiltrados.slice(0, 50).map((j, i) => (
                <tr key={i} className="hover:bg-slate-700/20 transition-colors group">
                  <td className="p-4 font-bold text-white sticky left-0 bg-slate-800/90 backdrop-blur group-hover:bg-slate-700/40 z-10 transition-colors">{j.Jogador}</td>
                  <td className="p-4 text-slate-400 text-xs">{j.Time}</td>
                  <td className="p-4">
                    <span className="bg-slate-900 px-2 py-1 rounded text-[10px] font-bold border border-slate-700 text-slate-400">{j['Posição']}</span>
                  </td>
                  {metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Posição'].includes(m)).map(m => {
                    const val = parseValue(j[m])
                    const media = mediaLiga[m] || 0
                    const acimaMedia = val > media
                    return (
                      <td key={m} className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-bold ${acimaMedia ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {j[m] || '-'}
                          </span>
                          {j.Time === 'Grêmio Novorizontino' && (
                            <div className={`h-1 w-8 rounded-full ${acimaMedia ? 'bg-emerald-500' : 'bg-red-500/50'}`} title={`Média da Liga: ${media.toFixed(2)}`}></div>
                          )}
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
      
      <div className="mt-4 text-[10px] text-slate-500 flex items-center gap-4 px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Acima da média da liga
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-red-500/50 rounded-full"></div> Abaixo da média da liga
        </div>
      </div>
    </div>
  )
}
