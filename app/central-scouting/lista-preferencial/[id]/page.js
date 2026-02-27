'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { sheetUrl } from '../../../datasources';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';
import HeatmapComponent from '@/app/components/HeatmapComponent';
import { calcularPerfilSugerido } from '@/app/utils/perfilAnalyzer';
import { gerarTextoAnalise } from '@/app/utils/textGenerator';
import { PERFIL_DESCRICOES } from '@/app/utils/perfilWeights';

// ── IMPORTAÇÃO DAS MÉTRICAS DINÂMICAS POR POSIÇÃO ──
import { getMetricsByPosicao, normalizePosicao } from '@/app/utils/positionMetrics';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-slate-400 font-bold italic animate-pulse text-sm">
      CARREGANDO...
    </div>
  ),
});

// ─── Métricas Fallback (Caso a posição falhe ou não exista) ─────────────────
const FALLBACK_METRICS = [
  { label: 'Passes Chave',              key: 'Passes chave',                                type: 'per90', max: 5 },
  { label: 'Passes Progressivos %',     key: 'Passes progressivos precisos,%',              type: 'raw',   max: 100 },
  { label: 'Passes na Área %',          key: 'Passes dentro da área / precisos, %',         type: 'raw',   max: 100 },
  { label: 'Dribles Certos/90',         key: 'Dribles bem sucedidos',                       type: 'per90', max: 6 },
  { label: 'Dribles 1/3 Final/90',      key: 'Dribles no último terço do campo com sucesso',type: 'per90', max: 4 },
  { label: 'Entradas 1/3 Final/90',     key: 'Entradas no terço final carregando a bola',   type: 'per90', max: 5 },
  { label: 'Recuperações Campo Adv/90', key: 'Bolas recuperadas no campo do adversário',    type: 'per90', max: 6 },
  { label: 'xA/90',                     key: 'xA',                                          type: 'per90', max: 0.5 },
  { label: 'xG/90',                     key: 'Xg',                                          type: 'per90', max: 0.5 },
  { label: 'Ações Área Adv/90',         key: 'Ações na área adversária bem-sucedidas',      type: 'per90', max: 6 },
];

// ─── Utilitários puros (sem estado) ─────────────────────────────────────────

/** Converte um jogador cru do CSV, pré-calculando raw e per90 para TODAS as colunas. */
function processarJogador(raw, fonte) {
  const minutos = safeParseFloat(raw['Minutos jogados']);
  const jaPer90 = fonte === 'GN' || fonte === 'SERIEB';
  const obj = { ...raw, _fonte: fonte, _minutos: minutos };
  
  Object.keys(raw).forEach(k => {
    const v = safeParseFloat(raw[k]);
    obj[`_v_${k}_raw`] = v;
    obj[`_v_${k}_per90`] = jaPer90 ? v : (minutos > 0 ? (v / minutos) * 90 : 0);
  });
  
  return obj;
}

/** Retorna o valor processado de uma métrica para um jogador */
function getVal(jogador, metrica) {
  if (!jogador) return 0;
  const isPer90 = metrica.type === 'per90' || metrica.per90 === true;
  const key = isPer90 ? `_v_${metrica.key}_per90` : `_v_${metrica.key}_raw`;
  let val = jogador[key] !== undefined ? jogador[key] : safeParseFloat(jogador[metrica.key]);

  // CORREÇÃO INTELIGENTE PARA PORCENTAGEM:
  // Se a métrica é de %, e o valor no CSV veio como decimal (ex: 0.31), multiplicamos por 100 para virar 31%.
  const isPercentage = metrica.label.includes('%') || metrica.key.includes('%');
  if (isPercentage && val > 0 && val <= 2) {
    val = val * 100;
  }

  return val;
}

/** Normaliza uma posição para string uppercase padronizada */
function normPos(p) {
  return normalizePosicao(p) || (p || '').trim().toUpperCase();
}

/** Verifica se duas posições "batem" */
function mesmaPos(p1, p2) {
  const a = normPos(p1);
  const b = normPos(p2);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/** Promisifica Papa.parse */
function parseCsv(csvText, fonte) {
  return new Promise(resolve => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const limpos = cleanData(results.data).map(r => processarJogador(r, fonte));
        resolve(limpos);
      },
    });
  });
}

/** Computa a escala (p90) de cada métrica a partir de um array de jogadores baseada nas métricas ATUAIS */
function computarEscalas(jogadores, metricasAtuais) {
  const escalas = {};
  metricasAtuais.forEach(m => {
    const vals = jogadores
      .map(j => getVal(j, m))
      .filter(v => isFinite(v) && v >= 0)
      .sort((a, b) => a - b);
      
    if (vals.length === 0) { escalas[m.label] = m.max || 1; return; }
    
    const idx = Math.min(Math.floor(vals.length * 0.9), vals.length - 1);
    // Combina o percentil 90 dos dados reais com o "max" ideal definido nas configurações
    escalas[m.label] = Math.max(vals[idx], m.max || 1, 0.001);
  });
  return escalas;
}

/** Normaliza um valor na escala 0-100, travando em 100 para não estourar o radar */
function normalizar(val, max) {
  return Math.min((val / max) * 100, 100);
}

// ─── Componente principal ─────────────────────────────────────────────────────
function PlayerProfileContent() {
  const { id } = useParams();
  const router = useRouter();

  const [dados, setDados] = useState(null); 
  const [loading, setLoading] = useState(true);

  const [perfisRankeados, setPerfisRankeados]     = useState([]);
  const [perfilSelecionado, setPerfilSelecionado] = useState('');
  const [textoAnalitico, setTextoAnalitico]       = useState('');
  const [perfilEditando, setPerfilEditando]       = useState(false);

  // ── Carrega tudo em paralelo e só termina quando 100% pronto ──────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [r1, r2, r3] = await Promise.all([
          fetch(sheetUrl('LISTA_PREFERENCIAL')),
          fetch(sheetUrl('GREMIO_NOVORIZONTINO', false)),
          fetch(sheetUrl('SERIE_B', false)),
        ]);
        const [c1, c2, c3] = await Promise.all([r1.text(), r2.text(), r3.text()]);
        const [lista, gn, serieB] = await Promise.all([
          parseCsv(c1, 'LISTA'),
          parseCsv(c2, 'GN'),
          parseCsv(c3, 'SERIEB'),
        ]);

        if (cancelled) return;

        const decodedId = decodeURIComponent(id);
        const player = lista.find(d => d.ID_ATLETA === decodedId || d.Jogador === decodedId);

        if (player) {
          const timeKey = Object.keys(player).find(k => k.toLowerCase() === 'time') || 'TIME';
          player.TIME_FIXED = player[timeKey] || player['Equipa'] || player['Equipe'] || '-';
        }

        const pos = normPos(player?.['Posição'] || player?.['POSIÇÃO'] || player?.Posicao || '');

        const listaMesmaPos  = lista.filter(j => mesmaPos(j['Posição'] || j['POSIÇÃO'] || j.Posicao, pos));
        const gnMesmaPos     = gn.filter(j   => mesmaPos(j['Posição'] || j['POSIÇÃO'] || j.Posicao, pos));
        const serieBMesmaPos = serieB.filter(j => mesmaPos(j['Posição'] || j['POSIÇÃO'] || j.Posicao, pos));

        setDados({ player, lista, gn, serieB, listaMesmaPos, gnMesmaPos, serieBMesmaPos });
      } catch (e) {
        console.error('Erro ao carregar:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── 1. Determina as Métricas Dinâmicas e as Escalas (p90) ─────────────────
  const { metricasAtuais, configPosicao, escalas, scatterPlots } = useMemo(() => {
    if (!dados?.player) return { metricasAtuais: FALLBACK_METRICS, configPosicao: null, escalas: {}, scatterPlots: [] };
    
    const posAtleta = normPos(dados.player['Posição'] || dados.player['POSIÇÃO'] || '');
    const cfg = getMetricsByPosicao(posAtleta);
    
    const metricas = cfg ? cfg.radarMetrics : FALLBACK_METRICS;
    const plots = cfg ? cfg.scatterPlots : [];
    
    const baseEscala = dados.listaMesmaPos.length >= 3 ? dados.listaMesmaPos : dados.lista;
    const esc = computarEscalas(baseEscala, metricas);

    return { metricasAtuais: metricas, configPosicao: cfg, escalas: esc, scatterPlots: plots };
  }, [dados]);


  // ── Perfil sugerido ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dados?.player || !dados?.lista?.length) return;
    const ranked = calcularPerfilSugerido(dados.player, dados.lista);
    setPerfisRankeados(ranked);
    setPerfilSelecionado(prev => prev || ranked[0]?.perfil || '');
  }, [dados]);

  // ── Texto analítico ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dados?.player || !perfilSelecionado || !dados?.lista?.length) return;
    const texto = gerarTextoAnalise({
      player:           dados.player,
      perfil:           perfilSelecionado,
      descricaoPerfil:  PERFIL_DESCRICOES[perfilSelecionado] || '',
      listaPreferencial: dados.lista,
      serieB:           dados.serieB,
      metricas:         metricasAtuais.map(m => ({ label: m.label, key: m.key, type: m.type || 'per90' })),
    });
    setTextoAnalitico(texto);
  }, [perfilSelecionado, dados, metricasAtuais]);

  // ── Pontos fortes / fracos ─────────────────────────────────────────────────
  const pontosFortesFragos = useMemo(() => {
    if (!dados?.player || !dados?.listaMesmaPos?.length) return { fortes: [], fracos: [] };
    const { player, listaMesmaPos, serieBMesmaPos } = dados;
    const base = [...listaMesmaPos, ...serieBMesmaPos];

    const comparacoes = metricasAtuais.map(m => {
      const vAtleta = getVal(player, m);
      const vals    = base.map(j => getVal(j, m)).filter(v => isFinite(v) && v >= 0);
      if (!vals.length) return null;
      const media   = vals.reduce((a, b) => a + b, 0) / vals.length;
      const diff    = media > 0 ? ((vAtleta - media) / media) * 100 : 0;
      const pctil   = Math.round((vals.filter(v => v <= vAtleta).length / vals.length) * 100);
      return { label: m.label, diff, percentil: pctil };
    }).filter(Boolean);

    const ord    = [...comparacoes].sort((a, b) => b.diff - a.diff);
    const fortes = ord.filter(x => x.diff > 5 && x.percentil >= 55).slice(0, 3);
    const fracos = [...ord].reverse().filter(x => x.diff < -5 && x.percentil <= 45).slice(0, 3);
    return { fortes, fracos };
  }, [dados, metricasAtuais]);


  // ── Radar data ────────────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    if (!dados?.player) return { media: [], gremio: [], serieb: [] };
    const { player, listaMesmaPos, gnMesmaPos, serieBMesmaPos } = dados;

    const labels = [...metricasAtuais.map(m => m.label), metricasAtuais[0].label];
    const pColor = configPosicao?.cor || '#fbbf24';

    // Trace do jogador analisado
    const playerR = metricasAtuais.map(m => normalizar(getVal(player, m), escalas[m.label]));
    playerR.push(playerR[0]); 
    const tracePlayer = {
      type: 'scatterpolar', mode: 'lines', r: playerR, theta: labels,
      fill: 'toself', fillcolor: `${pColor}44`, name: player.Jogador,
      line: { color: pColor, width: 3 },
    };

    // ── VS Média Lista ──
    const baseMediaLista = listaMesmaPos.length >= 2 ? listaMesmaPos : dados.lista;
    const mediaListaR = metricasAtuais.map(m => {
      const vals = baseMediaLista.map(j => getVal(j, m)).filter(v => isFinite(v) && v >= 0);
      const med  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return normalizar(med, escalas[m.label]);
    });
    mediaListaR.push(mediaListaR[0]);
    const traceMediaLista = {
      type: 'scatterpolar', mode: 'lines', r: mediaListaR, theta: labels,
      fill: 'toself', fillcolor: 'rgba(239,68,68,0.12)',
      name: `Média Lista (${configPosicao?.label || 'Geral'})`,
      line: { color: '#ef4444', width: 2, dash: 'dot' },
    };

    // ── VS Elenco GN ──
    const CORES = ['#3b82f6','#10b981','#8b5cf6','#f97316','#ec4899','#06b6d4','#84cc16','#a855f7'];
    const gnCandidatos = gnMesmaPos.length > 0 ? gnMesmaPos : dados.gn;
    const tracesGN = gnCandidatos.map((p, i) => {
      const gnR = metricasAtuais.map(m => normalizar(getVal(p, m), escalas[m.label]));
      gnR.push(gnR[0]);
      return {
        type: 'scatterpolar', mode: 'lines', r: gnR, theta: labels,
        name: p.Jogador, line: { color: CORES[i % CORES.length], width: 2 },
      };
    });

    // ── VS Série B ──
    const baseSB = serieBMesmaPos.length >= 2 ? serieBMesmaPos : dados.serieB;
    const mediaSBR = metricasAtuais.map(m => {
      const vals = baseSB.map(j => getVal(j, m)).filter(v => isFinite(v) && v >= 0);
      const med  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return normalizar(med, escalas[m.label]);
    });
    mediaSBR.push(mediaSBR[0]);
    const traceMediaSB = {
      type: 'scatterpolar', mode: 'lines', r: mediaSBR, theta: labels,
      fill: 'toself', fillcolor: 'rgba(59,130,246,0.12)',
      name: `Média Série B (${configPosicao?.label || 'Geral'})`,
      line: { color: '#3b82f6', width: 2, dash: 'dot' },
    };

    return {
      media:  [tracePlayer, traceMediaLista],
      gremio: [tracePlayer, ...tracesGN],
      serieb: [tracePlayer, traceMediaSB],
    };
  }, [dados, metricasAtuais, escalas, configPosicao]);


  // ── Scatter Plots Data Generation ──────────────────────────────────────────
  const scatterPlotData = useMemo(() => {
    if (!dados?.player || !scatterPlots || scatterPlots.length === 0) return [];
    
    const { player, listaMesmaPos, serieBMesmaPos } = dados;
    const base = [...listaMesmaPos, ...serieBMesmaPos];
    
    return scatterPlots.map(plot => {
      const getX = (j) => getVal(j, { key: plot.xKey, type: plot.xType, label: plot.xLabel });
      const getY = (j) => getVal(j, { key: plot.yKey, type: plot.yType, label: plot.yLabel });

      const bgTrace = {
        x: base.map(getX),
        y: base.map(getY),
        mode: 'markers',
        type: 'scatter',
        marker: { color: '#cbd5e1', size: 6, opacity: 0.6 },
        name: 'Liga',
        hoverinfo: 'text',
        text: base.map(j => j.Jogador)
      };

      const playerTrace = {
        x: [getX(player)],
        y: [getY(player)],
        mode: 'markers+text',
        type: 'scatter',
        marker: { color: configPosicao?.cor || '#f59e0b', size: 14, line: { color: '#1e293b', width: 2 } },
        name: player.Jogador,
        text: [player.Jogador],
        textposition: 'top center',
        textfont: { family: 'Arial Black', size: 10, color: '#0f172a' },
        hoverinfo: 'text'
      };

      return {
        id: plot.id,
        title: plot.titulo,
        sub: plot.subtitulo,
        data: [bgTrace, playerTrace],
        layout: {
          margin: { l: 30, r: 20, t: 15, b: 30 },
          xaxis: { title: { text: plot.xLabel, font: { size: 9, weight: 'bold' } }, tickfont: { size: 8 }, zeroline: false, gridcolor: '#f1f5f9' },
          yaxis: { title: { text: plot.yLabel, font: { size: 9, weight: 'bold' } }, tickfont: { size: 8 }, zeroline: false, gridcolor: '#f1f5f9' },
          showlegend: false,
          hovermode: 'closest',
          plot_bgcolor: '#fafafa',
          paper_bgcolor: '#ffffff',
          autosize: true
        }
      };
    });
  }, [dados, scatterPlots, configPosicao]);

  // ── Layout padrão do radar ─────────────────────────────────────────────────
  const radarLayout = {
    polar: {
      radialaxis: { visible: true, range: [0, 100], gridcolor: '#e2e8f0', showticklabels: false, ticks: '' },
      angularaxis: { tickfont: { size: 9, color: '#111', family: 'Arial Black' }, gridcolor: '#e2e8f0', rotation: 90, direction: 'clockwise' },
      bgcolor: '#ffffff',
    },
    showlegend: true,
    legend: { orientation: 'h', x: 0.5, y: -0.12, xanchor: 'center', font: { size: 9, color: '#111' } },
    margin: { l: 50, r: 50, t: 20, b: 30 },
    paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', autosize: true,
  };

  const navigation = useMemo(() => {
    if (!dados?.player || !dados?.lista?.length) return { prev: null, next: null };
    const idx = dados.lista.findIndex(p => p.ID_ATLETA === dados.player.ID_ATLETA);
    return {
      prev: idx > 0 ? dados.lista[idx - 1] : null,
      next: idx < dados.lista.length - 1 ? dados.lista[idx + 1] : null,
    };
  }, [dados]);

  const getPlayerPhoto = (name) => {
    if (!name) return '/images/players/default.png';
    const mapa = {
      'Kayke': 'Kayke_Ferrari.png', 'Rodrigo Farofa': 'rodrigo_rodrigues.png',
      'Allison Patrick': 'Allison.png', 'Santi González': 'santi_gonzález.png',
      'Sorriso': 'sorriso.png', 'Romarinho': 'romarinho.png',
    };
    if (mapa[name.trim()]) return `/images/players/${mapa[name.trim()]}`;
    return `/images/players/${name.trim().replace(/\s+/g, '_')}.png`;
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">Carregando Relatório...</div>;
  if (!dados?.player) return <div className="min-h-screen bg-white flex items-center justify-center text-black font-black uppercase text-2xl">Atleta não encontrado.</div>;

  const { player } = dados;

  return (
    <div className="min-h-screen bg-white text-black p-4 font-sans print:p-0 overflow-x-hidden">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.2cm; }
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-container { width: 100% !important; margin: 0 !important; padding: 0.1cm !important; transform: scale(0.96); transform-origin: top left; }
          .radar-chart { height: 260px !important; }
          .scatter-chart { page-break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-[1600px] mx-auto print-container flex flex-col gap-3">

        {/* ── HEADER ── */}
        <header className="flex justify-between items-center border-b-4 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="GN" className="h-16 w-auto" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
              <p className="text-base font-bold tracking-widest text-slate-600 uppercase">Departamento de Scouting</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="flex gap-2 no-print">
              {navigation.prev && (
                <button onClick={() => router.push(`/central-scouting/lista-preferencial/${navigation.prev.ID_ATLETA}`)}
                  className="bg-slate-800 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-700 transition-colors">
                  ← ANTERIOR
                </button>
              )}
              <button onClick={() => router.push('/central-scouting/lista-preferencial')}
                className="bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors">
                MENU
              </button>
              {navigation.next && (
                <button onClick={() => router.push(`/central-scouting/lista-preferencial/${navigation.next.ID_ATLETA}`)}
                  className="bg-amber-500 text-black px-3 py-1 rounded-md text-xs font-bold hover:bg-amber-400 transition-colors">
                  PRÓXIMO →
                </button>
              )}
            </div>
            <div className="bg-amber-500 text-black px-6 py-1 font-black text-xl uppercase italic shadow-md">Relatório de Prospecção</div>
            <div className="text-slate-600 font-black text-[10px] mt-1 tracking-wider uppercase">
              DATA: {new Date().toLocaleDateString('pt-BR')} | ID: {player.ID_ATLETA}
            </div>
          </div>
        </header>

        {/* ── GRID PRINCIPAL ── */}
        <div className="grid grid-cols-12 gap-3">

          {/* COLUNA ESQUERDA */}
          <div className="col-span-3 flex flex-col gap-3">
            <div className="bg-white border-2 border-slate-900 rounded-[2rem] overflow-hidden shadow-lg">
              <div className="relative h-48 bg-slate-50 border-b-2 border-slate-900">
                <img
                  src={getPlayerPhoto(player.Jogador)}
                  alt={player.Jogador}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full object-contain"
                  onError={e => { e.target.src = '/images/players/default.png'; }}
                />
              </div>
              <div className="p-4">
                <h2 className="text-2xl font-black text-black uppercase mb-2 leading-none">{player.Jogador}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">TIME</p><p className="text-sm font-black truncate">{player.TIME_FIXED || '-'}</p></div>
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Pé</p><p className="text-sm font-black">{player['Pé dominante'] || '-'}</p></div>
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Idade</p><p className="text-sm font-black">{player.Idade} anos</p></div>
                  <div><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Minutos</p><p className="text-sm font-black">{player['Minutos jogados']}'</p></div>
                  <div className="col-span-2">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Posição Mapeada</p>
                    <p className="text-sm font-black" style={{color: configPosicao?.cor || '#d97706'}}>
                      {configPosicao?.label || player['Posição'] || player['POSIÇÃO'] || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="scale-95 origin-top-left">
              <HeatmapComponent player={player} />
            </div>
          </div>

          {/* COLUNA DIREITA: Radares + Análise */}
          <div className="col-span-9 grid grid-cols-3 gap-3">

            {/* Radares */}
            <div className="col-span-2 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                {/* VS Média Lista */}
                <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-4 flex flex-col items-center shadow-lg">
                  <h3 className="text-black font-black text-[10px] uppercase tracking-widest mb-2 border-b-2 border-amber-500 px-4 pb-0.5">
                    Vs Média Lista
                  </h3>
                  <div className="w-full h-[260px] radar-chart">
                    <Plot data={radarData.media} layout={radarLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
                  </div>
                </div>
                {/* VS Elenco GN */}
                <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-4 flex flex-col items-center shadow-lg">
                  <h3 className="text-black font-black text-[10px] uppercase tracking-widest mb-2 border-b-2 border-amber-500 px-4 pb-0.5">
                    Vs Elenco GN
                  </h3>
                  <div className="w-full h-[260px] radar-chart">
                    <Plot data={radarData.gremio} layout={radarLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
                  </div>
                </div>
              </div>
              {/* VS Série B */}
              <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-4 flex flex-col items-center shadow-lg">
                <h3 className="text-black font-black text-[10px] uppercase tracking-widest mb-2 border-b-2 border-amber-500 px-4 pb-0.5">
                  Vs Série B
                </h3>
                <div className="w-full h-[260px] radar-chart">
                  <Plot data={radarData.serieb} layout={radarLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
                </div>
              </div>
            </div>

            {/* Análise Técnica */}
            {textoAnalitico && (
              <div className="col-span-1 bg-white border-2 border-slate-900 rounded-[1.5rem] overflow-hidden shadow-lg flex flex-col">
                <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
                  Análise Técnica
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">

                  {/* Perfil sugerido */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Perfil:</span>
                    {!perfilEditando ? (
                      <>
                        <span className="bg-amber-500 text-black font-black text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wide">
                          {perfilSelecionado}
                        </span>
                        <button onClick={() => setPerfilEditando(true)}
                          className="no-print text-[9px] font-black text-slate-400 hover:text-black uppercase underline underline-offset-2">
                          Ajustar
                        </button>
                      </>
                    ) : (
                      <>
                        <select value={perfilSelecionado} onChange={e => { setPerfilSelecionado(e.target.value); setPerfilEditando(false); }} className="no-print border-2 border-amber-500 rounded-lg px-2 py-0.5 text-[10px] font-black bg-white text-black uppercase focus:outline-none" autoFocus>
                          {perfisRankeados.map(({ perfil, percentual }) => (
                            <option key={perfil} value={perfil}>
                              {perfil} {percentual >= 100 ? '★' : `(${percentual}%)`}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => setPerfilEditando(false)} className="no-print text-[9px] font-black text-slate-400 hover:text-black uppercase underline underline-offset-2">
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>

                  {/* Texto analítico */}
                  <p className="text-[10px] text-slate-800 leading-relaxed font-medium">
                    {textoAnalitico.split('**').map((part, i) =>
                      i % 2 === 1 ? <strong key={i} className="font-black text-black">{part}</strong> : <span key={i}>{part}</span>
                    )}
                  </p>

                  {/* Pontos fortes & fracos */}
                  {pontosFortesFragos.fortes.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pontos Fortes</span>
                        </div>
                        {pontosFortesFragos.fortes.map((item, i) => (
                          <div key={i} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 mb-1">
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-tight">{item.label}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                              <span className="text-[9px] font-black text-emerald-700">+{item.percentil}%</span>
                              <span className="text-[8px] font-bold text-emerald-700 bg-white border border-emerald-200 rounded px-1">Top {100 - item.percentil}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Pontos de Atenção</span>
                        </div>
                        {pontosFortesFragos.fracos.map((item, i) => (
                          <div key={i} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mb-1">
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-tight">{item.label}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                              <span className="text-[9px] font-black text-red-600">{item.percentil}%</span>
                              <span className="text-[8px] font-bold text-red-600 bg-white border border-red-200 rounded px-1">Bot {100 - item.percentil}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── MÉTRICAS DETALHADAS ── */}
        <div className="bg-white border-2 border-slate-900 rounded-[1.5rem] overflow-hidden shadow-lg">
          <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
            Métricas por 90 Minutos ({configPosicao?.label || 'Geral'})
          </div>
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900">
            {[0, 5].map(start => (
              <table key={start} className="w-full text-left text-[10px]">
                <tbody className="divide-y divide-slate-100">
                  {metricasAtuais.slice(start, start + 5).map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-2 text-slate-700 font-black uppercase tracking-tight">{m.label}</td>
                      <td className="px-6 py-2 text-right font-black text-black text-xs">
                        {getVal(player, m).toFixed(1)}
                        {m.label.includes('%') || m.key.includes('%') ? '%' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </div>

        {/* ── GRÁFICOS DE DISPERSÃO (SCATTER PLOTS) ── */}
        {scatterPlotData.length > 0 && (
          <div className="bg-white border-2 border-slate-900 rounded-[1.5rem] overflow-hidden shadow-lg mt-2 scatter-chart">
            <div className="bg-slate-900 text-white font-black text-center py-2 text-[10px] uppercase tracking-widest">
              Gráficos de Dispersão Estratégicos — Mapeamento de {configPosicao?.label}s
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {scatterPlotData.map(plot => (
                <div key={plot.id} className="border-2 border-slate-100 rounded-[1rem] p-2 flex flex-col bg-slate-50">
                  <div className="text-center mb-1">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight tracking-tighter">{plot.title}</h4>
                    <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">{plot.sub}</p>
                  </div>
                  <div className="w-full h-[180px] mt-auto">
                    <Plot data={plot.data} layout={plot.layout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer className="flex justify-between items-center border-t-2 border-slate-900 pt-3 no-print">
          <div className="flex gap-4">
            <button onClick={() => window.print()}
              className="bg-slate-900 hover:bg-black text-white font-black px-8 py-3 rounded-2xl text-sm shadow-xl transition-all flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              EXPORTAR PDF
            </button>
            <button onClick={() => router.back()}
              className="text-slate-500 hover:text-black text-sm font-black uppercase tracking-widest px-4 transition-colors">
              Voltar
            </button>
          </div>
          <p className="text-[10px] text-slate-500 font-black italic tracking-tight uppercase">© Scouting System GN</p>
        </footer>
      </div>
    </div>
  );
}

export default function PlayerProfile() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center text-amber-600 font-black italic animate-pulse text-2xl uppercase">
        Carregando...
      </div>
    }>
      <PlayerProfileContent />
    </Suspense>
  );
}
