'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv";

export default function BenchmarkPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('Todas')
  const [filtrosPosicao, setFiltrosPosicao] = useState([])
  const [jogadorSelecionado, setJogadorSelecionado] = useState(null)
  const [posicaoReferencia, setPosicaoReferencia] = useState('MESMA')

  // Métricas e UI
  const [metricasBenchmark, setMetricasBenchmark] = useState(['Gols', 'Assistências', 'Passes precisos %', 'Dribles', 'Desafios vencidos, %', 'Interceptações'])
  const [abaAtiva, setAbaAtiva] = useState('Ataque')
  const [categoriasMetricas, setCategoriasMetricas] = useState({})

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`)
        const csvText = await response.text()
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const dados = results.data.filter(j => j.Jogador && j.Jogador.trim())
            setJogadores(dados)
            if (dados.length > 0) {
              setJogadorSelecionado(dados[0])
              const colunas = Object.keys(dados[0]).filter(col => col && col.trim() && !['Jogador', 'Time', 'Equipe', 'Posição', '№', 'Idade', 'Altura', 'Peso', 'Nacionalidade'].includes(col))
              setCategoriasMetricas(categorizarMetricas(colunas))
            }
            setCarregando(false)
          }
        })
      } catch (error) { setCarregando(false) }
    }
    carregarDados()
  }, [])

  const categorizarMetricas = (colunas) => {
    const categorias = { 'Ataque': [], 'Defesa': [], 'Passes & Criação': [], 'Posse & Controle': [], 'Físico & Duelos': [], 'Geral': [] }
    const palavrasChave = {
      'Ataque': ['gol', 'finalização', 'chute', 'xg', 'chance', 'header'],
      'Defesa': ['desarme', 'interceptação', 'disputa', 'defesa', 'cartão'],
      'Passes & Criação': ['passe', 'cruzamento', 'chave', 'progressivo', 'assistência'],
      'Posse & Controle': ['drible', 'controle', 'perda', 'bola', 'posse'],
      'Físico & Duelos': ['minuto', 'duelo', 'disputa aérea']
    }
    colunas.forEach(metrica => {
      const m = metrica.toLowerCase()
      let catFound = false
      for (const [cat, words] of Object.entries(palavrasChave)) {
        if (words.some(w => m.includes(w))) { categorias[cat].push(metrica); catFound = true; break }
      }
      if (!catFound) categorias['Geral'].push(metrica)
    })
    return categorias
  }

  const parseValue = (val) => {
    if (!val || val === '-') return 0
    const clean = String(val).replace('%', '').replace(',', '.')
    return parseFloat(clean) || 0
  }

  const times = useMemo(() => ['Todas', ...new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean))].sort(), [jogadores])
  const posicoes = useMemo(() => [...new Set(jogadores.map(j => j.Posição).filter(Boolean))].sort(), [jogadores])

  const jogadoresFiltrados = useMemo(() => {
    return jogadores.filter(j => {
      const pB = j.Jogador.toLowerCase().includes(busca.toLowerCase())
      const pT = filtroTime === 'Todas' || j.Time === filtroTime || j.Equipe === filtroTime
      const pP = filtrosPosicao.length === 0 || filtrosPosicao.includes(j.Posição)
      return pB && pT && pP
    })
  }, [jogadores, busca, filtroTime, filtrosPosicao])

  const mediaReferencia = useMemo(() => {
    if (!jogadorSelecionado) return {}
    const posParaMedia = posicaoReferencia === 'MESMA' ? jogadorSelecionado.Posição : posicaoReferencia
    const jogadoresParaMedia = posParaMedia === 'LIGA' ? jogadores : jogadores.filter(j => j.Posição === posParaMedia)
    const medias = {}
    metricasBenchmark.forEach(m => {
      const valores = jogadoresParaMedia.map(j => parseValue(j[m]))
      medias[m] = valores.reduce((a, b) => a + b, 0) / (valores.length || 1)
    })
    return medias
  }, [jogadores, jogadorSelecionado, posicaoReferencia, metricasBenchmark])

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-emerald-500">Calculando Benchmarks...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/central-dados')} className="p-4 bg-slate-900/80 hover:bg-emerald-500/20 rounded-2xl border border-slate-800 transition-all group"><svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <div><h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">Benchmark <span className="text-emerald-500">Performance</span></h1></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtros</h3>
              <div className="space-y-3">
                <input type="text" placeholder="BUSCAR..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none" />
                <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none">{times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select>
                <div className="flex flex-wrap gap-1 max-h-[150px] overflow-y-auto p-1">{posicoes.map(p => <button key={p} onClick={() => setFiltrosPosicao(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${filtrosPosicao.includes(p) ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>{p}</button>)}</div>
              </div>
            </div>
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Atletas ({jogadoresFiltrados.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {jogadoresFiltrados.map(j => <button key={j.Jogador} onClick={() => setJogadorSelecionado(j)} className={`w-full p-4 rounded-2xl text-left transition-all border ${jogadorSelecionado?.Jogador === j.Jogador ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}><div className="font-black italic uppercase text-[11px]">{j.Jogador}</div><div className="text-[8px] font-bold uppercase opacity-60">{j.Posição} • {j.Time || j.Equipe}</div></button>)}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {jogadorSelecionado && (
              <div className="bg-slate-900/40 rounded-[3rem] p-10 border border-slate-800/50">
                <div className="flex justify-between items-center mb-12">
                  <div>
                    <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">{jogadorSelecionado.Jogador}</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">{jogadorSelecionado.Posição} • {jogadorSelecionado.Time || jogadorSelecionado.Equipe}</p>
                  </div>
                  <select value={posicaoReferencia} onChange={e => setPosicaoReferencia(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black uppercase outline-none">
                    <option value="MESMA">Média da Posição ({jogadorSelecionado.Posição})</option>
                    <option value="LIGA">Média Geral da Liga</option>
                    {posicoes.map(p => <option key={p} value={p}>Média de {p}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {metricasBenchmark.map(m => {
                    const val = parseValue(jogadorSelecionado[m]), med = mediaReferencia[m] || 1
                    const diff = ((val - med) / med) * 100
                    return (
                      <div key={m} className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50">
                        <div className="flex justify-between mb-4"><span className="text-[10px] font-black uppercase text-slate-500">{m}</span><span className={`text-[10px] font-black ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}% vs Média</span></div>
                        <div className="flex items-end gap-4">
                          <div className="text-3xl font-black italic text-white">{jogadorSelecionado[m] || '0'}</div>
                          <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden"><div className={`h-full rounded-full ${diff >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(Math.max((val/med)*50, 10), 100)}%` }}></div></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50">
              <div className="flex justify-between mb-8">
                <h2 className="text-xl font-black italic uppercase">Configurar <span className="text-emerald-500">Benchmark</span></h2>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">{Object.keys(categoriasMetricas).map(cat => <button key={cat} onClick={() => setAbaAtiva(cat)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${abaAtiva === cat ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}>{cat}</button>)}</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">{categoriasMetricas[abaAtiva]?.map(m => <button key={m} onClick={() => setMetricasBenchmark(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} className={`p-3 rounded-xl border text-[9px] font-black uppercase transition-all text-left ${metricasBenchmark.includes(m) ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950/50 border-slate-800 text-slate-500'}`}>{m}</button>)}</div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  )
}
