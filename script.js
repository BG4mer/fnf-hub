/* FNF Hub — Legendary static launcher
   - Fetches apps.json
   - EXP / achievements (localStorage)
   - Konami code + logo clicks easter eggs
   - Toasts, confetti, iframe preview for "School Mode"
   - Lots of tiny interactions to feel legendary
*/

const DATA_URL = 'apps.json';
const grid = document.getElementById('grid');
const search = document.getElementById('search');
const expFill = document.getElementById('expFill');
const levelNode = document.getElementById('level');
const expCount = document.getElementById('expCount');
const achBtn = document.getElementById('achBtn');
const achModal = document.getElementById('achModal');
const achList = document.getElementById('achList');
const closeAch = document.getElementById('closeAch');
const xpBig = document.getElementById('xpBig');
const toastWrap = document.getElementById('toastWrap');
const logoWrap = document.getElementById('logoWrap');
const schoolToggle = document.getElementById('schoolToggle');
const iframePreview = document.getElementById('iframePreview');
const appFrame = document.getElementById('appFrame');
const closeIframe = document.getElementById('closeIframe');
const toggleGridBtn = document.getElementById('toggleGridBtn');

let apps = [];
let toastTimeouts = [];
let logoClicks = 0;
let konamiBuffer = [];
const KONAMI = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];

// Save keys
const STORE_KEY = 'fnfHub:v1';
let state = {
  exp: 0,
  unlocked: [],
  opens: {},
  favorites: {}
};

const ACHIEVEMENTS = [
  { id:'first_click', name:'First Click', desc:'Opened your first app', exp: 10 },
  { id:'explorer', name:'Explorer', desc:'Open 5 different apps', exp: 30 },
  { id:'social', name:'Social Butterfly', desc:'Clicked the GitHub button', exp: 20 },
  { id:'legendary', name:'Legendary Mode', desc:'Found the hidden legendary mode', exp: 120 },
  { id:'konami', name:'Konami Master', desc:'Input the secret code', exp: 80 },
  { id:'favoriter', name:'Favorite Collector', desc:'Favorite 5 apps', exp: 40 },
  { id:'raver', name:'Raver', desc:'Run hub.rave() in console', exp: 100 }
];

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw) state = JSON.parse(raw);
  }catch(e){
    state = {exp:0,unlocked:[],opens:{},favorites:{}};
  }
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); updateXPUI(); renderAchievements(); }

function toast(text, opts = {}){
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
  toastWrap.appendChild(el);
  const t = setTimeout(()=>{ el.remove(); }, opts.time || 3500);
  toastTimeouts.push(t);
}

function gainExp(n){
  state.exp += n;
  updateXPUI();
  toast(`+${n} XP`);
  saveState();
  if(n >= 100) confettiBurst();
  if(levelUpPending()) levelUp();
}

function levelUpPending(){
  // level every 100xp
  return (state.exp - (state.lastLevelExp || 0)) >= 100;
}
function levelUp(){
  state.lastLevelExp = Math.floor(state.exp/100)*100;
  toast(`Level up! Lvl ${Math.floor(state.exp/100)+1}`);
  confettiBurst();
  saveState();
}

function updateXPUI(){
  const xp = state.exp;
  const level = Math.floor(xp/100)+1;
  const progress = (xp % 100);
  levelNode.textContent = level;
  expCount.textContent = xp + ' XP';
  xpBig.textContent = xp;
  expFill.style.width = Math.min(100, progress) + '%';
}

function unlock(id){
  if(!state.unlocked.includes(id)){
    state.unlocked.push(id);
    const meta = ACHIEVEMENTS.find(a=>a.id===id);
    if(meta) gainExp(meta.exp);
    renderAchievements();
    toast(`Achievement: ${meta ? meta.name : id}`);
    saveState();
  }
}

function renderAchievements(){
  achList.innerHTML = '';
  ACHIEVEMENTS.forEach(a=>{
    const div = document.createElement('div'); div.className = 'ach-item ' + (state.unlocked.includes(a.id) ? '' : 'locked');
    div.innerHTML = `<div class="name">${a.name}</div><div class="desc">${a.desc}</div><div class="tiny">+${a.exp} XP</div>`;
    achList.appendChild(div);
  });
}

/* fetch apps and render */
async function loadApps(){
  try{
    const r = await fetch(DATA_URL, {cache: 'no-store'});
    apps = await r.json();
  }catch(e){
    apps = []; toast('Failed to load apps.json — check file path');
  }
  renderApps(apps);
}

function renderApps(list){
  grid.innerHTML = '';
  list.forEach(app=>{
    const el = document.createElement('div'); el.className = 'app';
    el.innerHTML = `
      <img class="thumb" src="${app.img}" alt="${app.title}">
      <div class="meta">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3>${app.title}</h3>
          <div class="tiny">${(state.opens[app.id]||0)} opens</div>
        </div>
        <p>${app.desc}</p>
        <div class="row">
          <div class="btn-row">
            <button class="small-btn open">Open</button>
            <button class="small-btn try">Try (iframe)</button>
            <button class="small-btn repo">Repo</button>
          </div>
          <div>
            <button class="small-btn fav">${state.favorites[app.id] ? '★' : '☆'}</button>
          </div>
        </div>
      </div>
    `;
    // handlers
    el.querySelector('.open').addEventListener('click', ()=>openApp(app, false));
    el.querySelector('.try').addEventListener('click', ()=>openApp(app, true));
    el.querySelector('.repo').addEventListener('click', ()=>{ window.open(app.url,'_blank'); unlock('social'); saveState(); });
    el.querySelector('.fav').addEventListener('click', (ev)=>{
      state.favorites[app.id] = !state.favorites[app.id];
      ev.target.textContent = state.favorites[app.id] ? '★' : '☆';
      toast(state.favorites[app.id] ? 'Favorited' : 'Unfavorited');
      const favs = Object.keys(state.favorites).filter(k=>state.favorites[k]).length;
      if(favs >= 5) unlock('favoriter');
      saveState();
    });

    // keyboard "F" to favorite while hovering
    el.addEventListener('mouseenter', ()=>{ el.dataset.hover = '1'; });
    el.addEventListener('mouseleave', ()=>{ delete el.dataset.hover; });

    grid.appendChild(el);
  });
}

function openApp(app, iframeMode){
  // attempt iframe if school mode or forced iframeMode
  const useIframe = (schoolToggle.checked || iframeMode);
  if(useIframe){
    try{
      appFrame.src = app.url;
      iframePreview.classList.remove('hidden');
      toast(`Trying iframe for ${app.title} — if blocked, it will open in a new tab.`);
      // if the frame refuses to load (X-Frame-Options), user can close and click Open to open new tab
    }catch(e){
      toast('Iframe failed, opening in new tab');
      window.open(app.url, '_blank');
    }
  }else{
    window.open(app.url, '_blank');
  }

  // track open
  state.opens[app.id] = (state.opens[app.id] || 0) + 1;
  if(!state.unlocked.includes('first_click')) unlock('first_click');
  const distinct = Object.keys(state.opens).length;
  if(distinct >= 5) unlock('explorer');
  gainExp(15);
  saveState();
}

/* iframe close */
closeIframe.addEventListener('click', ()=>{
  iframePreview.classList.add('hidden'); appFrame.src = 'about:blank';
});

/* search */
search.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase().trim();
  const filtered = apps.filter(a=> (a.title+a.desc).toLowerCase().includes(q));
  renderApps(filtered);
});

/* achievements modal */
achBtn.addEventListener('click', ()=>{ achModal.classList.remove('hidden'); });
closeAch.addEventListener('click', ()=>{ achModal.classList.add('hidden'); });

/* reset/export/import */
document.getElementById('resetBtn').addEventListener('click', ()=>{
  if(!confirm('Reset progress?')) return;
  state = {exp:0,unlocked:[],opens:{},favorites:{}};
  saveState(); toast('Progress reset'); renderApps(apps);
});
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'fnfHub-save.json'; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('importBtn').addEventListener('click', ()=>{
  const f = document.getElementById('importFile'); f.click();
});
document.getElementById('importFile').addEventListener('change', async (ev)=>{
  const file = ev.target.files[0]; if(!file) return;
  try{
    const text = await file.text(); const data = JSON.parse(text);
    state = data; saveState(); renderApps(apps); toast('Imported save');
  }catch(e){ toast('Import failed'); }
});

/* logo easter egg */
logoWrap.addEventListener('click', ()=>{
  logoClicks++;
  toast(`logo x${logoClicks}`);
  if(logoClicks >= 7 && !state.unlocked.includes('legendary')){
    unlock('legendary'); document.body.classList.add('legendary');
    confettiBurst(true);
  }
});

/* konami detection */
window.addEventListener('keydown', (e)=>{
  konamiBuffer.push(e.key.toLowerCase());
  if(konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
  if(KONAMI.every((k,i)=>konamiBuffer[i] === k)){
    unlock('konami'); raveMode(); confettiBurst(true);
  }
  // quick favorite hotkey when hovering
  if(e.key.toLowerCase() === 'f'){
    const hovered = document.querySelector('.app[data-hover="1"]');
    if(hovered){
      hovered.querySelector('.fav').click();
    }
  }
});

/* rave mode (console trick) */
window.hub = {
  rave: () => {
    toast('RAVE MODE ON');
    document.body.classList.toggle('rave');
    unlock('raver');
    confettiBurst();
  },
  state: () => state
};

/* confetti */
function confettiBurst(big=false){
  const count = big ? 200 : 80;
  const el = document.createElement('canvas'); el.style.position='fixed'; el.style.left=0; el.style.top=0; el.style.zIndex=200; el.width = innerWidth; el.height = innerHeight;
  document.body.appendChild(el);
  const ctx = el.getContext('2d');
  const pieces = [];
  for(let i=0;i<count;i++){
    pieces.push({
      x: Math.random()*el.width, y: -Math.random()*el.height,
      vx: (Math.random()-0.5)*6, vy: Math.random()*4+2,
      size: Math.random()*8+4, rot: Math.random()*Math.PI*2,
      col: `hsl(${Math.random()*360}, 80%, 60%)`
    });
  }
  let t=0;
  function frame(){
    t++; ctx.clearRect(0,0,el.width,el.height);
    for(const p of pieces){
      p.x += p.vx; p.y += p.vy; p.rot += 0.1;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size/2);
      ctx.restore();
    }
    if(t>220){ el.remove(); return; }
    requestAnimationFrame(frame);
  }
  frame();
}

/* small UI toggles */
toggleGridBtn.addEventListener('click', ()=>{ document.body.classList.toggle('grid-fx'); toast('Toggled grid effects'); });

/* minimal background particle system */
(function bgParticles(){
  const c = document.getElementById('bg-canvas'); const ctx = c.getContext('2d');
  function resize(){ c.width = innerWidth; c.height = innerHeight; }
  window.addEventListener('resize', resize); resize();
  const nodes = [];
  for(let i=0;i<60;i++){
    nodes.push({x:Math.random()*c.width,y:Math.random()*c.height, vx:(Math.random()-0.5)*0.6, vy:(Math.random()-0.5)*0.6, r:Math.random()*2+1, hue: Math.random()*360});
  }
  function loop(){
    ctx.clearRect(0,0,c.width,c.height);
    for(let n of nodes){
      n.x += n.vx; n.y += n.vy;
      if(n.x<0||n.x>c.width) n.vx*=-1;
      if(n.y<0||n.y>c.height) n.vy*=-1;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${n.hue},65%,60%,0.08)`;
      ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
    }
    // lines
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const a = nodes[i], b = nodes[j];
        const dx = a.x-b.x, dy = a.y-b.y, d = Math.hypot(dx,dy);
        if(d<120){
          ctx.strokeStyle = `hsla(${(a.hue+b.hue)/2},70%,60%,${1 - d/120})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

/* initial load */
loadState(); loadApps(); updateXPUI(); renderAchievements();

/* tiny keyboard shortcut: pressing `~` opens console helper */
window.addEventListener('keydown', (e)=>{ if(e.key === '`'){ toast('Type hub.rave() in console for a surprise') } });

/* small safety: if iframe on page blocks, detect via load error */
appFrame.addEventListener('load', ()=>{
  // If the appFrame remains blank, it might be blocked by X-Frame-Options. We can't reliably detect all cases cross-origin.
});

/* make grid keyboard accessible: focus the first open button on load */
document.addEventListener('DOMContentLoaded', ()=>{
  setTimeout(()=>{ const b = document.querySelector('.open'); if(b) b.setAttribute('tabindex','0'); }, 400);
});