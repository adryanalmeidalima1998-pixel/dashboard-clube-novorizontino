'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { sheetUrl } from '../../datasources';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';

// Colunas fixas que NUNCA são métricas
const COLUNAS_FIXAS = [
  'ID_ATLETA', 'Jogador', 'Time', 'Idade', 'Altura', 'Peso', 
  'Nacionalidade', 'Pé dominante', 'Index', 'Minutos jogados', 
  'Posição', 'Falhas em gol', 'Erros graves'
];

// Categorização dinâmica com palavras-chave
const CATEGORIAS_METRICAS = {
  'ATAQUE': {
    keywords: ['gol', 'finalização', 'toque', 'área', 'chance', 'xg', 'shot', 'remate', 'chute', 'tentativa']
  },
  'DEFESA': {
    keywords: ['desarme', 'interceptação', 'recuperação', 'bloqueio', 'falta', 'cartão', 'defesa', 'roubo', 'corte']
  },
  'PASSES & CRIAÇÃO': {
    keywords: ['assistência', 'passe', 'cruzamento', 'decisivo', 'progressão', 'criação', 'através', 'bola']
  },
  'POSSE & CONTROLE': {
    keywords: ['posse', 'controle', 'toque', 'drible', 'condução', 'domínio', 'bola']
  },
  'FÍSICO & DUELOS': {
    keywords: ['duelo', 'aceleração', 'velocidade', 'físico', 'corrida', 'distância', 'sprint', 'ganho']
  },
  'GERAL': {
    keywords: []
  }
};

function categorizarMetrica(metrica) {
  const metricaLower = metrica.toLowerCase().trim();
  
  if (COLUNAS_FIXAS.some(col => col.toLowerCase() === metricaLower)) {
    return null;
  }
  
  for (const [categoria, config] of Object.entries(CATEGORIAS_METRICAS)) {
    if (categoria === 'GERAL') continue;
    
    if (config.keywords.some(keyword => metricaLower.includes(keyword))) {
      return categoria;
    }
  }
  
  return 'GERAL';
}

function ehNumerico(valor) {
  if (valor === null || valor === undefined || valor === '') return false;
  if (valor === '-') return false;
  const num = parseFloat(String(valor).replace(',', '.'));
  return !isNaN(num);
}

function ListaPreferencialContent() {
  const router = useRouter();
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');
  const [metricasSelecionadas, setMetricasSelecionadas] = useState([]);
  const [todasMetricas, setTodasMetricas] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('ATAQUE');
  const [gerandoLote, setGerandoLote] = useState(false);

  const calcularPor90 = (valor, minutosJogados) => {
    const val = safeParseFloat(valor);
    const minutos = safeParseFloat(minutosJogados);
    if (minutos === 0 || minutos === '-' || val === '-') return 0;
    return (val / minutos) * 90;
  };

  const processarDados = (dados, aba) => {
    if (dados.length === 0) return [];

    const primeiraLinha = dados[0];
    const metricasReais = Object.keys(primeiraLinha).filter(coluna => {
      if (COLUNAS_FIXAS.includes(coluna)) return false;
      if (!coluna || coluna.trim() === '') return false;
      const temNumerico = dados.some(d => ehNumerico(d[coluna]));
      return temNumerico;
    });

    return dados.map(jogador => {
      const minutosJogados = safeParseFloat(jogador['Minutos jogados']);
      const processado = {
        ...jogador,
        aba: aba,
        minutosJogados: minutosJogados,
      };
      metricasReais.forEach(metrica => {
        const chaveCalc = `${metrica}_por_90`;
        processado[chaveCalc] = calcularPor90(jogador[metrica], minutosJogados);
      });
      return processado;
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlAba1 = sheetUrl('LISTA_PREFERENCIAL');

        const response1 = await fetch(urlAba1);
        const csvText1 = await response1.text();

        Papa.parse(csvText1, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dadosLimpos = cleanData(results.data);
            const listaProcessada = processarDados(dadosLimpos, 'LISTA PREFERENCIAL');
            let todasMetricasDetectadas = [];

            if (listaProcessada.length > 0) {
              todasMetricasDetectadas = Object.keys(listaProcessada[0])
                .filter(k => k.endsWith('_por_90'))
                .sort();
            }

            setListaPreferencial(listaProcessada);
            setTodasMetricas(todasMetricasDetectadas);

            const saved = localStorage.getItem('metricasTemplate');
            if (saved) {
              try {
                const metricas = JSON.parse(saved);
                setMetricasSelecionadas(metricas);
              } catch (e) {
                if (todasMetricasDetectadas.length > 0) {
                  setMetricasSelecionadas(todasMetricasDetectadas.slice(0, 5));
                }
              }
            } else if (todasMetricasDetectadas.length > 0) {
              setMetricasSelecionadas(todasMetricasDetectadas.slice(0, 5));
            }
          }
        });

        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const metricasPorCategoria = useMemo(() => {
    const grouped = {};
    Object.keys(CATEGORIAS_METRICAS).forEach(cat => {
      grouped[cat] = [];
    });
    
    todasMetricas.forEach(metrica => {
      const categoria = categorizarMetrica(metrica);
      if (categoria) {
        grouped[categoria].push(metrica);
      }
    });
    
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort();
    });
    
    return grouped;
  }, [todasMetricas]);

  const jogadoresFiltrados = useMemo(() => {
    return listaPreferencial.filter(j => {
      const matchTeam = !filterTeam || (j.Time && j.Time.toLowerCase().includes(filterTeam.toLowerCase()));
      return matchTeam;
    });
  }, [listaPreferencial, filterTeam]);

  const handleToggleMetrica = (metrica) => {
    if (metricasSelecionadas.includes(metrica)) {
      setMetricasSelecionadas(metricasSelecionadas.filter(m => m !== metrica));
    } else {
      if (metricasSelecionadas.length < 8) {
        setMetricasSelecionadas([...metricasSelecionadas, metrica]);
      }
    }
  };

  const salvarTemplate = () => {
    localStorage.setItem('metricasTemplate', JSON.stringify(metricasSelecionadas));
    alert('✅ Template de métricas salvo com sucesso!');
  };

  const getPlayerPhoto = (name) => {
    if (!name) return '/images/players/default.png';
    const cleanName = name.trim();
    const mapa = {
      'Kayke': 'Kayke_Ferrari.png',
      'Rodrigo Farofa': 'rodrigo_rodrigues.png',
      'Allison Patrick': 'Allison.png',
      'Santi González': 'santi_gonzález.png',
      'Sorriso': 'sorriso.png',
      'Romarinho': 'romarinho.png',
    };
    if (mapa[cleanName]) return `/images/players/${mapa[cleanName]}`;
    return `/images/players/${cleanName.replace(/\s+/g, '_')}.png`;
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
      Carregando Lista Preferencial...
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans print:p-0 overflow-x-hidden">
      <style jsx global>{`
        @media print {
          @page { size: A3 landscape; margin: 0.5cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .table-scroll-wrapper { overflow: visible !important; }
          table { font-size: 8px !important; width: 100% !important; table-layout: auto; }
          th, td { padding: 3px 5px !important; word-break: break-word; white-space: nowrap; }
          thead tr { background-color: #0f172a !important; }
          thead th { color: white !important; }
          .avatar-initial { display: none !important; }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto print-container flex flex-col gap-4">

        {/* HEADER */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <button
              onClick={() => router.push('/central-scouting')}
              className="no-print bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              ← VOLTAR
            </button>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">
              Lista Preferencial
            </div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              DATA: {new Date().toLocaleDateString('pt-BR')} · {jogadoresFiltrados.length} ATLETAS
            </div>
          </div>
        </header>

        {/* FILTROS */}
        <div className="no-print flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="FILTRAR POR TIME..."
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="border-2 border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-amber-500 w-48"
          />
          <div className="flex gap-2 ml-2">
            <button
              onClick={() => router.push('/central-scouting/lista-preferencial/ponderacao')}
              className="border-2 border-slate-200 hover:border-amber-500 text-slate-700 hover:text-black font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
            >
              ▦ Ponderação
            </button>
            <button
              onClick={() => router.push('/central-scouting/lista-preferencial/dispersao')}
              className="border-2 border-slate-200 hover:border-amber-500 text-slate-700 hover:text-black font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
            >
              ◎ Dispersão
            </button>
            <button
              onClick={() => router.push('/central-scouting/lista-preferencial/radar-comparativo')}
              className="border-2 border-slate-200 hover:border-amber-500 text-slate-700 hover:text-black font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
            >
              ◉ Radar
            </button>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-[9px] font-black text-slate-400 uppercase">{listaPreferencial.length} atletas na lista</span>
          </div>
        </div>

        {/* SELETOR DE MÉTRICAS */}
        {todasMetricas.length > 0 && (
          <div className="no-print border-2 border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Métricas exibidas</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black">{metricasSelecionadas.length}/8</span>
                {metricasSelecionadas.length > 0 && (
                  <button
                    onClick={() => setMetricasSelecionadas([])}
                    className="px-2 py-0.5 border border-slate-300 hover:border-red-400 hover:text-red-500 text-slate-400 rounded text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    ✕ Desmarcar tudo
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Object.keys(CATEGORIAS_METRICAS).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaAtiva(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      categoriaAtiva === cat
                        ? 'bg-amber-500 text-black'
                        : 'border border-slate-200 text-slate-500 hover:border-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
              {metricasPorCategoria[categoriaAtiva].map(metrica => (
                <button
                  key={metrica}
                  onClick={() => handleToggleMetrica(metrica)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    metricasSelecionadas.includes(metrica)
                      ? 'bg-amber-500 border-amber-500 text-black'
                      : 'border-slate-200 text-slate-500 hover:border-slate-400'
                  }`}
                >
                  <div className="text-[8px] font-black uppercase tracking-tight leading-tight">{metrica.replace('_por_90', '')}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={salvarTemplate}
                className="bg-slate-900 hover:bg-black text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
              >
                💾 Salvar Template
              </button>
            </div>
          </div>
        )}

        {/* TABELA */}
        <div className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
            Lista Preferencial · Métricas por 90 min · {jogadoresFiltrados.length} atletas exibidos
          </div>          <div className="overflow-x-auto table-scroll-wrapper">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-900">
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 w-8">#</th>
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[160px]">Atleta</th>
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[90px]">Time</th>
                  <th className="px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[50px]">Pos</th>
                  <th className="px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[40px]">Idade</th>
                  <th className="px-3 py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-300 min-w-[50px]">Min</th>
                  {metricasSelecionadas.map(m => (
                    <th key={m} className="px-2 py-3 text-center text-[8px] font-black uppercase tracking-widest text-amber-400 min-w-[90px]">
                      {m.replace('_por_90', '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jogadoresFiltrados.map((j, idx) => (
                  <tr
                    key={idx}
                    onClick={() => router.push(`/central-scouting/lista-preferencial/${j.ID_ATLETA || j.Jogador}`)}
                    className="hover:bg-amber-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="px-3 py-2.5 text-[9px] font-black text-slate-400">#{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="no-print avatar-initial w-7 h-7 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                          <img
                            src={getPlayerPhoto(j.Jogador)}
                            alt={j.Jogador}
                            className="w-full h-full object-cover object-top"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = `<span class="w-full h-full flex items-center justify-center text-[8px] font-black text-slate-500">${(j.Jogador||'??').substring(0,2).toUpperCase()}</span>`;
                            }}
                          />
                        </div>
                        <div>
                          <div className="font-black uppercase italic tracking-tight text-[10px] group-hover:text-amber-600 transition-colors">{j.Jogador}</div>
                          <div className="text-[8px] text-slate-400 font-bold">{j.Idade} anos</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[9px] font-black uppercase text-slate-600">{j.Time}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-600">{j.Posição}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[9px] font-black">{j.Idade}</td>
                    <td className="px-3 py-2.5 text-center text-[9px] font-black tabular-nums">{j.minutosJogados}</td>
                    {metricasSelecionadas.map(m => (
                      <td key={m} className="px-2 py-2.5 text-center">
                        <span className="tabular-nums text-[10px] font-bold text-slate-700">
                          {typeof j[m] === 'number' ? j[m].toFixed(2) : '-'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {jogadoresFiltrados.length === 0 && (
          <div className="border-2 border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-slate-500 font-bold text-sm">Nenhum atleta encontrado com os filtros selecionados.</p>
          </div>
        )}

        {/* FOOTER */}
        <footer className="no-print flex justify-between items-center border-t-2 border-slate-900 pt-3">
          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-black text-white font-black px-8 py-3 rounded-2xl text-sm shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              EXPORTAR PDF
            </button>
            <button
              onClick={() => router.push('/central-scouting')}
              className="text-slate-500 hover:text-black text-sm font-black uppercase tracking-widest px-4 transition-colors"
            >
              Voltar
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>

      </div>
    </div>
  );
}

export default function ListaPreferencial() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ListaPreferencialContent />
    </Suspense>
  );
}
