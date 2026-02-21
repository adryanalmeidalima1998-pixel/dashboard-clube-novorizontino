'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false, 
  loading: () => <div className="h-64 flex items-center justify-center text-slate-500 font-bold italic animate-pulse">CARREGANDO GRÁFICOS...</div> 
});

const CORES_JOGADORES = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A9DFBF',
  '#F5B7B1', '#D7BDE2', '#A3E4D7', '#F9E79F', '#ABEBC6'
];

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
    yLabel: 'Entradas 1/3 Final (C)/90',
    xKey: 'Passes progressivos precisos,%',
    yKey: 'Entradas no terço final carregando a bola',
    xType: 'raw',
    yType: 'per90'
  },
  { 
    titulo: 'Chances Criadas vs Assistências Esperadas',
    xLabel: 'Chances com Sucesso/90',
    yLabel: 'xA/90',
    xKey: 'Chances com sucesso',
    yKey: 'xA',
    xType: 'per90',
    yType: 'per90'
  },
  { 
    titulo: 'Recuperações de Bola vs Desafios Vencidos',
    xLabel: 'Recuperações Campo Adv/90',
    yLabel: 'Desafios Ganhos/90',
    xKey: 'Bolas recuperadas no campo do adversário',
    yKey: 'Desafios vencidos',
    xType: 'per90',
    yType: 'per90'
  },
  { 
    titulo: 'Volume vs Eficiência de Dribles',
    xLabel: 'Dribles/90',
    yLabel: 'Dribles Certos/90',
    xKey: 'Dribles',
    yKey: 'Dribles bem sucedidos',
    xType: 'per90',
    yType: 'per90'
  }
];

function DistorsaoContent() {
  const router = useRouter();
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioNovorizontino, setGremioNovorizontino] = useState([]);
  const [serieB, setSerieB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapaCores, setMapaCores] = useState({});
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const processarDados = (dados, aba) => {
    return dados.map(jogador => {
      const minutos = safeParseFloat(jogador['Minutos jogados']);
      const processado = { ...jogador, aba };
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
      return processado;
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlAba1 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=0';
        const urlAba2 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKQDSwtQvkSq1v9P2TzUDnFsV_i1gRCNXyQ0aT5TewfwNMnouAoICwQKRAmtCUDLHcJXO4DYS0fL_R/pub?output=csv&gid=1236859817';
        const urlSerieB = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQbSUvDghD3MPKBNEYz1cxeLgCmftwt5AoqkVmai6xCrA7W8fIy77Y2RlTmqR5w1A6a-MRPlV67pVYA/pub?output=csv';

        const [res1, res2, res3] = await Promise.all([fetch(urlAba1), fetch(urlAba2), fetch(urlSerieB)]);
        const [csv1, csv2, csv3] = await Promise.all([res1.text(), res2.text(), res3.text()]);

        Papa.parse(csv1, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const dados = processarDados(cleanData(results.data), 'LISTA PREFERENCIAL');
            setListaPreferencial(dados);
            const cores = {};
            dados.forEach((j, idx) => { cores[j.Jogador] = CORES_JOGADORES[idx % CORES_JOGADORES.length]; });
            setMapaCores(cores);
          }
        });

        Papa.parse(csv2, {
          header: true, skipEmptyLines: true,
          complete: (results) => setGremioNovorizontino(processarDados(cleanData(results.data), 'GRÊMIO NOVORIZONTINO'))
        });

        Papa.parse(csv3, {
          header: true, skipEmptyLines: true,
          complete: (results) => setSerieB(cleanData(results.data))
        });

        setLoading(false);
      } catch (error) {
        console.error('Erro:', error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getValorMetrica = (jogador, key, type) => {
    if (!jogador) return 0;
    if (type === 'per90') {
      if (jogador.aba === undefined) return safeParseFloat(jogador[key]);
      return safeParseFloat(jogador[`${key}_per90`]);
    }
    return safeParseFloat(jogador[key]);
  };

  const criarGraficoCorrelacao = (config) => {
    const plotData = [];

    listaPreferencial.forEach(jogador => {
      const primeiroNome = jogador.Jogador.split(' ')[0];
      plotData.push({
        x: [getValorMetrica(jogador, config.xKey, config.xType)],
        y: [getValorMetrica(jogador, config.yKey, config.yType)],
        mode: 'markers+text',
        type: 'scatter',
        name: jogador.Jogador,
        text: [primeiroNome],
        textposition: 'top center',
        textfont: { size: 12, color: isPrinting ? '#000' : '#fff', weight: 'bold' },
        marker: { size: 16, color: mapaCores[jogador.Jogador], line: { color: isPrinting ? '#000' : '#fff', width: 2 } },
        hovertemplate: `<b>${jogador.Jogador}</b><br>${config.xLabel}: %{x:.2f}<br>${config.yLabel}: %{y:.2f}<extra></extra>`
      });
    });

    gremioNovorizontino.forEach(jogador => {
      const primeiroNome = jogador.Jogador.split(' ')[0];
      plotData.push({
        x: [getValorMetrica(jogador, config.xKey, config.xType)],
        y: [getValorMetrica(jogador, config.yKey, config.yType)],
        mode: 'markers+text',
        type: 'scatter',
        name: `GN: ${jogador.Jogador}`,
        text: [primeiroNome],
        textposition: 'bottom center',
        textfont: { size: 11, color: isPrinting ? '#000' : '#3b82f6', weight: 'bold' },
        marker: { size: 14, color: '#3b82f6', symbol: 'diamond', line: { color: isPrinting ? '#000' : '#fff', width: 1.5 } },
        hovertemplate: `<b>${jogador.Jogador} (Elenco GN)</b><br>${config.xLabel}: %{x:.2f}<br>${config.yLabel}: %{y:.2f}<extra></extra>`,
        showlegend: false
      });
    });

    plotData.push({
      x: [null], y: [null], mode: 'markers', type: 'scatter', name: 'Elenco GN',
      marker: { size: 14, color: '#3b82f6', symbol: 'diamond', line: { color: '#fff', width: 1.5 } },
      showlegend: true
    });

    const serieBX = serieB.map(j => safeParseFloat(j[config.xKey]));
    const serieBY = serieB.map(j => safeParseFloat(j[config.yKey]));
    const avgX = serieBX.reduce((a, b) => a + b, 0) / (serieBX.length || 1);
    const avgY = serieBY.reduce((a, b) => a + b, 0) / (serieBY.length || 1);
    plotData.push({
      x: [avgX], y: [avgY], mode: 'markers+text', type: 'scatter', name: 'Média Série B',
      text: ['SÉRIE B'], textposition: 'bottom center',
      textfont: { size: 13, color: '#ef4444', weight: 'bold' },
      marker: { size: 22, color: 'rgba(239, 68, 68, 0.95)', symbol: 'star', line: { color: isPrinting ? '#000' : '#fff', width: 2.5 } },
      hovertemplate: `<b>Média Série B</b><br>${config.xLabel}: %{x:.2f}<br>${config.yLabel}: %{y:.2f}<extra></extra>`
    });

    const layout = {
      title: { text: config.titulo, font: { size: 24, color: isPrinting ? '#000' : '#fbbf24', family: 'Arial Black' } },
      xaxis: { title: { text: config.xLabel, font: { size: 14, color: isPrinting ? '#000' : '#fff', weight: 'bold' } }, gridcolor: isPrinting ? '#ccc' : 'rgba(255,255,255,0.1)', tickfont: { size: 12, color: isPrinting ? '#000' : '#fff', weight: 'bold' }, showline: true, linecolor: isPrinting ? '#000' : '#fff' },
      yaxis: { title: { text: config.yLabel, font: { size: 14, color: isPrinting ? '#000' : '#fff', weight: 'bold' } }, gridcolor: isPrinting ? '#ccc' : 'rgba(255,255,255,0.1)', tickfont: { size: 12, color: isPrinting ? '#000' : '#fff', weight: 'bold' }, showline: true, linecolor: isPrinting ? '#000' : '#fff' },
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { t: 80, b: 100, l: 100, r: 50 }, height: 750, showlegend: true,
      legend: { font: { size: 12, color: isPrinting ? '#000' : '#fff', weight: 'bold' }, orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center' },
      hovermode: 'closest'
    };

    return { data: plotData, layout };
  };

  if (loading) return <div className="min-h-screen bg-[#08101e] flex items-center justify-center text-amber-500 font-black italic animate-pulse text-2xl">CARREGANDO ANÁLISE...</div>;

  return (
    <div className="min-h-screen bg-[#08101e] text-white p-6 font-sans print:bg-white print:text-black print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .bg-slate-900, .bg-slate-900\/50 { background: white !important; border: 2px solid #000 !important; }
          .text-amber-500 { color: #000 !important; font-weight: 900 !important; }
          .js-plotly-plot .main-svg { background: transparent !important; }
          .chart-card { break-inside: avoid; page-break-after: always; padding: 1.5cm !important; height: 19cm !important; display: flex !important; flex-direction: column !important; justify-content: center !important; border: 3px solid #000 !important; margin-bottom: 0 !important; }
          .chart-card:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="max-w-[1500px] mx-auto print-container">
        <header className="flex justify-between items-center mb-10 border-b-4 border-amber-500 pb-6">
          <div className="flex items-center gap-8">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-24 w-auto" />
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-amber-500 uppercase leading-none print:text-black">Grêmio Novorizontino</h1>
              <p className="text-xl font-black tracking-widest text-slate-400 uppercase">Análise de Correlação e Dispersão de Atletas</p>
            </div>
          </div>
          <div className="flex gap-4 no-print">
            <button onClick={() => window.print()} className="bg-amber-500 hover:bg-amber-600 text-black px-10 py-4 font-black rounded-2xl text-lg shadow-2xl transition-all transform hover:scale-105">PDF</button>
            <button onClick={() => router.back()} className="bg-slate-800 hover:bg-slate-700 text-white px-10 py-4 font-black rounded-2xl text-lg border-2 border-slate-700">VOLTAR</button>
          </div>
        </header>

        <div className="flex flex-col gap-16">
          {GRAFICOS_CORRELACAO.map((config, idx) => {
            const { data, layout } = criarGraficoCorrelacao(config);
            return (
              <div key={idx} className="chart-card bg-slate-900/50 border border-slate-700 rounded-[3rem] p-10 shadow-2xl overflow-hidden backdrop-blur-sm">
                <Plot data={data} layout={layout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Distorsao() {
  return <Suspense fallback={<div>Carregando...</div>}><DistorsaoContent /></Suspense>;
}
