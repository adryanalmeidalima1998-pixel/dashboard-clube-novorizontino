'use client';

import React, { useRef, useEffect, useMemo } from 'react';

// ─── Zone Intensity Computation ──────────────────────────────────────────────
// Field: 5 cols (defensive → attacking) × 4 rows (top-left → bottom-right)
function computeZones(playerData) {
  const minutes = parseFloat(playerData['Minutos jogados']) || 1;
  const p90 = 90 / minutes;
  
  const s = (key) => (parseFloat(playerData[key]) || 0) * p90;
  
  // Pé preferencial para definir o lado do campo (invertido para extremos)
  const foot = (playerData['Pé'] || 'R').toUpperCase();
  const isRight = foot === "R";
  
  // Extremo invertido: pé direito joga pela ala ESQUERDA (row 0=topo), pé esquerdo pela ala DIREITA (row 3=base)
  const wideRow = isRight ? 0 : 3;
  const semiRow = isRight ? 1 : 2;
  const centerRow = isRight ? 2 : 1;
  
  // 5 cols × 4 rows grid
  const z = Array.from({ length: 5 }, () => new Array(4).fill(0));
  const add = (col, row, val) => { 
    if (val > 0 && col >= 0 && col < 5 && row >= 0 && row < 4) {
      z[col][row] += val; 
    }
  };

  // ── Col 0 – Defensive third ────────────────────────────────────────────────
  const def = s("Desafios vencidos") * 0.5 + s("Interceptações") * 0.5;
  add(0, wideRow,   def * 0.55);
  add(0, semiRow,   def * 0.25);
  add(0, centerRow, def * 0.10);
  add(0, isRight ? 3 : 0, def * 0.05);
  add(1, wideRow,   def * 0.25);
  add(1, semiRow,   def * 0.10);

  // ── Cols 1–2 – Midfield ────────────────────────────────────────────────────
  const mid = s("Passes") * 0.06 + s("Passes progressivos precisos") * 0.6;
  add(1, wideRow,   mid * 0.45);
  add(1, semiRow,   mid * 0.30);
  add(1, centerRow, mid * 0.15);
  add(2, wideRow,   mid * 0.35);
  add(2, semiRow,   mid * 0.45);
  add(2, centerRow, mid * 0.15);

  // ── Cols 2–3 – Attacking approach ─────────────────────────────────────────
  const approach = s("Passes dentro da área / precisos") * 0.6 + s("Entradas no terço final carregando a bola") * 1.8;
  add(2, wideRow,   approach * 0.50);
  add(2, semiRow,   approach * 0.30);
  add(3, wideRow,   approach * 0.90);
  add(3, semiRow,   approach * 0.55);
  add(3, centerRow, approach * 0.25);

  // ── Wide final third: dribbles + crosses ──────────────────────────────────
  const wideAtk = s("Dribles no último terço do campo com sucesso") * 2.5 + s("Cruzamentos precisos") * 1.5;
  add(3, wideRow,   wideAtk * 1.20);
  add(4, wideRow,   wideAtk * 0.70);
  add(3, semiRow,   wideAtk * 0.35);
  add(4, semiRow,   wideAtk * 0.20);

  // ── Col 4 – Penalty box ────────────────────────────────────────────────────
  const box = s("Remates") * 1.2 + s("Ações na área adversária bem-sucedidas") * 0.8;
  add(4, centerRow, box * 0.70);
  add(4, semiRow,   box * 0.65);
  add(4, wideRow,   box * 0.35);
  add(3, centerRow, box * 0.30);
  add(3, semiRow,   box * 0.20);

  // Normalize to [0, 1]
  let maxVal = 0;
  z.forEach(col => col.forEach(v => { if (v > maxVal) maxVal = v; }));
  if (maxVal > 0) z.forEach(col => col.forEach((v, r) => { col[r] = v / maxVal; }));
  
  return z;
}

// ─── Color Mapping ────────────────────────────────────────────────────────────
function heatColor(v) {
  if (v < 0.03) return "transparent";
  const stops = [
    [20,  40, 120],
    [20, 100, 200],
    [10, 180, 170],
    [100,210,  60],
    [250,200,  20],
    [255, 80,  20],
    [210,  0,  40],
  ];
  const t = Math.min(v, 1);
  const idx = t * (stops.length - 1);
  const i = Math.min(Math.floor(idx), stops.length - 2);
  const f = idx - i;
  const r = Math.round(stops[i][0] + f * (stops[i + 1][0] - stops[i][0]));
  const g = Math.round(stops[i][1] + f * (stops[i + 1][1] - stops[i][1]));
  const b = Math.round(stops[i][2] + f * (stops[i + 1][2] - stops[i][2]));
  const a = 0.18 + v * 0.72;
  return `rgba(${r},${g},${b},${a})`;
}

export default function HeatmapComponent({ player }) {
  const canvasRef = useRef(null);
  const W = 700, H = 440;
  
  const zones = useMemo(() => computeZones(player), [player]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Clear canvas
    ctx.clearRect(0, 0, W, H);
    
    const mg = 30;
    const fw = W - 2 * mg, fh = H - 2 * mg;
    
    // ── Field background ────────────────────────────────────────────────────
    // Stripes
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#1e5c38" : "#1a5233";
      ctx.fillRect(mg + i * fw / 8, mg, fw / 8, fh);
    }
    
    // ── Heatmap zones ────────────────────────────────────────────────────────
    const COLS = 5, ROWS = 4;
    const cellW = fw / COLS, cellH = fh / ROWS;
    
    // Off-screen canvas for blur
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const octx = off.getContext("2d");
    
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const v = zones[c][r];
        if (v < 0.03) continue;
        const x = mg + c * cellW;
        const y = mg + r * cellH;
        const cx = x + cellW / 2, cy = y + cellH / 2;
        const radius = Math.max(cellW, cellH) * 1.2;
        
        const grad = octx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const color = heatColor(v);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "transparent");
        octx.fillStyle = grad;
        octx.beginPath();
        octx.arc(cx, cy, radius, 0, Math.PI * 2);
        octx.fill();
      }
    }
    
    // Apply blur for smooth heatmap
    ctx.filter = "blur(22px)";
    ctx.drawImage(off, 0, 0);
    ctx.filter = "none";
    
    // Second pass for sharpness
    const off2 = document.createElement("canvas");
    off2.width = W; off2.height = H;
    const octx2 = off2.getContext("2d");
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const v = zones[c][r];
        if (v < 0.2) continue;
        const x = mg + c * cellW, y = mg + r * cellH;
        const cx = x + cellW / 2, cy = y + cellH / 2;
        const radius = Math.max(cellW, cellH) * 0.6;
        const grad = octx2.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const color = heatColor(v);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "transparent");
        octx2.fillStyle = grad;
        octx2.beginPath();
        octx2.arc(cx, cy, radius, 0, Math.PI * 2);
        octx2.fill();
      }
    }
    ctx.filter = "blur(8px)";
    ctx.drawImage(off2, 0, 0);
    ctx.filter = "none";
    
    // ── Field lines ──────────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    
    // Boundary
    ctx.strokeRect(mg, mg, fw, fh);
    
    // Midfield
    ctx.beginPath();
    ctx.moveTo(mg + fw / 2, mg);
    ctx.lineTo(mg + fw / 2, mg + fh);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(mg + fw / 2, mg + fh / 2, 60, 0, Math.PI * 2);
    ctx.stroke();
    
    // Penalty areas
    const boxW = 100, boxH = 220;
    ctx.strokeRect(mg, mg + (fh - boxH) / 2, boxW, boxH);
    ctx.strokeRect(mg + fw - boxW, mg + (fh - boxH) / 2, boxW, boxH);
    
    // Goal areas
    const gW = 40, gH = 100;
    ctx.strokeRect(mg, mg + (fh - gH) / 2, gW, gH);
    ctx.strokeRect(mg + fw - gW, mg + (fh - gH) / 2, gW, gH);
    
    // Corners
    const cR = 15;
    ctx.beginPath(); ctx.arc(mg, mg, cR, 0, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(mg + fw, mg, cR, Math.PI / 2, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(mg + fw, mg + fh, cR, Math.PI, 3 * Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(mg, mg + fh, cR, 3 * Math.PI / 2, 0); ctx.stroke();

    // Foot dominance indicator
    const foot = (player['Pé'] || 'R').toUpperCase();
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.fillText(`PÉ DOMINANTE: ${foot === 'R' ? 'DIREITO' : 'ESQUERDO'}`, mg + 10, H - 10);
    
  }, [player, zones]);
  
  return (
    <div className="flex flex-col items-center bg-[#0a1628] p-4 rounded-lg border border-slate-700 shadow-xl">
      <h3 className="text-white font-bold mb-3 text-sm tracking-widest uppercase opacity-80">Mapa de Calor - Intensidade por Zonas</h3>
      <div className="relative border-2 border-slate-800 rounded shadow-2xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={W} 
          height={H} 
          style={{ maxWidth: '100%', height: 'auto', display: 'block' }} 
        />
      </div>
    </div>
  );
}
