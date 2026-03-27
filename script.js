
// ═══════════════════════════════
// STATE
// ═══════════════════════════════
let S = {
  central: { text:'Membranas Poliméricas', sub:'Alta Seletividade CO₂' },
  mesos: [], micros: [], articles: [], _id: 1
};
let PC = { meso:'#A8C4D8', edit:'#A8C4D8' };
let editId = null;
let vp = { tx:0, ty:0, scale:1 };
let isPan=false, panStart=null;
let contentW=900, contentH=700;
let tapStart=null;
let dragSrcId = null;
let touchDrag = { active:false, id:null, ghost:null, timer:null };
const actionSeq = [];
const EASTER_EGG_SEQUENCES = [
  {seq:['export-svg','export-json','export-excel'],msg:'Steel Ball Run — o spin está alinhado.'},
  {seq:['fit','zoom-reset','fit'],msg:'Saint’s Corpse whispers: siga o vento do Oeste.'}
];
const TAXONOMY_HELP_SEEN_KEY = 'taxonomiars_help_seen';
const TAXONOMY_HELP_SEEN_SESSION_KEY = 'taxonomiars_help_seen_session';
const HELP_DISPLAY_DELAY = 200; // Brief delay (validated on slower mobile renders) to ensure layout is ready before auto-opening help
let helpShownOnce = false;
let helpTimeoutId = null;

function uid(){ return 'n'+(S._id++) }

// ═══════════════════════════════
// LAYOUT CONSTANTS
// ═══════════════════════════════
// All in SVG user units (pixels at 1:1)
// ♠ These proportions orbit the Golden Rectangle — Gyro's secret of the Spin
const K = {
  PAD_TOP: 90,    // space for title/query
  PAD_BOT: 36,
  PAD_L:   20,
  // Central node
  CX: 20, CW: 160,
  // Trunk connector elbow gap before meso column
  ELBOW_GAP: 18,
  // Meso column
  MESO_X: 0,  // computed
  MESO_W: 162, MESO_H: 44,
  // Micro column
  MICRO_GAP: 14,   // horizontal gap meso→micro
  MICRO_X: 0,      // computed
  MICRO_W: 150, MICRO_H: 26,
  // Article column
  ART_GAP: 14,
  ART_X: 0,        // computed
  ART_W: 310, ART_H: 40, // expanded from 32→40 to accommodate the DOI/URL line (see ART_OFFSETS)
};
// Y offsets (px) for reference, journal and DOI lines inside article cards (must fit within K.ART_H)
const ART_OFFSETS = { REF:13, JOURNAL:25, DOI:36 };
const FONT_FAMILY = 'Helvetica';

function initK(){
  K.MESO_X  = K.CX + K.CW + K.ELBOW_GAP;
  K.MICRO_X = K.MESO_X + K.MESO_W + K.MICRO_GAP;
  K.ART_X   = K.MICRO_X + K.MICRO_W + K.ART_GAP;
}

// ═══════════════════════════════
// TREE LAYOUT ENGINE
// Computes Y position for every meso group so nothing overlaps.
// Each group's height = max(MESO_H, microStackH, artStackH)
// Groups are stacked top-to-bottom with GROUP_GAP between them.
// Central node is centred across all groups.
// ═══════════════════════════════
function computeLayout() {
  initK();
  const showArts = document.getElementById('show-arts').value === '1';
  const GROUP_GAP  = parseInt(document.getElementById('vgap').value)  || 20;
  const MICRO_VGAP = parseInt(document.getElementById('mgap').value)  || 8;
  const ART_VGAP   = 8;

  const groups = S.mesos.map(meso => {
    const micros = S.micros.filter(m => m.parent === meso.id);
    const arts   = showArts ? S.articles.filter(a => a.parent === meso.id) : [];

    // height each column occupies
    const microStackH = micros.length > 0
      ? micros.length * K.MICRO_H + (micros.length - 1) * MICRO_VGAP
      : 0;
    const artStackH = arts.length > 0
      ? arts.length * K.ART_H + (arts.length - 1) * ART_VGAP
      : 0;

    const groupH = Math.max(K.MESO_H, microStackH, artStackH, 4);
    return { meso, micros, arts, groupH, microStackH, artStackH, MICRO_VGAP, ART_VGAP };
  });

  // assign Y to each group
  let curY = K.PAD_TOP;
  groups.forEach(g => {
    g.groupY = curY;
    // meso box: vertically centred in group
    g.mesoBoxY = curY + (g.groupH - K.MESO_H) / 2;
    // micro stack: vertically centred
    g.microsY  = curY + (g.groupH - g.microStackH) / 2;
    // art stack: vertically centred
    g.artsY    = curY + (g.groupH - g.artStackH) / 2;
    curY += g.groupH + GROUP_GAP;
  });

  const totalContentH = curY - GROUP_GAP + K.PAD_BOT;
  const totalContentW = K.ART_X + K.ART_W + 24;

  // central node height
  const CH = S.central.sub ? 68 : 52;
  // central node centred across all group rows
  const groupsSpan = groups.length > 0
    ? (groups[groups.length-1].groupY + groups[groups.length-1].groupH) - groups[0].groupY
    : K.MESO_H;
  const centralY = K.PAD_TOP + groupsSpan / 2 - CH / 2;

  return { groups, totalContentH, totalContentW, centralY, CH };
}

// ═══════════════════════════════
// RENDER
// ═══════════════════════════════
function render() {
  const svg    = document.getElementById('main-svg');
  const title  = document.getElementById('map-title').value;
  const sub    = document.getElementById('map-subtitle').value;
  const query  = document.getElementById('map-query').value;
  const showArts = document.getElementById('show-arts').value === '1';

  const layout = computeLayout();
  const { groups, totalContentH, totalContentW, centralY, CH } = layout;
  contentW = totalContentW;
  contentH = totalContentH;

  const W = totalContentW, H = totalContentH;
  const els = [];

  // ── DEFS (arrow markers) ──────────────────────────
  els.push(`<defs>
    <marker id="am" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M1 2L8 5L1 8" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round"/>
    </marker>
    <marker id="am2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M1 2L8 5L1 8" fill="none" stroke="#4a8aaa" stroke-width="1.5" stroke-linecap="round"/>
    </marker>
  </defs>`);

  // ── BACKGROUND ───────────────────────────────────
  els.push(`<rect width="${W}" height="${H}" fill="#f0efe8"/>`);

  // ── TITLE / QUERY BAR ────────────────────────────
  els.push(`<text x="${W/2}" y="26" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="16" font-weight="bold" fill="#CC2200">${esc(title)}</text>`);
  if (sub)
    els.push(`<text x="${W/2}" y="44" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="11" fill="#555">${esc(sub)}</text>`);
  if (query) {
    els.push(`<rect x="36" y="52" width="${W-72}" height="22" rx="5" fill="white" stroke="#ccc" stroke-width="0.8"/>`);
    els.push(`<text x="${W/2}" y="66" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="8.5" fill="#888" font-style="italic">${esc(query)}</text>`);
  }

  // ── CENTRAL NODE ─────────────────────────────────
  const cx = K.CX, cw = K.CW;
  const cy = centralY;
  els.push(`<rect x="${cx}" y="${cy}" width="${cw}" height="${CH}" rx="10" fill="#CC2200" stroke="#8B0000" stroke-width="2" class="svgn" data-id="__central"/>`);
  const cTextLines = wrapText(S.central.text, 17);
  const cLineH = 15;
  const cTextTotalH = cTextLines.length * cLineH;
  // position text block centred, leaving room for sub
  const cTextTopY = cy + (S.central.sub
    ? (CH - cTextTotalH - 14) / 2 + cLineH
    : (CH - cTextTotalH) / 2 + cLineH);
  cTextLines.forEach((line, i) => {
    els.push(`<text x="${cx+cw/2}" y="${cTextTopY + i*cLineH}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="12" font-weight="bold" fill="white">${esc(line)}</text>`);
  });
  if (S.central.sub) {
    els.push(`<text x="${cx+cw/2}" y="${cy+CH-9}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="9.5" fill="#FFD0CC">${esc(S.central.sub)}</text>`);
  }

  const centralMidY = cy + CH / 2;
  const elbowX = K.MESO_X - 8; // shared elbow column X for trunks

  // ── GROUPS ───────────────────────────────────────
  groups.forEach(g => {
    const { meso, micros, arts, mesoBoxY, microsY, artsY, MICRO_VGAP, ART_VGAP } = g;
    const mx = K.MESO_X, mw = K.MESO_W, mh = K.MESO_H;
    const mesoMidY = mesoBoxY + mh / 2;
    const mborder  = colorDarken(meso.color, 60);
    const mtextCol = colorText(meso.color);

    // ── TRUNK: central → meso (elbow routing) ──────
    // right edge of central → elbow col → meso left edge
    els.push(`<path d="M${cx+cw} ${centralMidY} H${elbowX} V${mesoMidY} H${mx}" fill="none" stroke="#555" stroke-width="1.8" marker-end="url(#am)"/>`);

    // ── MESO BOX ────────────────────────────────────
    els.push(`<rect x="${mx}" y="${mesoBoxY}" width="${mw}" height="${mh}" rx="7" fill="${meso.color}" stroke="${mborder}" stroke-width="1.2" class="svgn" data-id="${meso.id}"/>`);
    const mlines = wrapText(meso.name, 22);
    const mlH = 13;
    const mTextH = mlines.length * mlH + (meso.desc ? 12 : 0);
    let mty = mesoBoxY + (mh - mTextH) / 2 + mlH;
    mlines.forEach((line, i) => {
      els.push(`<text x="${mx+mw/2}" y="${mty+i*mlH}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="11.5" font-weight="bold" fill="${mtextCol}">${esc(line)}</text>`);
    });
    if (meso.desc) {
      els.push(`<text x="${mx+mw/2}" y="${mesoBoxY+mh-7}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="8" fill="${colorDarken(mtextCol,30)}" font-style="italic">${esc(meso.desc)}</text>`);
    }

    // ── MICROS ──────────────────────────────────────
    if (micros.length > 0) {
      const microElbowX = K.MICRO_X - 8;
      micros.forEach((mc, i) => {
        const mry    = microsY + i * (K.MICRO_H + MICRO_VGAP);
        const mrMidY = mry + K.MICRO_H / 2;
        // elbow: meso right → microElbowX → micro left
        els.push(`<path d="M${mx+mw} ${mesoMidY} H${microElbowX} V${mrMidY} H${K.MICRO_X}" fill="none" stroke="${mborder}" stroke-width="1.1" marker-end="url(#am2)"/>`);
        els.push(`<rect x="${K.MICRO_X}" y="${mry}" width="${K.MICRO_W}" height="${K.MICRO_H}" rx="5" fill="#C8E6C0" stroke="#5A9950" stroke-width="0.8" class="svgn" data-id="${mc.id}"/>`);
        const mclines = wrapText(mc.name, 24);
        const mclH    = 11;
        const mcTextH = mclines.length * mclH;
        const mcts    = mry + (K.MICRO_H - mcTextH) / 2 + mclH;
        mclines.forEach((line, li) => {
          els.push(`<text x="${K.MICRO_X+K.MICRO_W/2}" y="${mcts+li*mclH}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="9.5" fill="#1a4d10">${esc(line)}</text>`);
        });
      });
    }

    // ── ARTICLES ────────────────────────────────────
    if (showArts && arts.length > 0) {
      arts.forEach((art, i) => {
        const ary = artsY + i * (K.ART_H + ART_VGAP);
        const doiUrl = formatDoiUrl(art.doi);
        const doiText = prettyDoi(art.doi);
        els.push(`<rect x="${K.ART_X}" y="${ary}" width="${K.ART_W}" height="${K.ART_H}" rx="5" fill="#FFF3CD" stroke="#C8A400" stroke-width="0.8" class="svgn" data-id="${art.id}"/>`);
        els.push(`<text x="${K.ART_X+K.ART_W/2}" y="${ary+ART_OFFSETS.REF}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="8.5" font-weight="bold" fill="#5c4a00">${esc(art.ref)}</text>`);
        if (art.journal)
          els.push(`<text x="${K.ART_X+K.ART_W/2}" y="${ary+ART_OFFSETS.JOURNAL}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="8" fill="#7a6a00">${esc(art.journal)}</text>`);
        if (doiUrl)
          els.push(`<a href="${escAttr(doiUrl)}" target="_blank" rel="noopener noreferrer"><text x="${K.ART_X+K.ART_W/2}" y="${ary+ART_OFFSETS.DOI}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="7.6" fill="#5c4a00" text-decoration="underline">${esc(doiText)}</text></a>`);
      });
    }
  });

  // ── LEGEND ───────────────────────────────────────
  const ly = H - 22;
  const legend = [['Tema Central','#CC2200'],['Driver Meso','#A8C4D8'],['Taxonomia Micro','#C8E6C0'],['Artigo Ref.','#FFF3CD']];
  let lx = 20;
  legend.forEach(([label,col]) => {
    els.push(`<rect x="${lx}" y="${ly}" width="11" height="11" rx="2" fill="${col}" stroke="#999" stroke-width="0.8"/>`);
    els.push(`<text x="${lx+15}" y="${ly+9}" font-family="${FONT_FAMILY}" font-size="8.5" fill="#666">${esc(label)}</text>`);
    lx += 96;
  });
  els.push(`<text x="${W-8}" y="${ly+9}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="8" fill="#bbb">TaxonomyMapBuilder · TRM/UFRJ</text>`);

  // ── INJECT ───────────────────────────────────────
  svg.setAttribute('width',  W);
  svg.setAttribute('height', H);
  svg.innerHTML = els.join('');

  applyVP();

  // click handlers
  svg.querySelectorAll('.svgn').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', e => { e.stopPropagation(); openEdit(el.dataset.id); });
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        const t=e.touches[0];
        tapStart={x:t.clientX,y:t.clientY,t:Date.now(),id:el.dataset.id};
      } else {
        tapStart=null;
      }
      e.stopPropagation();
    }, {passive:true});
    el.addEventListener('touchend', e => {
      if (e.changedTouches.length===1 && tapStart && tapStart.id===el.dataset.id) {
        const t=e.changedTouches[0];
        const moved=Math.hypot(t.clientX-tapStart.x,t.clientY-tapStart.y)>8 || (Date.now()-tapStart.t)>600;
        if (!moved) {
          e.preventDefault();
          e.stopPropagation();
          openEdit(el.dataset.id);
        }
      }
      tapStart=null;
    }, {passive:false});
  });
}

// ═══════════════════════════════
// VIEWPORT
// ═══════════════════════════════
function applyVP(){
  const svg = document.getElementById('main-svg');
  const vbW = contentW / vp.scale;
  const vbH = contentH / vp.scale;
  const vbX = -vp.tx / vp.scale;
  const vbY = -vp.ty / vp.scale;
  svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  document.getElementById('zoom-info').textContent = `zoom: ${Math.round(vp.scale*100)}%`;
}

function doZoom(f){
  vp.scale = Math.min(Math.max(vp.scale*f, 0.12), 8);
  applyVP();
  rememberAction(f>1?'zoom-in':'zoom-out');
}
function resetView(){ vp={tx:0,ty:0,scale:1}; applyVP(); rememberAction('zoom-reset'); }
function fitAll(){
  const wrap = document.getElementById('cwrap');
  const ww = wrap.clientWidth, wh = wrap.clientHeight;
  vp.scale = Math.min(ww/contentW, wh/contentH) * 0.94;
  vp.tx = (ww - contentW*vp.scale)/2;
  vp.ty = (wh - contentH*vp.scale)/2;
  applyVP();
  rememberAction('fit');
}

const cwrap = document.getElementById('cwrap');
cwrap.addEventListener('mousedown', e => {
  if(e.button===0){ isPan=true; panStart={x:e.clientX,y:e.clientY}; e.preventDefault(); }
});
window.addEventListener('mousemove', e => {
  if(!isPan||!panStart) return;
  vp.tx += e.clientX - panStart.x;
  vp.ty += e.clientY - panStart.y;
  panStart = {x:e.clientX, y:e.clientY};
  applyVP();
});
window.addEventListener('mouseup', () => { isPan=false; });

cwrap.addEventListener('wheel', e => {
  e.preventDefault();
  const f = e.deltaY < 0 ? 1.1 : 1/1.1;
  const rect = cwrap.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const wx = (mx - vp.tx)/vp.scale, wy = (my - vp.ty)/vp.scale;
  vp.scale = Math.min(Math.max(vp.scale*f, 0.12), 8);
  vp.tx = mx - wx*vp.scale;
  vp.ty = my - wy*vp.scale;
  applyVP();
}, {passive:false});

// ── TOUCH EVENTS ─────────────────────────────────
let touchState = null;
cwrap.addEventListener('touchstart', e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    touchState = { type:'pan', x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    touchState = { type:'pinch', dist, cx, cy };
  }
}, {passive:false});

cwrap.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!touchState) return;
  const rect = cwrap.getBoundingClientRect();
  if (touchState.type === 'pan' && e.touches.length === 1) {
    const dx = e.touches[0].clientX - touchState.x;
    const dy = e.touches[0].clientY - touchState.y;
    vp.tx += dx; vp.ty += dy;
    touchState.x = e.touches[0].clientX;
    touchState.y = e.touches[0].clientY;
    applyVP();
  } else if (touchState.type === 'pinch' && e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const newDist = Math.hypot(dx, dy);
    const f = newDist / touchState.dist;
    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
    const wx = (cx - vp.tx) / vp.scale, wy = (cy - vp.ty) / vp.scale;
    vp.scale = Math.min(Math.max(vp.scale * f, 0.12), 8);
    vp.tx = cx - wx * vp.scale;
    vp.ty = cy - wy * vp.scale;
    touchState.dist = newDist;
    touchState.cx = cx + rect.left;
    touchState.cy = cy + rect.top;
    applyVP();
  }
}, {passive:false});

cwrap.addEventListener('touchend', e => {
  if (e.touches.length === 0) touchState = null;
  else if (e.touches.length === 1) {
    touchState = { type:'pan', x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
}, {passive:false});

// ═══════════════════════════════
// HELPERS
// ═══════════════════════════════
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
// Extends esc() by also escaping single quotes for safe use in HTML attribute values.
function escAttr(s){ return esc(s).replace(/'/g,'&#39;'); }

function formatDoiUrl(doi){
  if(!doi) return '';
  const t=doi.trim();
  if(!t) return '';
  if(/^https?:\/\//i.test(t)) return t;
  return 'https://doi.org/'+t.replace(/^doi:/i,'').replace(/^https?:\/\/doi.org\//i,'');
}
function prettyDoi(doi){
  const u=formatDoiUrl(doi);
  return u ? u.replace(/^https?:\/\/(www\.)?/i,'') : '';
}
function buildArticleSubtitle(journal, doi){
  const parts=[];
  if(journal) parts.push(journal);
  const pd=prettyDoi(doi);
  if(pd) parts.push(pd);
  return parts.join(' · ');
}

function colorDarken(hex, amt){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return '#'+[r,g,b].map(v=>Math.max(0,v-amt).toString(16).padStart(2,'0')).join('');
}

function colorText(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b)/255 > 0.55 ? '#1a2d3a' : '#e8f4ff';
}

function wrapText(str, maxChars){
  if(!str) return [''];
  const words=str.split(' ');
  const lines=[];
  let cur='';
  words.forEach(w=>{
    const test=(cur+' '+w).trim();
    if(test.length>maxChars && cur){ lines.push(cur.trim()); cur=w; }
    else cur=test;
  });
  if(cur) lines.push(cur.trim());
  return lines.length ? lines : [''];
}

function rememberAction(key){
  actionSeq.push(key);
  const maxLen=Math.max(6,...EASTER_EGG_SEQUENCES.map(s=>s.seq.length));
  if(actionSeq.length>maxLen) actionSeq.shift();
  EASTER_EGG_SEQUENCES.forEach(({seq,msg})=>{
    if(endsWithSeq(actionSeq,seq)){ toast(msg); }
  });
}
function endsWithSeq(arr,seq){
  if(arr.length<seq.length) return false;
  for(let i=0;i<seq.length;i++){
    if(arr[arr.length-seq.length+i]!==seq[i]) return false;
  }
  return true;
}

// ═══════════════════════════════
// MUTATIONS
// ═══════════════════════════════
function updateCentral(){
  S.central.text = document.getElementById('central-text').value.trim()||'Tema';
  S.central.sub  = document.getElementById('central-sub').value.trim();
  render(); toast('Central atualizado');
}
function addMeso(){
  const n=document.getElementById('meso-name').value.trim();
  if(!n){toast('Digite o nome');return;}
  S.mesos.push({id:uid(),name:n,desc:document.getElementById('meso-desc').value.trim(),color:PC.meso});
  document.getElementById('meso-name').value='';
  document.getElementById('meso-desc').value='';
  render(); refreshSelects(); toast('Driver Meso adicionado');
}
function addMicro(){
  const n=document.getElementById('micro-name').value.trim();
  const p=document.getElementById('micro-parent').value;
  if(!n){toast('Digite o nome');return;}
  if(!p){toast('Selecione o Driver Pai');return;}
  S.micros.push({id:uid(),name:n,parent:p});
  document.getElementById('micro-name').value='';
  render(); toast('Micro adicionada');
}
function addArticle(){
  const r=document.getElementById('art-ref').value.trim();
  const p=document.getElementById('art-parent').value;
  if(!r){toast('Digite a referência');return;}
  if(!p){toast('Selecione o Driver Pai');return;}
  S.articles.push({id:uid(),ref:r,journal:document.getElementById('art-journal').value.trim(),doi:document.getElementById('art-doi').value.trim(),parent:p});
  ['art-ref','art-journal','art-doi'].forEach(id=>document.getElementById(id).value='');
  render(); toast('Artigo adicionado');
}
function quickDel(id){
  S.mesos    = S.mesos.filter(x=>x.id!==id);
  S.micros   = S.micros.filter(x=>x.id!==id&&x.parent!==id);
  S.articles = S.articles.filter(x=>x.id!==id&&x.parent!==id);
  render(); refreshSelects(); buildNodeList(); toast('Nó removido');
}

// ═══════════════════════════════
// EDIT MODAL
// ═══════════════════════════════
function openEdit(id){
  editId=id;
  const show=f=>document.getElementById(f).style.display='';
  const hide=f=>document.getElementById(f).style.display='none';
  ['f-desc','f-journal','f-doi','f-color','f-parent'].forEach(show);

  if(id==='__central'){
    document.getElementById('modal-ttl').textContent='Editar Nó Central';
    document.getElementById('ename').value=S.central.text;
    document.getElementById('edesc').value=S.central.sub||'';
    ['f-journal','f-doi','f-color','f-parent'].forEach(hide);
  } else {
    const meso=S.mesos.find(x=>x.id===id);
    const micro=S.micros.find(x=>x.id===id);
    const art=S.articles.find(x=>x.id===id);
    if(meso){
      document.getElementById('modal-ttl').textContent='Editar Driver Meso';
      document.getElementById('ename').value=meso.name;
      document.getElementById('edesc').value=meso.desc||'';
      ['f-journal','f-doi','f-parent'].forEach(hide);
      setEditColor(meso.color);
    } else if(micro){
      document.getElementById('modal-ttl').textContent='Editar Micro';
      document.getElementById('ename').value=micro.name;
      ['f-desc','f-journal','f-doi','f-color'].forEach(hide);
      document.getElementById('eparent').innerHTML=S.mesos.map(m=>`<option value="${m.id}"${m.id===micro.parent?' selected':''}>${m.name}</option>`).join('');
    } else if(art){
      document.getElementById('modal-ttl').textContent='Editar Artigo';
      document.getElementById('ename').value=art.ref;
      document.getElementById('ejournal').value=art.journal||'';
      document.getElementById('edoi').value=art.doi||'';
      ['f-desc','f-color'].forEach(hide);
      document.getElementById('eparent').innerHTML=S.mesos.map(m=>`<option value="${m.id}"${m.id===art.parent?' selected':''}>${m.name}</option>`).join('');
    }
  }
  document.getElementById('edit-modal').classList.add('open');
}
function setEditColor(hex){
  PC.edit=hex;
  document.querySelectorAll('#edit-swatches .csw').forEach(s=>s.classList.toggle('sel',s.dataset.c===hex));
}
function saveEdit(){
  const name=document.getElementById('ename').value.trim();
  if(!name){toast('Nome não pode ser vazio');return;}
  if(editId==='__central'){
    S.central.text=name; S.central.sub=document.getElementById('edesc').value.trim();
    document.getElementById('central-text').value=S.central.text;
    document.getElementById('central-sub').value=S.central.sub;
  } else {
    const meso=S.mesos.find(x=>x.id===editId);
    const micro=S.micros.find(x=>x.id===editId);
    const art=S.articles.find(x=>x.id===editId);
    if(meso){ meso.name=name; meso.desc=document.getElementById('edesc').value.trim(); meso.color=PC.edit; }
    else if(micro){ micro.name=name; micro.parent=document.getElementById('eparent').value; }
    else if(art){ art.ref=name; art.journal=document.getElementById('ejournal').value.trim(); art.doi=document.getElementById('edoi').value.trim(); art.parent=document.getElementById('eparent').value; }
  }
  closeModal(); render(); refreshSelects(); buildNodeList(); toast('Salvo');
}
function deleteNode(){
  if(editId==='__central'){toast('Não é possível deletar o nó central');return;}
  quickDel(editId); closeModal();
}
function closeModal(){ document.getElementById('edit-modal').classList.remove('open'); }
function safeSetItem(store, key, value, label){
  try{ store.setItem(key,value); }
  catch(e){ console.warn(`Help modal: unable to persist flag in ${label}.`, e); }
}
function safeGetItem(store, key, label){
  try{ return store.getItem(key); }
  catch(e){ console.warn(`Help modal: unable to read flag from ${label}.`, e); return null; }
}
function markHelpSeen(){
  helpShownOnce = true;
  safeSetItem(localStorage, TAXONOMY_HELP_SEEN_KEY,'1','localStorage');
  safeSetItem(sessionStorage, TAXONOMY_HELP_SEEN_SESSION_KEY,'1','sessionStorage');
}
function hasSeenHelp(){
  if(helpShownOnce) return true;
  if(safeGetItem(localStorage, TAXONOMY_HELP_SEEN_KEY,'localStorage')) return true;
  if(safeGetItem(sessionStorage, TAXONOMY_HELP_SEEN_SESSION_KEY,'sessionStorage')) return true;
  return false;
}
function openHelp(){
  if(helpTimeoutId){ clearTimeout(helpTimeoutId); helpTimeoutId=null; }
  document.getElementById('help-modal').classList.add('open');
  markHelpSeen();
}
function closeHelp(e){ if(e.target===e.currentTarget) document.getElementById('help-modal').classList.remove('open'); }
function autoShowHelpOnce(){
  const seen = hasSeenHelp();
  if(seen) return;
  helpTimeoutId = setTimeout(()=>{
    const helpModal = document.getElementById('help-modal');
    // Recheck in case help was opened manually before the timeout fires
    if(hasSeenHelp() || (helpModal && helpModal.classList.contains('open'))){
      helpTimeoutId = null;
      return;
    }
    openHelp();
    helpTimeoutId = null;
  },HELP_DISPLAY_DELAY);
}

// ═══════════════════════════════
// SELECTS / NODE LIST
// ═══════════════════════════════
function refreshSelects(){
  ['micro-parent','art-parent'].forEach(sid=>{
    const sel=document.getElementById(sid), v=sel.value;
    sel.innerHTML=S.mesos.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
    if(v) sel.value=v;
  });
}
function buildNodeList(){
  const list=document.getElementById('node-list');
  list.innerHTML='';
  addNI(list,S.central.text,S.central.sub,'bc','Central','__central',false,0,null);
  S.mesos.forEach(m=>{
    const mc=S.micros.filter(x=>x.parent===m.id).length;
    const ac=S.articles.filter(x=>x.parent===m.id).length;
    addNI(list,m.name,(m.desc?m.desc+' · ':'')+mc+' micro · '+ac+' art.','bm','Meso',m.id,true,0,null);
    S.micros.filter(x=>x.parent===m.id).forEach(mc=>addNI(list,mc.name,'','bmi','Micro',mc.id,true,14,null));
    S.articles.filter(x=>x.parent===m.id).forEach(a=>{
      const link=formatDoiUrl(a.doi);
      const subtitle=buildArticleSubtitle(a.journal, a.doi);
      addNI(list,a.ref,subtitle,'ba','Art.',a.id,true,14,link);
    });
  });
}
function addNI(parent,label,sub,bc,bt,id,canDel,indent,linkUrl){
  const d=document.createElement('div');
  d.className='ni'; d.style.marginLeft=indent+'px';
  const isMeso=bc==='bm';
  if(isMeso){ d.setAttribute('draggable','true'); d.dataset.dragId=id; }
  d.innerHTML=(isMeso?'<span class="drag-handle" title="Arrastar para reordenar">⠿</span>':'')+
    `<div style="flex:1;min-width:0"><div class="ni-label">${label}</div>${sub?`<div class="ni-sub">${sub}</div>`:''}</div>`+
    `<div style="display:flex;gap:4px;align-items:center;flex-shrink:0">`+
    `<span class="badge ${bc}">${bt}</span>`+
    `${linkUrl?`<a class="xbtn" href="${escAttr(linkUrl)}" target="_blank" rel="noopener noreferrer" title="Abrir referência">↗</a>`:''}`+
    `${canDel?`<button class="xbtn" onclick="event.stopPropagation();quickDel('${id}')">✕</button>`:''}`+
    `</div>`;
  d.onclick=()=>openEdit(id);
  if(linkUrl){
    const lk=d.querySelector('a.xbtn');
    lk&&lk.addEventListener('click',ev=>ev.stopPropagation());
  }
  if(isMeso){
    d.addEventListener('dragstart',e=>{
      dragSrcId=id;
      setTimeout(()=>d.classList.add('dragging'),0);
      e.dataTransfer.effectAllowed='move';
    });
    d.addEventListener('dragend',()=>{ d.classList.remove('dragging'); clearDragOver(); });
    d.addEventListener('dragover',e=>{
      e.preventDefault(); e.dataTransfer.dropEffect='move';
      clearDragOver();
      const r=d.getBoundingClientRect();
      d.classList.add(e.clientY<r.top+r.height/2?'drag-over-top':'drag-over-bot');
    });
    d.addEventListener('dragleave',()=>clearDragOver());
    d.addEventListener('drop',e=>{
      e.preventDefault();
      performDrop(id,e.clientY);
    });
    // Touch drag (long-press to activate)
    d.addEventListener('touchstart',e=>{
      if(e.touches.length!==1) return;
      clearTimeout(touchDrag.timer);
      resetTouchDrag();
      const t=e.touches[0];
      touchDrag.timer=setTimeout(()=>{
        touchDrag.active=true; touchDrag.id=id;
        d.classList.add('dragging');
        const g=d.cloneNode(true);
        g.style.cssText=`position:fixed;left:${t.clientX-10}px;top:${t.clientY-30}px;width:${d.offsetWidth}px;opacity:.88;pointer-events:none;z-index:9999;border:2px solid var(--accent);border-radius:var(--radius);padding:7px 9px;background:var(--surface2);box-shadow:0 8px 24px rgba(0,0,0,.55)`;
        document.body.appendChild(g);
        touchDrag.ghost=g;
        navigator.vibrate&&navigator.vibrate(40);
      },450);
    },{passive:true});
    d.addEventListener('touchmove',e=>{
      if(!touchDrag.active||touchDrag.id!==id){ clearTimeout(touchDrag.timer); return; }
      e.preventDefault();
      const t=e.touches[0];
      if(touchDrag.ghost){ touchDrag.ghost.style.left=(t.clientX-10)+'px'; touchDrag.ghost.style.top=(t.clientY-30)+'px'; }
      clearDragOver();
      document.querySelectorAll('#node-list .ni[data-drag-id]').forEach(ni=>{
        const r=ni.getBoundingClientRect();
        if(t.clientY>=r.top&&t.clientY<=r.bottom) ni.classList.add(t.clientY<r.top+r.height/2?'drag-over-top':'drag-over-bot');
      });
    },{passive:false});
    d.addEventListener('touchend',e=>{
      clearTimeout(touchDrag.timer);
      if(!touchDrag.active||touchDrag.id!==id){ touchDrag.active=false; return; }
      e.preventDefault();
      const t=e.changedTouches[0];
      d.classList.remove('dragging');
      if(touchDrag.ghost){ touchDrag.ghost.remove(); touchDrag.ghost=null; }
      let tgtId=null,tgtY=null;
      document.querySelectorAll('#node-list .ni[data-drag-id]').forEach(ni=>{
        const r=ni.getBoundingClientRect();
        if(t.clientY>=r.top&&t.clientY<=r.bottom){ tgtId=ni.dataset.dragId; tgtY=t.clientY; }
      });
      clearDragOver();
      if(tgtId&&tgtId!==id) doReorder(id,tgtId,tgtY);
      resetTouchDrag();
    },{passive:false});
  }
  parent.appendChild(d);
}
function clearDragOver(){
  document.querySelectorAll('.drag-over-top,.drag-over-bot').forEach(el=>el.classList.remove('drag-over-top','drag-over-bot'));
}
function resetTouchDrag(){ touchDrag={active:false,id:null,ghost:null,timer:null}; }
function performDrop(dstId,clientY){
  clearDragOver();
  if(!dragSrcId||dragSrcId===dstId){dragSrcId=null;return;}
  doReorder(dragSrcId,dstId,clientY);
  dragSrcId=null;
}
function doReorder(srcId,dstId,clientY){
  const srcIdx=S.mesos.findIndex(m=>m.id===srcId);
  const dstIdx=S.mesos.findIndex(m=>m.id===dstId);
  if(srcIdx<0||dstIdx<0) return;
  const dstEl=document.querySelector(`.ni[data-drag-id="${dstId}"]`);
  let ins=true;
  if(dstEl&&clientY!=null){const r=dstEl.getBoundingClientRect();ins=clientY<r.top+r.height/2;}
  const[item]=S.mesos.splice(srcIdx,1);
  const nd=S.mesos.findIndex(m=>m.id===dstId);
  S.mesos.splice(ins?nd:nd+1,0,item);
  render();buildNodeList();
  toast('Ordem atualizada');
}

// ═══════════════════════════════
// COLORS
// ═══════════════════════════════
function pickColor(el,scope){
  PC[scope]=el.dataset.c;
  el.closest('.cswatches').querySelectorAll('.csw').forEach(s=>s.classList.remove('sel'));
  el.classList.add('sel');
}

// ═══════════════════════════════
// TABS
// ═══════════════════════════════
function switchTab(t){
  document.querySelectorAll('.atab').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(e=>e.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  document.getElementById('panel-'+t).classList.add('active');
  if(t==='nodes') buildNodeList();
}

// ═══════════════════════════════
// EXPORT
// ═══════════════════════════════
function getCleanSVG(){
  const orig={...vp};
  vp={tx:0,ty:0,scale:1};
  render();
  const svg=document.getElementById('main-svg').cloneNode(true);
  svg.setAttribute('viewBox',`0 0 ${contentW} ${contentH}`);
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  svg.querySelectorAll('.svgn').forEach(el=>el.style.cursor='');
  const s='<?xml version="1.0" encoding="UTF-8"?>\n'+(new XMLSerializer().serializeToString(svg));
  vp=orig; render();
  return s;
}
function exportSVG(){ dl(getCleanSVG(),'taxonomy_map.svg','image/svg+xml'); toast('SVG exportado'); rememberAction('export-svg'); }
function exportHTML(){
  const svgS=getCleanSVG().replace(/^<\?xml[^?]*\?>\n/,'');
  dl(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${document.getElementById('map-title').value}</title>
<style>body{margin:0;background:#f0efe8;padding:20px}svg{max-width:100%;height:auto;display:block;margin:auto}</style>
</head><body>${svgS}</body></html>`,'taxonomy_map.html','text/html'); toast('HTML exportado'); rememberAction('export-html');
}
function exportJSON(){ dl(JSON.stringify(S,null,2),'taxonomy_map.json','application/json'); toast('JSON exportado'); rememberAction('export-json'); }
function exportExcel(){
  const rows=[['Tipo','Nome','Descrição / Periódico','Pai','Cor','DOI / URL']];
  rows.push(['Central',S.central.text,S.central.sub||'','','','']);
  S.mesos.forEach(m=>rows.push(['Meso',m.name,m.desc||'', '', m.color || '', '']));
  S.micros.forEach(mi=>{
    const parent=S.mesos.find(m=>m.id===mi.parent);
    rows.push(['Micro',mi.name,'',parent?parent.name:'','','']);
  });
  S.articles.forEach(a=>{
    const parent=S.mesos.find(m=>m.id===a.parent);
    rows.push(['Artigo',a.ref,a.journal||'',parent?parent.name:'','',formatDoiUrl(a.doi)]);
  });
  const csv='\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\n');
  dl(csv,'taxonomy_map.csv','text/csv');
  toast('Planilha exportada');
  rememberAction('export-excel');
}
/**
 * Escapes a value for CSV by turning null/undefined into '', wrapping with quotes, and doubling internal quotes (RFC 4180).
 */
function csvCell(v){
  const s=(v??'').toString();
  return `"${s.replace(/"/g,'""')}"`;
}
function handleImport(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      S=JSON.parse(ev.target.result);
      render(); refreshSelects(); buildNodeList(); toast('Importado!');
    }catch{
      toast('Erro no JSON');
    }
  };
  r.readAsText(f); e.target.value='';
}
function dl(c,n,t){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([c],{type:t})); a.download=n; a.click(); URL.revokeObjectURL(a.href); }

// ═══════════════════════════════
// NEW MAP
// ═══════════════════════════════
function newMap(){
  S={central:{text:'Tema Central',sub:'Subtítulo'},mesos:[],micros:[],articles:[],_id:1};
  document.getElementById('newmap-modal').classList.remove('open');
  render(); refreshSelects(); buildNodeList(); toast('Mapa limpo');
}

// ═══════════════════════════════
// EXAMPLES
// ═══════════════════════════════
function loadEx(type){
  if(type==='blank'){ newMap(); return; }
  if(type==='biogas'){
    S={central:{text:'Biometanização da Palha',sub:'Biogás'},mesos:[],micros:[],articles:[],_id:1};
    const ids={};
    [['Processo','controle','#A8C4D8'],['Produto','geração','#A4D8B4'],
     ['Matéria-Prima','tipo de palha','#D8C8A4'],['Pós-Tratamento','impurezas','#C8A4D8'],
     ['Insumos do Processo','equipamentos','#D8A4A4']
    ].forEach(([n,d,c])=>{ const id=uid(); ids[n]=id; S.mesos.push({id,name:n,desc:d,color:c}); });
    [['Processo','Parâmetros do Processo'],['Processo','Múltiplos Estágios'],['Processo','Codigestão'],
     ['Produto','Fertilizante'],['Produto','Biogás'],['Produto','Bioenergia'],['Produto','Outros Biocombustíveis'],['Produto','Outros Bioprodutos'],
     ['Matéria-Prima','Palha de Trigo'],['Matéria-Prima','Palha de Milho'],['Matéria-Prima','Palha de Arroz'],['Matéria-Prima','Palha de Soja'],['Matéria-Prima','Outras Palhas'],
     ['Pós-Tratamento','Biogás'],['Pós-Tratamento','Digestato'],
     ['Insumos do Processo','Reator'],['Insumos do Processo','Equipamentos Acessórios']
    ].forEach(([p,n])=>S.micros.push({id:uid(),name:n,parent:ids[p]}));
    render(); refreshSelects(); buildNodeList(); toast('Biogás carregado'); return;
  }
  // membranas
  S={central:{text:'Membranas Poliméricas',sub:'Alta Seletividade CO₂'},mesos:[],micros:[],articles:[],_id:1};
  const cm={'Material':'#A8C4D8','Transporte Facilitado':'#C8A4D8','Processo':'#A4D8B4',
    'Desempenho e Propriedades':'#D8C8A4','Substrato / Corrente Gasosa':'#D8A4A4',
    'Módulo / Equipamento':'#A4C8D8','Modelagem e Simulação':'#D4D8A4'};
  const mids={};
  Object.entries(cm).forEach(([n,c])=>{ const id=uid(); mids[n]=id; S.mesos.push({id,name:n,desc:'',color:c}); });
  [['Material','Poliimida (PI / 6FDA)'],['Material','PIM (microporoso)'],['Material','TR Polymer (térmico)'],['Material','MMM / MOF'],['Material','Pebax / PEO (borracha)'],
   ['Transporte Facilitado','Carreador fixo (amina)'],['Transporte Facilitado','Carreador móvel'],['Transporte Facilitado','PVAm / amina estérica'],['Transporte Facilitado','Líq. iônico (NCIL)'],
   ['Processo','Pós-combustão'],['Processo','Pré-combustão (IGCC)'],['Processo','Oxicombustão'],['Processo','Upgrading biogás'],
   ['Desempenho e Propriedades','Permeabilidade CO₂'],['Desempenho e Propriedades','Seletividade CO₂/N₂'],['Desempenho e Propriedades','Seletividade CO₂/CH₄'],['Desempenho e Propriedades','Robeson upper bound'],['Desempenho e Propriedades','Plastificação / aging'],
   ['Substrato / Corrente Gasosa','Gases de combustão'],['Substrato / Corrente Gasosa','Gás natural (CO₂/CH₄)'],['Substrato / Corrente Gasosa','Biogás'],['Substrato / Corrente Gasosa','Gás de síntese / IGCC'],['Substrato / Corrente Gasosa','Hidrogênio (CO₂/H₂)'],
   ['Módulo / Equipamento','Fibra oca'],['Módulo / Equipamento','Plana (flat sheet)'],['Módulo / Equipamento','Espiral enrolada'],['Módulo / Equipamento','Cascata / multi-estágio'],
   ['Modelagem e Simulação','MD / DFT'],['Modelagem e Simulação','Machine learning'],['Modelagem e Simulação','Modelo de processo'],['Modelagem e Simulação','Otimização']
  ].forEach(([p,n])=>S.micros.push({id:uid(),name:n,parent:mids[p]}));
  [[mids['Material'],'Han & Ho (2021)','J. Membr. Sci. 628, 119244','https://doi.org/10.1016/j.memsci.2021.119244'],
   [mids['Transporte Facilitado'],'Sandru et al. (2022)','Science 376(6588), 90-94','https://doi.org/10.1126/science.abj9351'],
   [mids['Processo'],'Favre (2022)','Membranes 12(9), 884','https://doi.org/10.3390/membranes12090884'],
   [mids['Módulo / Equipamento'],'Liu et al. (2019)','Acc. Chem. Res. 52, 1905','https://doi.org/10.1021/acs.accounts.9b00111'],
   [mids['Modelagem e Simulação'],'Alabid et al. (2022)','Membranes 12(9), 904','https://doi.org/10.3390/membranes12090904'],
  ].forEach(([p,r,j,d])=>S.articles.push({id:uid(),ref:r,journal:j,doi:d,parent:p}));
  render(); refreshSelects(); buildNodeList(); toast('Membranas CO₂ carregado');
}

// ═══════════════════════════════
// TOAST
// ═══════════════════════════════
let _tt;
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  clearTimeout(_tt); _tt=setTimeout(()=>el.classList.remove('show'),2200);
}

// ═══════════════════════════════
// SIDEBAR TOGGLE (mobile)
// ═══════════════════════════════
function toggleSidebar(){
  const sidebar=document.getElementById('sidebar'), overlay=document.getElementById('aside-overlay');
  const open=sidebar.classList.toggle('open');
  overlay.classList.toggle('open',open);
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('aside-overlay').classList.remove('open');
}

// ═══════════════════════════════
// BOOT
// ═══════════════════════════════
loadEx('membranas');
setTimeout(fitAll, 80);
autoShowHelpOnce();
// ♠ Tusk Act 4 — 7 shots, 7 nails, 7 universes (try clicking the title 7 times)
let titleClickCount=0;
document.querySelector('header h1').addEventListener('click',()=>{
  if(++titleClickCount===7){titleClickCount=0;toast('Tusk Act 4 — full spin achieved.');}
});
