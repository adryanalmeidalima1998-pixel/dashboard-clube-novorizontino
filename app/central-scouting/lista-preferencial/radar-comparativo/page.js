'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { sheetUrl, URLS } from '../../../datasources';
import { cleanData, safeParseFloat } from '@/app/utils/dataCleaner';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false, 
  loading: () => <div className="h-96 flex items-center justify-center text-slate-500 font-bold">Carregando gráfico...</div> 
});

// Configuração das métricas solicitadas
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

function RadarComparativoContent() {
  const router = useRouter();
  const [listaPreferencial, setListaPreferencial] = useState([]);
  const [gremioNovorizontino, setGremioNovorizontino] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [comparisonType, setComparisonType] = useState('all_pref'); // 'all_pref' ou 'with_gremio'

  const calcularMetricasCustomizadas = (jogador) => {
    const minutos = safeParseFloat(jogador['Minutos jogados']);
    if (minutos <= 0) return jogador;

    // 1. Dribles Certos por 90: (Dribles * % sucesso) / minutos * 90
    const dribles = safeParseFloat(jogador['Dribles']);
    const driblesSucessoPct = safeParseFloat(jogador['% de dribles com sucesso']) / 100;
    jogador.dribles_certos_90 = (dribles * driblesSucessoPct / minutos) * 90;

    // 2. Dribles no Último Terço Certos por 90
    const dribles13 = safeParseFloat(jogador['Dribles no último terço do campo']);
    const dribles13SucessoPct = safeParseFloat(jogador['Dribles no último terço do campo com sucesso, %']) / 100;
    jogador.dribles_13_certos_90 = (dribles13 * dribles13SucessoPct / minutos) * 90;

    // 3. Ações na Área Adv Certas por 90
    // O CSV tem "Ações na área adversária bem-sucedidas" que parece ser o valor absoluto
    const acoesCertasAbs = safeParseFloat(jogador['Ações na área adversária bem-sucedidas']);
    jogador.acoes_area_adv_certas_90 = (acoesCertasAbs / minutos) * 90;

    // 4. Desafios Ganhos por 90 (Média de acerto por jogo)
    const desafiosVencidos = safeParseFloat(jogador['Desafios vencidos']);
    jogador.desafios_ganhos_90 = (desafiosVencidos / minutos) * 90;

    // 5. Disputas Ataque Ganhas por 90
    const disputasAtaqueGanhos = safeParseFloat(jogador['Disputas de bola no ataque / com sucesso']);
    jogador.disputas_ataque_ganhas_90 = (disputasAtaqueGanhos / minutos) * 90;

    return jogador;
  };

  const processarDados = (dados, aba) => {
    return dados.map(jogador => {
      const minutos = safeParseFloat(jogador['Minutos jogados']);
      const processado = { ...jogador, aba };
      
      // Calcular métricas por 90 para as que precisam
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
        const urlAba1 = sheetUrl('LISTA_PREFERENCIAL');
        const urlAba2 = sheetUrl('GREMIO_NOVORIZONTINO', false);

        const [res1, res2] = await Promise.all([fetch(urlAba1), fetch(urlAba2)]);
        const [csv1, csv2] = await Promise.all([res1.text(), res2.text()]);

        Papa.parse(csv1, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dados = processarDados(cleanData(results.data), 'LISTA PREFERENCIAL');
            setListaPreferencial(dados);
            if (dados.length > 0) setSelectedPlayer(dados[0]);
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

  // Calcular médias para normalização e comparação
  const statsGerais = useMemo(() => {
    const todos = [...listaPreferencial, ...gremioNovorizontino];
    const stats = {};
    METRICAS_RADAR.forEach(m => {
      const valores = todos.map(j => getValorMetrica(j, m)).filter(v => v > 0);
      stats[m.label] = {
        max: Math.max(...valores, 1),
        avg: valores.reduce((a, b) => a + b, 0) / (valores.length || 1)
      };
    });
    return stats;
  }, [listaPreferencial, gremioNovorizontino]);

  const radarData = useMemo(() => {
    if (!selectedPlayer) return [];

    const data = [];

    // 1. Jogador Selecionado
    data.push({
      type: 'scatterpolar',
      r: METRICAS_RADAR.map(m => {
        const val = getValorMetrica(selectedPlayer, m);
        return (val / statsGerais[m.label].max) * 100;
      }),
      theta: METRICAS_RADAR.map(m => m.label),
      fill: 'toself',
      name: selectedPlayer.Jogador,
      line: { color: '#fbbf24', width: 3 },
      fillcolor: 'rgba(251, 191, 36, 0.3)'
    });

    if (comparisonType === 'all_pref') {
      // 2. Média da Lista Preferencial
      const mediaLista = METRICAS_RADAR.map(m => {
        const valores = listaPreferencial.map(j => getValorMetrica(j, m));
        const avg = valores.reduce((a, b) => a + b, 0) / (valores.length || 1);
        return (avg / statsGerais[m.label].max) * 100;
      });

      data.push({
        type: 'scatterpolar',
        r: mediaLista,
        theta: METRICAS_RADAR.map(m => m.label),
        fill: 'toself',
        name: 'Média Lista Preferencial',
        line: { color: '#ef4444', dash: 'dot', width: 2 },
        fillcolor: 'rgba(239, 68, 68, 0.1)'
      });
    } else {
      // 3. Jogadores do Grêmio Novorizontino
      const coresGremio = ['#3b82f6', '#10b981', '#8b5cf6'];
      gremioNovorizontino.slice(0, 3).forEach((p, i) => {
        data.push({
          type: 'scatterpolar',
          r: METRICAS_RADAR.map(m => {
            const val = getValorMetrica(p, m);
            return (val / statsGerais[m.label].max) * 100;
          }),
          theta: METRICAS_RADAR.map(m => m.label),
          fill: 'none',
          name: `GN: ${p.Jogador}`,
          line: { color: coresGremio[i], width: 2 }
        });
      });
    }

    return data;
  }, [selectedPlayer, comparisonType, listaPreferencial, gremioNovorizontino, statsGerais]);

  const layout = {
    polar: {
      radialaxis: { visible: true, range: [0, 100], gridcolor: 'rgba(255,255,255,0.1)', tickfont: { size: 10, color: '#64748b' } },
      angularaxis: { tickfont: { size: 11, color: '#e2e8f0', weight: 'bold' }, gridcolor: 'rgba(255,255,255,0.1)' },
      bgcolor: 'rgba(15, 23, 42, 0.5)'
    },
    showlegend: true,
    legend: { orientation: 'h', y: -0.2, font: { color: '#e2e8f0' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 40, b: 100, l: 80, r: 80 },
    height: 600
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-slate-500 hover:text-brand-yellow transition-all uppercase text-[10px] font-black">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Voltar
            </button>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Relatórios <span className="text-brand-yellow">Radar</span></h1>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-2 rounded-xl flex gap-2">
              <button 
                onClick={() => setComparisonType('all_pref')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${comparisonType === 'all_pref' ? 'bg-brand-yellow text-black' : 'text-slate-500 hover:text-white'}`}
              >
                Média Lista
              </button>
              <button 
                onClick={() => setComparisonType('with_gremio')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${comparisonType === 'with_gremio' ? 'bg-brand-yellow text-black' : 'text-slate-500 hover:text-white'}`}
              >
                vs Grêmio Novorizontino
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* LISTA DE JOGADORES */}
          <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 h-[700px] flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Lista Preferencial</h3>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {listaPreferencial.map(player => (
                <button
                  key={player.ID_ATLETA || player.Jogador}
                  onClick={() => setSelectedPlayer(player)}
                  className={`w-full text-left p-4 rounded-2xl mb-2 transition-all border ${
                    selectedPlayer?.Jogador === player.Jogador 
                      ? 'bg-brand-yellow border-brand-yellow text-black' 
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-brand-yellow/50'
                  }`}
                >
                  <p className="font-black uppercase text-xs truncate">{player.Jogador}</p>
                  <p className={`text-[9px] font-bold ${selectedPlayer?.Jogador === player.Jogador ? 'text-black/60' : 'text-slate-600'}`}>{player.Time}</p>
                </button>
              ))}
            </div>
          </div>

          {/* GRÁFICO */}
          <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8">
            {selectedPlayer ? (
              <>
                <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic">{selectedPlayer.Jogador}</h2>
                    <p className="text-brand-yellow font-bold text-xs uppercase tracking-widest">{selectedPlayer.Time} • {selectedPlayer.Posição}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Minutos Jogados</p>
                    <p className="text-xl font-black">{selectedPlayer['Minutos jogados']}</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Plot
                    data={radarData}
                    layout={layout}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  {METRICAS_RADAR.slice(0, 8).map(m => (
                    <div key={m.label} className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">{m.label}</p>
                      <p className="text-lg font-black text-brand-yellow">{getValorMetrica(selectedPlayer, m).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-bold italic uppercase">
                Selecione um atleta para visualizar o radar
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fbbf24; }
      `}</style>
    </div>
  );
}

export default function RadarComparativoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c10] flex items-center justify-center"><div className="w-12 h-12 border-4 border-brand-yellow/20 border-t-brand-yellow rounded-full animate-spin"></div></div>}>
      <RadarComparativoContent />
    </Suspense>
  );
}
