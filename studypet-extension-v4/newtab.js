// StudyPet v4 — New Tab script (externalised per MV3 CSP).

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future belongs to those who believe in their dreams.", author: "Eleanor Roosevelt" },
  { text: "Small progress is still progress.", author: "StudyPet 🐾" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Study hard what interests you the most in the most undisciplined way.", author: "Richard Feynman" },
  { text: "Every expert was once a beginner.", author: "Helen Hayes" },
  { text: "Your future self is watching you right now.", author: "Hal Elrod" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "Success is the sum of small efforts, repeated daily.", author: "Robert Collier" },
];

const AFFIRMATIONS = [
  "I am capable of achieving great things today. 🌸",
  "Every minute I focus is an investment in my future. ⭐",
  "I learn something new with every attempt. 💡",
  "My effort today builds the person I'll be tomorrow. 🌱",
  "I am allowed to take breaks without feeling guilty. 💗",
  "Progress, not perfection. I celebrate small wins. 🎉",
  "My mind gets stronger every time I choose focus. 🧠",
  "I deserve the goals I'm working toward. 👑",
  "Hard today, easy tomorrow. I trust the process. 🔁",
  "I am exactly where I need to be, and I'm growing. 🌼",
];

const SPEECHES = [
  'Hello! Ready to crush it today? 💪',
  'New day, new chance to be amazing! 🌸',
  "You came to study — I'm so proud! 📚",
  "Let's make today count! ⭐",
  'Your future self says thank you! 🌟',
  'One focused session at a time! 🎯',
  'I believe in you! Always! 💖',
];

const DEFAULT_SHORTCUTS = [
  { label: 'Google', url: 'https://google.com', icon: '🔍' },
  { label: 'YouTube', url: 'https://youtube.com', icon: '▶️' },
  { label: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
  { label: 'Calendar', url: 'https://calendar.google.com', icon: '📅' },
  { label: 'Notion', url: 'https://notion.so', icon: '📝' },
  { label: 'GitHub', url: 'https://github.com', icon: '💻' },
];

const EVO_LABELS = { bunny:'Bunny 🐰', cat:'Cat 🐱', dragon:'Dragon 🐲', phoenix:'Phoenix 🔥' };

// Clock
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  document.getElementById('nt-clock').textContent = h + ':' + m;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('nt-date').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const hr = now.getHours();
  const greeting = hr < 12 ? 'Good morning! ☀️' : hr < 17 ? 'Good afternoon! 🌤️' : hr < 21 ? 'Good evening! 🌙' : 'Night owl mode! 🦉';
  document.getElementById('nt-greeting').textContent = greeting;
}
updateClock(); setInterval(updateClock, 1000);

// Deterministic day-of-year → quote & affirmation
function dayOfYear() {
  const n = new Date();
  const s = new Date(n.getFullYear(), 0, 0);
  return Math.floor((n - s) / 86400000);
}
const doy = dayOfYear();
const q = QUOTES[doy % QUOTES.length];
document.getElementById('nt-quote-text').textContent = q.text;
document.getElementById('nt-quote-author').textContent = '— ' + q.author;
document.getElementById('nt-affirm').textContent = '✨ ' + AFFIRMATIONS[doy % AFFIRMATIONS.length];

// Speech
document.getElementById('nt-speech').textContent = SPEECHES[Math.floor(Math.random() * SPEECHES.length)];

// Heatmap — 12 weeks x 7 days
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function heatLevel(mins) {
  if (!mins) return 0;
  if (mins < 15) return 1;
  if (mins < 30) return 2;
  if (mins < 60) return 3;
  if (mins < 120) return 4;
  return 5;
}
function renderHeatmap(focusHistory) {
  const wrap = document.getElementById('heatmap');
  wrap.innerHTML = '';
  const today = new Date(); today.setHours(0,0,0,0);
  const weeks = 12;
  const totalDays = weeks * 7;
  const start = new Date(today); start.setDate(today.getDate() - (totalDays - 1));
  // Align so first column's top is Sunday
  const leadIn = start.getDay();
  for (let i = 0; i < leadIn; i++) {
    const pad = document.createElement('div'); pad.style.visibility = 'hidden'; pad.className = 'heatcell'; wrap.appendChild(pad);
  }
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const mins = focusHistory[dateKey(d)] || 0;
    const cell = document.createElement('div');
    cell.className = 'heatcell l' + heatLevel(mins);
    cell.title = `${dateKey(d)} — ${mins} min focus`;
    wrap.appendChild(cell);
  }
}

// Site time
function renderSiteTime(siteTime) {
  const list = document.getElementById('sitetime-list');
  const today = siteTime[todayKey()] || {};
  const entries = Object.entries(today)
    .map(([d, s]) => [d, Math.round(s/60)])    // seconds → minutes
    .filter(([, m]) => m >= 1)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 8);
  if (!entries.length) {
    list.innerHTML = '<div class="empty">No activity tracked yet — browse a bit!</div>';
    return;
  }
  const max = entries[0][1];
  list.innerHTML = '';
  entries.forEach(([d, m]) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `<div class="bar-label" title="${d}">${d}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(m/max)*100}%"></div></div>
      <div class="bar-value">${m >= 60 ? (m/60).toFixed(1)+'h' : m+'m'}</div>`;
    list.appendChild(row);
  });
}

// Shortcuts
let shortcuts = DEFAULT_SHORTCUTS.slice();
function renderShortcuts() {
  const grid = document.getElementById('shortcuts-grid');
  grid.innerHTML = '';
  shortcuts.forEach((s, i) => {
    const a = document.createElement('a');
    a.className = 'shortcut';
    a.href = s.url;
    a.setAttribute('data-testid', 'nt-shortcut-' + i);
    const dom = s.url.replace(/^https?:\/\//, '').split('/')[0];
    const iconEl = document.createElement('span'); iconEl.className = 'shortcut-icon'; iconEl.textContent = s.icon;
    const wrap = document.createElement('div');
    const lbl = document.createElement('div'); lbl.className = 'shortcut-label'; lbl.textContent = s.label;
    const urlEl = document.createElement('div'); urlEl.className = 'shortcut-url'; urlEl.textContent = dom;
    wrap.appendChild(lbl); wrap.appendChild(urlEl);
    a.appendChild(iconEl); a.appendChild(wrap);
    a.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (confirm('Remove "' + s.label + '"?')) { shortcuts.splice(i, 1); saveShortcuts(); renderShortcuts(); }
    });
    grid.appendChild(a);
  });
  if (shortcuts.length < 8) {
    const add = document.createElement('div');
    add.className = 'shortcut add-shortcut';
    add.setAttribute('data-testid', 'nt-add-shortcut');
    add.innerHTML = '<span>＋</span><span style="font-size:11px">Add link</span>';
    add.addEventListener('click', () => document.getElementById('modal-overlay').classList.add('open'));
    grid.appendChild(add);
  }
}
function saveShortcuts() {
  try { chrome.storage.local.set({ ntShortcuts: shortcuts }); } catch(e) { localStorage.setItem('ntShortcuts', JSON.stringify(shortcuts)); }
}

// Boot
try {
  chrome.storage.local.get(null, d => {
    if (d.ntShortcuts && d.ntShortcuts.length) shortcuts = d.ntShortcuts;
    if (d.petName) document.getElementById('nt-pet-name').textContent = d.petName;
    document.getElementById('nt-evo').textContent = EVO_LABELS[d.petEvolution || 'bunny'] || 'Bunny 🐰';
    if (d.petLevel) document.getElementById('nt-level').textContent = d.petLevel;
    if (d.streak) document.getElementById('nt-streak').textContent = d.streak;
    const mins = (d.focusHistory && d.focusHistory[todayKey()]) || 0;
    document.getElementById('nt-hours').textContent = mins >= 60 ? (mins/60).toFixed(1)+'h' : mins+'m';
    if (d.darkMode) document.body.classList.add('dark');
    if (d.ntIntention) document.getElementById('nt-intention').value = d.ntIntention;
    renderShortcuts();
    renderHeatmap(d.focusHistory || {});
    renderSiteTime(d.siteTime || {});
  });
} catch(e) {
  renderShortcuts();
  renderHeatmap({});
  renderSiteTime({});
}

// Intention
document.getElementById('nt-save-intention').addEventListener('click', () => {
  const val = document.getElementById('nt-intention').value.trim();
  if (val) {
    try { chrome.storage.local.set({ ntIntention: val }); } catch(e){}
    document.getElementById('nt-speech').textContent = 'Studying: ' + val + '! Let\'s go! 🎯';
  }
});
document.getElementById('nt-intention').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('nt-save-intention').click();
});

// Modal
document.getElementById('modal-cancel').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.remove('open');
});
document.getElementById('modal-save').addEventListener('click', () => {
  const label = document.getElementById('modal-label').value.trim();
  let url = document.getElementById('modal-url').value.trim();
  const icon = document.getElementById('modal-icon').value.trim() || '🔗';
  if (!label || !url) return;
  if (!url.startsWith('http')) url = 'https://' + url;
  shortcuts.push({ label, url, icon });
  saveShortcuts(); renderShortcuts();
  document.getElementById('modal-label').value = '';
  document.getElementById('modal-url').value = '';
  document.getElementById('modal-icon').value = '';
  document.getElementById('modal-overlay').classList.remove('open');
});
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) document.getElementById('modal-overlay').classList.remove('open');
});

// Dark mode
document.getElementById('btn-dark').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  try { chrome.storage.local.set({ darkMode: document.body.classList.contains('dark') }); } catch(e){}
});

// Mini-game
document.getElementById('btn-popup').addEventListener('click', () => {
  try { chrome.runtime.sendMessage({ type: 'OPEN_MINIGAME' }); } catch(e){ window.open('minigame.html','_blank'); }
});

// Pet click
document.getElementById('nt-pet-wrap').addEventListener('click', () => {
  document.getElementById('nt-speech').textContent = SPEECHES[Math.floor(Math.random() * SPEECHES.length)];
  const svg = document.getElementById('nt-pet-svg');
  svg.style.animation = 'none';
  setTimeout(() => { svg.style.animation = ''; }, 50);
  try { chrome.runtime.sendMessage({ type: 'AWARD_XP', amount: 1 }); } catch(e){}
});
