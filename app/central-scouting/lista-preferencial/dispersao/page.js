'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center text-slate-400 font-bold italic animate-pulse">
      Carregando gráfico...
    </div>
  ),
});

const METRICAS_RADAR = [
  { label: 'Passes Chave',           key: 'Passes chave',                                  type: 'per90' },
  { label: 'Passes Progressivos %',  key: 'Passes progressivos precisos,%',                type: 'raw'   },
  { label: 'Passes na Área %',       key: 'Passes dentro da área / precisos, %',           type: 'raw'   },
  { label: 'Dribles Certos/90',      key: 'Dribles bem sucedidos',                         type: 'per90' },
  { label: 'Dribles 1/3 Final/90',   key: 'Dribles no último terço do campo com sucesso',  type: 'per90' },
  { label: 'Entradas 1/3 Final',     key: 'Entradas no terço final carregando a bola',     type: 'per90' },
  { label: 'Recuperações Campo Adv', key: 'Bolas recuperadas no campo do adversário',      type: 'per90' },
  { label: 'xA',                     key: 'xA',                                            type: 'per90' },
  { label: 'xG',                     key: 'Xg',                                            type: 'per90' },
  { label: 'Ações Área Adv/90',      key: 'Ações na área adversária bem-sucedidas',        type: 'per90' },
];

function getVal(j, label) {
  const m = METRICAS_RADAR.find(m => m.label === label);
  if (!m) return 0;
  if (m.type === 'per90') return safeParseFloat(j[`${m.key}_per90`]) || 0;
  return safeParseFloat(j[m.key]) || 0;
}

function processarDados(dados, aba) {
  return dados.map(jogador => {
    const minutos = safeParseFloat(jogador['Minutos jogados']);
    const processado = { ...jogador, aba };
    METRICAS_RADAR.forEach(m => {
      if (m.type === 'per90') {
        const val = safeParseFloat(jogador[m.key]);
        processado[`${m.key}_per90`] = minutos > 0 ? (val / minutos) * 90 : 0;
      }
    });
    return processado;
  });
}

function gerarAnalise(lista, gn, serieB, labelX, labelY, nomeX, nomeY, resumoQualidade) {
  if (lista.length === 0) return 'Dados insuficientes para gerar análise.';

  const mediaListaX = lista.reduce((s, j) => s + getVal(j, labelX), 0) / lista.length;
  const mediaListaY = lista.reduce((s, j) => s + getVal(j, labelY), 0) / lista.length;
  const mediaSerieBX = serieB.length > 0 ? serieB.reduce((s, j) => s + getVal(j, labelX), 0) / serieB.length : mediaListaX;
  const mediaSerieBY = serieB.length > 0 ? serieB.reduce((s, j) => s + getVal(j, labelY), 0) / serieB.length : mediaListaY;

  const liderX = [...lista].sort((a, b) => getVal(b, labelX) - getVal(a, labelX))[0];
  const liderY = [...lista].sort((a, b) => getVal(b, labelY) - getVal(a, labelY))[0];
  const completos = lista.filter(j => getVal(j, labelX) >= mediaListaX * 1.05 && getVal(j, labelY) >= mediaListaY * 1.05);
  const nomesCompletos = completos.map(j => j.Jogador?.split(' ')[0]).filter(Boolean);
  const gnAbaixo = gn.filter(j => getVal(j, labelX) < mediaListaX && getVal(j, labelY) < mediaListaY);

  let txt = `A média da lista em ${nomeX} é ${mediaListaX.toFixed(2)} `;
  txt += `(Série B: ${mediaSerieBX.toFixed(2)}) e em ${nomeY} é ${mediaListaY.toFixed(2)} `;
  txt += `(Série B: ${mediaSerieBY.toFixed(2)}). `;

  if (liderX) txt += `${liderX.Jogador?.split(' ')[0]} lidera em ${nomeX} (${getVal(liderX, labelX).toFixed(2)}). `;
  if (liderY && liderY.Jogador !== liderX?.Jogador) txt += `${liderY.Jogador?.split(' ')[0]} lidera em ${nomeY} (${getVal(liderY, labelY).toFixed(2)}). `;

  if (nomesCompletos.length > 0) {
    txt += `${nomesCompletos.join(', ')} apresenta${nomesCompletos.length > 1 ? 'm' : ''} ${resumoQualidade} — posicionados no quadrante superior direito. `;
  } else {
    txt += `Nenhum atleta da lista supera a média da lista simultaneamente nos dois eixos. `;
  }

  if (gnAbaixo.length > 0) {
    txt += `Do elenco GN, ${gnAbaixo.map(j => j.Jogador?.split(' ')[0] || j.name).filter(Boolean).join(', ')} ficam abaixo da média da lista nos dois eixos — reforçando a necessidade de ${resumoQualidade} no plantel.`;
  }

  return txt;
}

const GRAFICOS = [
  {
    id: 'criacao-finalizacao',
    titulo: 'Criação vs Finalização',
    subtitulo: 'Passes chave por 90 min  ×  xG por 90 min',
    x: 'Passes Chave',
    y: 'xG',
    nomeX: 'passes chave/90',
    nomeY: 'xG/90',
    resumo: 'alta capacidade de criação e finalização simultânea',
  },
  {
    id: 'drible-penetracao',
    titulo: 'Dribles vs Penetração no Terço Final',
    subtitulo: 'Dribles bem-sucedidos por 90  ×  Entradas no terço final carregando a bola por 90',
    x: 'Dribles Certos/90',
    y: 'Entradas 1/3 Final',
    nomeX: 'dribles certos/90',
    nomeY: 'entradas 1/3 final/90',
    resumo: 'desequilíbrio no 1x1 com penetração efetiva no terço ofensivo',
  },
  {
    id: 'progressao-area',
    titulo: 'Progressão vs Presença na Área',
    subtitulo: '% passes progressivos precisos  ×  Ações certas na área adversária por 90',
    x: 'Passes Progressivos %',
    y: 'Ações Área Adv/90',
    nomeX: 'passes progressivos (%)',
    nomeY: 'ações na área/90',
    resumo: 'progressão qualificada combinada com presença e ações certas na área',
  },
];

function GraficoBloco({ config, lista, gn, serieB }) {
  const analise = useMemo(
    () => gerarAnalise(lista, gn, serieB, config.x, config.y, config.nomeX, config.nomeY, config.resumo),
    [lista, gn, serieB]
  );

  const mediaX = lista.length > 0 ? lista.reduce((s, j) => s + getVal(j, config.x), 0) / lista.length : 0;
  const mediaY = lista.length > 0 ? lista.reduce((s, j) => s + getVal(j, config.y), 0) / lista.length : 0;
  const mediaSBX = serieB.length > 0 ? serieB.reduce((s, j) => s + getVal(j, config.x), 0) / serieB.length : 0;
  const mediaSBY = serieB.length > 0 ? serieB.reduce((s, j) => s + getVal(j, config.y), 0) / serieB.length : 0;

  const traces = [
    {
      type: 'scatter', mode: 'markers+text', name: 'Lista Preferencial',
      x: lista.map(j => getVal(j, config.x)),
      y: lista.map(j => getVal(j, config.y)),
      text: lista.map(j => j.Jogador?.split(' ')[0] || ''),
      textposition: 'top center',
      textfont: { size: 9, color: '#1e293b' },
      marker: {
        size: 12, opacity: 0.9,
        color: lista.map(j => {
          const abX = getVal(j, config.x) >= mediaX;
          const abY = getVal(j, config.y) >= mediaY;
          if (abX && abY) return '#f59e0b';
          if (abX) return '#3b82f6';
          if (abY) return '#10b981';
          return '#94a3b8';
        }),
        line: { color: '#fff', width: 1.5 },
      },
      hovertemplate: `<b>%{text}</b><br>${config.x}: %{x:.2f}<br>${config.y}: %{y:.2f}<extra></extra>`,
    },
    {
      type: 'scatter', mode: 'markers+text', name: 'Elenco GN',
      x: gn.map(j => getVal(j, config.x)),
      y: gn.map(j => getVal(j, config.y)),
      text: gn.map(j => j.Jogador?.split(' ')[0] || ''),
      textposition: 'top center',
      textfont: { size: 9, color: '#0f172a' },
      marker: { size: 14, symbol: 'diamond', color: '#1e293b', opacity: 0.9, line: { color: '#fff', width: 2 } },
      hovertemplate: `<b>%{text}</b> (GN)<br>${config.x}: %{x:.2f}<br>${config.y}: %{y:.2f}<extra></extra>`,
    },
    ...(serieB.length > 0 ? [{
      type: 'scatter', mode: 'markers+text', name: 'Média Série B',
      x: [mediaSBX], y: [mediaSBY],
      text: ['SÉRIE B'],
      textposition: 'top center',
      textfont: { size: 9, color: '#ef4444' },
      marker: { size: 18, symbol: 'star', color: '#ef4444', line: { color: '#fff', width: 2 } },
      hovertemplate: `<b>Média Série B</b><br>${config.x}: %{x:.2f}<br>${config.y}: %{y:.2f}<extra></extra>`,
    }] : []),
  ];

  const layout = {
    title: { text: config.titulo, font: { size: 15, color: '#0f172a', weight: 'bold' }, x: 0.5, xanchor: 'center' },
    xaxis: {
      title: { text: config.x, font: { size: 11, color: '#475569' } },
      tickfont: { color: '#64748b', size: 10 },
      gridcolor: '#e2e8f0', zeroline: false,
    },
    yaxis: {
      title: { text: config.y, font: { size: 11, color: '#475569' } },
      tickfont: { color: '#64748b', size: 10 },
      gridcolor: '#e2e8f0', zeroline: false,
    },
    paper_bgcolor: '#fff', plot_bgcolor: '#f8fafc',
    showlegend: true,
    legend: { orientation: 'h', x: 0.5, y: -0.18, xanchor: 'center', font: { size: 10, color: '#0f172a' }, bgcolor: '#f8fafc' },
    margin: { l: 70, r: 30, t: 50, b: 80 },
    height: 440,
    shapes: [
      { type: 'line', x0: mediaX, x1: mediaX, y0: 0, y1: 1, yref: 'paper', line: { color: '#cbd5e1', width: 1.5, dash: 'dot' } },
      { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: mediaY, y1: mediaY, line: { color: '#cbd5e1', width: 1.5, dash: 'dot' } },
    ],
    annotations: [
      { x: 0.98, y: 0.98, xref: 'paper', yref: 'paper', text: '▲ alto X + alto Y', showarrow: false, font: { size: 8, color: '#92400e' }, xanchor: 'right', yanchor: 'top', bgcolor: '#fef3c7', borderpad: 3, opacity: 0.85 },
      { x: 0.02, y: 0.98, xref: 'paper', yref: 'paper', text: '▲ alto Y, baixo X', showarrow: false, font: { size: 8, color: '#065f46' }, xanchor: 'left', yanchor: 'top', bgcolor: '#d1fae5', borderpad: 3, opacity: 0.85 },
      { x: 0.02, y: 0.02, xref: 'paper', yref: 'paper', text: '▼ abaixo da média', showarrow: false, font: { size: 8, color: '#475569' }, xanchor: 'left', yanchor: 'bottom', bgcolor: '#f1f5f9', borderpad: 3, opacity: 0.85 },
      { x: 0.98, y: 0.02, xref: 'paper', yref: 'paper', text: '▲ alto X, baixo Y', showarrow: false, font: { size: 8, color: '#1e40af' }, xanchor: 'right', yanchor: 'bottom', bgcolor: '#dbeafe', borderpad: 3, opacity: 0.85 },
    ],
  };

  return (
    <div className="grafico-bloco bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
      {/* Cabeçalho */}
      <div className="bg-slate-900 px-6 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-white font-black uppercase tracking-wide text-sm">{config.titulo}</h2>
          <p className="text-slate-400 text-[10px] mt-0.5">{config.subtitulo}</p>
        </div>
        <div className="no-print flex items-center gap-4 text-[9px] font-black uppercase">
          <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>Quadrante superior direito</span>
          <span className="flex items-center gap-1.5 text-slate-300"><span className="inline-block w-3 h-3 bg-slate-300 rotate-45 scale-75"></span>Elenco GN</span>
          <span className="flex items-center gap-1.5 text-red-400"><span>★</span>Média Série B</span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="px-4 pt-4 pb-0">
        <Plot
          data={traces}
          layout={layout}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
      </div>

      {/* Análise técnica */}
      <div className="border-t-2 border-amber-400 bg-amber-50 px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-700 bg-amber-200 px-2 py-0.5 rounded">Análise Técnica</span>
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">{analise}</p>
        </div>
      </div>
    </div>
  );
}

function DispersaoContent() {
  const router = useRouter();
  const [lista, setLista] = useState([]);
  const [gn, setGn] = useState([]);
  const [serieB, setSerieB] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const urlLista  = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=0';
        const urlGN     = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=1236859817';
        const urlSerieB = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQbSUvDghD3MPKBNEYz1cxeLgCmftwt5AoqkVmai6xCrA7W8fIy77Y2RlTmqR5w1A6a-MRPlV67pVYA/pub?output=csv';
        const [r1, r2, r3] = await Promise.all([fetch(urlLista), fetch(urlGN), fetch(urlSerieB)]);
        const [c1, c2, c3] = await Promise.all([r1.text(), r2.text(), r3.text()]);
        const parseCSV = (csv, aba) => new Promise(resolve => {
          Papa.parse(csv, { header: true, skipEmptyLines: true, complete: r => resolve(processarDados(cleanData(r.data), aba)) });
        });
        const [d1, d2, d3] = await Promise.all([parseCSV(c1, 'LISTA'), parseCSV(c2, 'GN'), parseCSV(c3, 'SERIEB')]);
        setLista(d1); setGn(d2); setSerieB(d3);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Carregando análises de dispersão...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans print:bg-white">
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 0.6cm; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .grafico-bloco { page-break-after: always; page-break-inside: avoid; border-radius: 0 !important; border: 1px solid #e2e8f0 !important; margin-bottom: 0 !important; }
          .grafico-bloco:last-child { page-break-after: avoid; }
          .print-header { display: flex !important; }
          .main-header { display: none !important; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Header tela */}
      <header className="main-header bg-white border-b-4 border-amber-500 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <img src="/club/escudonovorizontino.png" alt="GN" className="h-12 w-auto" onError={e => e.target.style.display='none'} />
          <div>
            <h1 className="text-xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Análise de Correlação e Dispersão</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()}
            className="bg-slate-900 hover:bg-black text-white font-black px-6 py-2.5 rounded-xl text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Gerar PDF
          </button>
          <button onClick={() => router.push('/central-scouting/lista-preferencial')}
            className="border-2 border-slate-200 hover:border-slate-900 text-slate-600 hover:text-black font-black px-6 py-2.5 rounded-xl text-[11px] uppercase tracking-widest transition-all">
            Voltar
          </button>
        </div>
      </header>

      {/* Header print */}
      <div className="print-header px-2 pb-2 border-b-4 border-amber-500 justify-between items-center mb-3">
        <div>
          <p className="text-base font-black uppercase tracking-tighter leading-tight">Grêmio Novorizontino</p>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Departamento de Scouting</p>
        </div>
        <div className="bg-amber-500 text-black px-4 py-1 font-black text-sm uppercase italic">Análise de Dispersão</div>
        <p className="text-[9px] font-bold text-slate-500 uppercase">DATA: {new Date().toLocaleDateString('pt-BR')} · {lista.length} ATLETAS</p>
      </div>

      {/* Gráficos */}
      <main className="max-w-[1400px] mx-auto p-6 print:p-0 print:max-w-none space-y-6 print:space-y-0">
        {GRAFICOS.map(cfg => (
          <GraficoBloco key={cfg.id} config={cfg} lista={lista} gn={gn} serieB={serieB} />
        ))}
      </main>

      <footer className="no-print text-center py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-200 mt-6">
        © {new Date().getFullYear()} Grêmio Novorizontino · Departamento de Análise e Scouting
      </footer>
    </div>
  );
}

export default function DispersaoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    }>
      <DispersaoContent />
    </Suspense>
  );
}
