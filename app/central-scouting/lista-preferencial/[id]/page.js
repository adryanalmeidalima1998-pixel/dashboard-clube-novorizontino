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

  const getRadarData = (type) => {
    if (!player) return [];
    const data = [];

    data.push({
      type: 'scatterpolar',
      r: METRICAS_RADAR.map(m => (getValorMetrica(player, m) / statsGerais[m.label].max) * 100),
      theta: METRICAS_RADAR.map(m => m.label),
      fill: 'toself',
      name: player.Jogador,
      line: { color: '#fbbf24', width: 3 },
      fillcolor: 'rgba(251, 191, 36, 0.3)'
    });

    if (type === 'media') {
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
      const coresGremio = ['#3b82f6', '#10b981', '#8b5cf6'];
      gremioNovorizontino.slice(0, 3).forEach((p, i) => {
        data.push({
          type: 'scatterpolar',
          r: METRICAS_RADAR.map(m => (getValorMetrica(p, m) / statsGerais[m.label].max) * 100),
          theta: METRICAS_RADAR.map(m => m.label),
          fill: 'none',
          name: `GN: ${p.Jogador}`,
          line: { color: coresGremio[i], width: 2 }
        });
      });
    }
    return data;
  };

  const radarLayout = {
    polar: {
      radialaxis: { visible: true, range: [0, 100], gridcolor: 'rgba(0,0,0,0.1)', tickfont: { size: 7, color: '#64748b' } },
      angularaxis: { tickfont: { size: 8, color: '#1e293b', weight: 'bold' }, gridcolor: 'rgba(0,0,0,0.1)' },
      bgcolor: 'rgba(255, 255, 255, 0.5)'
    },
    showlegend: true,
    legend: { orientation: 'h', y: -0.15, font: { size: 9, color: '#1e293b' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 20, b: 20, l: 40, r: 40 },
    height: 320
  };

  const heatmapData = useMemo(() => {
    if (!player) return [];
    const points = [];
    const isAtaque = player.Posição?.toLowerCase().includes('ataque') || player.Posição?.toLowerCase().includes('ponta');
    for (let i = 0; i < 100; i++) {
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
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 print:p-0 print:bg-white print:text-black font-sans">
      {/* CONTAINER A4 */}
      <div className="max-w-[1000px] mx-auto bg-slate-900/20 border border-slate-800/50 rounded-[2rem] p-6 md:p-10 shadow-2xl print:border-0 print:shadow-none print:rounded-none print:p-8 print:w-[210mm] print:h-[297mm] print:mx-0 print:bg-white overflow-hidden relative">
        
        {/* BOTÕES DE AÇÃO (HIDDEN ON PRINT) */}
        <div className="absolute top-6 right-6 flex gap-3 print:hidden z-50">
          <button onClick={() => window.print()} className="p-3 bg-brand-yellow text-black rounded-xl hover:bg-yellow-500 transition-all shadow-lg flex items-center gap-2 font-black uppercase text-[10px]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" /></svg>
            Gerar PDF
          </button>
          <button onClick={() => router.back()} className="p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* CABEÇALHO INSTITUCIONAL (MOVED TO TOP) */}
        <div className="flex items-center justify-between mb-8 border-b-2 border-brand-yellow/30 pb-6 print:border-slate-200">
          <div className="flex items-center gap-5">
            <img src="/club/escudonovorizontino.png" alt="Logo" className="w-16 h-16 object-contain" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-[0.1em] leading-tight print:text-black">G R Ê M I O &nbsp; N O V O R I Z O N T I N O</h2>
              <p className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.3em] print:text-slate-500">DEPARTAMENTO DE SCOUTING</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Data do Relatório</p>
            <p className="text-xs font-black print:text-black">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        
        {/* BIO DO ATLETA */}
        <div className="flex gap-8 mb-8 items-center bg-slate-900/40 p-6 rounded-3xl border border-slate-800/50 print:bg-slate-50 print:border-slate-100">
          <div className="w-32 h-32 rounded-2xl bg-slate-800 border-2 border-brand-yellow overflow-hidden flex-shrink-0 shadow-xl print:border-slate-300">
            <img 
              src={`/images/players/${player.Jogador}.png`} 
              alt={player.Jogador}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${player.Jogador}&background=1e293b&color=fbbf24&size=256&bold=true`; }}
            />
          </div>
          
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
            <div className="col-span-2">
              <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1 print:text-black">{player.Jogador}</h1>
              <p className="text-brand-yellow font-black uppercase tracking-widest text-[9px] print:text-slate-600">{player.Time} • {player.Posição}</p>
            </div>
            {[
              { label: 'Idade', val: player.Idade },
              { label: 'Altura', val: player.Altura },
              { label: 'Peso', val: player.Peso },
              { label: 'Nacionalidade', val: player.Nacionalidade },
              { label: 'Pé', val: player['Pé dominante'] },
              { label: 'Index', val: player.Index },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{item.label}</p>
                <p className="text-xs font-black print:text-black">{item.val || '-'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* GRÁFICOS DE RADAR (REDUCED SIZE FOR A4) */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-4 print:border-slate-100 print:bg-white">
            <h3 className="text-[9px] font-black uppercase italic text-brand-yellow mb-2 text-center print:text-slate-700">vs Média Lista Preferencial</h3>
            <Plot data={getRadarData('media')} layout={radarLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-4 print:border-slate-100 print:bg-white">
            <h3 className="text-[9px] font-black uppercase italic text-brand-yellow mb-2 text-center print:text-slate-700">vs Grêmio Novorizontino</h3>
            <Plot data={getRadarData('gremio')} layout={radarLayout} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%' }} />
          </div>
        </div>

        {/* HEATMAP E MÉTRICAS */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-slate-900/40 border border-slate-800/50 rounded-3xl p-5 print:border-slate-100 print:bg-white">
            <h3 className="text-[9px] font-black uppercase italic text-brand-yellow mb-3 print:text-slate-700">Mapa de Calor (Estimado)</h3>
            <div className="relative aspect-[105/68] bg-green-900/10 border border-slate-700 rounded-xl overflow-hidden print:border-slate-200">
              <div className="absolute inset-0 border border-white/10 pointer-events-none"></div>
              <div className="absolute inset-y-0 left-1/2 border-l border-white/10 pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/10 rounded-full pointer-events-none"></div>
              {heatmapData.map((p, i) => (
                <div key={i} className="absolute w-6 h-6 rounded-full blur-lg" style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: `rgba(251, 191, 36, ${p.z * 0.4})` }} />
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-5 print:border-slate-100 print:bg-white">
            <h3 className="text-[9px] font-black uppercase italic text-brand-yellow mb-3 print:text-slate-700">Métricas p/90</h3>
            <div className="space-y-2.5">
              {METRICAS_RADAR.slice(0, 8).map(m => (
                <div key={m.label} className="flex justify-between items-center border-b border-slate-800 pb-1 print:border-slate-50">
                  <span className="text-[8px] font-bold text-slate-500 uppercase print:text-slate-500">{m.label}</span>
                  <span className="text-[10px] font-black text-brand-yellow print:text-black">{getValorMetrica(player, m).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER DISCRETO */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex justify-center print:border-slate-100">
          <p className="text-[7px] font-bold text-slate-600 uppercase tracking-[0.5em]">Confidencial • Grêmio Novorizontino Scouting System</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .print\:hidden { display: none !important; }
          canvas { max-width: 100% !important; height: auto !important; }
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
