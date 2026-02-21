'use client';

import { useRef, useEffect, useMemo } from 'react';
import { safeParseFloat } from '@/app/utils/dataCleaner';

// ─── Tudo calculado do zero com valores brutos do CSV ─────────────────────────
function computeZones(player) {
  const minutes = safeParseFloat(player['Minutos jogados']);
  if (minutes <= 0) return Array.from({ length: 5 }, () => new Array(4).fill(0));

  // Calcula p90 direto do valor bruto do CSV
  const p = (col) => (safeParseFloat(player[col]) / minutes) * 90;

  // Pé dominante: CSV tem 'DIREITO' / 'ESQUERDO' na coluna 'Pé dominante'
  const pe = String(player['Pé dominante'] || player['Pé'] || '').toUpperCase();
  const isRight = pe.includes('DIREITO') || pe === 'R' || pe === 'RIGHT';

  // Extremo invertido: pé direito → ala esquerda (row 0 = topo)
  const wideRow   = isRight ? 0 : 3;
  const semiRow   = isRight ? 1 : 2;
  const centerRow = isRight ? 2 : 1;

  const z = Array.from({ length: 5 }, () => new Array(4).fill(0));
  const add = (col, row, val) => { if (val > 0 && col < 5 && row < 4) z[col][row] += val; };

  // ── Col 0 — Terço defensivo ───────────────────────────────────────────────
  const def = p('Desarmes') + p('Interceptações') + p('Bolas recuperadas');
  add(0, wideRow,   def * 0.55);
  add(0, semiRow,   def * 0.25);
  add(0, centerRow, def * 0.10);
  add(1, wideRow,   def * 0.25);
  add(1, semiRow,   def * 0.10);

  // ── Cols 1–2 — Meio campo ─────────────────────────────────────────────────
  const mid = p('Passes chave') * 1.2 + p('Passes progressivos') * 0.6 + p('Passes') * 0.1;
  add(1, wideRow,   mid * 0.45);
  add(1, semiRow,   mid * 0.30);
  add(1, centerRow, mid * 0.15);
  add(2, wideRow,   mid * 0.35);
  add(2, semiRow,   mid * 0.45);
  add(2, centerRow, mid * 0.15);

  // ── Cols 2–3 — Aproximação ao terço final ────────────────────────────────
  const entCarry   = p('Entradas no terço final carregando a bola');
  const entTotal   = p('Entradas no terço final');
  const finalThird = entCarry * 1.8 + entTotal * 1.2 + p('Passes chave') * 0.6;
  add(2, wideRow,   finalThird * 0.50);
  add(2, semiRow,   finalThird * 0.30);
  add(3, wideRow,   finalThird * 0.90);
  add(3, semiRow,   finalThird * 0.55);
  add(3, centerRow, finalThird * 0.25);

  // ── Ala no terço final — dribles + cruzamentos ────────────────────────────
  const wideAtk = p('Dribles no último terço do campo') * 2.5 + p('Cruzamentos') * 1.5 + p('Dribles bem sucedidos') * 1.0;
  add(3, wideRow,   wideAtk * 1.20);
  add(4, wideRow,   wideAtk * 0.70);
  add(3, semiRow,   wideAtk * 0.35);
  add(4, semiRow,   wideAtk * 0.20);

  // ── Col 4 — Área adversária ───────────────────────────────────────────────
  const acoesArea = p('Ações na área adv.')
                 || p('Ações na caixa adversária bem-sucedidas')
                 || 0;
  const box = p('Chutes') * 1.2 + acoesArea * 0.8 + p('Xg') * 2.0;
  add(4, centerRow, box * 0.70);
  add(4, semiRow,   box * 0.65);
  add(4, wideRow,   box * 0.35);
  add(3, centerRow, box * 0.30);
  add(3, semiRow,   box * 0.20);

  // Normaliza [0, 1]
  let maxVal = 0;
  z.forEach(col => col.forEach(v => { if (v > maxVal) maxVal = v; }));
  if (maxVal > 0) z.forEach(col => col.forEach((v, r, arr) => { arr[r] = v / maxVal; }));

  return z;
}

// ─── Colormap ─────────────────────────────────────────────────────────────────
function heatColor(v) {
  if (v < 0.03) return 'transparent';
  const stops = [
    [20,  40, 120],
    [20, 100, 200],
    [10, 180, 170],
    [100,210,  60],
    [250,200,  20],
    [255, 80,  20],
    [210,  0,  40],
  ];
  const t   = Math.min(v, 1);
  const idx = t * (stops.length - 1);
  const i   = Math.min(Math.floor(idx), stops.length - 2);
  const f   = idx - i;
  const r = Math.round(stops[i][0] + f * (stops[i+1][0] - stops[i][0]));
  const g = Math.round(stops[i][1] + f * (stops[i+1][1] - stops[i][1]));
  const b = Math.round(stops[i][2] + f * (stops[i+1][2] - stops[i][2]));
  return `rgba(${r},${g},${b},${0.18 + v * 0.72})`;
}

// ─── Desenho do campo ─────────────────────────────────────────────────────────
function drawField(canvas, zones, isRight) {
  const ctx   = canvas.getContext('2d');
  const W     = canvas.width;
  const H     = canvas.height;
  const mg    = 20;
  const fw    = W - 2 * mg;
  const fh    = H - 2 * mg;
  const COLS  = 5, ROWS = 4;
  const cellW = fw / COLS;
  const cellH = fh / ROWS;

  ctx.clearRect(0, 0, W, H);

  // Listras do gramado
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1e5c38' : '#1a5233';
    ctx.fillRect(mg + i * fw / 8, mg, fw / 8, fh);
  }

  // Heatmap em 2 passes: blur largo (suavidade) + blur fino (picos)
  [
    { blur: 18, minV: 0,   radiusMult: 0.9 },
    { blur:  7, minV: 0.2, radiusMult: 0.5 },
  ].forEach(pass => {
    const off  = document.createElement('canvas');
    off.width  = W;
    off.height = H;
    const octx = off.getContext('2d');

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const v = zones[c][r];
        if (v < pass.minV) continue;
        const cx     = mg + c * cellW + cellW / 2;
        const cy     = mg + r * cellH + cellH / 2;
        const radius = Math.max(cellW, cellH) * pass.radiusMult;
        const grad   = octx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, heatColor(v));
        grad.addColorStop(1, 'transparent');
        octx.fillStyle = grad;
        octx.beginPath();
        octx.arc(cx, cy, radius, 0, Math.PI * 2);
        octx.fill();
      }
    }
    ctx.filter = `blur(${pass.blur}px)`;
    ctx.drawImage(off, 0, 0);
    ctx.filter = 'none';
  });

  // Linhas do campo
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(mg, mg, fw, fh);

  ctx.beginPath(); ctx.moveTo(W / 2, mg); ctx.lineTo(W / 2, H - mg); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, fh * 0.18, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2); ctx.fill();

  [-1, 1].forEach(side => {
    const bx  = side === -1 ? mg : W - mg;
    const dir = side === -1 ? 1 : -1;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeRect(bx, H / 2 - fh * 0.28,  dir * fw * 0.16,  fh * 0.56);
    ctx.strokeRect(bx, H / 2 - fh * 0.15,  dir * fw * 0.065, fh * 0.30);
    ctx.strokeRect(bx, H / 2 - fh * 0.073, dir * fw * 0.014, fh * 0.145);
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(bx + dir * fw * 0.12, H / 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    const a1 = side === -1 ? -Math.PI * 0.38 : Math.PI * 0.62;
    const a2 = side === -1 ?  Math.PI * 0.38 : Math.PI * 1.38;
    ctx.arc(bx + dir * fw * 0.16, H / 2, fh * 0.14, a1, a2);
    ctx.stroke();
  });

  [
    [mg,     mg,     0,            Math.PI / 2  ],
    [W - mg, mg,     Math.PI / 2,  Math.PI      ],
    [mg,     H - mg, -Math.PI / 2, 0            ],
    [W - mg, H - mg, Math.PI,      Math.PI * 1.5],
  ].forEach(([cx, cy, a1, a2]) => {
    ctx.beginPath(); ctx.arc(cx, cy, 8, a1, a2); ctx.stroke();
  });

  // Grid de zonas (sutil)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth   = 1;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath(); ctx.moveTo(mg + c * cellW, mg); ctx.lineTo(mg + c * cellW, H - mg); ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(mg, mg + r * cellH); ctx.lineTo(W - mg, mg + r * cellH); ctx.stroke();
  }

  ctx.font      = 'bold 9px monospace';
  ctx.fillStyle = 'rgba(251,191,36,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText(
    isRight ? 'PÉ DIREITO · ALA ESQ.' : 'PÉ ESQUERDO · ALA DIR.',
    W / 2, H - 5
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function HeatmapComponent({ player }) {
  const canvasRef = useRef(null);
  const W = 380, H = 240;

  const pe      = String(player?.['Pé dominante'] || player?.['Pé'] || '').toUpperCase();
  const isRight = pe.includes('DIREITO') || pe === 'R' || pe === 'RIGHT';

  const zones = useMemo(() => {
    if (!player) return Array.from({ length: 5 }, () => new Array(4).fill(0));
    return computeZones(player);
  }, [player]);

  useEffect(() => {
    if (canvasRef.current && player) {
      drawField(canvasRef.current, zones, isRight);
    }
  }, [zones, isRight, player]);

  if (!player) return null;

  // Mini stats: calcula aqui mesmo para não depender de campos pré-computados
  const minutes = safeParseFloat(player['Minutos jogados']);
  const raw90   = (col) => minutes > 0
    ? ((safeParseFloat(player[col]) / minutes) * 90).toFixed(2)
    : '0.00';

  const miniStats = [
    { label: 'xG/90',       value: raw90('Xg') },
    { label: 'xA/90',       value: raw90('xA') },
    { label: 'Dribles/90',  value: raw90('Dribles bem sucedidos') },
  ];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
      <div className="bg-amber-500 text-black font-black text-center py-2 text-xs uppercase tracking-widest">
        Mapa de Calor · Zona de Atuação
      </div>

      <div className="p-3 bg-slate-950/60">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-lg"
          style={{ display: 'block' }}
        />
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] text-slate-600 whitespace-nowrap">Baixa</span>
          <div
            className="flex-1 h-1.5 rounded-full"
            style={{ background: 'linear-gradient(to right, rgb(20,40,120), rgb(10,180,170), rgb(250,200,20), rgb(210,0,40))' }}
          />
          <span className="text-[9px] text-slate-600 whitespace-nowrap">Alta</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-slate-700 font-bold">← DEFESA</span>
          <span className="text-[8px] text-slate-700 font-bold">ATAQUE →</span>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-800 border-t border-slate-800">
        {miniStats.map((s) => (
          <div key={s.label} className="py-2 px-3 text-center">
            <p className="text-amber-400 font-black text-sm">{s.value}</p>
            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
