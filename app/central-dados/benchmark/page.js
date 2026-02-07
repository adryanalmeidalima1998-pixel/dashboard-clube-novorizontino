'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { cleanData, normalizeTeamName, safeParseFloat } from '../../utils/dataCleaner'

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv";

export default function BenchmarkPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('Todas')
  const [filtrosPosicao, setFiltrosPosicao] = useState([])
  const [jogadorSelecionado, setJogadorSelecionado] = useState(null)
  const [posicaoReferencia, setPosicaoReferencia] = useState('MESMA')

  // Métricas e Templates
  const [metricasBenchmark, setMetricasBenchmark] = useState(['Gols', 'Assistências', 'Passes precisos %', 'Dribles', 'Desafios vencidos, %', 'Interceptações'])
  const [templates, setTemplates] = useState([])
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  const [categoriasMetricas, setCategoriasMetricas] = useState({})

  // Carregar dados do CSV
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data).map(j => ({
              ...j,
              Time: normalizeTeamName(j.Time || j.Equipe)
            }))
            setJogadores(dadosLimpos)
            if (dadosLimpos.length > 0) {
              setJogadorSelecionado(dadosLimpos[0])
              const colunas = Object.keys(dadosLimpos[0]).filter(col => col && col.trim() && !['Jogador', 'Time', 'Equipe', 'Posição', 'Número', 'Idade', 'Altura', 'Peso', 'Nacionalidade', '?', 'Liga', 'Temporada', '№'].includes(col))
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
    const saved = localStorage.getItem('benchmarkTemplates')
    if (saved) setTemplates(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('benchmarkTemplates', JSON.stringify(templates))
  }, [templates])

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Ataque': [], 'Defesa': [], 'Passes & Criação': [], 'Posse & Controle': [], 'Físico & Duelos': [], 'Geral': [] }
    const palavrasChave = {
      'Ataque': ['gol', 'finalização', 'chute', 'xg', 'chance', 'header', 'entradas no terço'],
      'Defesa': ['desarme', 'interceptação', 'disputa', 'defesa', 'cartão', 'falta sofrida', 'erro grave'],
      'Passes & Criação': ['passe', 'cruzamento', 'chave', 'progressivo', 'assistência', 'nxg', 'xa'],
      'Posse & Controle': ['drible', 'controle', 'perda', 'bola', 'recuperada', 'posse'],
      'Físico & Duelos': ['minuto', 'duelo', 'disputa aérea', 'impedimento', 'escalação', 'substituído']
    }
    colunas.forEach(metrica => {
      const metricaLower = metrica.toLowerCase()
      let categorizado = false
      for (const [cat, palavras] of Object.entries(palavrasChave)) {
        if (palavras.some(p => metricaLower.includes(p))) {
          categorias[cat].push(metrica); categorizado = true; break
        }
      }
      if (!categorizado) categorias['Geral'].push(metrica)
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
  const posicoes = useMemo(() => [...new Set(jogadores.map(j => j.Posição).filter(Boolean))].sort(), [jogadores])

  const jogadoresFiltrados = useMemo(() => {
    return jogadores.filter(j => {
      const timeAtleta = (j.Time || j.Equipe || '').trim();
      const passaTime = filtroTime === 'Todas' || timeAtleta.toLowerCase() === filtroTime.toLowerCase();
      const nomeAtleta = (j.Jogador || '').trim();
      const passaBusca = nomeAtleta.toLowerCase().includes(busca.toLowerCase());
      const passaPosicao = filtrosPosicao.length === 0 || filtrosPosicao.includes(j.Posição);
      return passaTime && passaBusca && passaPosicao;
    });
  }, [jogadores, busca, filtroTime, filtrosPosicao])

  const mediaReferencia = useMemo(() => {
    if (!jogadorSelecionado) return {}
    const posParaMedia = posicaoReferencia === 'MESMA' ? jogadorSelecionado.Posição : posicaoReferencia
    const jogadoresParaMedia = posParaMedia === 'LIGA' 
      ? jogadores 
      : jogadores.filter(j => j.Posição === posParaMedia)
    
    const medias = {}
    metricasBenchmark.forEach(m => {
      const valores = jogadoresParaMedia.map(j => parseValue(j[m]))
      medias[m] = valores.reduce((a, b) => a + b, 0) / (valores.length || 1)
    })
    return medias
  }, [jogadores, jogadorSelecionado, posicaoReferencia, metricasBenchmark])

  const togglePosicao = (pos) => {
    setFiltrosPosicao(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos])
  }

  const salvarTemplate = () => {
    if (!nomeNovoTemplate.trim()) return
    setTemplates([...templates, { id: Date.now(), nome: nomeNovoTemplate, metricas: [...metricasBenchmark] }])
    setNomeNovoTemplate('')
  }

  if (carregando) return (
    <div className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin mx-auto mb-4"></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse italic">Calculando Benchmarks...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/central-dados')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
              Benchmark <span className="text-brand-yellow">Performance</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Comparação Técnica com a Média da Liga</p>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS NO TOPO */}
        <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-800/50 shadow-2xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black italic uppercase tracking-tighter">Configurar <span className="text-brand-yellow">Benchmark</span></h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="NOME DO TEMPLATE..." 
                  value={nomeNovoTemplate} 
                  onChange={e => setNomeNovoTemplate(e.target.value)} 
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:border-brand-yellow/50"
                />
                <button onClick={salvarTemplate} className="bg-brand-yellow text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-brand-yellow/80 transition-all">Salvar</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 mb-1">
                <button 
                  onClick={() => setMetricasBenchmark([])}
                  className="text-[10px] font-black uppercase text-slate-500 hover:text-brand-yellow transition-colors ml-1"
                >
                  [ Desmarcar Tudo ]
                </button>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar flex-1">
                  {Object.keys(categoriasMetricas).map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setAbaAtiva(cat)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaAtiva === cat ? 'bg-brand-yellow text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
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
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[8px] font-black uppercase text-slate-400 hover:text-brand-yellow hover:border-brand-yellow/50 transition-all"
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
                className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group ${metricasBenchmark.includes(metrica) ? 'bg-brand-yellow/10 border-brand-yellow text-brand-yellow' : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-600'}`}
              >
                <span className="truncate mr-2">{metrica}</span>
                {metricasBenchmark.includes(metrica) && <div className="w-2 h-2 bg-brand-yellow rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* SIDEBAR SELEÇÃO */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtros</h3>
              <div className="space-y-4">
                <input type="text" placeholder="BUSCAR ATLETA..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-brand-yellow/50" />
                <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-brand-yellow/50">
                  {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
                <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto p-1 custom-scrollbar">
                  {posicoes.map(p => (
                    <button key={p} onClick={() => togglePosicao(p)} className={`px-2 py-1 rounded text-[8px] font-black uppercase border transition-all ${filtrosPosicao.includes(p) ? 'bg-brand-yellow text-slate-950 border-brand-yellow' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Atletas ({jogadoresFiltrados.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {jogadoresFiltrados.map(j => (
                  <button 
                    key={j.Jogador}
                    onClick={() => setJogadorSelecionado(j)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border ${jogadorSelecionado?.Jogador === j.Jogador ? 'bg-brand-yellow border-brand-yellow text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    <div className="font-black italic uppercase text-[11px] tracking-tighter">{j.Jogador}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">{j.Time || j.Equipe}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ÁREA DE BENCHMARK */}
          <div className="lg:col-span-3 space-y-8">
            {jogadorSelecionado ? (
              <>
                {/* CARD DO ATLETA */}
                <div className="bg-slate-900/40 rounded-[3rem] p-10 border border-slate-800/50 shadow-2xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-brand-yellow/[0.03] to-transparent"></div>
                  <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <div className="w-32 h-32 bg-slate-950 rounded-[2.5rem] border-2 border-brand-yellow flex items-center justify-center text-4xl font-black italic text-brand-yellow shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                      {jogadorSelecionado.Jogador.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-center md:text-left">
                      <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-2">{jogadorSelecionado.Jogador}</h2>
                      <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <span className="px-4 py-1.5 bg-slate-950 border border-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">{jogadorSelecionado.Time || jogadorSelecionado.Equipe}</span>
                        <span className="px-4 py-1.5 bg-brand-yellow/10 border border-brand-yellow/30 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-yellow">{jogadorSelecionado.Posição}</span>
                        <span className="px-4 py-1.5 bg-slate-950 border border-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">{jogadorSelecionado.Idade} ANOS</span>
                      </div>
                    </div>
                    <div className="md:ml-auto text-center md:text-right">
                      <span className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Referência de Média</span>
                      <select 
                        value={posicaoReferencia} 
                        onChange={e => setPosicaoReferencia(e.target.value)}
                        className="bg-slate-950 border border-brand-yellow/30 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none text-brand-yellow"
                      >
                        <option value="MESMA">MESMA POSIÇÃO ({jogadorSelecionado.Posição})</option>
                        <option value="LIGA">MÉDIA DA LIGA (GERAL)</option>
                        {posicoes.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* GRID DE MÉTRICAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {metricasBenchmark.map(m => {
                    const valAtleta = parseValue(jogadorSelecionado[m])
                    const valMedia = mediaReferencia[m] || 0
                    const diff = valMedia === 0 ? 0 : ((valAtleta - valMedia) / valMedia) * 100
                    const percent = Math.min(Math.max((valAtleta / (valMedia * 2 || 1)) * 50, 5), 95)

                    return (
                      <div key={m} className="bg-slate-900/40 rounded-[2rem] p-8 border border-slate-800/50 hover:border-brand-yellow/20 transition-all group shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{m}</h4>
                            <div className="text-3xl font-black italic text-white group-hover:text-brand-yellow transition-colors">{valAtleta}</div>
                          </div>
                          <div className={`text-right ${diff >= 0 ? 'text-brand-yellow' : 'text-red-500'}`}>
                            <span className="text-[10px] font-black uppercase block mb-1">vs Média</span>
                            <span className="text-lg font-black italic">{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        <div className="relative h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                          <div className="absolute top-0 left-1/2 w-0.5 h-full bg-slate-700 z-10"></div>
                          <div 
                            className={`absolute top-0 h-full transition-all duration-1000 ${diff >= 0 ? 'bg-brand-yellow shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'bg-red-500'}`}
                            style={{ 
                              left: diff >= 0 ? '50%' : `${Math.max(50 + (diff/2), 0)}%`,
                              width: `${Math.abs(diff/2)}%`,
                              maxWidth: '50%'
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-3 text-[8px] font-black uppercase tracking-widest text-slate-600">
                          <span>Abaixo da Média</span>
                          <span>Acima da Média</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-black italic uppercase tracking-widest">Selecione um atleta para iniciar o benchmark</div>
            )}
          </div>
        </div>

      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c10; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fbbf24; }
      `}</style>
    </div>
  )
}
