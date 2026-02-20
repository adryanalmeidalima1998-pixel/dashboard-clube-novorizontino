'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

// ─── Color Mapping ────────────────────────────────────────────────────────────
function heatColor(v) {
  if (v < 0.03) return 'transparent';
  const stops = [
    [20, 40, 120],
    [20, 100, 200],
    [10, 180, 170],
    [100, 210, 60],
    [250, 200, 20],
    [255, 80, 20],
    [210, 0, 40],
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

// ─── Zone Intensity Computation ──────────────────────────────────────────────
function computeZones(playerData) {
  const p90 = (val) => (val * 90) / playerData.minutes;
  const s = (key) => playerData[key] * (90 / playerData.minutes);

  const isRight = playerData.foot === 'R';
  const wideRow = isRight ? 0 : 3;
  const semiRow = isRight ? 1 : 2;
  const centerRow = isRight ? 2 : 1;

  const z = Array.from({ length: 5 }, () => new Array(4).fill(0));
  const add = (col, row, val) => {
    if (val > 0) z[col][row] += val;
  };

  // Defensive third
  const def = s('tackles') + s('intercepts');
  add(0, wideRow, def * 0.55);
  add(0, semiRow, def * 0.25);
  add(0, centerRow, def * 0.1);
  add(0, isRight ? 0 : 3, def * 0.05);
  add(1, wideRow, def * 0.25);
  add(1, semiRow, def * 0.1);

  // Midfield
  const mid = s('passes') * 0.06 + s('prog_passes') * 0.6;
  add(1, wideRow, mid * 0.45);
  add(1, semiRow, mid * 0.3);
  add(1, centerRow, mid * 0.15);
  add(2, wideRow, mid * 0.35);
  add(2, semiRow, mid * 0.45);
  add(2, centerRow, mid * 0.15);

  // Attacking approach
  const approach = s('passes_final3') * 0.6 + s('entries_final3') * 1.2 + s('entries_carry') * 1.8;
  add(2, wideRow, approach * 0.5);
  add(2, semiRow, approach * 0.3);
  add(3, wideRow, approach * 0.9);
  add(3, semiRow, approach * 0.55);
  add(3, centerRow, approach * 0.25);

  // Wide final third
  const wideAtk = s('drb_final3') * 2.5 + s('crosses') * 1.5;
  add(3, wideRow, wideAtk * 1.2);
  add(4, wideRow, wideAtk * 0.7);
  add(3, semiRow, wideAtk * 0.35);
  add(4, semiRow, wideAtk * 0.2);

  // Penalty box
  const box = s('shots') * 1.2 + s('actions_opp_box') * 0.8 + s('passes_box') * 0.5;
  add(4, centerRow, box * 0.7);
  add(4, semiRow, box * 0.65);
  add(4, wideRow, box * 0.35);
  add(3, centerRow, box * 0.3);
  add(3, semiRow, box * 0.2);

  // Normalize to [0, 1]
  let maxVal = 0;
  z.forEach((col) => col.forEach((v) => { if (v > maxVal) maxVal = v; }));
  if (maxVal > 0) z.forEach((col) => col.forEach((v, r) => { col[r] = v / maxVal; }));
  return z;
}

// ─── Canvas Heatmap ───────────────────────────────────────────────────────────
function FieldCanvas({ player, zones }) {
  const canvasRef = useRef(null);
  const W = 700;
  const H = 440;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Field background
    const mg = 30;
    const fw = W - 2 * mg;
    const fh = H - 2 * mg;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1e5c38' : '#1a5233';
      ctx.fillRect(mg + (i * fw) / 8, mg, fw / 8, fh);
    }

    // Heatmap zones
    const COLS = 5;
    const ROWS = 4;
    const cellW = fw / COLS;
    const cellH = fh / ROWS;

    // First pass with blur
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const octx = off.getContext('2d');
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const v = zones[c][r];
        if (v < 0.03) continue;
        const x = mg + c * cellW;
        const y = mg + r * cellH;
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;
        const radius = Math.max(cellW, cellH) * 0.9;
        const grad = octx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const color = heatColor(v);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        octx.fillStyle = grad;
        octx.beginPath();
        octx.arc(cx, cy, radius, 0, Math.PI * 2);
        octx.fill();
      }
    }
    ctx.filter = 'blur(22px)';
    ctx.drawImage(off, 0, 0);
    ctx.filter = 'none';

    // Second pass for sharpness
    const off2 = document.createElement('canvas');
    off2.width = W;
    off2.height = H;
    const octx2 = off2.getContext('2d');
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const v = zones[c][r];
        if (v < 0.2) continue;
        const x = mg + c * cellW;
        const y = mg + r * cellH;
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;
        const radius = Math.max(cellW, cellH) * 0.5;
        const grad = octx2.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const color = heatColor(v);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        octx2.fillStyle = grad;
        octx2.beginPath();
        octx2.arc(cx, cy, radius, 0, Math.PI * 2);
        octx2.fill();
      }
    }
    ctx.filter = 'blur(8px)';
    ctx.drawImage(off2, 0, 0);
    ctx.filter = 'none';

    // Field lines
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mg, mg, fw, fh);

    // Center line
    ctx.beginPath();
    ctx.moveTo(W / 2, mg);
    ctx.lineTo(W / 2, H - mg);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, (fh * 0.18), 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Penalty areas
    [-1, 1].forEach((side) => {
      const baseX = side === -1 ? mg : W - mg;
      const dir = side === -1 ? 1 : -1;
      const bW = fw * 0.16;
      const bH = fh * 0.56;
      ctx.strokeRect(baseX, H / 2 - bH / 2, dir * bW, bH);
      const sW = fw * 0.065;
      const sH = fh * 0.3;
      ctx.strokeRect(baseX, H / 2 - sH / 2, dir * sW, sH);
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(baseX + (dir * fw * 0.12), H / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      const arcCX = baseX + dir * bW;
      const arcR = fh * 0.14;
      const a1 = side === -1 ? (-Math.PI * 0.38) : (Math.PI * 0.62);
      const a2 = side === -1 ? (Math.PI * 0.38) : (Math.PI * 1.38);
      ctx.arc(arcCX, H / 2, arcR, a1, a2);
      ctx.stroke();
      const gW = fw * 0.014;
      const gH = fh * 0.145;
      ctx.lineWidth = 2;
      ctx.strokeRect(baseX, H / 2 - gH / 2, dir * gW, gH);
    });

    // Corner arcs
    [[mg, mg, 0, Math.PI / 2], [W - mg, mg, Math.PI / 2, Math.PI], [mg, H - mg, -Math.PI / 2, 0], [W - mg, H - mg, Math.PI, (Math.PI * 1.5)]].forEach(([cx, cy, a1, a2]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 9, a1, a2);
      ctx.stroke();
    });

    // Foot indicator
    ctx.font = "bold 11px 'IBM Plex Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    const label = player.foot === 'R' ? '→ pé direito' : '→ pé esquerdo';
    ctx.fillText(label, W / 2, H - 6);

    // Zone borders
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(mg + c * cellW, mg);
      ctx.lineTo(mg + c * cellW, H - mg);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(mg, mg + r * cellH);
      ctx.lineTo(W - mg, mg + r * cellH);
      ctx.stroke();
    }
  }, [player, zones]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ borderRadius: '12px', display: 'block', maxWidth: '100%', height: 'auto' }}
    />
  );
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, max, accent }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '11px', color: '#8fa0b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#e2e8f4' }}>{value}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: accent,
            borderRadius: '4px',
            transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  const stops = [
    [20, 40, 120],
    [20, 100, 200],
    [10, 180, 170],
    [100, 210, 60],
    [250, 200, 20],
    [255, 80, 20],
    [210, 0, 40],
  ];
  const gradient = stops
    .map((c, i) => `rgb(${c[0]},${c[1]},${c[2]}) ${((i / (stops.length - 1)) * 100).toFixed(0)}%`)
    .join(',');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
      <span style={{ fontSize: '10px', color: '#6b7a94', whiteSpace: 'nowrap' }}>Baixa</span>
      <div
        style={{
          flex: 1,
          height: '8px',
          borderRadius: '4px',
          background: `linear-gradient(to right, ${gradient})`,
          boxShadow: '0 0 8px rgba(255,80,20,0.3)',
        }}
      />
      <span style={{ fontSize: '10px', color: '#6b7a94', whiteSpace: 'nowrap' }}>Alta</span>
    </div>
  );
}

// ─── Main Heatmap Component ──────────────────────────────────────────────────
export default function HeatmapComponent({ playerData }) {
  const zones = useMemo(() => computeZones(playerData), [playerData]);
  const p90 = (v) => ((v * 90) / playerData.minutes).toFixed(1);

  const statGroups = [
    {
      label: 'ATAQUE',
      accent: 'linear-gradient(90deg,#f97316,#ef4444)',
      stats: [
        { label: 'Chutes / 90', value: parseFloat(p90(playerData.shots || 0)), max: 5 },
        { label: 'Gols', value: playerData.goals || 0, max: 25 },
        { label: 'Assistências', value: playerData.assists || 0, max: 10 },
        { label: 'Ações área adv. / 90', value: parseFloat(p90(playerData.actions_opp_box || 0)), max: 10 },
      ],
    },
    {
      label: 'CRIAÇÃO',
      accent: 'linear-gradient(90deg,#22d3ee,#3b82f6)',
      stats: [
        { label: 'Passes prog. / 90', value: parseFloat(p90(playerData.prog_passes || 0)), max: 8 },
        { label: 'Dribles últ. terço / 90', value: parseFloat(p90(playerData.drb_final3 || 0)), max: 8 },
        { label: 'Cruzamentos / 90', value: parseFloat(p90(playerData.crosses || 0)), max: 4 },
        { label: 'Entradas terço final / 90', value: parseFloat(p90(playerData.entries_final3 || 0)), max: 5 },
      ],
    },
    {
      label: 'DEFESA',
      accent: 'linear-gradient(90deg,#a78bfa,#6366f1)',
      stats: [
        { label: 'Desarmes / 90', value: parseFloat(p90(playerData.tackles || 0)), max: 5 },
        { label: 'Interceptações / 90', value: parseFloat(p90(playerData.intercepts || 0)), max: 4 },
      ],
    },
  ];

  return (
    <div style={{ background: '#08101e', padding: '28px 32px', fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: '#e2e8f4' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.3em', color: '#3b82f6', marginBottom: '6px', textTransform: 'uppercase' }}>
            Scout Analysis
          </div>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em', color: '#f0f4ff' }}>
            MAPA DE CALOR
          </h2>
          <div style={{ fontSize: '12px', color: '#4a5a76', marginTop: '4px' }}>
            Distribuição de intensidade por zona do campo
          </div>
        </div>
        <div style={{ fontSize: '10px', color: '#2a3a56', textAlign: 'right' }}>
          <div>PÉ DOMINANTE</div>
          <div style={{ fontSize: '20px', color: '#3b82f6', marginTop: '2px' }}>
            {playerData.foot === 'R' ? 'D →' : '← E'}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Field */}
        <div style={{ flex: '0 0 auto' }}>
          {/* Player badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px 10px 0 0',
              padding: '12px 18px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#1e3a5f,#3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '800',
                color: '#e0f0ff',
              }}
            >
              {playerData.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#f0f4ff', lineHeight: 1 }}>
                {playerData.name}
              </div>
              <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '3px' }}>
                {playerData.team} · EXTREMO · {playerData.age} anos
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#4a5a76' }}>MIN JOGADOS</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#93c5fd' }}>
                {playerData.minutes.toLocaleString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.07)',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              overflow: 'hidden',
            }}
          >
            <FieldCanvas player={playerData} zones={zones} />
          </div>

          {/* Direction labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '0 4px' }}>
            <span style={{ fontSize: '10px', color: '#2a3a56' }}>← DEFESA</span>
            <Legend />
            <span style={{ fontSize: '10px', color: '#2a3a56' }}>ATAQUE →</span>
          </div>
        </div>

        {/* Stats panel */}
        <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
          {/* xG badge */}
          <div
            style={{
              background: 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(249,115,22,0.1))',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '16px 20px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: '#f87171', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Expected Goals
              </div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#fca5a5', lineHeight: 1.1 }}>
                {(playerData.xG || 0).toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#6b7a94' }}>Gols</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#f0f4ff' }}>{playerData.goals || 0}</div>
              <div style={{ fontSize: '10px', color: '#6b7a94', marginTop: '4px' }}>Assist.</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#93c5fd' }}>{playerData.assists || 0}</div>
            </div>
          </div>

          {/* Stat groups */}
          {statGroups.map((group) => (
            <div
              key={group.label}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.25em',
                  background: group.accent,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '12px',
                  fontWeight: '700',
                }}
              >
                {group.label}
              </div>
              {group.stats.map((st) => (
                <StatBar key={st.label} label={st.label} value={st.value} max={st.max} accent={group.accent} />
              ))}
            </div>
          ))}

          {/* Volume badge */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '10px', color: '#4a5a76', letterSpacing: '0.2em', marginBottom: '10px' }}>
              VOLUME DE JOGO / 90
            </div>
            {[
              { label: 'Passes', v: p90(playerData.passes || 0), max: 30 },
              { label: 'Dribles', v: p90(playerData.dribbles || 0), max: 12 },
              { label: 'Passes p/ área', v: p90(playerData.passes_box || 0), max: 8 },
            ].map((s) => (
              <StatBar
                key={s.label}
                label={s.label}
                value={parseFloat(s.v)}
                max={s.max}
                accent="linear-gradient(90deg,#34d399,#10b981)"
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '10px', color: '#1a2a3a', textAlign: 'center' }}>
        Heatmap gerado a partir de estatísticas agregadas normalizadas por 90 minutos · Posição inferida por tipo de ação
      </div>
    </div>
  );
}
