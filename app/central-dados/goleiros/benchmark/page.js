'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

const GOLEIROS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlQGKcj7Dv6ziVn4MU-zs6PAJc5WFyjwr0aks9xNdG4rgRw4iwRNFws7lDGXtjNoQHGypQJ4ssSlqM/pub?output=csv";

export default function BenchmarkGoleirosPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('Todas')
  const [jogadorSelecionado, setJogadorSelecionado] = useState(null)
  const [posicaoReferencia, setPosicaoReferencia] = useState('LIGA')

  // Métricas e Templates
  const [metricasBenchmark, setMetricasBenchmark] = useState(['Defesas', 'Gols sofridos', 'Clean sheets', 'Saídas do gol', 'Passes precisos %'])
  const [templates, setTemplates] = useState([])
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('Defesa')
  const [categoriasMetricas, setCategoriasMetricas] = useState({})

  // Carregar dados do CSV
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${GOLEIROS_CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            setJogadores(dados)
            if (dados.length > 0) {
              setJogadorSelecionado(dados[0])
              const colunas = Object.keys(dados[0]).filter(col => col && col.trim() && !['Jogador', 'Time', 'Equipe', 'Posição', 'Número', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '?', 'Liga', 'Temporada', '№'].includes(col))
              setCategoriasMetricas(categorizarMetricas(colunas))
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

  // Templates LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('benchmarkTemplates_Goleiros')
    if (saved) setTemplates(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('benchmarkTemplates_Goleiros', JSON.stringify(templates))
  }, [templates])

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Defesa': [], 'Passes': [], 'Geral': [] }
    colunas.forEach(metrica => {
      if (['Jogador', 'Time', 'Equipe', 'Posição', 'Idade', '№'].includes(metrica)) return
      if (metrica.includes('Defesa') || metrica.includes('Gol') || metrica.includes('Clean') || metrica.includes('Saída')) categorias['Defesa'].push(metrica)
      else if (metrica.includes('Passe') || metrica.includes('Lançamento')) categorias['Passes'].push(metrica)
      else categorias['Geral'].push(metrica)
    })
    return categorias
  }

  const parseValue = (val) => {
    if (!val || val === '-' || val === 'nan' || val === '') return 0
    const clean = String(val).replace('%', '').replace(',', '.')
    const num = parseFloat(clean)
    return isNaN(num) ? 0 : num
  }

  const times = useMemo(() => ['Todas', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))].sort(), [jogadores])

  const jogadoresFiltrados = useMemo(() => {
    return jogadores.filter(j => {
      const nomeAtleta = (j.Jogador || '').trim();
      const timeAtleta = (j.Time || j.Equipe || '').trim();
      const passaBusca = nomeAtleta.toLowerCase().includes(busca.toLowerCase());
      const passaTime = filtroTime === 'Todas' || timeAtleta === filtroTime;
      return passaBusca && passaTime;
    })
  }, [jogadores, busca, filtroTime])

  const mediaReferencia = useMemo(() => {
    if (!jogadorSelecionado) return {}
    const jogadoresParaMedia = jogadores 
    const medias = {}
    metricasBenchmark.forEach(m => {
      const valores = jogadoresParaMedia.map(j => parseValue(j[m]))
      medias[m] = valores.reduce((a, b) => a + b, 0) / (valores.length || 1)
    })
    return medias
  }, [jogadores, jogadorSelecionado, metricasBenchmark])

  const salvarTemplate = () => {
    if (!nomeNovoTemplate.trim()) return
    setTemplates([...templates, { id: Date.now(), nome: nomeNovoTemplate, metricas: [...metricasBenchmark] }])
    setNomeNovoTemplate('')
  }

  if (carregando) return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse italic">Calculando Benchmarks de Goleiros...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2 mb-6">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button onClick={() => router.push('/central-dados/goleiros')} className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors">
              ← VOLTAR
            </button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Benchmark Goleiros
            </div>
          </div>
        </header>

        {/* SELETOR DE MÉTRICAS NO TOPO */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Configurar <span className="text-emerald-600">Benchmark</span></h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="NOME DO TEMPLATE..." 
                  value={nomeNovoTemplate} 
                  onChange={e => setNomeNovoTemplate(e.target.value)} 
                  className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-emerald-500/50"
                />
                <button onClick={salvarTemplate} className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-400 transition-all">Salvar</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 mb-1">
                <button 
                  onClick={() => setMetricasBenchmark([])}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-emerald-400 transition-colors ml-1"
                >
                  [ Desmarcar Tudo ]
                </button>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto custom-scrollbar flex-1">
                  {Object.keys(categoriasMetricas).map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setAbaAtiva(cat)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === cat ? 'bg-emerald-500 text-black' : 'text-slate-500 hover:text-slate-600'}`}
                  >
                    {cat}
                  </button>
                ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setMetricasBenchmark(t.metricas)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[8px] font-black uppercase text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categoriasMetricas[abaAtiva]?.map(metrica => (
              <button 
                key={metrica}
                onClick={() => {
                  if (metricasBenchmark.includes(metrica)) setMetricasBenchmark(metricasBenchmark.filter(m => m !== metrica))
                  else setMetricasBenchmark([...metricasBenchmark, metrica])
                }}
                className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group ${metricasBenchmark.includes(metrica) ? 'bg-emerald-50 border-emerald-500 text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-600'}`}
              >
                <span className="truncate mr-2">{metrica}</span>
                {metricasBenchmark.includes(metrica) && <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SIDEBAR FILTROS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtros de Contexto</h3>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="BUSCAR GOLEIRO..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:border-emerald-500/50 outline-none"
                />
                <select value={filtroTime} onChange={(e) => setFiltroTime(e.target.value)} className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest focus:outline-none">
                  {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Goleiros ({jogadoresFiltrados.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {jogadoresFiltrados.map(j => (
                  <button 
                    key={j.Jogador}
                    onClick={() => setJogadorSelecionado(j)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border ${jogadorSelecionado?.Jogador === j.Jogador ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-700'}`}
                  >
                    <div className="font-black italic uppercase text-[11px] tracking-tighter">{j.Jogador}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">{j.Posição} • {j.Time || j.Equipe}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="lg:col-span-3 space-y-6">
            {jogadorSelecionado && (
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center border border-slate-200 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                      <span className="text-emerald-600 font-black italic text-2xl">{jogadorSelecionado.Jogador.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                        <span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em]">Perfil de Benchmark Goleiro</span>
                      </div>
                      <h2 className="text-5xl font-black italic uppercase tracking-tighter text-black leading-none">{jogadorSelecionado.Jogador}</h2>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">{jogadorSelecionado.Posição} • {jogadorSelecionado.Time || jogadorSelecionado.Equipe}</p>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
                    <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-2 ml-1">Referência de Comparação</label>
                    <div className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Média Geral da Liga</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {metricasBenchmark.map((metrica, idx) => {
                    const valorAtleta = parseValue(jogadorSelecionado[metrica])
                    const valorMedia = mediaReferencia[metrica] || 0
                    const diferenca = valorMedia === 0 ? 0 : ((valorAtleta - valorMedia) / valorMedia) * 100
                    const isPositive = metrica.includes('sofrido') ? diferenca <= 0 : diferenca >= 0

                    return (
                      <div key={idx} className="bg-slate-100 p-8 rounded-[2rem] border border-slate-200 group hover:border-emerald-300 transition-all duration-500">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">{metrica}</span>
                            <div className="text-3xl font-black italic text-black group-hover:text-amber-600 transition-colors">{jogadorSelecionado[metrica] || '0'}</div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                            {diferenca >= 0 ? '+' : ''}{diferenca.toFixed(1)}%
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                            <span className="text-slate-600">Atleta</span>
                            <span className="text-slate-600">Média Liga</span>
                          </div>
                          <div className="relative h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-200">
                            <div className="absolute top-0 bottom-0 bg-slate-700/50 border-r-2 border-white/20 z-10" style={{ width: '50%' }}></div>
                            <div 
                              className={`absolute top-0 bottom-0 transition-all duration-1000 ${isPositive ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-red-500/50'}`}
                              style={{ width: `${Math.min(Math.max((valorAtleta / (valorMedia || 1)) * 50, 5), 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[9px] font-black text-slate-400">
                            <span>{valorAtleta.toFixed(1)}</span>
                            <span>{valorMedia.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c10; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>
    </div>
  )
}
