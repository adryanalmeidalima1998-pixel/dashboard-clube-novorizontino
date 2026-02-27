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
import { getMetricsByPosicao, normalizePosicao } from '@/app/utils/positionMetrics';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-slate-400 font-bold italic animate-pulse text-sm">
      CARREGANDO GRÁFICOS...
    </div>
  ),
});

const FALLBACK_METRICS = [
  { label: 'Passes Chave', key: 'Passes chave', type: 'per90', max: 5 },
  { label: 'Passes Progressivos %', key: 'Passes progressivos precisos,%', type: 'raw', max: 100 },
  { label: 'Passes na Área %', key: 'Passes dentro da área / precisos, %', type: 'raw', max: 100 },
  { label: 'Dribles Certos/90', key: 'Dribles bem sucedidos', type: 'per90', max: 6 },
  { label: 'Dribles 1/3 Final/90', key: 'Dribles no último terço do campo com sucesso', type: 'per90', max: 4 },
  { label: 'Entradas 1/3 Final/90', key: 'Entradas no terço final carregando a bola', type: 'per90', max: 5 },
  { label: 'Recuperações Campo Adv/90', key: 'Bolas recuperadas no campo do adversário', type: 'per90', max: 6 },
  { label: 'xA/90', key: 'xA', type: 'per90', max: 0.5 },
  { label: 'xG/90', key: 'Xg', type: 'per90', max: 0.5 },
  { label: 'Ações Área Adv/90', key: 'Ações na área adversária bem-sucedidas', type: 'per90', max: 6 },
];

function processarJogador(raw, fonte) {
  const minutos = safeParseFloat(raw['Minutos jogados']);
  const obj = { ...raw, _fonte: fonte, _minutos: minutos };
  
  Object.keys(raw).forEach(k => {
    const v = safeParseFloat(raw[k]);
    obj[`_v_${k}_raw`] = v;
    
    if (fonte === 'SERIEB') {
        obj[`_v_${k}_per90`] = v; 
    } else {
        obj[`_v_${k}_per90`] = (minutos > 0) ? (v / minutos) * 90 : v;
    }
  });
  
  return obj;
}

function getVal(jogador, metrica) {
  if (!jogador || !metrica) return 0;
  const isPer90 = metrica.type === 'per90' || metrica.per90 === true;
  const key = isPer90 ? `_v_${metrica.key}_per90` : `_v_${metrica.key}_raw`;
  let val = jogador[key] !== undefined ? jogador[key] : safeParseFloat(jogador[metrica.key]);

  const isPercentage = (metrica.label && metrica.label.includes('%')) || (metrica.key && metrica.key.includes('%'));
  if (isPercentage && val > 0 && val <= 2) {
    val = val * 100;
  }
  return val || 0; 
}

function normPos(p) {
  return normalizePosicao(p) || (p || '').trim().toUpperCase();
}

function mesmaPos(p1, p2) {
  const a = normPos(p1);
  const b = normPos(p2);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function parseCsv(csvText, fonte) {
  return new Promise(resolve => {
    Papa.parse(csvText, {
      header: true, skipEmptyLines: true,
      complete: results => resolve(cleanData(results.data).map(r => processarJogador(r, fonte))),
    });
  });
}

function PlayerProfileContent() {
  const { id } = useParams();
  const router = useRouter();

  const [dados, setDados] = useState(null); 
  const [loading, setLoading] = useState(true);

  const [perfisRankeados, setPerfisRankeados]     = useState([]);
  const [perfilSelecionado, setPerfilSelecionado] = useState('');
  const [textoAnalitico, setTextoAnalitico]       = useState('');
  const [perfilEditando, setPerfilEdit
