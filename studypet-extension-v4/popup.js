// ====================================================
// StudyPet v2.0 — Popup Script
// ====================================================

const DEFAULT_BLOCKLIST = [
  'youtube.com','youtu.be','instagram.com','facebook.com','twitter.com','x.com',
  'tiktok.com','reddit.com','netflix.com','twitch.tv','discord.com','snapchat.com','pinterest.com','tumblr.com'
];

let state = {
  petName:'Mochi', petLevel:1, petXP:0, petMood:'happy', petActivity:'idle',
  tasks:[], totalFocusMinutes:0, streak:0, focusActive:false,
  sessionStartTime:null, badges:[],
  blocklist:DEFAULT_BLOCKLIST, blockEnabled:true,
  focusDuration:25, shortBreak:5, longBreak:15, dailyGoalMinutes:120,
  focusHistory:{}, notes:'', darkMode:false, autoStartBreaks:false,
  ambientSound:'off', petHidden:false
};

let currentMode = 'focus';
let timerInterval = null, timerRunning = false;
let timerSeconds = 25*60, totalTimerSeconds = 25*60;

const ALL_BADGES = [
  { id:'first_session', icon:'🌱', name:'First Step', desc:'Complete 1 session', req:s=>s.totalFocusMinutes>=25 },
  { id:'hour_club',     icon:'⏰', name:'Hour Club',  desc:'Study 1 hour total', req:s=>s.totalFocusMinutes>=60 },
  { id:'ten_hours',     icon:'📚', name:'Bookworm',    desc:'Study 10 hours',    req:s=>s.totalFocusMinutes>=600 },
  { id:'streak_3',      icon:'🔥', name:'On Fire',     desc:'3 day streak',      req:s=>s.streak>=3 },
  { id:'streak_7',      icon:'🌟', name:'Week Star',   desc:'7 day streak',      req:s=>s.streak>=7 },
  { id:'tasks_5',       icon:'✅', name:'Task Master', desc:'5 tasks done',      req:s=>(s.tasks||[]).filter(t=>t.done).length>=5 },
  { id:'tasks_20',      icon:'🎯', name:'Goal Getter', desc:'20 tasks done',     req:s=>(s.tasks||[]).filter(t=>t.done).length>=20 },
  { id:'level_3',       icon:'⭐', name:'Rising Star', desc:'Reach Level 3',     req:s=>s.petLevel>=3 },
  { id:'level_5',       icon:'👑', name:'Study Queen', desc:'Reach Level 5',     req:s=>s.petLevel>=5 },
  { id:'daily_goal',    icon:'🎖️', name:'Goal Hit',    desc:'Hit daily goal',   req:s=>{ const k=todayKey(); return (s.focusHistory?.[k]||0)>=s.dailyGoalMinutes; } },
  { id:'deep_focus',    icon:'🧘', name:'Deep Focus',  desc:'Complete 60-min session', req:s=>s.focusDuration>=60 && s.totalFocusMinutes>=60 },
  { id:'century',       icon:'💯', name:'Century',     desc:'100 hours total',   req:s=>s.totalFocusMinutes>=6000 }
];

const LEADERBOARD = [
  { name:'Sakura', emoji:'🌸', hours:48.5 },
  { name:'You',    emoji:'🐾', hours:0, isMe:true },
  { name:'Hana',   emoji:'🌺', hours:32.1 },
  { name:'Yuki',   emoji:'❄️', hours:28.7 },
  { name:'Rin',    emoji:'🎀', hours:19.3 }
];

const PET_INTER = {
  pat:     { act:'excited',    speeches:["Purring... 💕","So warm! 🥰","I love pats!"], xp:5 },
  feed:    { act:'eating',     speeches:["Nom nom!","Delicious!","More please~"],      xp:8 },
  play:    { act:'running',    speeches:["Wheee!!","So fun!!","Again again!"],         xp:10 },
  squeeze: { act:'celebrating',speeches:["Eep!","Squish!","Heehee~"],                  xp:5 }
};

// ─── helpers ───────────────────────────────
function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function $(id){ return document.getElementById(id); }
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─── init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await new Promise(res => chrome.storage.local.get(null, res));
    Object.assign(state, data);
    if (!Array.isArray(state.blocklist) || state.blocklist.length===0) state.blocklist = DEFAULT_BLOCKLIST;
  } catch(e){}

  applyTheme();
  setupTabs();
  setupPetButtons();
  setupTimer();
  setupSounds();
  setupTasks();
  setupSettings();
  setupBlocklist();
  setupExportImport();

  currentMode = 'focus';
  timerSeconds = state.focusDuration * 60;
  totalTimerSeconds = timerSeconds;

  renderAll();
  syncTimerFromState();
});

function renderAll(){
  $('header-title').textContent = `${state.petName || 'Mochi'} 🌸`;
  $('pet-name').textContent = state.petName || 'Mochi';
  $('pet-name-input').value = state.petName || 'Mochi';
  $('header-sub').textContent = `${state.petName} is ready to study!`;

  updateXPBar();
  updateStats();
  updateGoalRing();
  renderBadges();
  renderLeaderboard();
  renderTasks();
  renderBlocklist();
  renderChart();
  renderModeLabels();
  renderSoundActive();
  renderSettingSwitches();
  updatePetMood(state.petMood, state.petActivity);
  $('notes').value = state.notes || '';
  $('in-focus').value = state.focusDuration;
  $('in-short').value = state.shortBreak;
  $('in-long').value  = state.longBreak;
  $('in-goal').value  = state.dailyGoalMinutes;
}

function applyTheme(){ document.body.classList.toggle('dark', !!state.darkMode); }

// ─── Tabs ──────────────────────────────────
function setupTabs(){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      $(`panel-${btn.dataset.tab}`).classList.add('active');
      if (btn.dataset.tab==='stats') renderChart();
    });
  });
}

// ─── Pet action buttons ───────────────────
function setupPetButtons(){
  document.querySelectorAll('.pet-btn').forEach(b=>{
    b.addEventListener('click',()=> petAction(b.dataset.act));
  });
}

function updatePetMood(mood, activity){
  state.petMood = mood; state.petActivity = activity;
  const svg = $('main-pet-svg'); if (!svg) return;
  const classes = ['pet-anim-idle','pet-anim-cycling','pet-anim-running','pet-anim-celebrating','pet-anim-sad','pet-anim-sleeping','pet-anim-excited','pet-anim-eating'];
  classes.forEach(c=>svg.classList.remove(c));
  svg.classList.add(`pet-anim-${activity==='idle'?'idle':activity}`);

  const cfg = {
    happy:{eyeRy:8,mouthD:'M 36 64 Q 50 72 64 64',chip:'😊 Happy'},
    sad:{eyeRy:5,mouthD:'M 36 66 Q 50 61 64 66',chip:'😢 Sad'},
    excited:{eyeRy:10,mouthD:'M 34 62 Q 50 75 66 62',chip:'🤩 Excited'},
    sleeping:{eyeRy:2,mouthD:'M 38 66 Q 50 70 62 66',chip:'😴 Sleeping'}
  }[mood] || {eyeRy:8,mouthD:'M 36 64 Q 50 72 64 64',chip:'😊 Happy'};

  $('eye-l')?.setAttribute('ry', cfg.eyeRy);
  $('eye-r')?.setAttribute('ry', cfg.eyeRy);
  $('mouth')?.setAttribute('d', cfg.mouthD);
  $('pet-mood-chip').textContent = cfg.chip;

  const speeches = {
    happy:`I'm so happy! 🌸`, sad:'Please come back...',
    excited:`This is amazing!! 🎉`, sleeping:'Zzz... zzzz... 💤',
    cycling:'Pedaling alongside you! 🚲', running:'Running with you!',
    celebrating:"We did it! 🎊", eating:'Om nom nom~ 🍓',
    idle:`${state.petName} is ready!`
  };
  $('main-speech').textContent = speeches[activity] || speeches[mood] || `I'm here for you! 🌸`;
  $('header-sub').textContent = `${state.petName} is ${activity==='idle'?'ready to study!':activity}!`;
  saveState();
}

function petAction(act){
  const cfg = PET_INTER[act]; if (!cfg) return;
  gainXP(cfg.xp);
  updatePetMood('happy', cfg.act);
  const msg = cfg.speeches[Math.floor(Math.random()*cfg.speeches.length)];
  $('main-speech').textContent = msg;
  showXPPop(`+${cfg.xp} XP`);
  setTimeout(()=>{ if (state.petActivity===cfg.act) updatePetMood('happy', state.focusActive?'cycling':'idle'); }, 2000);
}

// ─── XP / Level ───────────────────────────
function gainXP(n){
  state.petXP += n;
  const need = state.petLevel * 100;
  if (state.petXP >= need){
    state.petXP -= need; state.petLevel++;
    showXPPop(`🎉 Level Up! Lv.${state.petLevel}`);
    updatePetMood('excited','celebrating');
    setTimeout(()=>updatePetMood('happy', state.focusActive?'cycling':'idle'), 3000);
  }
  updateXPBar(); checkBadges(); saveState();
}
function updateXPBar(){
  const need = state.petLevel*100;
  $('xp-fill').style.width = Math.min(state.petXP/need*100,100)+'%';
  $('xp-text').textContent = `${state.petXP} / ${need} XP`;
  $('level-badge').textContent = `Lv.${state.petLevel}`;
}
function showXPPop(t){
  const wrap = $('main-pet-wrap'); const pop = document.createElement('div');
  pop.className='xp-pop'; pop.textContent=t; wrap.appendChild(pop);
  setTimeout(()=>pop.remove(),1500);
}

// ─── Goal ring ────────────────────────────
function updateGoalRing(){
  const today = state.focusHistory?.[todayKey()] || 0;
  const goal = state.dailyGoalMinutes || 120;
  const pct = Math.min(today/goal*100, 100);
  const circ = 138;
  $('goal-ring-prog').style.strokeDashoffset = circ - (pct/100)*circ;
  $('goal-ring-pct').textContent = Math.round(pct)+'%';
  $('goal-val').textContent = `${today} / ${goal} min`;
}

// ─── Stats strip ──────────────────────────
function updateStats(){
  const hours = ((state.totalFocusMinutes||0)/60).toFixed(1);
  const doneTasks = (state.tasks||[]).filter(t=>t.done).length;
  const sessions = Math.floor((state.totalFocusMinutes||0)/Math.max(state.focusDuration,1));
  ['stat-hours','stat2-hours'].forEach(id=>{ const el=$(id); if(el) el.textContent=hours+'h'; });
  ['stat-streak','stat2-streak'].forEach(id=>{ const el=$(id); if(el) el.textContent=(state.streak||0)+'🔥'; });
  const t=$('stat-tasks'); if(t) t.textContent=doneTasks;
  const s=$('stat2-sessions'); if(s) s.textContent=sessions;
}

// ─── Weekly chart ────────────────────────
function renderChart(){
  const bars = $('bars'); bars.innerHTML='';
  const days = []; const now = new Date();
  for (let i=6;i>=0;i--){
    const d = new Date(now); d.setDate(now.getDate()-i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const lbl = d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,2);
    days.push({ key, lbl, mins: state.focusHistory?.[key] || 0, isToday: i===0 });
  }
  const max = Math.max(1, ...days.map(d=>d.mins), state.dailyGoalMinutes);
  const total = days.reduce((a,b)=>a+b.mins,0);
  $('chart-total').textContent = `Last 7 days: ${total} min`;
  days.forEach(d=>{
    const col = document.createElement('div'); col.className='bar-col';
    col.innerHTML = `<div class="bar-val">${d.mins||''}</div>
      <div class="bar${d.isToday?' today':''}" style="height:${(d.mins/max)*100}%"></div>
      <div class="bar-lbl">${d.lbl}</div>`;
    bars.appendChild(col);
  });
}

// ─── Timer ────────────────────────────────
function setupTimer(){
  document.querySelectorAll('.mode-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      const mins = currentMode==='focus'?state.focusDuration:currentMode==='short'?state.shortBreak:state.longBreak;
      timerSeconds = mins*60; totalTimerSeconds = timerSeconds;
      if (timerRunning) stopTimer();
      updateTimerDisplay();
    });
  });
  $('timer-start-btn').addEventListener('click', ()=> timerRunning?stopTimer():startTimer());
  $('timer-reset-btn').addEventListener('click', resetTimer);
}

function renderModeLabels(){
  $('mode-focus-min').textContent = state.focusDuration;
  $('mode-short-min').textContent = state.shortBreak;
  $('mode-long-min').textContent  = state.longBreak;
}

function startTimer(){
  timerRunning = true;
  state.focusActive = currentMode==='focus';
  $('timer-start-btn').textContent = '⏸ Pause';
  $('timer-status').textContent = currentMode==='focus'?'Focusing...':'Break';

  if (currentMode==='focus'){
    updatePetMood('happy','cycling');
    $('ai-dot').className='ai-dot';
    $('ai-text').textContent='Blocker active';
    $('ai-sub').textContent='Distraction sites will redirect';
    $('ai-pet-icon').textContent='🚲';
    try { chrome.runtime.sendMessage({ type:'START_FOCUS', duration: state.focusDuration }); } catch(e){}
  } else {
    updatePetMood('happy','idle');
  }

  timerInterval = setInterval(()=>{
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0){ timerSeconds=0; updateTimerDisplay(); completeSession(); }
  }, 1000);
  saveState();
}
function stopTimer(){
  timerRunning = false;
  state.focusActive = false;
  clearInterval(timerInterval);
  $('timer-start-btn').textContent = '▶ Start Focus';
  $('timer-status').textContent = 'Paused';
  updatePetMood('happy','idle');
  $('ai-dot').className='ai-dot warn';
  $('ai-text').textContent='Session paused';
  $('ai-sub').textContent='Resume to continue';
  $('ai-pet-icon').textContent='😴';
  try { chrome.runtime.sendMessage({ type:'STOP_FOCUS' }); } catch(e){}
  saveState();
}
function resetTimer(){
  stopTimer();
  const mins = currentMode==='focus'?state.focusDuration:currentMode==='short'?state.shortBreak:state.longBreak;
  timerSeconds = mins*60; totalTimerSeconds = timerSeconds;
  updateTimerDisplay();
  $('timer-status').textContent='Ready';
  $('timer-start-btn').textContent='▶ Start Focus';
}
function completeSession(){
  const wasFocus = currentMode==='focus';
  stopTimer();
  if (wasFocus){
    state.totalFocusMinutes = (state.totalFocusMinutes||0) + state.focusDuration;
    const k = todayKey();
    state.focusHistory = state.focusHistory || {};
    state.focusHistory[k] = (state.focusHistory[k]||0) + state.focusDuration;
    gainXP(state.focusDuration*2);
    updatePetMood('excited','celebrating');
    $('timer-status').textContent='Complete! 🎉';
    updateGoalRing(); updateStats(); renderChart();
  }
  setTimeout(()=>{ resetTimer(); updatePetMood('happy','idle'); }, 3500);
}
function updateTimerDisplay(){
  const m = Math.floor(timerSeconds/60).toString().padStart(2,'0');
  const s = (timerSeconds%60).toString().padStart(2,'0');
  $('timer-display').textContent = `${m}:${s}`;
  const elapsed = totalTimerSeconds - timerSeconds;
  const progress = totalTimerSeconds>0 ? elapsed/totalTimerSeconds : 0;
  $('timer-progress').style.strokeDashoffset = 408 - (progress*408);
}
function syncTimerFromState(){
  if (state.focusActive && state.sessionStartTime){
    const elapsed = Math.floor((Date.now()-state.sessionStartTime)/1000);
    timerSeconds = Math.max(0, state.focusDuration*60 - elapsed);
    totalTimerSeconds = state.focusDuration*60;
    updateTimerDisplay();
    if (timerSeconds>0) startTimer();
  }
}

// ─── Ambient sounds ───────────────────────
function setupSounds(){
  document.querySelectorAll('.sound-chip').forEach(c=>{
    c.addEventListener('click', ()=>{
      const sound = c.dataset.sound;
      state.ambientSound = sound;
      renderSoundActive();
      try { chrome.runtime.sendMessage({ type:'SET_AMBIENT', sound }); } catch(e){}
      saveState();
    });
  });
}
function renderSoundActive(){
  document.querySelectorAll('.sound-chip').forEach(c=>{
    c.classList.toggle('active', c.dataset.sound===state.ambientSound);
  });
}

// ─── Tasks ────────────────────────────────
function setupTasks(){
  $('task-add-btn').addEventListener('click', addTask);
  $('task-input').addEventListener('keydown',e=>{ if(e.key==='Enter') addTask(); });
}
function addTask(){
  const v = $('task-input').value.trim(); if (!v) return;
  state.tasks = state.tasks || [];
  state.tasks.push({ id: Date.now(), text:v, done:false });
  $('task-input').value='';
  renderTasks(); saveState();
}
function toggleTask(id){
  const t = state.tasks.find(x=>x.id===id); if (!t) return;
  t.done = !t.done;
  if (t.done){
    gainXP(15); showXPPop('+15 XP Task Done!');
    updatePetMood('excited','celebrating');
    setTimeout(()=>updatePetMood('happy', state.focusActive?'cycling':'idle'), 2000);
  }
  updateStats(); renderTasks(); checkBadges(); saveState();
}
function deleteTask(id){
  state.tasks = state.tasks.filter(t=>t.id!==id);
  renderTasks(); saveState();
}
function renderTasks(){
  const list = $('tasks-list'); const empty = $('empty-tasks');
  const tasks = state.tasks || [];
  list.querySelectorAll('.task-item').forEach(el=>el.remove());
  empty.style.display = tasks.length===0 ? 'block':'none';
  tasks.forEach(t=>{
    const item = document.createElement('div');
    item.className = `task-item${t.done?' done':''}`;
    item.innerHTML = `<div class="task-check${t.done?' checked':''}"></div>
      <div class="task-text">${esc(t.text)}</div>
      <button class="task-del">✕</button>`;
    item.querySelector('.task-check').addEventListener('click', ()=>toggleTask(t.id));
    item.querySelector('.task-del').addEventListener('click', ()=>deleteTask(t.id));
    list.appendChild(item);
  });
}

// ─── Badges ───────────────────────────────
function checkBadges(){
  ALL_BADGES.forEach(b=>{
    if (!state.badges.includes(b.id) && b.req(state)){
      state.badges.push(b.id);
      showXPPop(`🏆 ${b.name}!`);
    }
  });
  renderBadges();
}
function renderBadges(){
  const grid = $('badges-grid'); grid.innerHTML='';
  ALL_BADGES.forEach(b=>{
    const unlocked = (state.badges||[]).includes(b.id);
    const c = document.createElement('div');
    c.className = `badge-card ${unlocked?'unlocked':'locked'}`;
    c.innerHTML = `<span class="badge-icon">${unlocked?b.icon:'🔒'}</span>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>`;
    grid.appendChild(c);
  });
}

// ─── Leaderboard ──────────────────────────
function renderLeaderboard(){
  const list = $('lb-list'); if (!list) return;
  list.innerHTML='';
  const myH = +(((state.totalFocusMinutes||0)/60).toFixed(1));
  const ranks = ['gold','silver','bronze']; const emojis=['🥇','🥈','🥉'];
  const rows = LEADERBOARD.map(r=> r.isMe ? {...r, hours: myH} : r);
  rows.sort((a,b)=>b.hours-a.hours);
  rows.forEach((e,i)=>{
    const item = document.createElement('div');
    item.className = `lb-item${e.isMe?' me':''}`;
    item.innerHTML = `<div class="lb-rank ${i<3?ranks[i]:''}">${i<3?emojis[i]:`#${i+1}`}</div>
      <div class="lb-avatar">${e.emoji}</div>
      <div class="lb-name">${e.name}${e.isMe?' (You)':''}</div>
      <div class="lb-hours">${e.hours}h</div>`;
    list.appendChild(item);
  });
}

// ─── Settings ─────────────────────────────
function setupSettings(){
  $('pet-name-input').addEventListener('change', e=>{
    const v = e.target.value.trim() || 'Mochi';
    state.petName = v;
    $('header-title').textContent = `${v} 🌸`;
    $('pet-name').textContent = v;
    saveState();
  });
  $('notes').addEventListener('input', e=>{ state.notes = e.target.value; saveState(); });

  $('sw-dark').addEventListener('click', ()=>{
    state.darkMode = !state.darkMode;
    applyTheme(); renderSettingSwitches(); saveState();
  });
  $('sw-auto').addEventListener('click', ()=>{
    state.autoStartBreaks = !state.autoStartBreaks;
    renderSettingSwitches(); saveState();
  });
  $('sw-block').addEventListener('click', ()=>{
    state.blockEnabled = !state.blockEnabled;
    renderSettingSwitches(); saveState();
    try { chrome.runtime.sendMessage({ type:'SET_BLOCK_ENABLED', enabled: state.blockEnabled }); } catch(e){}
  });
  $('sw-hide').addEventListener('click', ()=>{
    state.petHidden = !state.petHidden;
    renderSettingSwitches(); saveState();
    try { chrome.runtime.sendMessage({ type:'TOGGLE_PET_VISIBILITY' }); } catch(e){}
  });

  ['in-focus','in-short','in-long','in-goal'].forEach(id=>{
    $(id).addEventListener('change', e=>{
      const v = Math.max(1, parseInt(e.target.value)||1);
      if (id==='in-focus') state.focusDuration = v;
      if (id==='in-short') state.shortBreak = v;
      if (id==='in-long')  state.longBreak = v;
      if (id==='in-goal')  state.dailyGoalMinutes = v;
      renderModeLabels(); updateGoalRing(); saveState();
      // Reset active timer if not running
      if (!timerRunning){
        const mins = currentMode==='focus'?state.focusDuration:currentMode==='short'?state.shortBreak:state.longBreak;
        timerSeconds = mins*60; totalTimerSeconds = timerSeconds; updateTimerDisplay();
      }
    });
  });

  $('btn-reset').addEventListener('click', ()=>{
    if (!confirm('Reset all StudyPet data? This cannot be undone.')) return;
    try { chrome.storage.local.clear(()=> location.reload()); } catch(e){}
  });
}

function renderSettingSwitches(){
  $('sw-dark').classList.toggle('on', !!state.darkMode);
  $('sw-auto').classList.toggle('on', !!state.autoStartBreaks);
  $('sw-block').classList.toggle('on', !!state.blockEnabled);
  $('sw-hide').classList.toggle('on', !!state.petHidden);
}

// ─── Blocklist editor ─────────────────────
function setupBlocklist(){
  $('bl-add-btn').addEventListener('click', blAdd);
  $('bl-input').addEventListener('keydown', e=>{ if(e.key==='Enter') blAdd(); });
}
function blAdd(){
  let v = $('bl-input').value.trim().toLowerCase();
  if (!v) return;
  v = v.replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/^www\./,'');
  if (!v || state.blocklist.includes(v)) { $('bl-input').value=''; return; }
  state.blocklist.push(v);
  $('bl-input').value='';
  renderBlocklist();
  try { chrome.runtime.sendMessage({ type:'UPDATE_BLOCKLIST', blocklist: state.blocklist }); } catch(e){}
  saveState();
}
function blDel(site){
  state.blocklist = state.blocklist.filter(s=>s!==site);
  renderBlocklist();
  try { chrome.runtime.sendMessage({ type:'UPDATE_BLOCKLIST', blocklist: state.blocklist }); } catch(e){}
  saveState();
}
function renderBlocklist(){
  const box = $('blocklist-items'); box.innerHTML='';
  (state.blocklist||[]).forEach(site=>{
    const el = document.createElement('div'); el.className='bl-item';
    el.innerHTML = `<div class="bl-text">🚫 ${esc(site)}</div><button class="bl-del">✕</button>`;
    el.querySelector('.bl-del').addEventListener('click', ()=>blDel(site));
    box.appendChild(el);
  });
}

// ─── Export / Import ──────────────────────
function setupExportImport(){
  $('btn-export').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `studypet-data-${todayKey()}.json`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  });
  $('btn-import').addEventListener('click', ()=> $('import-file').click());
  $('import-file').addEventListener('change', e=>{
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        Object.assign(state, data);
        chrome.storage.local.set(state, ()=> location.reload());
      } catch(err){ alert('Invalid file.'); }
    };
    reader.readAsText(f);
  });
}

// ─── Save ─────────────────────────────────
function saveState(){
  try {
    chrome.storage.local.set({
      petName:state.petName, petLevel:state.petLevel, petXP:state.petXP,
      petMood:state.petMood, petActivity:state.petActivity,
      tasks:state.tasks, totalFocusMinutes:state.totalFocusMinutes,
      streak:state.streak, focusActive:state.focusActive, badges:state.badges,
      blocklist:state.blocklist, blockEnabled:state.blockEnabled,
      focusDuration:state.focusDuration, shortBreak:state.shortBreak,
      longBreak:state.longBreak, dailyGoalMinutes:state.dailyGoalMinutes,
      focusHistory:state.focusHistory, notes:state.notes,
      darkMode:state.darkMode, autoStartBreaks:state.autoStartBreaks,
      ambientSound:state.ambientSound, petHidden:state.petHidden
    });
  } catch(e){}
}
