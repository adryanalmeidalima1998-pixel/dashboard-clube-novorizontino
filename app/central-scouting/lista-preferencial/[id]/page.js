'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false, 
  loading: () => <div className="h-64 flex items-center justify-center text-slate-500 font-bold">Carregando gráfico...</div> 
});

const METRICAS_RADAR = [
  { label: 'Passes Chave', key: 'Passes chave', type: 'per90' },
  { label: 'Passes Progressivos %', key: 'Passes progressivos precisos %', type: 'raw' },
  { label: 'Passes na Área %', key: 'Passes dentro da área / precisos, %', type: 'raw' },
  { label: 'Dribles Certos/90', key: 'dribles_certos_90', type: 'custom' },
  { label: 'Dribles 1/3 Final Certos/90', key: 'dribles_13_certos_90', type: 'custom' },
  { label: 'Entradas 1/3 Final (C)', key: 'Entradas no terço final carregando a bola, % do total', type: 'raw' },
  { label: 'Recuperações Campo Adv', key: 'Bolas recuperadas no campo do adversário', type: 'per90' },
  { label: 'xA', key: 'xA', type: 'per90' },
  { label: 'xG', key: 'Xg', type: 'per90' },
  { label: 'Ações Área Adv Certas/90', key: 'acoes_area_adv_certas_90', type: 'custom' },
  { label: 'Desafios Ganhos/90', key: 'desafios_ganhos_90', type: 'custom' },
  { label: 'Disputas Ataque Ganhas/90', key: 'disputas_ataque_ganhas_90', type: 'custom' }
];

function PlayerProfileContent() {
  const { id } = useParams();
  const router = useRouter();
  const [player, setPlayer] = useState(null);
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioNovorizontino, setGremioNovorizontino] = useState([]);
  const [loading, setLoading] = useState(true);

  const calcularMetricasCustomizadas = (jogador) => {
    const minutos = safeParseFloat(jogador['Minutos jogados']);
    if (minutos <= 0) return jogador;

    const dribles = safeParseFloat(jogador['Dribles']);
    const driblesSucessoPct = safeParseFloat(jogador['% de dribles com sucesso']) / 100;
    jogador.dribles_certos_90 = (dribles * driblesSucessoPct / minutos) * 90;

    const dribles13 = safeParseFloat(jogador['Dribles no último terço do campo']);
    const dribles13SucessoPct = safeParseFloat(jogador['Dribles no último terço do campo com sucesso, %']) / 100;
    jogador.dribles_13_certos_90 = (dribles13 * dribles13SucessoPct / minutos) * 90;

    const acoesCertasAbs = safeParseFloat(jogador['Ações na área adversária bem-sucedidas']);
    jogador.acoes_area_adv_certas_90 = (acoesCertasAbs / minutos) * 90;

    const desafiosVencidos = safeParseFloat(jogador['Desafios vencidos']);
    jogador.desafios_ganhos_90 = (desafiosVencidos / minutos) * 90;

    const disputasAtaqueGanhos = safeParseFloat(jogador['Disputas de bola no ataque / com sucesso']);
    jogador.disputas_ataque_ganhas_90 = (disputasAtaqueGanhos / minutos) * 90;

    return jogador;
  };

  const processarDados = (dados, aba) => {
    return dados.map(jogador => {
      const minutos = safeParseFloat(jogador['Minutos jogados']);
      const processado = { ...jogador, aba };
      METRICAS_RADAR.forEach(m => {
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
            const p = dados.find(d => d.ID_ATLETA === id || d.Jogador === decodeURIComponent(id));
            if (p) setPlayer(p);
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
  }, [id]);

  const getValorMetrica = (jogador, metrica) => {
    if (!jogador) return 0;
    if (metrica.type === 'per90') return safeParseFloat(jogador[`${metrica.key}_per90`]);
    if (metrica.type === 'custom') return safeParseFloat(jogador[metrica.key]);
    return safeParseFloat(jogador[metrica.key]);
  };

  // Calcular escalas independentes para cada métrica
  const escalasMetricas = useMemo(() => {
    const todos = [...listaPreferencial, ...gremioNovorizontino];
    const escalas = {};
    
    METRICAS_RADAR.forEach(m => {
      const valores = todos.map(j => getValorMetrica(j, m)).filter(v => v >= 0);
      const max = Math.max(...valores, 1);
      
      // Gerar ticks apropriados para cada métrica
      let tickvals = [];
      let ticktext = [];
      
      if (max <= 1) {
        // Para valores pequenos (xG, xA, etc) - 5 ticks
        for (let i = 0; i <= 4; i++) {
          const val = (i / 4) * max;
          tickvals.push(val);
          ticktext.push(val.toFixed(2));
        }
      } else if (max <= 10) {
        // Para valores médios - 5 ticks
        const step = max / 4;
        for (let i = 0; i <= 4; i++) {
          const val = i * step;
          tickvals.push(val);
          ticktext.push(val.toFixed(1));
        }
      } else {
        // Para valores altos (percentuais, etc) - 5 ticks
        const step = max / 4;
        for (let i = 0; i <= 4; i++) {
          const val = i * step;
          tickvals.push(val);
          ticktext.push(val.toFixed(0));
        }
      }
      
      escalas[m.label] = { max, tickvals, ticktext };
    });
    
    return escalas;
  }, [listaPreferencial, gremioNovorizontino]);

  const getRadarData = (type) => {
    if (!player) return [];
    const data = [];

    // Normalizar valores para escala 0-2
    const playerNormalizedValues = METRICAS_RADAR.map(m => {
      const val = getValorMetrica(player, m);
      const escala = escalasMetricas[m.label];
      return (val / escala.max) * 2; // Normalizar para 0-2
    });
    const playerRealValues = METRICAS_RADAR.map(m => getValorMetrica(player, m));

    data.push({
      type: 'scatterpolar',
      r: playerNormalizedValues,
      theta: METRICAS_RADAR.map(m => m.label),
      customdata: playerRealValues,
      hovertemplate: '<b>%{theta}</b><br>Valor: %{customdata:.2f}<extra></extra>',
      fill: 'toself',
      name: player.Jogador,
      line: { color: '#fbbf24', width: 3 },
      fillcolor: 'rgba(251, 191, 36, 0.25)',
      mode: 'lines+markers',
      marker: { size: 6, color: '#fbbf24', line: { color: '#ffffff', width: 1 } }
    });

    if (type === 'media') {
      const mediaListaNormalizedValues = METRICAS_RADAR.map(m => {
        const valores = listaPreferencial.map(j => getValorMetrica(j, m));
        const avg = valores.reduce((a, b) => a + b, 0) / (valores.length || 1);
        const escala = escalasMetricas[m.label];
        return (avg / escala.max) * 2; // Normalizar para 0-2
      });
      const mediaListaRealValues = METRICAS_RADAR.map(m => {
        const valores = listaPreferencial.map(j => getValorMetrica(j, m));
        return valores.reduce((a, b) => a + b, 0) / (valores.length || 1);
      });
      data.push({
        type: 'scatterpolar',
        r: mediaListaNormalizedValues,
        theta: METRICAS_RADAR.map(m => m.label),
        customdata: mediaListaRealValues,
        hovertemplate: '<b>%{theta}</b><br>Media: %{customdata:.2f}<extra></extra>',
        fill: 'toself',
        name: 'Media Lista Preferencial',
        line: { color: '#ef4444', dash: 'dot', width: 2 },
        fillcolor: 'rgba(239, 68, 68, 0.08)',
        mode: 'lines+markers',
        marker: { size: 5, color: '#ef4444', line: { color: '#ffffff', width: 1 } }
      });
    } else {
      const coresGremio = ['#3b82f6', '#10b981', '#8b5cf6'];
      gremioNovorizontino.slice(0, 3).forEach((p, i) => {
        const gremioNormalizedValues = METRICAS_RADAR.map(m => {
          const val = getValorMetrica(p, m);
          const escala = escalasMetricas[m.label];
          return (val / escala.max) * 2; // Normalizar para 0-2
        });
        const gremioRealValues = METRICAS_RADAR.map(m => getValorMetrica(p, m));
        data.push({
          type: 'scatterpolar',
          r: gremioNormalizedValues,
          theta: METRICAS_RADAR.map(m => m.label),
          customdata: gremioRealValues,
          hovertemplate: '<b>%{theta}</b><br>' + p.Jogador + ': %{customdata:.2f}<extra></extra>',
          fill: 'none',
          name: `GN: ${p.Jogador}`,
          line: { color: coresGremio[i], width: 2 },
          mode: 'lines+markers',
          marker: { size: 5, color: coresGremio[i], line: { color: '#ffffff', width: 1 } }
        });
      });
    }
    return data;
  };

  // Criar layout com escalas independentes para cada eixo
  const radarLayout = {
    title: { text: '', font: { size: 0 } },
    polar: {
      radialaxis: { 
        visible: true,
        gridcolor: 'rgba(255,255,255,0.2)',
        tickfont: { size: 6, color: '#ffffff', family: 'Arial, sans-serif' },
        showticklabels: true,
        ticks: 'outside'
      },
      angularaxis: { 
        tickfont: { size: 8, color: '#ffffff', family: 'Arial, sans-serif' },
        gridcolor: 'rgba(255,255,255,0.25)',
        rotation: 90,
        direction: 'clockwise'
      },
      bgcolor: 'rgba(255, 255, 255, 0.01)'
    },
    showlegend: true,
    legend: { 
      orientation: 'h', 
      x: 0.5, 
      y: -0.25, 
      font: { size: 7, color: '#ffffff', family: 'Arial, sans-serif' },
      bgcolor: 'rgba(0,0,0,0)',
      bordercolor: 'rgba(0,0,0,0)',
      borderwidth: 0,
      xanchor: 'center',
      yanchor: 'top'
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 20, b: 80, l: 60, r: 60 },
    height: 300,
    font: { family: 'Arial, sans-serif', color: '#ffffff' }
  };

  // Configurar range e ticks dinâmicos para o eixo radial
  const getRadarLayoutWithDynamicRange = (type) => {
    const layout = { ...radarLayout };
    
    // Encontrar o valor máximo entre todas as métricas
    let maxValue = 0;
    METRICAS_RADAR.forEach(m => {
      const escala = escalasMetricas[m.label];
      if (escala.max > maxValue) maxValue = escala.max;
    });

    // Configurar range e ticks
    layout.polar.radialaxis.range = [0, maxValue];
    
    // Gerar ticks para a escala máxima
    let tickvals = [];
    let ticktext = [];
    if (maxValue <= 1) {
      for (let i = 0; i <= 4; i++) {
        const val = (i / 4) * maxValue;
        tickvals.push(val);
        ticktext.push(val.toFixed(2));
      }
    } else if (maxValue <= 10) {
      const step = maxValue / 4;
      for (let i = 0; i <= 4; i++) {
        const val = i * step;
        tickvals.push(val);
        ticktext.push(val.toFixed(1));
      }
    } else {
      const step = maxValue / 4;
      for (let i = 0; i <= 4; i++) {
        const val = i * step;
        tickvals.push(val);
        ticktext.push(val.toFixed(0));
      }
    }
    
    layout.polar.radialaxis.tickvals = tickvals;
    layout.polar.radialaxis.ticktext = ticktext;

    // Adicionar anotações com as escalas de cada eixo
    layout.annotations = METRICAS_RADAR.map((m, idx) => {
      const escala = escalasMetricas[m.label];
      const angle = (idx / METRICAS_RADAR.length) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      const distance = 1.25;
      const x = Math.cos(rad) * distance;
      const y = Math.sin(rad) * distance;
      
      return {
        x: x,
        y: y,
        text: `<b>${escala.max.toFixed(2)}</b>`,
        showarrow: false,
        font: { size: 6, color: '#fbbf24' },
        xref: 'paper',
        yref: 'paper',
        xanchor: 'center',
        yanchor: 'middle'
      };
    });

    return layout;
  };

  const heatmapData = useMemo(() => {
    if (!player) return [];
    const points = [];
    const isAtaque = player.Posição?.toLowerCase().includes('ataque') || player.Posição?.toLowerCase().includes('ponta');
    for (let i = 0; i < 80; i++) {
      points.push({
        x: isAtaque ? 70 + Math.random() * 30 : 30 + Math.random() * 50,
        y: 20 + Math.random() * 60,
        z: Math.random()
      });
    }
    return points;
  }, [player]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin"></div>
    </div>
  );

  if (!player) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-black uppercase text-brand-yellow mb-4">Atleta não encontrado</h2>
        <button onClick={() => router.back()} className="px-6 py-2 bg-slate-800 rounded-lg font-black uppercase text-xs">Voltar</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-2 md:p-4 print:p-0 print:bg-white print:text-black font-sans">
      <div className="max-w-[1350px] mx-auto bg-slate-900/20 border border-slate-800/50 rounded-2xl p-4 md:p-6 shadow-2xl print:border-0 print:shadow-none print:rounded-none print:p-6 print:w-[297mm] print:h-[210mm] print:mx-0 print:bg-white overflow-hidden relative flex flex-col">
        
        <div className="absolute top-4 right-4 flex gap-2 print:hidden z-50">
          <button onClick={() => window.print()} className="p-2 bg-brand-yellow text-black rounded-lg hover:bg-yellow-500 transition-all shadow-lg flex items-center gap-1 font-black uppercase text-[9px]">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" /></svg>
            PDF
          </button>
          <button onClick={() => router.back()} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex items-center justify-between mb-4 border-b border-brand-yellow/30 pb-3 print:border-slate-200">
          <div className="flex items-center gap-3">
            <img src="/club/escudonovorizontino.png" alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.08em] leading-tight print:text-black">G R Ê M I O &nbsp; N O V O R I Z O N T I N O</h2>
              <p className="text-[8px] font-black text-brand-yellow uppercase tracking-[0.2em] print:text-slate-500">SCOUTING</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Data</p>
            <p className="text-[9px] font-black print:text-black">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        
        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="flex flex-col gap-3 w-1/4">
            <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50 print:bg-slate-50 print:border-slate-100">
              <div className="w-24 h-24 rounded-xl bg-slate-800 border border-brand-yellow overflow-hidden flex-shrink-0 shadow-lg mb-2 print:border-slate-300">
                <img 
                  src={`/images/players/${player.Jogador.replace(/ /g, '_')}.png`} 
                  alt={player.Jogador}
                  className="w-full h-full object-cover"
                  onError={(e) => { 
                    const alternateSrc = `/images/players/${player.Jogador.toUpperCase().replace(/ /g, '_')}.png`;
                    if (e.target.src !== alternateSrc) {
                      e.target.src = alternateSrc;
                    } else {
                      e.target.src = `https://ui-avatars.com/api/?name=${player.Jogador}&background=1e293b&color=fbbf24&size=256&bold=true`;
                    }
                  }}
                />
              </div>
              <h1 className="text-lg font-black uppercase italic leading-none mb-1 print:text-black">{player.Jogador}</h1>
              <p className="text-brand-yellow font-black uppercase tracking-widest text-[7px] print:text-slate-600 mb-2">{player.Time} • {player.Posição}</p>
              
              <div className="grid grid-cols-2 gap-1 text-[7px]">
                {[
                  { label: 'Idade', val: player.Idade },
                  { label: 'Altura', val: player.Altura },
                  { label: 'Peso', val: player.Peso },
                  { label: 'Nac.', val: player.Nacionalidade },
                  { label: 'Pé', val: player['Pé dominante'] },
                  { label: 'Index', val: player.Index },
                ].map(item => (
                  <div key={item.label}>
                    <p className="font-black text-slate-500 uppercase tracking-widest mb-0.5">{item.label}</p>
                    <p className="font-black print:text-black">{item.val || '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-2 flex-1 print:border-slate-100 print:bg-white">
              <h3 className="text-[7px] font-black uppercase italic text-brand-yellow mb-1 print:text-slate-700">Heatmap</h3>
              <div className="relative aspect-[105/68] bg-green-900/10 border border-slate-700 rounded-lg overflow-hidden print:border-slate-200">
                <div className="absolute inset-0 border border-white/10 pointer-events-none"></div>
                <div className="absolute inset-y-0 left-1/2 border-l border-white/10 pointer-events-none"></div>
                {heatmapData.map((p, i) => (
                  <div key={i} className="absolute w-4 h-4 rounded-full blur-md" style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: `rgba(251, 191, 36, ${p.z * 0.3})` }} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-2 print:border-slate-100 print:bg-white h-1/2">
              <h3 className="text-[7px] font-black uppercase italic text-brand-yellow mb-1 print:text-slate-700">vs Média Lista Preferencial</h3>
              <Plot data={getRadarData('media')} layout={getRadarLayoutWithDynamicRange('media')} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-2 print:border-slate-100 print:bg-white h-1/2">
              <h3 className="text-[7px] font-black uppercase italic text-brand-yellow mb-1 print:text-slate-700">vs Grêmio Novorizontino</h3>
              <Plot data={getRadarData('gremio')} layout={getRadarLayoutWithDynamicRange('gremio')} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>

          <div className="w-1/5 bg-slate-900/40 border border-slate-800/50 rounded-2xl p-3 print:border-slate-100 print:bg-white overflow-y-auto">
            <h3 className="text-[7px] font-black uppercase italic text-brand-yellow mb-2 print:text-slate-700 sticky top-0 bg-slate-900/40 print:bg-white py-1 z-10">Métricas p/90</h3>
            <div className="space-y-1">
              {METRICAS_RADAR.map(m => (
                <div key={m.label} className="flex justify-between items-center border-b border-slate-700 pb-0.5 print:border-slate-200">
                  <span className="text-[6px] font-bold text-slate-300 uppercase print:text-slate-700">{m.label}</span>
                  <span className="text-[7px] font-black text-white print:text-black">{getValorMetrica(player, m).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800 flex justify-center print:border-slate-100">
          <p className="text-[6px] font-bold text-slate-600 uppercase tracking-[0.3em]">Confidencial • Grêmio Novorizontino Scouting</p>
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
        }
      `}</style>
    </div>
  );
}

export default function PlayerProfile() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c10] flex items-center justify-center"><div className="w-12 h-12 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin"></div></div>}>
      <PlayerProfileContent />
    </Suspense>
  );
}
