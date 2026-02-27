'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { safeParseFloat } from '@/app/utils/dataCleaner';

const COLS = 5, ROWS = 4;

// ─── Compute auto zones from raw CSV data ─────────────────────────────────────
function computeZones(player) {
  const minutes = safeParseFloat(player['Minutos jogados']);
  if (minutes <= 0) return Array.from({ length: COLS }, () => new Array(ROWS).fill(0));
  const p = (col) => (safeParseFloat(player[col]) / minutes) * 90;
  const pe = String(player['Pé dominante'] || player['Pé'] || '').toUpperCase();
  const isRight = pe.includes('DIREITO') || pe === 'R' || pe === 'RIGHT';
  const wideRow = isRight ? 0 : 3;
  const semiRow = isRight ? 1 : 2;
  const centerRow = isRight ? 2 : 1;
  const z = Array.from({ length: COLS }, () => new Array(ROWS).fill(0));
  const add = (col, row, val) => { if (val > 0 && col < COLS && row < ROWS) z[col][row] += val; };

  const def = p('Desarmes') + p('Interceptações') + p('Bolas recuperadas');
  add(0, wideRow, def*0.55); add(0, semiRow, def*0.25); add(0, centerRow, def*0.10);
  add(1, wideRow, def*0.25); add(1, semiRow, def*0.10);

  const mid = p('Passes chave')*1.2 + p('Passes progressivos')*0.6 + p('Passes')*0.1;
  add(1, wideRow, mid*0.45); add(1, semiRow, mid*0.30); add(1, centerRow, mid*0.15);
  add(2, wideRow, mid*0.35); add(2, semiRow, mid*0.45); add(2, centerRow, mid*0.15);

  const finalThird = p('Entradas no terço final carregando a bola')*1.8 + p('Entradas no terço final')*1.2 + p('Passes chave')*0.6;
  add(2, wideRow, finalThird*0.50); add(2, semiRow, finalThird*0.30);
  add(3, wideRow, finalThird*0.90); add(3, semiRow, finalThird*0.55); add(3, centerRow, finalThird*0.25);

  const wideAtk = p('Dribles no último terço do campo')*2.5 + p('Cruzamentos')*1.5 + p('Dribles bem sucedidos')*1.0;
  add(3, wideRow, wideAtk*1.20); add(4, wideRow, wideAtk*0.70);
  add(3, semiRow, wideAtk*0.35); add(4, semiRow, wideAtk*0.20);

  const acoesArea = p('Ações na área adv.') || p('Ações na caixa adversária bem-sucedidas') || 0;
  const box = p('Chutes')*1.2 + acoesArea*0.8 + p('Xg')*2.0;
  add(4, centerRow, box*0.70); add(4, semiRow, box*0.65); add(4, wideRow, box*0.35);
  add(3, centerRow, box*0.30); add(3, semiRow, box*0.20);

  let maxVal = 0;
  z.forEach(col => col.forEach(v => { if (v > maxVal) maxVal = v; }));
  if (maxVal > 0) z.forEach(col => col.forEach((v, r, arr) => { arr[r] = v / maxVal; }));
  return z;
}

// ─── Color ────────────────────────────────────────────────────────────────────
function heatColor(v) {
  if (v < 0.03) return 'transparent';
  const stops = [[20,40,120],[20,100,200],[10,180,170],[100,210,60],[250,200,20],[255,80,20],[210,0,40]];
  const t = Math.min(v, 1);
  const idx = t * (stops.length - 1);
  const i = Math.min(Math.floor(idx), stops.length - 2);
  const f = idx - i;
  const r = Math.round(stops[i][0] + f*(stops[i+1][0]-stops[i][0]));
  const g = Math.round(stops[i][1] + f*(stops[i+1][1]-stops[i][1]));
  const b = Math.round(stops[i][2] + f*(stops[i+1][2]-stops[i][2]));
  return `rgba(${r},${g},${b},${0.18 + v*0.72})`;
}

// ─── Draw field ───────────────────────────────────────────────────────────────
function drawField(canvas, zones, isRight, editMode, hoveredZone) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const mg = 20, fw = W-2*mg, fh = H-2*mg;
  const cellW = fw/COLS, cellH = fh/ROWS;

  ctx.clearRect(0, 0, W, H);

  // Grass stripes
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i%2===0 ? '#1e5c38' : '#1a5233';
    ctx.fillRect(mg + i*fw/8, mg, fw/8, fh);
  }

  // Heatmap
  [{blur:18,minV:0,radiusMult:0.9},{blur:7,minV:0.2,radiusMult:0.5}].forEach(pass => {
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const octx = off.getContext('2d');
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const v = zones[c][r]; if (v < pass.minV) continue;
      const cx = mg+c*cellW+cellW/2, cy = mg+r*cellH+cellH/2;
      const radius = Math.max(cellW,cellH)*pass.radiusMult;
      const grad = octx.createRadialGradient(cx,cy,0,cx,cy,radius);
      grad.addColorStop(0, heatColor(v)); grad.addColorStop(1, 'transparent');
      octx.fillStyle = grad; octx.beginPath(); octx.arc(cx,cy,radius,0,Math.PI*2); octx.fill();
    }
    ctx.filter = `blur(${pass.blur}px)`; ctx.drawImage(off,0,0); ctx.filter = 'none';
  });

  // Field lines
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(mg,mg,fw,fh);
  ctx.beginPath(); ctx.moveTo(W/2,mg); ctx.lineTo(W/2,H-mg); ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2,H/2,fh*0.18,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(W/2,H/2,3,0,Math.PI*2); ctx.fill();
  [-1,1].forEach(side=>{
    const bx=side===-1?mg:W-mg, dir=side===-1?1:-1;
    ctx.strokeStyle='rgba(255,255,255,0.85)';
    ctx.strokeRect(bx,H/2-fh*0.28,dir*fw*0.16,fh*0.56);
    ctx.strokeRect(bx,H/2-fh*0.15,dir*fw*0.065,fh*0.30);
    ctx.strokeRect(bx,H/2-fh*0.073,dir*fw*0.014,fh*0.145);
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(bx+dir*fw*0.12,H/2,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.arc(bx+dir*fw*0.16,H/2,fh*0.14,side===-1?-Math.PI*0.38:Math.PI*0.62,side===-1?Math.PI*0.38:Math.PI*1.38);
    ctx.stroke();
  });
  [[mg,mg,0,Math.PI/2],[W-mg,mg,Math.PI/2,Math.PI],[mg,H-mg,-Math.PI/2,0],[W-mg,H-mg,Math.PI,Math.PI*1.5]].forEach(([cx,cy,a1,a2])=>{
    ctx.beginPath(); ctx.arc(cx,cy,8,a1,a2); ctx.stroke();
  });

  // Zone grid
  ctx.strokeStyle = editMode ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  for (let c=1;c<COLS;c++){ctx.beginPath();ctx.moveTo(mg+c*cellW,mg);ctx.lineTo(mg+c*cellW,H-mg);ctx.stroke();}
  for (let r=1;r<ROWS;r++){ctx.beginPath();ctx.moveTo(mg,mg+r*cellH);ctx.lineTo(W-mg,mg+r*cellH);ctx.stroke();}

  // Edit mode overlays
  if (editMode) {
    for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++) {
      const x=mg+c*cellW, y=mg+r*cellH;
      const isHov = hoveredZone && hoveredZone[0]===c && hoveredZone[1]===r;
      if (isHov) {
        ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(x+1,y+1,cellW-2,cellH-2);
        ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1.5; ctx.strokeRect(x+1,y+1,cellW-2,cellH-2);
      }
      const v = zones[c][r];
      if (v>0.05 || isHov) {
        ctx.font='bold 8px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle = v>0.4?'rgba(0,0,0,0.75)':'rgba(255,255,255,0.7)';
        ctx.fillText(Math.round(v*100)+'%', x+cellW/2, y+cellH/2);
      }
    }
  }
  ctx.textBaseline = 'alphabetic';

  // Footer label
  ctx.font='bold 9px monospace'; ctx.fillStyle='rgba(251,191,36,0.5)'; ctx.textAlign='center';
  ctx.fillText(isRight?'PÉ DIREITO · ALA ESQ.':'PÉ ESQUERDO · ALA DIR.', W/2, H-5);
}

// ─── Canvas component ─────────────────────────────────────────────────────────
function FieldCanvas({ zones, isRight, editMode, onZoneClick, onZoneHover }) {
  const canvasRef = useRef(null);
  const W = 380, H = 240;
  const [hoveredZone, setHoveredZone] = useState(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (canvasRef.current) drawField(canvasRef.current, zones, isRight, editMode, hoveredZone);
  }, [zones, isRight, editMode, hoveredZone]);

  const getZone = useCallback((e) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mg = 20, fw = W-2*mg, fh = H-2*mg;
    const x = (e.clientX-rect.left)*(W/rect.width);
    const y = (e.clientY-rect.top)*(H/rect.height);
    if (x<mg||x>W-mg||y<mg||y>H-mg) return null;
    const c = Math.min(Math.floor(((x-mg)/fw)*COLS), COLS-1);
    const r = Math.min(Math.floor(((y-mg)/fh)*ROWS), ROWS-1);
    return [c, r];
  }, []);

  const handleMouseDown = useCallback((e)=>{
    if (!editMode) return; isDragging.current=true;
    const z=getZone(e); if(z) onZoneClick(z[0],z[1]);
  },[editMode,getZone,onZoneClick]);

  const handleMouseMove = useCallback((e)=>{
    if (!editMode) return;
    const z=getZone(e); setHoveredZone(z); if(z) onZoneHover(z[0],z[1]);
    if(isDragging.current&&z) onZoneClick(z[0],z[1]);
  },[editMode,getZone,onZoneClick,onZoneHover]);

  return (
    <canvas ref={canvasRef} width={W} height={H}
      className="w-full rounded-lg"
      style={{ display:'block', cursor: editMode?'crosshair':'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={()=>{isDragging.current=false;}}
      onMouseLeave={()=>{isDragging.current=false; setHoveredZone(null);}}
    />
  );
}

// ─── Brush levels ─────────────────────────────────────────────────────────────
const BRUSHES = [
  { label:'✕',   value:0,    bg:'#334155', active:'#64748b' },
  { label:'▪',   value:0.25, bg:'#1d4ed8', active:'#3b82f6' },
  { label:'▪▪',  value:0.55, bg:'#047857', active:'#10b981' },
  { label:'▪▪▪', value:0.82, bg:'#c2410c', active:'#f97316' },
  { label:'MAX', value:1.0,  bg:'#991b1b', active:'#ef4444' },
];

const COL_LABELS = ['DEF','MEIO','TRANS','ATAQ','ÁREA'];
const ROW_LABELS = ['A.Dir','M.Dir','M.Esq','A.Esq'];

// ─── Main component ───────────────────────────────────────────────────────────
export default function HeatmapComponent({ player }) {
  const autoZones = useMemo(() => {
    if (!player) return Array.from({length:COLS},()=>new Array(ROWS).fill(0));
    return computeZones(player);
  }, [player]);

  const [editMode, setEditMode]     = useState(false);
  const [manualZones, setManualZones] = useState(null);
  const [brush, setBrush]           = useState(BRUSHES[3]);
  const [hovInfo, setHovInfo]       = useState(null);

  const activeZones = manualZones || autoZones;

  const pe = String(player?.['Pé dominante']||player?.['Pé']||'').toUpperCase();
  const isRight = pe.includes('DIREITO')||pe==='R'||pe==='RIGHT';

  const enterEdit = () => {
    if (!manualZones) setManualZones(autoZones.map(col=>[...col]));
    setEditMode(true);
  };

  const handleZoneClick = useCallback((c, r) => {
    setManualZones(prev => {
      const next = (prev||autoZones).map(col=>[...col]);
      next[c][r] = brush.value;
      return next;
    });
  }, [brush, autoZones]);

  const handleZoneHover = useCallback((c, r) => {
    setHovInfo({c, r});
  }, []);

  if (!player) return null;

  const minutes = safeParseFloat(player['Minutos jogados']);
  const raw90 = (col) => minutes>0 ? ((safeParseFloat(player[col])/minutes)*90).toFixed(2) : '0.00';
  const miniStats = [
    { label:'xG/90', value:raw90('Xg') },
    { label:'xA/90', value:raw90('xA') },
    { label:'Dribles/90', value:raw90('Dribles bem sucedidos') },
  ];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-amber-500 px-3 py-2">
        <span className="text-black font-black text-xs uppercase tracking-widest">
          Mapa de Calor · Zona de Atuação
        </span>
        <button
          onClick={() => editMode ? setEditMode(false) : enterEdit()}
          style={{
            background: editMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)',
            border: editMode ? '1px solid rgba(0,0,0,0.4)' : '1px solid rgba(0,0,0,0.2)',
            color: editMode ? '#fff' : 'rgba(0,0,0,0.7)',
            borderRadius:'6px', padding:'2px 10px',
            fontSize:'9px', fontWeight:'800', letterSpacing:'0.12em',
            cursor:'pointer', textTransform:'uppercase', fontFamily:'inherit',
          }}
        >
          {editMode ? '✎ EDITANDO' : '✎ EDITAR'}
        </button>
      </div>

      {/* Edit toolbar */}
      {editMode && (
        <div style={{background:'#0f172a',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'8px 12px',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
          <span style={{fontSize:'9px',color:'#f97316',letterSpacing:'0.15em',fontWeight:'700',textTransform:'uppercase',flexShrink:0}}>Pincel</span>
          <div style={{display:'flex',gap:'4px'}}>
            {BRUSHES.map(b=>(
              <button key={b.label} onClick={()=>setBrush(b)} style={{
                background: brush.value===b.value ? b.active : 'rgba(255,255,255,0.06)',
                border: brush.value===b.value ? `1px solid ${b.active}` : '1px solid rgba(255,255,255,0.1)',
                color: brush.value===b.value?'#fff':'#64748b',
                borderRadius:'5px', padding:'3px 8px',
                fontSize:'9px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit',
                minWidth:'32px', textAlign:'center',
              }}>{b.label}</button>
            ))}
          </div>
          {hovInfo && (
            <span style={{fontSize:'9px',color:'#94a3b8',flex:1}}>
              <span style={{color:'#f97316',fontWeight:'700'}}>{COL_LABELS[hovInfo.c]}</span>
              {' · '}
              <span style={{color:'#cbd5e1'}}>{ROW_LABELS[hovInfo.r]}</span>
              {' · '}<span style={{color:'#475569'}}>{Math.round((activeZones[hovInfo.c]?.[hovInfo.r]||0)*100)}%</span>
            </span>
          )}
          <div style={{display:'flex',gap:'4px',marginLeft:'auto'}}>
            <button onClick={()=>setManualZones(Array.from({length:COLS},()=>new Array(ROWS).fill(0)))} style={{
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
              color:'#64748b', borderRadius:'5px', padding:'3px 8px',
              fontSize:'9px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit',
            }}>LIMPAR</button>
            <button onClick={()=>setManualZones(autoZones.map(col=>[...col]))} style={{
              background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)',
              color:'#93c5fd', borderRadius:'5px', padding:'3px 8px',
              fontSize:'9px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit',
            }}>↺ AUTO</button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="p-3 bg-slate-950/60 relative">
        {editMode && (
          <div style={{
            position:'absolute', top:'18px', left:'50%', transform:'translateX(-50%)',
            background:'rgba(249,115,22,0.85)', color:'#fff', borderRadius:'20px',
            padding:'2px 12px', fontSize:'8px', fontWeight:'700', letterSpacing:'0.12em',
            pointerEvents:'none', whiteSpace:'nowrap', zIndex:10,
          }}>
            CLIQUE OU ARRASTE PARA PINTAR
          </div>
        )}
        <FieldCanvas
          zones={activeZones} isRight={isRight}
          editMode={editMode} onZoneClick={handleZoneClick} onZoneHover={handleZoneHover}
        />

        {/* Zone grid table (edit mode) */}
        {editMode && (
          <div style={{marginTop:'10px'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'8px',fontFamily:'monospace'}}>
              <thead>
                <tr>
                  <td></td>
                  {COL_LABELS.map(l=>(
                    <th key={l} style={{color:'#475569',fontWeight:'700',textAlign:'center',padding:'2px 1px',letterSpacing:'0.05em'}}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROW_LABELS.map((rowLabel,r)=>(
                  <tr key={r}>
                    <td style={{color:'#475569',fontWeight:'700',paddingRight:'4px',whiteSpace:'nowrap'}}>{rowLabel}</td>
                    {Array.from({length:COLS},(_,c)=>{
                      const v=activeZones[c][r];
                      const pct=Math.round(v*100);
                      const tint=v<0.03?'255,255,255,0.04':v<0.3?'30,100,200,0.3':v<0.6?'10,180,100,0.3':v<0.85?'250,150,20,0.35':'210,0,40,0.35';
                      return (
                        <td key={c} style={{padding:'1px 1px'}}>
                          <button onClick={()=>handleZoneClick(c,r)} style={{
                            width:'100%', padding:'3px 2px',
                            background:`rgba(${tint})`,
                            border:`1px solid rgba(255,255,255,${v<0.03?'0.06':'0.12'})`,
                            borderRadius:'4px', color:v<0.03?'#1e293b':'#e2e8f4',
                            fontSize:'8px', fontWeight:'700', cursor:'pointer',
                            textAlign:'center', fontFamily:'inherit',
                          }}>
                            {pct>0?`${pct}%`:'—'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] text-slate-600 whitespace-nowrap">Baixa</span>
          <div className="flex-1 h-1.5 rounded-full"
            style={{background:'linear-gradient(to right,rgb(20,40,120),rgb(10,180,170),rgb(250,200,20),rgb(210,0,40))'}}
          />
          <span className="text-[9px] text-slate-600 whitespace-nowrap">Alta</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-slate-700 font-bold">← DEFESA</span>
          <span className="text-[8px] text-slate-700 font-bold">ATAQUE →</span>
        </div>
      </div>

      {/* Mini stats */}
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
