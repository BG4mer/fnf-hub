// FNF Hub — Legendary static launcher (GO ALL OUT)
// Robust apps.json loading with fallback, achievements, EXP, confetti, iframe try + fallback, service worker registration

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
const openInTab = document.getElementById('openInTab');
const iframeTitle = document.getElementById('iframeTitle');
const iframeBanner = document.getElementById('iframeBanner');
const toggleGridBtn = document.getElementById('toggleGridBtn');
const preloader = document.getElementById('preloader');
const refreshApps = document.getElementById('refreshApps');

let apps = [];
let logoClicks = 0;
let konamiBuffer = [];
const KONAMI = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];

// Storage
const STORE_KEY = 'fnfHub:v2';
let state = {
  exp: 0,
  unlocked: [],
  opens: {},
  favorites: {}
};

// Achievements meta
const ACHIEVEMENTS = [
  { id:'first_click', name:'First Click', desc:'Opened your first app', exp: 10 },
  { id:'explorer', name:'Explorer', desc:'Open 5 different apps', exp: 30 },
  { id:'social', name:'Social Butterfly', desc:'Clicked the GitHub button', exp: 20 },
  { id:'legendary', name:'Legendary Mode', desc:'Found the hidden legendary mode', exp: 120 },
  { id:'konami', name:'Konami Master', desc:'Input the secret code', exp: 80 },
  { id:'favoriter', name:'Favorite Collector', desc:'Favorite 5 apps', exp: 40 },
  { id:'raver', name:'Raver', desc:'Run hub.rave() in console', exp: 100 }
];

// Default apps fallback (embedded) — used when apps.json fails to load
const DEFAULT_APPS = [
  {"id":"fnf-web-player","title":"FNF Web Player","desc":"Play thousands of FNF mods in-browser (placeholder).","img":"assets/game1.png","url":"https://yourgithub.io/fnf-web-player"},
  {"id":"chart-editor","title":"Chart Editor","desc":"Make and edit custom songs & charts.","img":"assets/game2.png","url":"https://yourgithub.io/chart-editor"},
  {"id":"anim-studio","title":"Anim Studio","desc":"Animate characters for week-long chains.","img":"assets/game3.png","url":"https://yourgithub.io/anim-studio"},
  {"id":"sound-lab","title":"Sound Lab","desc":"Remix and export beats.","img":"assets/game4.png","url":"https://yourgithub.io/sound-lab"},
  {"id":"asset-hub","title":"Asset Hub","desc":"Sprites, SFX, backgrounds — placeholders.","img":"assets/game5.png","url":"https://yourgithub.io/asset-hub"},
  {"id":"level-gallery","title":"Level Gallery","desc":"Browse community levels and demos.","img":"assets/game6.png","url":"https://yourgithub.io/level-gallery"},
  {"id":"mod-manager","title":"Mod Manager","desc":"Install & manage web mods.","img":"assets/game7.png","url":"https://yourgithub.io/mod-manager"},
  {"id":"experimental","title":"Experimental","desc":"WIP fun stuff & prototypes.","img":"assets/game8.png","url":"https://yourgithub.io/experimental"}
];

// ------------------- storage -------------------
function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw) state = JSON.parse(raw);
  }catch(e){
    state = {exp:0,unlocked:[],opens:{},favorites:{}};
  }
}
function saveState(){
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  updateXPUI();
  renderAchievements();
}

// ------------------- toasts -------------------
function toast(text, opts = {}){
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
  toastWrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity = '0'; setTimeout(()=>el.remove(),300); }, opts.time || 3500);
}

// ------------------- EXP & Achievements -------------------
function gainExp(n){
  state.exp = (state.exp || 0) + n;
  toast(`+${n} XP`);
  saveState();
  if(n >= 100) confettiBurst();
  if(levelUpPending()) levelUp();
}
function levelUpPending(){
  return (state.exp - (state.lastLevelExp || 0)) >= 100;
}
function levelUp(){
  state.lastLevelExp = Math.floor(state.exp/100)*100;
  toast(`Level up! Lvl ${Math.floor(state.exp/100)+1}`);
  confettiBurst(true);
  saveState();
}
function updateXPUI(){
  const xp = state.exp || 0;
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

// ------------------- load apps.json (robust) -------------------
async function fetchApps(){
  try{
    const res = await fetch(DATA_URL, {cache: 'no-store'});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error('Invalid JSON');
    apps = data;
    return apps;
  }catch(err){
    toast('Failed to load apps.json — using embedded fallback');
    apps = DEFAULT_APPS.slice();
    return apps;
  }
}

// ------------------- render -------------------
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

    el.addEventListener('mouseenter', ()=>{ el.dataset.hover = '1'; });
    el.addEventListener('mouseleave', ()=>{ delete el.dataset.hover; });

    grid.appendChild(el);
  });
}

// ------------------- open app with iframe fallback -------------------
function openApp(app, forceIframe){
  const wantIframe = schoolToggle.checked || forceIframe;
  if(wantIframe){
    // show preview and attempt to load
    iframeTitle.textContent = app.title;
    appFrame.src = app.url;
    iframeBanner.classList.add('hidden');
    iframePreview.classList.remove('hidden');
    // Set a timeout: if iframe doesn't render within X sec, show banner and offer open-in-tab
    const checkTimeout = setTimeout(()=>{
      // can't reliably detect cross-origin block; show banner as friendly hint
      iframeBanner.classList.remove('hidden');
    }, 1600);

    // If the iframe loads a same-origin page, 'load' will fire and banner stay hidden
    appFrame.onload = () => {
      clearTimeout(checkTimeout);
      // If access denied for cross-origin, we can't inspect content — user can try open in tab
    };
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

// iframe controls
closeIframe.addEventListener('click', ()=>{
  iframePreview.classList.add('hidden'); appFrame.src = 'about:blank';
});
openInTab.addEventListener('click', ()=>{
  const u = appFrame.src || 'about:blank';
  if(u && u !== 'about:blank') window.open(u, '_blank');
});

// ------------------- search -------------------
search.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase().trim();
  const filtered = apps.filter(a=> (a.title + ' ' + a.desc).toLowerCase().includes(q));
  renderApps(filtered);
});

// ------------------- achievements modal -------------------
achBtn.addEventListener('click', ()=>{ achModal.classList.remove('hidden'); });
closeAch.addEventListener('click', ()=>{ achModal.classList.add('hidden'); });

// export/import/reset
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
document.getElementById('importBtn').addEventListener('click', ()=> document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', async (ev)=>{
  const file = ev.target.files[0]; if(!file) return;
  try{
    const text = await file.text(); const data = JSON.parse(text);
    state = data; saveState(); renderApps(apps); toast('Imported save');
  }catch(e){ toast('Import failed'); }
});

// logo + konami + hotkeys
logoWrap.addEventListener('click', ()=>{
  logoClicks++;
  toast(`logo x${logoClicks}`);
  if(logoClicks >= 7 && !state.unlocked.includes('legendary')){
    unlock('legendary'); document.body.classList.add('legendary');
    confettiBurst(true);
  }
});
window.addEventListener('keydown', (e)=>{
  konamiBuffer.push(e.key.toLowerCase());
  if(konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
  if(KONAMI.every((k,i)=>konamiBuffer[i] === k)){
    unlock('konami'); raveMode(); confettiBurst(true);
  }
  if(e.key.toLowerCase() === 'f'){
    const hovered = document.querySelector('.app[data-hover="1"]');
    if(hovered) hovered.querySelector('.fav').click();
  }
});

// console API
window.hub = {
  rave: () => { toast('RAVE MODE ON'); document.body.classList.toggle('rave'); unlock('raver'); confettiBurst(); },
  state: () => state,
  clearSaves: () => { localStorage.removeItem(STORE_KEY); loadState(); saveState(); toast('Save cleared'); }
};

// confetti
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

// background particles
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
          ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

// grid fx toggle
toggleGridBtn.addEventListener('click', ()=>{ document.body.classList.toggle('grid-fx'); toast('Toggled grid effects'); });

// refresh apps
refreshApps.addEventListener('click', async ()=>{
  await loadApps();
  toast('Apps refreshed');
});

// ------------------- init -------------------
async function loadApps(){
  try{
    preloader.style.display = 'flex';
  }catch(e){}
  await new Promise(r=>setTimeout(r, 300)); // tiny UX pause
  loadState();
  try{
    await fetchApps();
  }catch(e){
    apps = DEFAULT_APPS.slice();
  }
  renderApps(apps);
  updateXPUI();
  renderAchievements();
  try{ preloader.style.display = 'none'; }catch(e){}
}
loadApps();

// keyboard hint
window.addEventListener('keydown', (e)=>{ if(e.key === '`'){ toast('Tip: type hub.rave() in the console for a surprise') } });

// accessible focus helpers
document.addEventListener('keydown', (e)=>{ if(e.key === 'Tab'){ document.body.classList.add('user-is-tabbing'); }});