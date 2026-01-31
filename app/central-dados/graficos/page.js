'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Chart as ChartJS, RadarController, RadarElement, PointElement, LineElement, Filler, Tooltip, Legend, ScatterController, CategoryScale, LinearScale } from 'chart.js'
import { Radar, Scatter } from 'react-chartjs-2'
import Papa from 'papaparse'

ChartJS.register(RadarController, RadarElement, PointElement, LineElement, Filler, Tooltip, Legend, ScatterController, CategoryScale, LinearScale)

export default function GraficosPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [jogadorSelecionado, setJogadorSelecionado] = useState('')
  const [metricaX, setMetricaX] = useState('Minutos jogados')
  const [metricaY, setMetricaY] = useState('Gols')

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
              setJogadorSelecionado(dados[0].Jogador)
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
    if (!val || val === '-' || val === 'nan') return 0
    const clean = String(val).replace('%', '').replace(',', '.')
    return parseFloat(clean) || 0
  }

  // Dados para o Gráfico de Radar
  const jogadorAtual = jogadores.find(j => j.Jogador === jogadorSelecionado)
  
  const radarData = useMemo(() => {
    if (!jogadorAtual) return null

    return {
      labels: ['Gols', 'Passes %', 'Dribles', 'Desafios %', 'Interceptações'],
      datasets: [
        {
          label: jogadorAtual.Jogador,
          data: [
            parseValue(jogadorAtual.Gols),
            parseValue(jogadorAtual['Passes precisos %']),
            parseValue(jogadorAtual.Dribles),
            parseValue(jogadorAtual['Desafios vencidos, %']),
            parseValue(jogadorAtual.Interceptações)
          ],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    }
  }, [jogadorAtual])

  // Dados para o Gráfico de Dispersão
  const scatterData = useMemo(() => {
    const pontos = jogadores.map(j => ({
      x: parseValue(j[metricaX]),
      y: parseValue(j[metricaY]),
      jogador: j.Jogador
    })).filter(p => p.x >= 0 && p.y >= 0)

    return {
      datasets: [
        {
          label: `${metricaX} vs ${metricaY}`,
          data: pontos,
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10b981',
          borderWidth: 1,
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    }
  }, [jogadores, metricaX, metricaY])

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#e2e8f0',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        borderColor: '#10b981',
        borderWidth: 1
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: '#94a3b8',
          font: { size: 11 }
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        },
        pointLabels: {
          color: '#cbd5e1',
          font: { size: 12, weight: 'bold' }
        }
      }
    }
  }

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#e2e8f0',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        borderColor: '#10b981',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `${context.raw.jogador}: (${context.raw.x.toFixed(2)}, ${context.raw.y.toFixed(2)})`
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: metricaX,
          color: '#cbd5e1',
          font: { size: 12, weight: 'bold' }
        },
        ticks: {
          color: '#94a3b8'
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        }
      },
      y: {
        title: {
          display: true,
          text: metricaY,
          color: '#cbd5e1',
          font: { size: 12, weight: 'bold' }
        },
        ticks: {
          color: '#94a3b8'
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        }
      }
    }
  }

  if (carregando) return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <span className="text-lg">Carregando gráficos...</span>
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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/central-dados')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold">Análise Gráfica Avançada</h1>
            <p className="text-slate-400 text-sm">Gráficos de Radar e Dispersão em Tempo Real</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GRÁFICO DE RADAR */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-300 mb-2">Selecionar Jogador</label>
              <select 
                value={jogadorSelecionado} 
                onChange={(e) => setJogadorSelecionado(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {jogadores.map(j => (
                  <option key={j.Jogador} value={j.Jogador}>{j.Jogador}</option>
                ))}
              </select>
            </div>

            <h2 className="text-lg font-bold text-white mb-4">Perfil do Jogador (Radar 360°)</h2>
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 min-h-96">
              {radarData && <Radar data={radarData} options={radarOptions} />}
            </div>
            <p className="text-xs text-slate-400 mt-4">Visualize as principais métricas de performance do jogador selecionado em um gráfico de radar 360°. Quanto mais próximo da borda, melhor o desempenho.</p>
          </div>

          {/* GRÁFICO DE DISPERSÃO */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Eixo X (Métrica)</label>
                <select 
                  value={metricaX} 
                  onChange={(e) => setMetricaX(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none text-sm"
                >
                  <option>Minutos jogados</option>
                  <option>Gols</option>
                  <option>Assistências</option>
                  <option>Passes precisos %</option>
                  <option>Dribles</option>
                  <option>Desafios vencidos, %</option>
                  <option>Interceptações</option>
                  <option>Chances de gol</option>
                  <option>Chutes</option>
                  <option>Index</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Eixo Y (Métrica)</label>
                <select 
                  value={metricaY} 
                  onChange={(e) => setMetricaY(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none text-sm"
                >
                  <option>Minutos jogados</option>
                  <option>Gols</option>
                  <option>Assistências</option>
                  <option>Passes precisos %</option>
                  <option>Dribles</option>
                  <option>Desafios vencidos, %</option>
                  <option>Interceptações</option>
                  <option>Chances de gol</option>
                  <option>Chutes</option>
                  <option>Index</option>
                </select>
              </div>
            </div>

            <h2 className="text-lg font-bold text-white mb-4">Comparativo de Elenco (Dispersão)</h2>
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 min-h-96">
              {scatterData && <Scatter data={scatterData} options={scatterOptions} />}
            </div>
            <p className="text-xs text-slate-400 mt-4">Cruze duas métricas para identificar correlações e outliers no desempenho do elenco. Cada ponto representa um jogador.</p>
          </div>
        </div>

        {/* INFORMAÇÕES ADICIONAIS */}
        <div className="mt-8 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">📊 Como usar os gráficos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-emerald-400 mb-2">Gráfico de Radar</h4>
              <p className="text-sm text-slate-300">Ideal para entender o perfil técnico completo de um jogador. Quanto mais próximo da borda, melhor em cada métrica. Use para comparar posições ou identificar pontos fortes e fracos.</p>
            </div>
            <div>
              <h4 className="font-bold text-emerald-400 mb-2">Gráfico de Dispersão</h4>
              <p className="text-sm text-slate-300">Perfeito para scouting. Cruzar "Minutos Jogados" vs "Gols" mostra quem é mais eficiente. Jogadores no canto superior direito são os melhores em ambas as métricas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
