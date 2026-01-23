'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { jogadores as dadosJogadores } from './dados'

export default function CentralDados() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  // Filtros
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtroPosicao, setFiltroPosicao] = useState('todas')
  
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

  // Categorias (mantidas iguais)
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

  const toggleMetrica = (metrica) => {
    if (['Jogador', 'Time', 'Posição'].includes(metrica)) return
    if (metricasSelecionadas.includes(metrica)) {
      setMetricasSelecionadas(metricasSelecionadas.filter(m => m !== metrica))
    } else if (metricasSelecionadas.length < 8) {
      setMetricasSelecionadas([...metricasSelecionadas, metrica])
    }
  }

  const jogadoresFiltrados = useMemo(() => {
    return jogadores.filter(j => {
      const passaTime = filtroTime === 'todos' || j.Time === filtroTime
      const passaPosicao = filtroPosicao === 'todas' || j['Posição'] === filtroPosicao
      return passaTime && passaPosicao
    })
  }, [jogadores, filtroTime, filtroPosicao])

  // Função de parsing robusta
  const parseValue = (val) => {
    if (val === undefined || val === null || val === '-' || val === '') return -Infinity
    if (typeof val === 'number') return val
    
    // Converte string para número (ex: "0,3" -> 0.3, "83%" -> 83)
    const clean = String(val).replace('%', '').replace(',', '.')
    const num = parseFloat(clean)
    
    return isNaN(num) ? -Infinity : num
  }

  // Cálculo dos Rankings
  const rankings = useMemo(() => {
    const ranks = {}
    
    metricasSelecionadas.forEach(metrica => {
      if (['Jogador', 'Time', 'Posição'].includes(metrica)) return

      // Pega todos os valores válidos
      const valores = jogadoresFiltrados
        .map(j => parseValue(j[metrica]))
        .filter(v => v !== -Infinity)
      
      // Ordena e pega os Top 3 únicos
      const valoresUnicos = [...new Set(valores)]
        .sort((a, b) => b - a)
        .slice(0, 3)
      
      ranks[metrica] = valoresUnicos
    })
    
    console.log('Rankings calculados:', ranks) // Debug no console
    return ranks
  }, [jogadoresFiltrados, metricasSelecionadas])

  // Função para renderizar o conteúdo da célula com medalha
  const renderCellContent = (metrica, valor) => {
    if (['Jogador', 'Time', 'Posição'].includes(metrica)) return valor
    
    const valNum = parseValue(valor)
    if (valNum === -Infinity) return valor || '-'

    const top3 = rankings[metrica]
    if (!top3 || top3.length === 0) return valor

    // Verifica se o valor atual é um dos top 3
    if (valNum === top3[0]) {
      return (
        <span style={{ color: '#FFD700', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          🥇 {valor}
        </span>
      )
    }
    if (valNum === top3[1]) {
      return (
        <span style={{ color: '#C0C0C0', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          🥈 {valor}
        </span>
      )
    }
    if (valNum === top3[2]) {
      return (
        <span style={{ color: '#CD7F32', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          🥉 {valor}
        </span>
      )
    }
    
    return valor
  }

  const times = [...new Set(jogadores.map(j => j.Time))].filter(Boolean).sort()
  const posicoes = [...new Set(jogadores.map(j => j['Posição']))].filter(Boolean).sort()

  if (carregando) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Carregando...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </button>
        <h1 className="text-3xl font-bold">Central de Dados</h1>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/60 rounded-xl p-4">
          <label className="text-sm text-gray-400 mb-2 block">Time</label>
          <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)} className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm">
            <option value="todos">Todos os times</option>
            {times.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4">
          <label className="text-sm text-gray-400 mb-2 block">Posição</label>
          <select value={filtroPosicao} onChange={(e) => setFiltroPosicao(e.target.value)} className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm">
            <option value="todas">Todas as posições</option>
            {posicoes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4">
          <label className="text-sm text-gray-400 mb-2 block">Jogadores</label>
          <div className="bg-slate-700 rounded-lg px-4 py-2 text-sm font-semibold">{jogadoresFiltrados.length} encontrados</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-4">
          <label className="text-sm text-gray-400 mb-2 block">Métricas</label>
          <button onClick={() => setPainelAberto(!painelAberto)} className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-lg px-4 py-2 text-sm font-semibold transition flex items-center justify-between">
            <span>Selecionar ({metricasSelecionadas.length}/8)</span>
            <svg className={`w-4 h-4 transition-transform ${painelAberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </div>

      {/* PAINEL MÉTRICAS */}
      {painelAberto && (
        <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 mb-6 border border-slate-700 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-emerald-400">Selecione até 8 métricas</h3>
            <button onClick={() => setMetricasSelecionadas(['Jogador', 'Time', 'Posição'])} className="text-xs text-gray-400 hover:text-white">Limpar seleção</button>
          </div>
          {Object.entries(categorias).map(([cat, mets]) => (
            <div key={cat} className="mb-4">
              <h4 className="text-sm font-semibold text-gray-400 mb-2">{cat}</h4>
              <div className="grid grid-cols-3 gap-2">
                {mets.map(m => {
                  const isId = ['Jogador', 'Time', 'Posição'].includes(m)
                  const isSel = metricasSelecionadas.includes(m)
                  const isDis = !isSel && metricasSelecionadas.length >= 8 && !isId
                  return (
                    <label key={m} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${isId ? 'opacity-50' : isSel ? 'bg-emerald-600 text-white' : isDis ? 'opacity-50' : 'bg-slate-700/50 hover:bg-slate-600'}`}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleMetrica(m)} disabled={isId || isDis} className="w-4 h-4" />
                      <span className="text-xs">{m}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABELA */}
      <div className="bg-slate-800/60 rounded-xl p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-3 sticky left-0 bg-slate-800 z-10">Jogador</th>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Posição</th>
              {metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Posição'].includes(m)).map(m => (
                <th key={m} className="text-center p-3">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jogadoresFiltrados.slice(0, 100).map((j, i) => (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-3 font-medium sticky left-0 bg-slate-800 z-10">{j.Jogador}</td>
                <td className="p-3">{j.Time}</td>
                <td className="p-3">{j['Posição']}</td>
                {metricasSelecionadas.filter(m => !['Jogador', 'Time', 'Posição'].includes(m)).map(m => (
                  <td key={m} className="p-3 text-center">
                    {renderCellContent(m, j[m])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
