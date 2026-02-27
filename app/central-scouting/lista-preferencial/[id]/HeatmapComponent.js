'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';

const COLS = 5;
const ROWS = 4;
const W = 700;
const H = 440;
const MG = 30;

function heatColor(v) {
  if (v < 0.03) return 'transparent';
  const stops = [
    [20, 40, 120],[20, 100, 200],[10, 180, 170],
    [100, 210, 60],[250, 200, 20],[255, 80, 20],[210, 0, 40],
  ];
  const t = Math.min(v, 1);
  const idx = t * (stops.length - 1);
  const i = Math.min(Math.floor(idx), stops.length - 2);
  const f = idx - i;
  const r = Math.round(stops[i][0] + f * (stops[i+1][0] - stops[i][0]));
  const g = Math.round(stops[i][1] + f * (stops[i+1][1] - stops[i][1]));
  const b = Math.round(stops[i][2] + f * (stops[i+1][2] - stops[i][2]));
  const a = 0.18 + v * 0.72;
  return `rgba(${r},${g},${b},${a})`;
}

function computeZones(playerData) {
  const s = (key) => (playerData[key] || 0) * (90 / (playerData.minutes || 1));
  const isRight = playerData.foot === 'R';
  const wideRow = isRight ? 0 : 3;
  const semiRow = isRight ? 1 : 2;
  const centerRow = isRight ? 2 : 1;
  const z = Array.from({ length: COLS }, () => new Array(ROWS).fill(0));
  const add = (col, row, val) => { if (val > 0) z[col][row] += val; };
  const def = s('tackles') + s('intercepts');
  add(0,wideRow,def*0.55); add(0,semiRow,def*0.25); add(0,centerRow,def*0.1);
  add(1,wideRow,def*0.25); add(1,semiRow,def*0.1);
  const mid = s('passes')*0.06 + s('prog_passes')*0.6;
  add(1,wideRow,mid*0.45); add(1,semiRow,mid*0.3); add(1,centerRow,mid*0.15);
  add(2,wideRow,mid*0.35); add(2,semiRow,mid*0.45); add(2,centerRow,mid*0.15);
  const approach = s('passes_final3')*0.6 + s('entries_final3')*1.2 + s('entries_carry')*1.8;
  add(2,wideRow,approach*0.5); add(2,semiRow,approach*0.3);
  add(3,wideRow,approach*0.9); add(3,semiRow,approach*0.55); add(3,centerRow,approach*0.25);
  const wideAtk = s('drb_final3')*2.5 + s('crosses')*1.5;
  add(3,wideRow,wideAtk*1.2); add(4,wideRow,wideAtk*0.7);
  add(3,semiRow,wideAtk*0.35); add(4,semiRow,wideAtk*0.2);
  const box = s('shots')*1.2 + s('actions_opp_box')*0.8 + s('passes_box')*0.5;
  add(4,centerRow,box*0.7); add(4,semiRow,box*0.65); add(4,wideRow,box*0.35);
  add(3,centerRow,box*0.3); add(3,semiRow,box*0.2);
  let maxVal = 0;
  z.forEach(col => col.forEach(v => { if (v > maxVal) maxVal = v; }));
  if (maxVal > 0) z.forEach(col => col.forEach((v,r) => { col[r] = v / maxVal; }));
  return z;
}

function drawField(ctx, player, zones, editMode, hoveredZone) {
  ctx.clearRect(0, 0, W, H);
  const fw = W - 2*MG; const fh = H - 2*MG;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1e5c38' : '#1a5233';
    ctx.fillRect(MG + (i*fw)/8, MG, fw/8, fh);
  }
  const cellW = fw/COLS; const cellH = fh/ROWS;
  const drawPass = (blurAmt, minVal, radiusFactor) => {
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const octx = off.getContext('2d');
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const v = zones[c][r]; if (v < minVal) continue;
      const cx = MG + c*cellW + cellW/2; const cy = MG + r*cellH + cellH/2;
      const radius = Math.max(cellW,cellH)*radiusFactor;
      const grad = octx.createRadialGradient(cx,cy,0,cx,cy,radius);
      grad.addColorStop(0, heatColor(v)); grad.addColorStop(1,'transparent');
      octx.fillStyle = grad; octx.beginPath(); octx.arc(cx,cy,radius,0,Math.PI*2); octx.fill();
    }
    ctx.filter = `blur(${blurAmt}px)`; ctx.drawImage(off,0,0); ctx.filter = 'none';
  };
  drawPass(22, 0.03, 0.9); drawPass(8, 0.2, 0.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
  ctx.strokeRect(MG,MG,fw,fh);
  ctx.beginPath(); ctx.moveTo(W/2,MG); ctx.lineTo(W/2,H-MG); ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2,H/2,fh*0.18,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(W/2,H/2,3.5,0,Math.PI*2); ctx.fill();
  [-1,1].forEach(side => {
    const baseX = side===-1 ? MG : W-MG; const dir = side===-1 ? 1 : -1;
    const bW=fw*0.16; const bH=fh*0.56;
    ctx.strokeRect(baseX,H/2-bH/2,dir*bW,bH);
    const sW=fw*0.065; const sH=fh*0.3;
    ctx.strokeRect(baseX,H/2-sH/2,dir*sW,sH);
    ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(baseX+dir*fw*0.12,H/2,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath();
    const arcCX=baseX+dir*bW;
    const a1=side===-1?-Math.PI*0.38:Math.PI*0.62; const a2=side===-1?Math.PI*0.38:Math.PI*1.38;
    ctx.arc(arcCX,H/2,fh*0.14,a1,a2); ctx.stroke();
    ctx.lineWidth=2; ctx.strokeRect(baseX,H/2-fh*0.145/2,dir*fw*0.014,fh*0.145);
  });
  [[MG,MG,0,Math.PI/2],[W-MG,MG,Math.PI/2,Math.PI],[MG,H-MG,-Math.PI/2,0],[W-MG,H-MG,Math.PI,Math.PI*1.5]].forEach(([cx,cy,a1,a2]) => {
    ctx.beginPath(); ctx.arc(cx,cy,9,a1,a2); ctx.stroke();
  });
  ctx.font="bold 11px 'IBM Plex Mono',monospace"; ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.textAlign='center';
  ctx.fillText(player.foot==='R'?'→ pé direito':'← pé esquerdo',W/2,H-6);
  ctx.strokeStyle = editMode?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.07)'; ctx.lineWidth=1;
  for (let c=1;c<COLS;c++){ctx.beginPath();ctx.moveTo(MG+c*cellW,MG);ctx.lineTo(MG+c*cellW,H-MG);ctx.stroke();}
  for (let r=1;r<ROWS;r++){ctx.beginPath();ctx.moveTo(MG,MG+r*cellH);ctx.lineTo(W-MG,MG+r*cellH);ctx.stroke();}
  if (editMode) {
    for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++) {
      const x=MG+c*cellW; const y=MG+r*cellH;
      const isHov = hoveredZone&&hoveredZone[0]===c&&hoveredZone[1]===r;
      if (isHov) {
        ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(x+1,y+1,cellW-2,cellH-2);
        ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.5; ctx.strokeRect(x+1,y+1,cellW-2,cellH-2);
      }
      const v=zones[c][r];
      if (v>0.05||isHov) {
        ctx.font="bold 10px 'IBM Plex Mono',monospace";
        ctx.fillStyle=v>0.4?'rgba(0,0,0,0.7)':'rgba(255,255,255,0.6)';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(Math.round(v*100)+'%',x+cellW/2,y+cellH/2);
      }
    }
  }
  ctx.textBaseline='alphabetic';
}

function FieldCanvas({ player, zones, editMode, onZoneClick, onZoneHover }) {
  const canvasRef = useRef(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const isDragging = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    drawField(canvas.getContext('2d'), player, zones, editMode, hoveredZone);
  }, [player, zones, editMode, hoveredZone]);
  const getZone = useCallback((e) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX-rect.left)*(W/rect.width);
    const y = (e.clientY-rect.top)*(H/rect.height);
    const fw=W-2*MG; const fh=H-2*MG;
    if (x<MG||x>W-MG||y<MG||y>H-MG) return null;
    const c=Math.floor(((x-MG)/fw)*COLS); const r=Math.floor(((y-MG)/fh)*ROWS);
    if (c<0||c>=COLS||r<0||r>=ROWS) return null;
    return [c,r];
  },[]);
  const handleMouseDown = useCallback((e)=>{
    if (!editMode) return; isDragging.current=true;
    const z=getZone(e); if(z) onZoneClick(z[0],z[1]);
  },[editMode,getZone,onZoneClick]);
  const handleMouseUp = useCallback(()=>{isDragging.current=false;},[]);
  const handleMouseMove = useCallback((e)=>{
    if (!editMode) return;
    const z=getZone(e); setHoveredZone(z); if(z) onZoneHover(z[0],z[1]);
    if (isDragging.current&&z) onZoneClick(z[0],z[1]);
  },[editMode,getZone,onZoneClick,onZoneHover]);
  return (
    <canvas ref={canvasRef} width={W} height={H}
      onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove} onMouseLeave={()=>{ setHoveredZone(null); isDragging.current=false; }}
      style={{ borderRadius:'12px', display:'block', maxWidth:'100%', height:'auto', cursor: editMode?'crosshair':'default' }}
    />
  );
}

function StatBar({ label, value, max, accent }) {
  const pct = Math.min((value/max)*100, 100);
  return (
    <div style={{marginBottom:'10px'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
        <span style={{fontSize:'11px',color:'#8fa0b8',letterSpacing:'0.04em',textTransform:'uppercase'}}>{label}</span>
        <span style={{fontSize:'11px',fontWeight:'700',color:'#e2e8f4'}}>{value}</span>
      </div>
      <div style={{background:'rgba(255,255,255,0.07)',borderRadius:'4px',height:'5px',overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:accent,borderRadius:'4px',transition:'width 0.6s cubic-bezier(.4,0,.2,1)'}}/>
      </div>
    </div>
  );
}

function Legend() {
  const stops=[[20,40,120],[20,100,200],[10,180,170],[100,210,60],[250,200,20],[255,80,20],[210,0,40]];
  const gradient=stops.map((c,i)=>`rgb(${c[0]},${c[1]},${c[2]}) ${((i/(stops.length-1))*100).toFixed(0)}%`).join(',');
  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'10px'}}>
      <span style={{fontSize:'10px',color:'#6b7a94',whiteSpace:'nowrap'}}>Baixa</span>
      <div style={{flex:1,height:'8px',borderRadius:'4px',background:`linear-gradient(to right,${gradient})`,boxShadow:'0 0 8px rgba(255,80,20,0.3)'}}/>
      <span style={{fontSize:'10px',color:'#6b7a94',whiteSpace:'nowrap'}}>Alta</span>
    </div>
  );
}

const BRUSH_LEVELS = [
  { label: 'Limpar', value: 0, color: '#475569' },
  { label: 'Baixa',  value: 0.25, color: '#1d4ed8' },
  { label: 'Média',  value: 0.55, color: '#059669' },
  { label: 'Alta',   value: 0.82, color: '#ea580c' },
  { label: 'Máx',    value: 1.0,  color: '#dc2626' },
];

const ZONE_COL_LABELS = ['1/3 DEF.','MEIO','TRANSIÇÃO','1/3 ATAQ.','ÁREA'];
const ZONE_ROW_LABELS = ['Ala Dir.','Meia Dir.','Meia Esq.','Ala Esq.'];

export default function HeatmapComponent({ playerData }) {
  const autoZones = useMemo(() => computeZones(playerData), [playerData]);
  const [editMode, setEditMode] = useState(false);
  const [manualZones, setManualZones] = useState(null);
  const [brushLevel, setBrushLevel] = useState(BRUSH_LEVELS[3]);
  const [hoveredInfo, setHoveredInfo] = useState(null);

  const activeZones = manualZones || autoZones;

  const enterEdit = () => {
    if (!manualZones) setManualZones(autoZones.map(col=>[...col]));
    setEditMode(true);
  };

  const handleZoneClick = useCallback((c, r) => {
    setManualZones(prev => {
      const next = (prev || autoZones).map(col=>[...col]);
      next[c][r] = brushLevel.value;
      return next;
    });
  }, [brushLevel, autoZones]);

  const handleZoneHover = useCallback((c, r) => {
    setHoveredInfo({ c, r, col: ZONE_COL_LABELS[c], row: ZONE_ROW_LABELS[r] });
  }, []);

  const p90 = (v) => ((v*90)/(playerData.minutes||1)).toFixed(1);

  const statGroups = [
    { label:'ATAQUE', accent:'linear-gradient(90deg,#f97316,#ef4444)', stats:[
      {label:'Chutes / 90', value:parseFloat(p90(playerData.shots||0)), max:5},
      {label:'Gols', value:playerData.goals||0, max:25},
      {label:'Assistências', value:playerData.assists||0, max:10},
      {label:'Ações área adv. / 90', value:parseFloat(p90(playerData.actions_opp_box||0)), max:10},
    ]},
    { label:'CRIAÇÃO', accent:'linear-gradient(90deg,#22d3ee,#3b82f6)', stats:[
      {label:'Passes prog. / 90', value:parseFloat(p90(playerData.prog_passes||0)), max:8},
      {label:'Dribles últ. terço / 90', value:parseFloat(p90(playerData.drb_final3||0)), max:8},
      {label:'Cruzamentos / 90', value:parseFloat(p90(playerData.crosses||0)), max:4},
      {label:'Entradas terço final / 90', value:parseFloat(p90(playerData.entries_final3||0)), max:5},
    ]},
    { label:'DEFESA', accent:'linear-gradient(90deg,#a78bfa,#6366f1)', stats:[
      {label:'Desarmes / 90', value:parseFloat(p90(playerData.tackles||0)), max:5},
      {label:'Interceptações / 90', value:parseFloat(p90(playerData.intercepts||0)), max:4},
    ]},
  ];

  return (
    <div style={{background:'#08101e',padding:'28px 32px',fontFamily:"'IBM Plex Mono','Courier New',monospace",color:'#e2e8f4'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'24px'}}>
        <div>
          <div style={{fontSize:'11px',letterSpacing:'0.3em',color:'#3b82f6',marginBottom:'6px',textTransform:'uppercase'}}>Scout Analysis</div>
          <h2 style={{margin:0,fontSize:'26px',fontWeight:'800',letterSpacing:'-0.02em',color:'#f0f4ff'}}>MAPA DE CALOR</h2>
          <div style={{fontSize:'12px',color:'#4a5a76',marginTop:'4px'}}>Distribuição de intensidade por zona do campo</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'10px'}}>
          <div style={{fontSize:'10px',color:'#2a3a56',textAlign:'right'}}>
            <div>PÉ DOMINANTE</div>
            <div style={{fontSize:'20px',color:'#3b82f6',marginTop:'2px'}}>{playerData.foot==='R'?'D →':'← E'}</div>
          </div>
          <button onClick={()=>editMode?setEditMode(false):enterEdit()} style={{
            background: editMode?'linear-gradient(135deg,#f97316,#ef4444)':'rgba(255,255,255,0.07)',
            border: editMode?'1px solid rgba(249,115,22,0.5)':'1px solid rgba(255,255,255,0.12)',
            color: editMode?'#fff':'#8fa0b8', borderRadius:'8px', padding:'7px 16px',
            fontSize:'10px', fontWeight:'700', letterSpacing:'0.15em', cursor:'pointer',
            textTransform:'uppercase', transition:'all 0.2s', fontFamily:'inherit',
          }}>
            {editMode ? '✎ EDITANDO' : '✎ EDITAR MAPA'}
          </button>
        </div>
      </div>

      {/* Edit toolbar */}
      {editMode && (
        <div style={{
          background:'rgba(249,115,22,0.07)', border:'1px solid rgba(249,115,22,0.22)',
          borderRadius:'12px', padding:'12px 18px', marginBottom:'18px',
          display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap',
        }}>
          <div style={{fontSize:'10px',color:'#f97316',letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:'700',flexShrink:0}}>
            Pincel
          </div>
          <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
            {BRUSH_LEVELS.map(b=>(
              <button key={b.label} onClick={()=>setBrushLevel(b)} style={{
                background: brushLevel.value===b.value ? b.color : 'rgba(255,255,255,0.06)',
                border: brushLevel.value===b.value ? `1px solid ${b.color}` : '1px solid rgba(255,255,255,0.1)',
                color: brushLevel.value===b.value ? '#fff' : '#8fa0b8',
                borderRadius:'6px', padding:'5px 14px', fontSize:'10px', fontWeight:'700',
                cursor:'pointer', letterSpacing:'0.1em', textTransform:'uppercase',
                transition:'all 0.15s', fontFamily:'inherit',
              }}>{b.label}</button>
            ))}
          </div>
          {hoveredInfo && (
            <div style={{fontSize:'10px',color:'#94a3b8',flex:1,paddingLeft:'4px'}}>
              <span style={{color:'#f97316',fontWeight:'700'}}>{hoveredInfo.col}</span>{' · '}
              <span style={{color:'#cbd5e1'}}>{hoveredInfo.row}</span>
              {' · '}<span style={{color:'#64748b'}}>Intensidade atual: {Math.round((activeZones[hoveredInfo.c]?.[hoveredInfo.r]||0)*100)}%</span>
            </div>
          )}
          <div style={{display:'flex',gap:'6px',marginLeft:'auto'}}>
            <button onClick={()=>setManualZones(Array.from({length:COLS},()=>new Array(ROWS).fill(0)))} style={{
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
              color:'#94a3b8', borderRadius:'6px', padding:'5px 12px', fontSize:'10px',
              fontWeight:'700', cursor:'pointer', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'inherit',
            }}>LIMPAR</button>
            <button onClick={()=>setManualZones(autoZones.map(col=>[...col]))} style={{
              background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)',
              color:'#93c5fd', borderRadius:'6px', padding:'5px 12px', fontSize:'10px',
              fontWeight:'700', cursor:'pointer', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'inherit',
            }}>↺ AUTO</button>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div style={{display:'flex',gap:'24px',flexWrap:'wrap'}}>
        <div style={{flex:'0 0 auto'}}>
          {/* Player badge */}
          <div style={{
            display:'flex', alignItems:'center', gap:'16px',
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'10px 10px 0 0', padding:'12px 18px',
          }}>
            <div style={{
              width:'40px', height:'40px', borderRadius:'50%',
              background:'linear-gradient(135deg,#1e3a5f,#3b82f6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'14px', fontWeight:'800', color:'#e0f0ff',
            }}>
              {playerData.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
            </div>
            <div>
              <div style={{fontSize:'16px',fontWeight:'800',color:'#f0f4ff',lineHeight:1}}>{playerData.name}</div>
              <div style={{fontSize:'11px',color:'#3b82f6',marginTop:'3px'}}>{playerData.team} · EXTREMO · {playerData.age} anos</div>
            </div>
            <div style={{marginLeft:'auto',textAlign:'right'}}>
              <div style={{fontSize:'10px',color:'#4a5a76'}}>MIN JOGADOS</div>
              <div style={{fontSize:'18px',fontWeight:'800',color:'#93c5fd'}}>{playerData.minutes.toLocaleString('pt-BR')}</div>
            </div>
          </div>

          {/* Canvas */}
          <div style={{
            border:'1px solid rgba(255,255,255,0.07)', borderTop:'none',
            borderRadius:'0 0 10px 10px', overflow:'hidden', position:'relative',
          }}>
            <FieldCanvas
              player={playerData} zones={activeZones} editMode={editMode}
              onZoneClick={handleZoneClick} onZoneHover={handleZoneHover}
            />
            {editMode && (
              <div style={{
                position:'absolute', top:'10px', left:'50%', transform:'translateX(-50%)',
                background:'rgba(249,115,22,0.88)', color:'#fff', borderRadius:'20px',
                padding:'3px 16px', fontSize:'10px', fontWeight:'700', letterSpacing:'0.15em',
                pointerEvents:'none', whiteSpace:'nowrap',
              }}>
                CLIQUE OU ARRASTE PARA PINTAR
              </div>
            )}
          </div>

          {/* Direction + legend */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'8px',padding:'0 4px'}}>
            <span style={{fontSize:'10px',color:'#2a3a56'}}>← DEFESA</span>
            <Legend />
            <span style={{fontSize:'10px',color:'#2a3a56'}}>ATAQUE →</span>
          </div>

          {/* Zone grid table (edit mode) */}
          {editMode && (
            <div style={{marginTop:'16px'}}>
              <div style={{fontSize:'10px',color:'#4a5a76',letterSpacing:'0.2em',marginBottom:'8px',textTransform:'uppercase'}}>
                Mapa de zonas — clique para ajustar individualmente
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'10px'}}>
                  <thead>
                    <tr>
                      <td style={{padding:'4px 6px'}}></td>
                      {ZONE_COL_LABELS.map(l=>(
                        <th key={l} style={{padding:'4px 6px',color:'#94a3b8',fontWeight:'700',letterSpacing:'0.08em',textAlign:'center',whiteSpace:'nowrap',fontSize:'9px'}}>{l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ZONE_ROW_LABELS.map((rowLabel,r)=>(
                      <tr key={r}>
                        <td style={{padding:'4px 6px',color:'#64748b',fontWeight:'700',whiteSpace:'nowrap',fontSize:'9px'}}>{rowLabel}</td>
                        {Array.from({length:COLS},(_,c)=>{
                          const v = activeZones[c][r];
                          const pct = Math.round(v*100);
                          const tint = v<0.03?'255,255,255,0.03': v<0.3?'30,100,200,0.25': v<0.6?'10,180,100,0.25': v<0.85?'250,150,20,0.3':'210,0,40,0.3';
                          return (
                            <td key={c} style={{padding:'2px'}}>
                              <button onClick={()=>handleZoneClick(c,r)} style={{
                                width:'100%', minWidth:'52px', padding:'6px 4px',
                                background:`rgba(${tint})`,
                                border:`1px solid rgba(255,255,255,${v<0.03?'0.07':'0.15'})`,
                                borderRadius:'6px', color:v<0.03?'#334155':'#e2e8f4',
                                fontSize:'11px', fontWeight:'700', cursor:'pointer',
                                textAlign:'center', transition:'all 0.15s', fontFamily:'inherit',
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
            </div>
          )}
        </div>

        {/* Stats panel */}
        <div style={{flex:'1 1 220px',minWidth:'200px'}}>
          <div style={{
            background:'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(249,115,22,0.1))',
            border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px',
            padding:'16px 20px', marginBottom:'16px',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <div>
              <div style={{fontSize:'10px',color:'#f87171',letterSpacing:'0.2em',textTransform:'uppercase'}}>Expected Goals</div>
              <div style={{fontSize:'36px',fontWeight:'800',color:'#fca5a5',lineHeight:1.1}}>{(playerData.xG||0).toFixed(2)}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:'10px',color:'#6b7a94'}}>Gols</div>
              <div style={{fontSize:'28px',fontWeight:'800',color:'#f0f4ff'}}>{playerData.goals||0}</div>
              <div style={{fontSize:'10px',color:'#6b7a94',marginTop:'4px'}}>Assist.</div>
              <div style={{fontSize:'22px',fontWeight:'700',color:'#93c5fd'}}>{playerData.assists||0}</div>
            </div>
          </div>
          {statGroups.map(group=>(
            <div key={group.label} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'14px 16px',marginBottom:'12px'}}>
              <div style={{fontSize:'10px',letterSpacing:'0.25em',background:group.accent,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'12px',fontWeight:'700'}}>{group.label}</div>
              {group.stats.map(st=><StatBar key={st.label} label={st.label} value={st.value} max={st.max} accent={group.accent}/>)}
            </div>
          ))}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'14px 16px'}}>
            <div style={{fontSize:'10px',color:'#4a5a76',letterSpacing:'0.2em',marginBottom:'10px'}}>VOLUME DE JOGO / 90</div>
            {[
              {label:'Passes',v:p90(playerData.passes||0),max:30},
              {label:'Dribles',v:p90(playerData.dribbles||0),max:12},
              {label:'Passes p/ área',v:p90(playerData.passes_box||0),max:8},
            ].map(s=><StatBar key={s.label} label={s.label} value={parseFloat(s.v)} max={s.max} accent="linear-gradient(90deg,#34d399,#10b981)"/>)}
          </div>
        </div>
      </div>

      <div style={{marginTop:'20px',fontSize:'10px',color:'#1a2a3a',textAlign:'center'}}>
        {manualZones
          ? 'Mapa editado manualmente · Use ↺ AUTO para restaurar geração automática'
          : 'Heatmap gerado a partir de estatísticas agregadas normalizadas por 90 minutos'}
      </div>
    </div>
  );
}
