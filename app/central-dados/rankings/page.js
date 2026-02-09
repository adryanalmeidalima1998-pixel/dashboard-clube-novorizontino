'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { cleanData, normalizeTeamName, safeParseFloat } from '../../utils/dataCleaner'
import { calculateRating, getDominantPerfil } from '../../utils/ratingSystem'
import { PERFIL_WEIGHTS, POSICAO_TO_PERFIS, PERFIL_DESCRICOES } from '../../utils/perfilWeights'

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVC0eenchMDxK3wsOTXjq9kQiy3aHTFl0X1o5vwJZR7RiZzg1Irxxe_SL2IDrqb3c1i7ZL2ugpBJkN/pub?output=csv";
const GOLEIROS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlQGKcj7Dv6ziVn4MU-zs6PAJc5WFyjwr0aks9xNdG4rgRw4iwRNFws7lDGXtjNoQHGypQJ4ssSlqM/pub?output=csv";

export default function RankingsPage() {
  const router = useRouter()
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  const [busca, setBusca] = useState('')
  const [filtroTime, setFiltroTime] = useState('todos')
  const [filtroIdade, setFiltroIdade] = useState({ min: 15, max: 45 })
  const [filtroMinutagem, setFiltroMinutagem] = useState(0)
  const [perfilAtivo, setPerfilAtivo] = useState('Goleiro Defensor da Meta')
  const [ordenacao, setOrdenacao] = useState({ coluna: 'nota', direcao: 'desc' })

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [resGeral, resGoleiros] = await Promise.all([
          fetch(`${CSV_URL}&t=${Date.now()}`),
          fetch(`${GOLEIROS_CSV_URL}&t=${Date.now()}`)
        ]);
        
        const [csvGeral, csvGoleiros] = await Promise.all([
          resGeral.text(),
          resGoleiros.text()
        ]);
        
        let dadosGeral = [];
        let dadosGoleiros = [];

        Papa.parse(csvGeral, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            dadosGeral = cleanData(results.data).map(j => ({
              ...j,
              Time: normalizeTeamName(j.Time || j.Equipe || '')
            }));
            finalizarCarregamento();
          }
        });

        Papa.parse(csvGoleiros, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            dadosGoleiros = cleanData(results.data).map(j => ({
              ...j,
              Time: normalizeTeamName(j.Time || j.Equipe || ''),
              Posição: 'GOLEIRO'
            }));
            finalizarCarregamento();
          }
        });

        let count = 0;
        function finalizarCarregamento() {
          count++;
          if (count === 2) {
            setJogadores([...dadosGeral, ...dadosGoleiros]);
            setCarregando(false);
          }
        }
      } catch (error) { setCarregando(false); }
    }
    carregarDados()
  }, [])

  const posicoesCompativeis = useMemo(() => {
    return Object.entries(POSICAO_TO_PERFIS)
      .filter(([pos, perfis]) => perfis.includes(perfilAtivo))
      .map(([pos]) => pos.toUpperCase())
  }, [perfilAtivo])

  const metricasPerfil = useMemo(() => {
    return Object.keys(PERFIL_WEIGHTS[perfilAtivo] || {})
  }, [perfilAtivo])

  const pesosPerfil = useMemo(() => {
    return PERFIL_WEIGHTS[perfilAtivo] || {}
  }, [perfilAtivo])

  const jogadoresRankeados = useMemo(() => {
    let filtrados = jogadores.filter(j => {
      const pB = (j.Jogador || '').toLowerCase().includes(busca.toLowerCase())
      const pT = filtroTime === 'todos' || (j.Time || j.Equipe) === filtroTime
      
      const posJogador = (j.Posição || '').trim().toUpperCase();
      const pP = posicoesCompativeis.includes(posJogador)
      
      const idade = safeParseFloat(j.Idade)
      const pI = (idade === 0 && filtroIdade.min === 15) || (idade >= filtroIdade.min && idade <= filtroIdade.max)
      
      const pM = safeParseFloat(j['Minutos jogados']) >= filtroMinutagem
      return pB && pT && pP && pI && pM
    })

    const comNota = filtrados.map(j => {
      const nota = calculateRating(j, jogadores, perfilAtivo)
      const dominant = getDominantPerfil(j, jogadores)
      return {
        ...j,
        nota,
        perfilDominante: dominant.perfil,
        notaDominante: dominant.nota
      }
    })

    comNota.sort((a, b) => {
      if (ordenacao.coluna === 'nota') {
        return ordenacao.direcao === 'desc' ? b.nota - a.nota : a.nota - b.nota
      }
      const vA = safeParseFloat(a[ordenacao.coluna]), vB = safeParseFloat(b[ordenacao.coluna])
      if (isNaN(vA) || isNaN(vB)) {
        const sA = String(a[ordenacao.coluna] || '')
        const sB = String(b[ordenacao.coluna] || '')
        return ordenacao.direcao === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA)
      }
      return ordenacao.direcao === 'asc' ? vA - vB : vB - vA
    })

    return comNota
  }, [jogadores, busca, filtroTime, filtroIdade, filtroMinutagem, perfilAtivo, posicoesCompativeis, ordenacao])

  const times = useMemo(() => {
    const uniqueTimes = new Set(jogadores.map(j => j.Time || j.Equipe).filter(Boolean));
    return ['todos', ...Array.from(uniqueTimes).sort()];
  }, [jogadores])

  const handleOrdenacao = (coluna) => {
    setOrdenacao(prev => ({ 
      coluna, 
      direcao: prev.coluna === coluna && prev.direcao === 'desc' ? 'asc' : 'desc' 
    }))
  }

  const perfisPorCategoria = useMemo(() => {
    const ordemCategorias = [
      { key: 'Goleiro', label: 'Goleiros' },
      { key: 'Lateral', label: 'Laterais' },
      { key: 'Zagueiro', label: 'Zagueiros' },
      { key: 'Volante', label: 'Volantes' },
      { key: '2º Volante', label: '2º Volantes (Médios)' },
      { key: 'Meia', label: 'Meias' },
      { key: 'Extremo', label: 'Extremos' },
      { key: 'Segundo Atacante', label: 'Segundo Atacante' },
      { key: 'Centroavante', label: 'Centroavantes' }
    ]
    const categorias = {}
    ordemCategorias.forEach(({ key, label }) => {
      const perfis = Object.keys(PERFIL_WEIGHTS).filter(p => p.startsWith(key))
      if (perfis.length > 0) categorias[label] = perfis
    })
    return categorias
  }, [])

  const exportarPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4')
      doc.text(`RANKING - ${perfilAtivo.toUpperCase()}`, 14, 20)
      const head = [['#', 'Jogador', 'Time', 'Posição', 'Nota', ...metricasPerfil]]
      const body = jogadoresRankeados.map((j, idx) => [
        idx + 1, j.Jogador, j.Time || j.Equipe, j.Posição, j.nota?.toFixed(1),
        ...metricasPerfil.map(m => j[m] || '0')
      ])
      doc.autoTable({ head, body, startY: 30, theme: 'grid', styles: { fontSize: 7 } })
      doc.save(`ranking-${perfilAtivo.toLowerCase().replace(/\s/g, '-')}.pdf`)
    } catch (e) {
      console.error('Erro PDF:', e)
      alert('Erro ao gerar PDF')
    }
  }

  if (carregando) return <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center text-brand-yellow">Processando Rankings...</div>

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/central-dados')} className="p-4 bg-slate-900/80 hover:bg-brand-yellow/20 rounded-2xl border border-slate-800 transition-all group"><svg className="w-6 h-6 text-slate-500 group-hover:text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
            <div>
              <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                <span className="text-brand-yellow">Rankings</span> por Perfil
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Inteligência de Scout baseada em Z-Score</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportarPDF} className="px-6 py-3 bg-brand-yellow text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-yellow/80 transition-all">Exportar PDF</button>
          </div>
        </div>

        {/* SELETOR DE PERFIL */}
        <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800/50 mb-8">
          <h2 className="text-lg font-black italic uppercase mb-6">Selecionar <span className="text-brand-yellow">Perfil Técnico</span></h2>
          <div className="space-y-4">
            {Object.entries(perfisPorCategoria).map(([categoria, perfis]) => (
              <div key={categoria}>
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">{categoria}</h3>
                <div className="flex flex-wrap gap-2">
                  {perfis.map(perfil => (
                    <button
                      key={perfil}
                      onClick={() => { setPerfilAtivo(perfil); setOrdenacao({ coluna: 'nota', direcao: 'desc' }); }}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border ${
                        perfilAtivo === perfil
                          ? 'bg-brand-yellow text-slate-950 border-brand-yellow shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                          : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-brand-yellow/30 hover:text-brand-yellow'
                      }`}
                    >
                      {perfil}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INFO DO PERFIL SELECIONADO */}
        <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-brand-yellow/20 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black italic uppercase text-brand-yellow">{perfilAtivo}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                Posições compatíveis: {posicoesCompativeis.join(', ')} | {jogadoresRankeados.length} atletas encontrados
              </p>
              {PERFIL_DESCRICOES[perfilAtivo] && <p className="text-[10px] text-slate-400 mt-2 italic">{PERFIL_DESCRICOES[perfilAtivo]}</p>}
            </div>
            <div className="flex flex-wrap gap-3">
              {metricasPerfil.map(m => (
                <div key={m} className="bg-slate-950 border border-brand-yellow/30 rounded-xl px-4 py-2 flex flex-col items-center">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{m}</span>
                  <span className="text-brand-yellow font-black text-lg">{Math.round(pesosPerfil[m] * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Buscar Atleta</h3>
            <input type="text" placeholder="NOME DO ATLETA..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50" />
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Filtrar Time</h3>
            <select value={filtroTime} onChange={e => setFiltroTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50">
              {times.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Idade</h3>
            <div className="flex items-center gap-3">
              <input type="number" value={filtroIdade.min} onChange={e => setFiltroIdade({...filtroIdade, min: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50" />
              <span className="text-slate-500 font-black">/</span>
              <input type="number" value={filtroIdade.max} onChange={e => setFiltroIdade({...filtroIdade, max: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50" />
            </div>
          </div>
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Minutos Jogados (Mín)</h3>
            <input type="number" value={filtroMinutagem} onChange={e => setFiltroMinutagem(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-black outline-none focus:border-brand-yellow/50" />
          </div>
        </div>

        {/* TABELA DE RANKING */}
        <div className="bg-slate-900/20 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800/50">
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Ranking</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Atleta</th>
                  <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Equipe</th>
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Pos</th>
                  <th className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-brand-yellow cursor-pointer" onClick={() => handleOrdenacao('nota')}>Nota</th>
                  {metricasPerfil.map(m => (
                    <th key={m} className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-brand-yellow transition-all" onClick={() => handleOrdenacao(m)}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {jogadoresRankeados.map((j, idx) => (
                  <tr key={idx} className="group transition-all hover:bg-white/[0.02]">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-black italic ${idx < 3 ? 'text-brand-yellow' : 'text-slate-700'}`}>
                          #{idx + 1}
                        </span>
                        {idx === 0 && <span className="text-xl">🥇</span>}
                        {idx === 1 && <span className="text-xl">🥈</span>}
                        {idx === 2 && <span className="text-xl">🥉</span>}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 group-hover:border-brand-yellow/30 transition-all uppercase">
                          {j.ID_ATLETA || j.Jogador?.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase italic tracking-tight text-white group-hover:text-brand-yellow transition-colors">{j.Jogador}</p>
                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">• {j.Idade} anos</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-black uppercase italic text-slate-400">{j.Time || j.Equipe}</span>
                    </td>
                    <td className="p-6 text-center">
                      <span className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[9px] font-black text-slate-500 uppercase">{j.Posição}</span>
                    </td>
                    <td className="p-6 text-center">
                      <div className={`inline-block px-3 py-1 rounded-lg font-black text-sm italic ${
                        j.nota >= 8 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        j.nota >= 6.5 ? 'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20' :
                        j.nota >= 5 ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                        'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {j.nota?.toFixed(1)}
                      </div>
                      <p className="text-[8px] font-black uppercase mt-1 opacity-50">
                        {j.nota >= 8 ? 'Elite' : j.nota >= 6.5 ? 'Bom' : j.nota >= 5 ? 'Regular' : 'Abaixo'}
                      </p>
                    </td>
                    {metricasPerfil.map(m => (
                      <td key={m} className="p-6 text-center text-xs font-black italic text-white">{j[m] || '0'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-800">Novorizontino Scouting Intelligence • 2026</p>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  )
}
