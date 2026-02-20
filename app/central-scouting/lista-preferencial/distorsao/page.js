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
    yLabel: 'Entradas 1/3 Final %',
    xKey: 'Passes progressivos precisos\n%',
    yKey: 'Entradas no terço final carregando a bola\n% do total',
    xType: 'raw',
    yType: 'raw'
  },
  { 
    titulo: 'Volume vs Eficiência de Dribles',
    xLabel: 'Dribles/90',
    yLabel: 'Dribles Certos/90',
    xKey: 'Dribles bem sucedidos',
    yKey: 'Dribles bem sucedidos', // Usando a mesma chave para volume e sucesso no exemplo, ajustar se houver coluna de tentativa
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

        const [res1, res2] = await Promise.all([fetch(urlAba1), fetch(urlAba2)]);
        const [csv1, csv2] = await Promise.all([res1.text(), res2.text()]);

        Papa.parse(csv1, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = processarDados(cleanData(results.data), 'LISTA PREFERENCIAL');
            setListaPreferencial(dados);
            const cores = {};
            dados.forEach((j, idx) => { cores[j.Jogador] = CORES_JOGADORES[idx % CORES_JOGADORES.length]; });
            setMapaCores(cores);
          }
        });

        Papa.parse(csv2, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setGremioNovorizontino(processarDados(cleanData(results.data), 'GRÊMIO NOVORIZONTINO'));
          }
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
    if (type === 'per90') return safeParseFloat(jogador[`${key}_per90`]);
    return safeParseFloat(jogador[key]);
  };

  const criarGraficoCorrelacao = (config) => {
    const plotData = [];

    listaPreferencial.forEach(jogador => {
      plotData.push({
        x: [getValorMetrica(jogador, config.xKey, config.xType)],
        y: [getValorMetrica(jogador, config.yKey, config.yType)],
        mode: 'markers',
        type: 'scatter',
        name: jogador.Jogador,
        marker: {
          size: 14,
          color: mapaCores[jogador.Jogador],
          line: { color: '#fff', width: 1.5 }
        },
        text: jogador.Jogador,
        hovertemplate: `<b>${jogador.Jogador}</b><br>${config.xLabel}: %{x:.2f}<br>${config.yLabel}: %{y:.2f}<extra></extra>`
      });
    });

    const gremioX = gremioNovorizontino.map(j => getValorMetrica(j, config.xKey, config.xType));
    const gremioY = gremioNovorizontino.map(j => getValorMetrica(j, config.yKey, config.yType));
    
    plotData.push({
      x: gremioX,
      y: gremioY,
      mode: 'markers',
      type: 'scatter',
      name: 'Elenco GN',
      marker: {
        size: 10,
        color: '#3b82f6',
        symbol: 'diamond',
        line: { color: '#fff', width: 1 }
      },
      text: gremioNovorizontino.map(j => j.Jogador),
      hovertemplate: `<b>%{text}</b><br>${config.xLabel}: %{x:.2f}<br>${config.yLabel}: %{y:.2f}<extra></extra>`
    });

    const layout = {
      title: { text: config.titulo, font: { size: 14, color: '#fbbf24', family: 'Arial Black' } },
      xaxis: { title: { text: config.xLabel, font: { size: 10, color: '#fff' } }, gridcolor: 'rgba(255,255,255,0.1)', tickfont: { size: 8, color: '#fff' } },
      yaxis: { title: { text: config.yLabel, font: { size: 10, color: '#fff' } }, gridcolor: 'rgba(255,255,255,0.1)', tickfont: { size: 8, color: '#fff' } },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { t: 40, b: 40, l: 40, r: 20 },
      height: 350,
      showlegend: true,
      legend: { font: { size: 8, color: '#fff' }, orientation: 'h', y: -0.2 }
    };

    return { data: plotData, layout };
  };

  if (loading) return <div className="min-h-screen bg-[#08101e] flex items-center justify-center text-amber-500 font-bold italic animate-pulse">CARREGANDO ANÁLISE...</div>;

  return (
    <div className="min-h-screen bg-[#08101e] text-white p-4 font-sans print:bg-white print:text-black print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .bg-slate-900, .bg-slate-900\/50 { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
          .text-amber-500 { color: #b45309 !important; }
          .js-plotly-plot .main-svg { background: transparent !important; }
          /* Forçar cores escuras nos textos dos gráficos para impressão */
          .xtick text, .ytick text, .gtitle, .xtitle, .ytitle { fill: black !important; font-weight: bold !important; }
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto print-container">
        <header className="flex justify-between items-center mb-6 border-b-2 border-amber-500 pb-2">
          <div className="flex items-center gap-4">
            <img src="/club/escudonovorizontino.png" alt="Shield" className="h-16 w-auto" />
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-amber-500 uppercase leading-none print:text-black">
                Grêmio Novorizontino
              </h1>
              <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">
                Análise de Correlação e Dispersão
              </p>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <button onClick={() => window.print()} className="bg-amber-500 text-black px-4 py-2 font-black rounded-lg text-xs">EXPORTAR PDF</button>
            <button onClick={() => router.back()} className="bg-slate-800 text-white px-4 py-2 font-black rounded-lg text-xs">VOLTAR</button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-6">
          {GRAFICOS_CORRELACAO.map((config, idx) => {
            const { data, layout } = criarGraficoCorrelacao(config);
            return (
              <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-2xl p-4 shadow-xl overflow-hidden">
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

        <footer className="mt-8 border-t border-slate-800 pt-4 flex justify-between items-center print:border-slate-200">
          <p className="text-[10px] text-slate-500 italic">
            * Dados processados para identificar jogadores com desempenho acima da média em métricas chave.
          </p>
          <img src="/club/escudonovorizontino.png" alt="Logo" className="h-6 grayscale opacity-20" />
        </footer>
      </div>
    </div>
  );
}

export default function Distorsao() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <DistorsaoContent />
    </Suspense>
  );
}
