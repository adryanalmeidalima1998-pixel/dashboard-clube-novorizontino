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

const METRICAS_DISPERSAO = [
  { label: 'Passes Chave', key: 'Passes chave', type: 'per90' },
  { label: 'Passes Progressivos %', key: 'Passes progressivos precisos %', type: 'raw' },
  { label: 'xG', key: 'Xg', type: 'per90' },
  { label: 'Entradas 1/3 Final (C)', key: 'Entradas no terço final carregando a bola, % do total', type: 'raw' },
  { label: 'Dribles Certos/90', key: 'dribles_certos_90', type: 'custom' }
];

function DistorsaoContent() {
  const router = useRouter();
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioNovorizontino, setGremioNovorizontino] = useState([]);
  const [loading, setLoading] = useState(true);

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
      METRICAS_DISPERSAO.forEach(m => {
        if (m.type === 'per90') {
          const val = safeParseFloat(jogador[m.key]);
          processado[`${m.key}_per90`] = minutos > 0 ? (val / minutos) * 90 : 0;
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

        Papa.parse(csv1, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = processarDados(cleanData(results.data), 'LISTA PREFERENCIAL');
            setListaPreferencial(dados);
          }
        });

        Papa.parse(csv2, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = processarDados(cleanData(results.data), 'GRÊMIO NOVORIZONTINO');
            setGremioNovorizontino(dados);
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

  const getValorMetrica = (jogador, metrica) => {
    if (!jogador) return 0;
    if (metrica.type === 'per90') return safeParseFloat(jogador[`${metrica.key}_per90`]);
    if (metrica.type === 'custom') return safeParseFloat(jogador[metrica.key]);
    return safeParseFloat(jogador[metrica.key]);
  };

  const getScatterData = useMemo(() => {
    const todos = [...listaPreferencial, ...gremioNovorizontino];
    
    return METRICAS_DISPERSAO.map(metrica => {
      // Dados da Lista Preferencial
      const listaData = listaPreferencial.map(j => ({
        x: j.Jogador,
        y: getValorMetrica(j, metrica),
        time: j.Time,
        posicao: j.Posição,
        type: 'Lista Preferencial'
      }));

      // Dados do Grêmio Novorizontino
      const gremioData = gremioNovorizontino.map(j => ({
        x: j.Jogador,
        y: getValorMetrica(j, metrica),
        time: j.Time,
        posicao: j.Posição,
        type: 'Grêmio Novorizontino'
      }));

      return {
        metrica: metrica.label,
        listaData,
        gremioData,
        allData: [...listaData, ...gremioData]
      };
    });
  }, [listaPreferencial, gremioNovorizontino]);

  const createScatterPlot = (data) => {
    const plotData = [
      {
        x: data.listaData.map(d => d.x),
        y: data.listaData.map(d => d.y),
        mode: 'markers',
        type: 'scatter',
        name: 'Lista Preferencial',
        marker: {
          size: 8,
          color: '#fbbf24',
          line: { color: '#ffffff', width: 1 },
          opacity: 0.8
        },
        text: data.listaData.map(d => `${d.x}<br>${d.time}<br>${d.posicao}`),
        hovertemplate: '<b>%{text}</b><br>Valor: %{y:.2f}<extra></extra>'
      },
      {
        x: data.gremioData.map(d => d.x),
        y: data.gremioData.map(d => d.y),
        mode: 'markers',
        type: 'scatter',
        name: 'Grêmio Novorizontino',
        marker: {
          size: 8,
          color: '#3b82f6',
          line: { color: '#ffffff', width: 1 },
          opacity: 0.8
        },
        text: data.gremioData.map(d => `${d.x}<br>${d.time}<br>${d.posicao}`),
        hovertemplate: '<b>%{text}</b><br>Valor: %{y:.2f}<extra></extra>'
      }
    ];

    const layout = {
      title: { text: data.metrica, font: { size: 14, color: '#ffffff', family: 'Arial, sans-serif' } },
      xaxis: {
        title: 'Jogador',
        tickfont: { size: 8, color: '#ffffff' },
        gridcolor: 'rgba(255,255,255,0.1)',
        showgrid: true
      },
      yaxis: {
        title: data.metrica,
        tickfont: { size: 8, color: '#ffffff' },
        gridcolor: 'rgba(255,255,255,0.1)',
        showgrid: true
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Arial, sans-serif', color: '#ffffff' },
      margin: { t: 40, b: 80, l: 60, r: 20 },
      height: 350,
      showlegend: true,
      legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: 'rgba(0,0,0,0.3)',
        bordercolor: 'rgba(255,255,255,0.2)',
        borderwidth: 1,
        font: { size: 8, color: '#ffffff' }
      }
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
      <div className="max-w-[1400px] mx-auto">
        
        <div className="flex items-center justify-between mb-6 print:mb-4">
          <div className="flex items-center gap-3">
            <img src="/club/escudonovorizontino.png" alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-[0.08em] leading-tight print:text-black">G R Ê M I O &nbsp; N O V O R I Z O N T I N O</h1>
              <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.2em] print:text-slate-500">GRÁFICOS DE DISPERSÃO - SCOUTING</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:gap-2">
          {getScatterData.map((data, idx) => {
            const { data: plotData, layout } = createScatterPlot(data);
            return (
              <div key={idx} className="bg-slate-900/20 border border-slate-800/50 rounded-2xl p-3 print:border-slate-200 print:bg-white print:p-2 print:page-break-inside-avoid">
                <Plot 
                  data={plotData} 
                  layout={layout} 
                  config={{ displayModeBar: false, responsive: true }} 
                  style={{ width: '100%', height: '100%' }} 
                />
              </div>
            );
          })}
          
          {/* Espaço para o 5º gráfico em tela cheia */}
          {getScatterData.length === 5 && (
            <div key={4} className="lg:col-span-2 bg-slate-900/20 border border-slate-800/50 rounded-2xl p-3 print:border-slate-200 print:bg-white print:p-2 print:page-break-inside-avoid">
              {(() => {
                const data = getScatterData[4];
                const { data: plotData, layout } = createScatterPlot(data);
                return (
                  <Plot 
                    data={plotData} 
                    layout={layout} 
                    config={{ displayModeBar: false, responsive: true }} 
                    style={{ width: '100%', height: '100%' }} 
                  />
                );
              })()}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-center print:border-slate-100 print:mt-4">
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.3em]">Confidencial • Grêmio Novorizontino Scouting • {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .print\:hidden { display: none !important; }
          canvas { max-width: 100% !important; height: auto !important; }
          text { fill: #000000 !important; }
          .plotly text { fill: #000000 !important; }
          .lg\:col-span-2 { grid-column: 1 / -1; }
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
