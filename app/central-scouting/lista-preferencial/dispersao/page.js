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

// Cor única por jogador da lista preferencial
const CORES_JOGADORES = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A9DFBF',
  '#F5B7B1', '#D7BDE2', '#A3E4D7', '#F9E79F', '#ABEBC6'
];

// ─── Todos os 5 gráficos ────────────────────────────────────────────────────
const GRAFICOS = [
  {
    id: 'criacao-finalizacao',
    titulo: 'Criação vs Finalização',
    subtitulo: 'Passes chave por 90 min  ×  xG por 90 min',
    xLabel: 'Passes Chave/90',
    yLabel: 'xG/90',
    xKey: 'Passes chave',
    yKey: 'Xg',
    xType: 'per90',
    yType: 'per90',
  },
  {
    id: 'progressao-perigo',
    titulo: 'Progressão vs Perigo',
    subtitulo: '% passes progressivos precisos  ×  Entradas no terço final carregando a bola por 90',
    xLabel: 'Passes Progressivos %',
    yLabel: 'Entradas 1/3 Final (C)/90',
    xKey: 'Passes progressivos precisos,%',
    yKey: 'Entradas no terço final carregando a bola',
    xType: 'raw',
    yType: 'per90',
  },
  {
    id: 'chances-xa',
    titulo: 'Chances Criadas vs Assistências Esperadas',
    subtitulo: 'Chances com sucesso por 90  ×  xA por 90',
    xLabel: 'Chances com Sucesso/90',
    yLabel: 'xA/90',
    xKey: 'Chances com sucesso',
    yKey: 'xA',
    xType: 'per90',
    yType: 'per90',
  },
  {
    id: 'recuperacoes-desafios',
    titulo: 'Recuperações de Bola vs Desafios Vencidos',
    subtitulo: 'Recuperações no campo adversário por 90  ×  Desafios ganhos por 90',
    xLabel: 'Recuperações Campo Adv/90',
    yLabel: 'Desafios Ganhos/90',
    xKey: 'Bolas recuperadas no campo do adversário',
    yKey: 'Desafios vencidos',
    xType: 'per90',
    yType: 'per90',
  },
  {
    id: 'drible-eficiencia',
    titulo: 'Volume vs Eficiência de Dribles',
    subtitulo: 'Dribles tentados por 90  ×  Dribles bem-sucedidos por 90',
    xLabel: 'Dribles/90',
    yLabel: 'Dribles Certos/90',
    xKey: 'Dribles',
    yKey: 'Dribles bem sucedidos',
    xType: 'per90',
    yType: 'per90',
  },
];

// ─── Processar dados: calcula per90 para lista preferencial e elenco GN ─────
function processarDados(dados, aba) {
  return dados.map(jogador => {
    const minutos = safeParseFloat(jogador['Minutos jogados']);
    const processado = { ...jogador, aba };
    GRAFICOS.forEach(g => {
      if (g.xType === 'per90') {
        const val = safeParseFloat(jogador[g.xKey]);
        processado[`${g.xKey}_per90`] = minutos > 0 ? (val / minutos) * 90 : 0;
      }
      if (g.yType === 'per90') {
        const val = safeParseFloat(jogador[g.yKey]);
        processado[`${g.yKey}_per90`] = minutos > 0 ? (val / minutos) * 90 : 0;
      }
    });
    return processado;
  });
}

// ─── Série B: valores já vêm por/90 — mapeia direto, sem transformar ─────────
function processarDadosSB(dados) {
  return dados.map(jogador => {
    const processado = { ...jogador, aba: 'SERIEB' };
    GRAFICOS.forEach(g => {
      if (g.xType === 'per90') processado[`${g.xKey}_per90`] = safeParseFloat(jogador[g.xKey]);
      if (g.yType === 'per90') processado[`${g.yKey}_per90`] = safeParseFloat(jogador[g.yKey]);
    });
    return processado;
  });
}

function getVal(jogador, key, type) {
  if (!jogador) return 0;
  if (type === 'per90') {
    if (jogador.aba === undefined) return safeParseFloat(jogador[key]);
    return safeParseFloat(jogador[`${key}_per90`]);
  }
  return safeParseFloat(jogador[key]);
}

// ─── Análise técnica automática ──────────────────────────────────────────────
function gerarAnalise(lista, gn, serieB, config) {
  if (lista.length === 0) return 'Dados insuficientes para gerar análise.';

  const bold = (s) => `**${s}**`;
  const { xLabel, yLabel, xKey, yKey, xType, yType, id } = config;

  const mediaListaX = lista.reduce((s, j) => s + getVal(j, xKey, xType), 0) / lista.length;
  const mediaListaY = lista.reduce((s, j) => s + getVal(j, yKey, yType), 0) / lista.length;
  const mediaSBX = serieB.length > 0 ? serieB.reduce((s, j) => s + getVal(j, xKey, xType), 0) / serieB.length : mediaListaX;
  const mediaSBY = serieB.length > 0 ? serieB.reduce((s, j) => s + getVal(j, yKey, yType), 0) / serieB.length : mediaListaY;

  const sorted = (arr, k, t) => [...arr].sort((a, b) => getVal(b, k, t) - getVal(a, k, t));
  const liderX = sorted(lista, xKey, xType)[0];
  const liderY = sorted(lista, yKey, yType)[0];
  const completos = lista.filter(j => getVal(j, xKey, xType) >= mediaListaX && getVal(j, yKey, yType) >= mediaListaY);
  const nomesCompletos = completos.map(j => j.Jogador?.split(' ')[0]).filter(Boolean);
  const gnAbaixo = gn.filter(j => getVal(j, xKey, xType) < mediaListaX && getVal(j, yKey, yType) < mediaListaY);
  const diffXpct = mediaSBX > 0 ? ((mediaListaX - mediaSBX) / mediaSBX * 100) : 0;

  if (id === 'criacao-finalizacao') {
    let txt = `O gráfico cruza a capacidade de ${bold('criação de jogadas')} (passes chave/90) com o ${bold('potencial de finalização')} (xG/90), revelando quais atletas acumulam influência direta tanto na construção quanto no desfecho das jogadas ofensivas. `;
    txt += `A média da lista em passes chave é ${bold(mediaListaX.toFixed(2))}/90 — ${Math.abs(diffXpct).toFixed(0)}% ${diffXpct >= 0 ? 'acima' : 'abaixo'} da Série B (${mediaSBX.toFixed(2)}) — enquanto em xG a lista registra ${bold(mediaListaY.toFixed(2))}/90 frente a ${mediaSBY.toFixed(2)} da divisão. `;
    if (liderX) txt += `${bold(liderX.Jogador)} destaca-se como o principal criador (${bold(getVal(liderX, xKey, xType).toFixed(2))} passes chave/90)`;
    if (liderY && liderY.Jogador !== liderX?.Jogador) txt += `, enquanto ${bold(liderY.Jogador)} lidera em xG com ${bold(getVal(liderY, yKey, yType).toFixed(2))}/90. `;
    else txt += '. ';
    if (nomesCompletos.length > 0) txt += `${bold(nomesCompletos.join(', '))} ${nomesCompletos.length > 1 ? 'se posicionam' : 'se posiciona'} no quadrante de alta performance nos dois eixos — perfil ideal para um extremo completo ofensivamente. `;
    else txt += `Nenhum atleta supera a média da lista simultaneamente em criação e xG — os perfis tendem a ser especializados em uma das dimensões. `;
    if (gnAbaixo.length > 0) txt += `Do elenco GN, ${bold(gnAbaixo.map(j => j.Jogador?.split(' ')[0]).join(', '))} ficam abaixo da média nos dois eixos, reforçando a demanda por reforço com maior participação direta nas finalizações.`;
    return txt;
  }

  if (id === 'progressao-perigo') {
    let txt = `Este gráfico avalia a ${bold('qualidade de progressão com bola')} (% passes progressivos precisos) em relação à ${bold('frequência de penetração no terço final')} carregando a bola/90 — dois indicadores da capacidade de avançar o jogo e criar desequilíbrio posicional. `;
    txt += `A lista registra média de ${bold(mediaListaX.toFixed(2)+'%')} em passes progressivos precisos e ${bold(mediaListaY.toFixed(2))} entradas no terço final/90. `;
    if (liderX) txt += `${bold(liderX.Jogador)} lidera em progressão (${bold(getVal(liderX, xKey, xType).toFixed(2)+'%')})`;
    if (liderY && liderY.Jogador !== liderX?.Jogador) txt += `, enquanto ${bold(liderY.Jogador)} é o que mais penetra no terço final (${bold(getVal(liderY, yKey, yType).toFixed(2))}/90). `;
    else txt += '. ';
    if (nomesCompletos.length > 0) txt += `${bold(nomesCompletos.join(', '))} combina${nomesCompletos.length > 1 ? 'm' : ''} progressão eficaz com presença frequente no terço ofensivo. `;
    else txt += `Nenhum atleta combina os dois atributos acima da média simultaneamente. `;
    if (gnAbaixo.length > 0) txt += `Do elenco GN, ${bold(gnAbaixo.map(j => j.Jogador?.split(' ')[0]).join(', '))} ficam abaixo da média nos dois eixos.`;
    return txt;
  }

  if (id === 'chances-xa') {
    let txt = `O gráfico cruza ${bold('chances criadas com sucesso')} (por 90) com o ${bold('xA')} (assistências esperadas/90), medindo quais atletas são mais efetivos tanto em converter chances em perigo real quanto em gerar assists de qualidade. `;
    txt += `A lista apresenta média de ${bold(mediaListaX.toFixed(2))} chances com sucesso/90 e ${bold(mediaListaY.toFixed(2))} xA/90. `;
    if (liderX) txt += `${bold(liderX.Jogador)} lidera em chances com sucesso (${bold(getVal(liderX, xKey, xType).toFixed(2))}/90)`;
    if (liderY && liderY.Jogador !== liderX?.Jogador) txt += `, enquanto ${bold(liderY.Jogador)} lidera em xA com ${bold(getVal(liderY, yKey, yType).toFixed(2))}/90. `;
    else txt += '. ';
    if (nomesCompletos.length > 0) txt += `${bold(nomesCompletos.join(', '))} ${nomesCompletos.length > 1 ? 'estão' : 'está'} acima da média nos dois eixos — perfil de criador completo. `;
    else txt += `Nenhum atleta da lista supera a média em chances e xA simultaneamente. `;
    if (gnAbaixo.length > 0) txt += `${bold(gnAbaixo.map(j => j.Jogador?.split(' ')[0]).join(', '))} do elenco GN ficam abaixo da média da lista nos dois indicadores.`;
    return txt;
  }

  if (id === 'recuperacoes-desafios') {
    let txt = `O gráfico avalia a ${bold('intensidade defensiva')} dos atletas, combinando recuperações no campo adversário/90 com desafios ganhos/90 — indicadores de pressão alta e capacidade de reconquistar a bola em zonas avançadas. `;
    txt += `A lista apresenta média de ${bold(mediaListaX.toFixed(2))} recuperações campo adv./90 e ${bold(mediaListaY.toFixed(2))} desafios ganhos/90. `;
    if (liderX) txt += `${bold(liderX.Jogador)} lidera em recuperações no campo adversário (${bold(getVal(liderX, xKey, xType).toFixed(2))}/90)`;
    if (liderY && liderY.Jogador !== liderX?.Jogador) txt += `, enquanto ${bold(liderY.Jogador)} vence mais desafios (${bold(getVal(liderY, yKey, yType).toFixed(2))}/90). `;
    else txt += '. ';
    if (nomesCompletos.length > 0) txt += `${bold(nomesCompletos.join(', '))} combina${nomesCompletos.length > 1 ? 'm' : ''} alta recuperação e volume de desafios ganhos — perfil com contribuição defensiva relevante. `;
    else txt += `Nenhum atleta supera a média da lista nos dois eixos defensivos simultaneamente. `;
    if (gnAbaixo.length > 0) txt += `Do elenco GN, ${bold(gnAbaixo.map(j => j.Jogador?.split(' ')[0]).join(', '))} ficam abaixo da média nesses indicadores.`;
    return txt;
  }

  if (id === 'drible-eficiencia') {
    let txt = `Este gráfico avalia o ${bold('volume de dribles tentados')} (por 90) em relação à ${bold('eficiência nos dribles')} (bem-sucedidos/90), separando os atletas de alto volume com baixo aproveitamento dos que têm alta taxa de conversão. `;
    txt += `A lista apresenta média de ${bold(mediaListaX.toFixed(2))} dribles tentados/90 e ${bold(mediaListaY.toFixed(2))} dribles certos/90. `;
    if (liderX) txt += `${bold(liderX.Jogador)} tenta mais dribles (${bold(getVal(liderX, xKey, xType).toFixed(2))}/90)`;
    if (liderY && liderY.Jogador !== liderX?.Jogador) txt += `, enquanto ${bold(liderY.Jogador)} é o mais eficiente (${bold(getVal(liderY, yKey, yType).toFixed(2))} dribles certos/90). `;
    else txt += '. ';
    if (nomesCompletos.length > 0) txt += `${bold(nomesCompletos.join(', '))} combina${nomesCompletos.length > 1 ? 'm' : ''} alto volume com alta eficiência — o perfil driblador mais completo da lista. `;
    else txt += `Nenhum atleta supera a média da lista em volume e eficiência de drible simultaneamente. `;
    if (gnAbaixo.length > 0) txt += `Do elenco GN, ${bold(gnAbaixo.map(j => j.Jogador?.split(' ')[0]).join(', '))} ficam abaixo da média da lista nos dois eixos, indicando lacuna no desequilíbrio individual.`;
    return txt;
  }

  return 'Análise não disponível para este gráfico.';
}

// ─── Componente de cada gráfico ──────────────────────────────────────────────
function GraficoBloco({ config, lista, gn, serieB, mapaCores }) {
  const analise = useMemo(
    () => gerarAnalise(lista, gn, serieB, config),
    [lista, gn, serieB]
  );

  const mediaX = lista.length > 0 ? lista.reduce((s, j) => s + getVal(j, config.xKey, config.xType), 0) / lista.length : 0;
  const mediaY = lista.length > 0 ? lista.reduce((s, j) => s + getVal(j, config.yKey, config.yType), 0) / lista.length : 0;
  const mediaSBX = serieB.length > 0 ? serieB.reduce((s, j) => s + getVal(j, config.xKey, config.xType), 0) / serieB.length : 0;
  const mediaSBY = serieB.length > 0 ? serieB.reduce((s, j) => s + getVal(j, config.yKey, config.yType), 0) / serieB.length : 0;

  // Um trace por jogador da lista (cor única)
  const tracesLista = lista.map(j => ({
    type: 'scatter',
    mode: 'markers+text',
    name: j.Jogador,
    x: [getVal(j, config.xKey, config.xType)],
    y: [getVal(j, config.yKey, config.yType)],
    text: [j.Jogador?.split(' ')[0] || ''],
    textposition: 'top center',
    textfont: { size: 11, color: '#1e293b', family: 'Arial Black' },
    marker: {
      size: 14,
      color: mapaCores[j.Jogador] || '#94a3b8',
      line: { color: '#000', width: 1.5 },
    },
    hovertemplate: `<b>${j.Jogador}</b><br>${config.xLabel}: %{x:.2f}<br>${config.yLabel}: %{y:.2f}<extra></extra>`,
  }));

  // Elenco GN — diamantes azuis, sem legenda individual
  const tracesGN = gn.map(j => ({
    type: 'scatter',
    mode: 'markers+text',
    name: `GN: ${j.Jogador}`,
    showlegend: false,
    x: [getVal(j, config.xKey, config.xType)],
    y: [getVal(j, config.yKey, config.yType)],
    text: [j.Jogador?.split(' ')[0] || ''],
    textposition: 'bottom center',
    textfont: { size: 10, color: '#1e40af' },
    marker: { size: 13, symbol: 'diamond', color: '#3b82f6', line: { color: '#000', width: 1.5 } },
    hovertemplate: `<b>${j.Jogador} (GN)</b><br>${config.xLabel}: %{x:.2f}<br>${config.yLabel}: %{y:.2f}<extra></extra>`,
  }));

  // Legenda GN (trace fantasma)
  const traceGNLegenda = {
    type: 'scatter', mode: 'markers', name: 'Elenco GN',
    x: [null], y: [null],
    marker: { size: 13, symbol: 'diamond', color: '#3b82f6', line: { color: '#000', width: 1.5 } },
    showlegend: true,
  };

  // Média Série B — estrela vermelha
  const traceSB = serieB.length > 0 ? {
    type: 'scatter', mode: 'markers+text', name: 'Média Série B',
    x: [mediaSBX], y: [mediaSBY],
    text: ['SÉRIE B'],
    textposition: 'top center',
    textfont: { size: 11, color: '#ef4444', family: 'Arial Black' },
    marker: { size: 22, symbol: 'star', color: '#ef4444', line: { color: '#fff', width: 2 } },
    hovertemplate: `<b>Média Série B</b><br>${config.xLabel}: %{x:.2f}<br>${config.yLabel}: %{y:.2f}<extra></extra>`,
  } : null;

  const traces = [...tracesLista, ...tracesGN, traceGNLegenda, ...(traceSB ? [traceSB] : [])];

  const layout = {
    title: { text: config.titulo, font: { size: 18, color: '#0f172a', family: 'Arial Black' }, x: 0.5, xanchor: 'center' },
    xaxis: {
      title: { text: config.xLabel, font: { size: 12, color: '#475569' } },
      tickfont: { color: '#64748b', size: 10 },
      gridcolor: '#e2e8f0', zeroline: false, showline: true, linecolor: '#94a3b8',
    },
    yaxis: {
      title: { text: config.yLabel, font: { size: 12, color: '#475569' } },
      tickfont: { color: '#64748b', size: 10 },
      gridcolor: '#e2e8f0', zeroline: false, showline: true, linecolor: '#94a3b8',
    },
    paper_bgcolor: '#fff', plot_bgcolor: '#f8fafc',
    showlegend: true,
    legend: { orientation: 'h', x: 0.5, y: -0.2, xanchor: 'center', font: { size: 10, color: '#0f172a' }, bgcolor: '#f8fafc' },
    margin: { l: 70, r: 30, t: 60, b: 90 },
    height: 480,
    hovermode: 'closest',
    shapes: [
      { type: 'line', x0: mediaX, x1: mediaX, y0: 0, y1: 1, yref: 'paper', line: { color: '#94a3b8', width: 1.5, dash: 'dot' } },
      { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: mediaY, y1: mediaY, line: { color: '#94a3b8', width: 1.5, dash: 'dot' } },
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
          <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>Quadrante superior direito</span>
          <span className="flex items-center gap-1.5 text-blue-400"><span className="inline-block w-3 h-3 bg-blue-400 rotate-45 scale-75"></span>Elenco GN</span>
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
          <p className="text-[11px] text-slate-700 leading-relaxed">
            {typeof analise === 'string' && analise.split('**').map((part, i) =>
              i % 2 === 1
                ? <strong key={i} className="font-black text-slate-900">{part}</strong>
                : <span key={i}>{part}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
function DispersaoContent() {
  const router = useRouter();
  const [lista, setLista] = useState([]);
  const [gn, setGn] = useState([]);
  const [serieB, setSerieB] = useState([]);
  const [mapaCores, setMapaCores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const urlLista  = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=0&t=' + Date.now();
        const urlGN     = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=1236859817';
        const urlSerieB = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQbSUvDghD3MPKBNEYz1cxeLgCmftwt5AoqkVmai6xCrA7W8fIy77Y2RlTmqR5w1A6a-MRPlV67pVYA/pub?output=csv';

        const [r1, r2, r3] = await Promise.all([fetch(urlLista), fetch(urlGN), fetch(urlSerieB)]);
        const [c1, c2, c3] = await Promise.all([r1.text(), r2.text(), r3.text()]);

        const parseCSV = (csv, aba) => new Promise(resolve => {
          Papa.parse(csv, {
            header: true, skipEmptyLines: true,
            complete: r => resolve(processarDados(cleanData(r.data), aba))
          });
        });

        const parseSB = (csv) => new Promise(resolve => {
          Papa.parse(csv, {
            header: true, skipEmptyLines: true,
            complete: r => resolve(processarDadosSB(cleanData(r.data)))
          });
        });

        const [d1, d2, d3] = await Promise.all([
          parseCSV(c1, 'LISTA'),
          parseCSV(c2, 'GN'),
          parseSB(c3),
        ]);

        // Cor única por jogador da lista preferencial
        const cores = {};
        d1.forEach((j, idx) => { cores[j.Jogador] = CORES_JOGADORES[idx % CORES_JOGADORES.length]; });

        setLista(d1);
        setGn(d2);
        setSerieB(d3);
        setMapaCores(cores);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
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
          <img src="/club/escudonovorizontino.png" alt="GN" className="h-12 w-auto" onError={e => e.target.style.display = 'none'} />
          <div>
            <h1 className="text-xl font-black tracking-tighter text-black uppercase leading-none">Grêmio Novorizontino</h1>
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Análise de Correlação e Dispersão — {lista.length} atletas</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-black text-white font-black px-6 py-2.5 rounded-xl text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Gerar PDF
          </button>
          <button
            onClick={() => router.push('/central-scouting/lista-preferencial')}
            className="border-2 border-slate-200 hover:border-slate-900 text-slate-600 hover:text-black font-black px-6 py-2.5 rounded-xl text-[11px] uppercase tracking-widest transition-all"
          >
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
          <GraficoBloco key={cfg.id} config={cfg} lista={lista} gn={gn} serieB={serieB} mapaCores={mapaCores} />
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
