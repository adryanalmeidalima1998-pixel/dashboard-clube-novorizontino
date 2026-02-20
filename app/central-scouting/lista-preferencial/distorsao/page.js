'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false, 
  loading: () => <div className="h-64 flex items-center justify-center text-slate-500 font-bold">Carregando gráficos...</div> 
});

// Paleta de cores para cada jogador da Lista Preferencial
const CORES_JOGADORES = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A9DFBF',
  '#F5B7B1', '#D7BDE2', '#A3E4D7', '#F9E79F', '#ABEBC6'
];

// Pares de métricas para os 5 gráficos de correlação (X vs Y)
const GRAFICOS_CORRELACAO = [
  { 
    titulo: 'Criação vs Finalização',
    xLabel: 'Passes Chave/90',
    yLabel: 'xG/90',
    xKey: 'Passes chave',
    yKey: 'Xg',
    xType: 'per90',
    yType: 'per90'
  },
  { 
    titulo: 'Progressão vs Perigo',
    xLabel: 'Passes Progressivos %',
    yLabel: 'Entradas 1/3 Final %',
    xKey: 'Passes progressivos precisos',
    yKey: 'Entradas no terço final carregando a bola',
    xType: 'raw',
    yType: 'raw'
  },
  { 
    titulo: 'Volume vs Eficiência de Dribles',
    xLabel: 'Dribles/90',
    yLabel: 'Dribles Certos/90',
    xKey: 'Dribles',
    yKey: 'dribles_certos_90',
    xType: 'per90',
    yType: 'custom'
  },
  { 
    titulo: 'Passes na Área vs Assistências Esperadas',
    xLabel: 'Passes na Área %',
    yLabel: 'xA/90',
    xKey: 'Passes dentro da área / precisos',
    yKey: 'xA',
    xType: 'raw',
    yType: 'per90'
  },
  { 
    titulo: 'Ações na Área vs Expectativa de Gol',
    xLabel: 'Ações Área Adv/90',
    yLabel: 'xG/90',
    xKey: 'Ações na caixa adversária bem-sucedidas',
    yKey: 'Xg',
    xType: 'per90',
    yType: 'per90'
  }
];

function DistorsaoContent() {
  const router = useRouter();
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioNovorizontino, setGremioNovorizontino] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapaCores, setMapaCores] = useState({});

  const calcularMetricasCustomizadas = (jogador) => {
    const minutos = safeParseFloat(jogador['Minutos jogados']);
    if (minutos <= 0) return jogador;

    const dribles = safeParseFloat(jogador['Dribles']);
    const driblesSucessoPct = safeParseFloat(jogador['% de dribles com sucesso']) / 100;
    jogador.dribles_certos_90 = (dribles * driblesSucessoPct / minutos) * 90;

    return jogador;
  };

  const processarDados = (dados, aba) => {
    return dados.map(jogador => {
      const minutos = safeParseFloat(jogador['Minutos jogados']);
      const processado = { ...jogador, aba };
      
      // Calcular per90 para todas as métricas que precisam
      GRAFICOS_CORRELACAO.forEach(g => {
        if (g.xType === 'per90') {
          const val = safeParseFloat(jogador[g.xKey]);
          processado[`${g.xKey}_per90`] = minutos > 0 ? (val / minutos) * 90 : 0;
        }
        if (g.yType === 'per90') {
          const val = safeParseFloat(jogador[g.yKey]);
          processado[`${g.yKey}_per90`] = minutos > 0 ? (val / minutos) * 90 : 0;
        }
      });
      
      return calcularMetricasCustomizadas(processado);
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlAba1 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=0';
        const urlAba2 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=1236859817';

        const [res1, res2] = await Promise.all([fetch(urlAba1), fetch(urlAba2)]);
        const [csv1, csv2] = await Promise.all([res1.text(), res2.text()]);

        let dadosLista = [];
        let dadosGremio = [];

        Papa.parse(csv1, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            dadosLista = processarDados(cleanData(results.data), 'LISTA PREFERENCIAL');
            setListaPreferencial(dadosLista);
            
            // Criar mapa de cores para cada jogador da Lista Preferencial
            const cores = {};
            dadosLista.forEach((jogador, idx) => {
              cores[jogador.Jogador] = CORES_JOGADORES[idx % CORES_JOGADORES.length];
            });
            setMapaCores(cores);
          }
        });

        Papa.parse(csv2, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            dadosGremio = processarDados(cleanData(results.data), 'GRÊMIO NOVORIZONTINO');
            setGremioNovorizontino(dadosGremio);
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

  const getValorMetrica = (jogador, key, type) => {
    if (!jogador) return 0;
    if (type === 'per90') return safeParseFloat(jogador[`${key}_per90`]);
    if (type === 'custom') return safeParseFloat(jogador[key]);
    return safeParseFloat(jogador[key]);
  };

  const criarGraficoCorrelacao = (config) => {
    const plotData = [];

    // Adicionar cada jogador da Lista Preferencial como um trace separado (cor exclusiva)
    listaPreferencial.forEach(jogador => {
      const xVal = getValorMetrica(jogador, config.xKey, config.xType);
      const yVal = getValorMetrica(jogador, config.yKey, config.yType);
      
      plotData.push({
        x: [xVal],
        y: [yVal],
        mode: 'markers',
        type: 'scatter',
        name: jogador.Jogador,
        marker: {
          size: 12,
          color: mapaCores[jogador.Jogador] || '#fbbf24',
          line: { color: '#ffffff', width: 2 },
          opacity: 0.85
        },
        text: `<b>${jogador.Jogador}</b><br>${jogador.Time}<br>${jogador.Posição}`,
        hovertemplate: '%{text}<br><b>${config.xLabel}:</b> %{x:.2f}<br><b>${config.yLabel}:</b> %{y:.2f}<extra></extra>',
        showlegend: true
      });
    });

    // Adicionar Grêmio Novorizontino como um grupo único (azul)
    const gremioX = gremioNovorizontino.map(j => getValorMetrica(j, config.xKey, config.xType));
    const gremioY = gremioNovorizontino.map(j => getValorMetrica(j, config.yKey, config.yType));
    
    plotData.push({
      x: gremioX,
      y: gremioY,
      mode: 'markers',
      type: 'scatter',
      name: 'Grêmio Novorizontino',
      marker: {
        size: 12,
        color: '#3b82f6',
        line: { color: '#ffffff', width: 2 },
        opacity: 0.85
      },
      text: gremioNovorizontino.map(j => `<b>${j.Jogador}</b><br>${j.Time}<br>${j.Posição}`),
      hovertemplate: '%{text}<br><b>${config.xLabel}:</b> %{x:.2f}<br><b>${config.yLabel}:</b> %{y:.2f}<extra></extra>',
      showlegend: true
    });

    const layout = {
      title: { 
        text: config.titulo, 
        font: { size: 16, color: '#ffffff', family: 'Arial, sans-serif', weight: 'bold' } 
      },
      xaxis: {
        title: { text: config.xLabel, font: { size: 12, color: '#ffffff', weight: 'bold' } },
        titlefont: { size: 12, color: '#ffffff' },
        tickfont: { size: 10, color: '#ffffff' },
        gridcolor: 'rgba(255,255,255,0.15)',
        showgrid: true,
        zeroline: false,
        showline: true,
        linewidth: 2,
        linecolor: '#ffffff'
      },
      yaxis: {
        title: { text: config.yLabel, font: { size: 12, color: '#ffffff', weight: 'bold' } },
        titlefont: { size: 12, color: '#ffffff' },
        tickfont: { size: 10, color: '#ffffff' },
        gridcolor: 'rgba(255,255,255,0.15)',
        showgrid: true,
        zeroline: false,
        showline: true,
        linewidth: 2,
        linecolor: '#ffffff'
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Arial, sans-serif', color: '#ffffff' },
      margin: { t: 60, b: 80, l: 100, r: 250 },
      height: 500,
      showlegend: true,
      legend: {
        x: 1.02,
        y: 1,
        xanchor: 'left',
        yanchor: 'top',
        bgcolor: 'rgba(0,0,0,0.5)',
        bordercolor: 'rgba(255,255,255,0.3)',
        borderwidth: 1,
        font: { size: 9, color: '#ffffff' },
        tracegroupgap: 5
      },
      hovermode: 'closest'
    };

    return { data: plotData, layout };
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-2 md:p-4 print:p-0 print:bg-white print:text-black font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        <div className="flex items-center justify-between mb-6 print:mb-4 sticky top-0 z-10 bg-[#0a0c10] py-2">
          <div className="flex items-center gap-3">
            <img src="/club/escudonovorizontino.png" alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-[0.08em] leading-tight print:text-black">G R Ê M I O &nbsp; N O V O R I Z O N T I N O</h1>
              <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.2em] print:text-slate-500">ANÁLISE DE CORRELAÇÕES - SCOUTING</p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => window.print()} className="p-2 bg-brand-yellow text-black rounded-lg hover:bg-yellow-500 transition-all shadow-lg flex items-center gap-1 font-black uppercase text-[9px]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" /></svg>
              PDF
            </button>
            <button onClick={() => router.back()} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="space-y-6 print:space-y-8">
          {GRAFICOS_CORRELACAO.map((config, idx) => {
            const { data, layout } = criarGraficoCorrelacao(config);
            return (
              <div key={idx} className="bg-slate-900/20 border border-slate-800/50 rounded-2xl p-4 print:border-slate-300 print:bg-white print:p-4 print:page-break-inside-avoid">
                <Plot 
                  data={data} 
                  layout={layout} 
                  config={{ displayModeBar: false, responsive: true }} 
                  style={{ width: '100%', height: '100%' }} 
                />
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-slate-800 flex justify-center print:border-slate-300 print:mt-6">
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.3em] print:text-slate-500">Confidencial • Grêmio Novorizontino Scouting • {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0.5cm; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .print\:hidden { display: none !important; }
          canvas { max-width: 100% !important; height: auto !important; }
          text { fill: #000000 !important; }
          .plotly text { fill: #000000 !important; }
          .plotly .xtitle, .plotly .ytitle { fill: #000000 !important; }
          .plotly .gridlayer line { stroke: #cccccc !important; }
        }
      `}</style>
    </div>
  );
}

export default function Distorsao() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c10] flex items-center justify-center"><div className="w-12 h-12 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin"></div></div>}>
      <DistorsaoContent />
    </Suspense>
  );
}
