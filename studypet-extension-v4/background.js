// ====================================================
// StudyPet v4.0 — Background Service Worker
// Fix: valid content-script match patterns
// NEW: keyboard commands, context menu note capture,
//      per-domain time tracking, auto long-break cycle,
//      pet evolution stages, Lo-Fi ambient option.
// ====================================================

const DEFAULT_DISTRACTION_SITES = [
  'youtube.com','youtu.be','instagram.com','facebook.com','twitter.com','x.com',
  'tiktok.com','reddit.com','netflix.com','twitch.tv','discord.com','snapchat.com',
  'pinterest.com','tumblr.com'
];

const DEFAULT_SETTINGS = {
  petName: 'Mochi', petLevel: 1, petXP: 0,
  petMood: 'happy', petActivity: 'idle',
  tasks: [], totalFocusMinutes: 0, streak: 0,
  lastStudyDate: null, sessionStartTime: null, focusActive: false, badges: [],
  blocklist: DEFAULT_DISTRACTION_SITES, blockEnabled: true,
  focusDuration: 25, shortBreak: 5, longBreak: 15, dailyGoalMinutes: 120,
  focusHistory: {}, notes: '', darkMode: false,
  autoStartBreaks: false, ambientSound: 'off',
  petHidden: false, petPosition: { right: 16, bottom: 80 },
  ntShortcuts: null, ntIntention: '',
  petEvolution: 'bunny',         // bunny → cat → dragon → phoenix
  totalGiftsCollected: 0,
  // v4
  pomodoroCount: 0,              // count since last long break (auto cycle)
  longBreakEvery: 4,             // every Nth session triggers long break
  siteTime: {},                  // { 'YYYY-MM-DD': { 'domain.com': minutes } }
  savedNotes: [],                // from context-menu selections
  affirmationSeed: 0,
};

// ─── Evolution helpers ────────────────────
function evolutionFor(level) {
  if (level >= 20) return 'phoenix';
  if (level >= 10) return 'dragon';
  if (level >= 5)  return 'cat';
  return 'bunny';
}

async function checkEvolution() {
  const { petLevel = 1, petEvolution = 'bunny' } = await chrome.storage.local.get(['petLevel','petEvolution']);
  const next = evolutionFor(petLevel);
  if (next !== petEvolution) {
    await chrome.storage.local.set({ petEvolution: next });
    const labels = { bunny: 'Bunny 🐰', cat: 'Cat 🐱', dragon: 'Dragon 🐲', phoenix: 'Phoenix 🔥' };
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon128.png',
      title: 'Your pet evolved! ✨',
      message: `Mochi is now a ${labels[next]}! Keep leveling up!`
    });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(null);
  await chrome.storage.local.set({ ...DEFAULT_SETTINGS, ...existing });
  setupContextMenus();
  await checkEvolution();
  console.log('StudyPet v4.0 installed');
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

// ─── Site Blocker ─────────────────────────
const BLOCK_RULE_ID_START = 1000;
async function enableBlocker() {
  const { blocklist = [], blockEnabled = true } = await chrome.storage.local.get(['blocklist','blockEnabled']);
  if (!blockEnabled) return;
  const redirectUrl = chrome.runtime.getURL('blocked.html');
  const rules = blocklist.map((site, i) => ({
    id: BLOCK_RULE_ID_START + i, priority: 1,
    action: { type: 'redirect', redirect: { url: redirectUrl + '?site=' + encodeURIComponent(site) } },
    condition: { urlFilter: `||${site}`, resourceTypes: ['main_frame'] }
  }));
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map(r => r.id), addRules: rules });
}
async function disableBlocker() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  if (existing.length) await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map(r => r.id), addRules: [] });
}

// ─── Offscreen Audio ──────────────────────
async function ensureOffscreen() {
  if (chrome.offscreen?.hasDocument && await chrome.offscreen.hasDocument()) return;
  try { await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['AUDIO_PLAYBACK'], justification: 'Ambient focus sounds' }); } catch(e){}
}
async function setAmbient(sound) {
  await chrome.storage.local.set({ ambientSound: sound });
  if (sound && sound !== 'off') {
    await ensureOffscreen();
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'PLAY_SOUND', sound });
  } else {
    try { chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP_SOUND' }); } catch(e){}
    if (chrome.offscreen?.closeDocument) try { await chrome.offscreen.closeDocument(); } catch(e){}
  }
}

// ─── Focus tracking ───────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
async function addFocusMinutes(mins) {
  const { focusHistory = {}, totalFocusMinutes = 0 } = await chrome.storage.local.get(['focusHistory','totalFocusMinutes']);
  const key = todayKey();
  focusHistory[key] = (focusHistory[key] || 0) + mins;
  await chrome.storage.local.set({ focusHistory, totalFocusMinutes: totalFocusMinutes + mins });
}
async function updateStreak() {
  const { lastStudyDate, streak = 0 } = await chrome.storage.local.get(['lastStudyDate','streak']);
  const today = new Date().toDateString();
  if (lastStudyDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newStreak = lastStudyDate === yesterday ? streak + 1 : 1;
  await chrome.storage.local.set({ lastStudyDate: today, streak: newStreak });
}

async function awardXP(amount) {
  const { petXP = 0, petLevel = 1 } = await chrome.storage.local.get(['petXP','petLevel']);
  let xp = petXP + amount;
  let lvl = petLevel;
  while (xp >= lvl * 100) { xp -= lvl * 100; lvl += 1; }
  await chrome.storage.local.set({ petXP: xp, petLevel: lvl });
  await checkEvolution();
}

// ─── Per-domain time tracker ──────────────
let activeDomain = null;
let activeStart = 0;

function domainFromUrl(u) {
  try {
    const url = new URL(u);
    if (!/^https?:/.test(url.protocol)) return null;
    return url.hostname.replace(/^www\./, '');
  } catch(e) { return null; }
}

async function flushActive() {
  if (!activeDomain || !activeStart) return;
  const elapsedSec = Math.round((Date.now() - activeStart) / 1000);
  activeStart = Date.now();
  if (elapsedSec < 3) return;
  const { siteTime = {} } = await chrome.storage.local.get('siteTime');
  const key = todayKey();
  siteTime[key] = siteTime[key] || {};
  siteTime[key][activeDomain] = (siteTime[key][activeDomain] || 0) + elapsedSec;
  // keep only last 30 days
  const days = Object.keys(siteTime).sort();
  while (days.length > 30) delete siteTime[days.shift()];
  await chrome.storage.local.set({ siteTime });
}

async function setActiveFromTab(tab) {
  await flushActive();
  activeDomain = tab?.url ? domainFromUrl(tab.url) : null;
  activeStart = Date.now();
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try { const tab = await chrome.tabs.get(tabId); await setActiveFromTab(tab); } catch(e){}
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) await setActiveFromTab(tab);
});
chrome.windows.onFocusChanged.addListener(async (wid) => {
  if (wid === chrome.windows.WINDOW_ID_NONE) { await flushActive(); activeDomain = null; return; }
  try { const [tab] = await chrome.tabs.query({ active:true, windowId: wid }); if (tab) await setActiveFromTab(tab); } catch(e){}
});
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state !== 'active') { await flushActive(); activeDomain = null; }
});

// flush every minute to persist current session
chrome.alarms.create('siteFlush', { periodInMinutes: 1 });

// ─── Context menu: Save selection to notes ─
function setupContextMenus() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({ id:'save-note', title:'🌸 Save to StudyPet notes', contexts:['selection'] });
      chrome.contextMenus.create({ id:'block-site', title:'🚫 Add this site to StudyPet blocklist', contexts:['page'] });
      chrome.contextMenus.create({ id:'start-focus', title:'🎯 Start StudyPet focus session', contexts:['action','page'] });
    });
  } catch(e){}
}
setupContextMenus();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-note' && info.selectionText) {
    const { savedNotes = [], notes = '' } = await chrome.storage.local.get(['savedNotes','notes']);
    const entry = {
      text: info.selectionText.slice(0, 500),
      url: tab?.url || '', title: tab?.title || '',
      savedAt: new Date().toISOString(),
    };
    savedNotes.unshift(entry);
    while (savedNotes.length > 100) savedNotes.pop();
    const appended = (notes ? notes + '\n\n' : '') + `• "${entry.text}" — ${entry.title}`;
    await chrome.storage.local.set({ savedNotes, notes: appended.slice(0, 10000) });
    chrome.notifications.create({ type:'basic', iconUrl:'icons/icon128.png', title:'Saved to notes! 📝', message: entry.text.slice(0, 80) });
  }
  if (info.menuItemId === 'block-site' && tab?.url) {
    const host = domainFromUrl(tab.url);
    if (!host) return;
    const { blocklist = [] } = await chrome.storage.local.get('blocklist');
    if (!blocklist.includes(host)) {
      blocklist.push(host);
      await chrome.storage.local.set({ blocklist });
      const { focusActive } = await chrome.storage.local.get('focusActive');
      if (focusActive) await enableBlocker();
      chrome.notifications.create({ type:'basic', iconUrl:'icons/icon128.png', title:'Site blocked 🚫', message: `${host} added to blocklist.` });
    }
  }
  if (info.menuItemId === 'start-focus') {
    const { focusActive, focusDuration = 25 } = await chrome.storage.local.get(['focusActive','focusDuration']);
    if (!focusActive) startFocus(focusDuration);
  }
});

// ─── Keyboard shortcuts ────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-focus') {
    const { focusActive, focusDuration = 25 } = await chrome.storage.local.get(['focusActive','focusDuration']);
    focusActive ? await stopFocus() : await startFocus(focusDuration);
  }
  if (command === 'toggle-pet') {
    const { petHidden = false } = await chrome.storage.local.get('petHidden');
    await chrome.storage.local.set({ petHidden: !petHidden });
    const tabs = await chrome.tabs.query({});
    tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type:'PET_VISIBILITY', hidden:!petHidden }).catch(()=>{}));
  }
  if (command === 'open-minigame') {
    chrome.tabs.create({ url: chrome.runtime.getURL('minigame.html') });
  }
});

// ─── Focus start/stop helpers ──────────────
async function startFocus(duration) {
  await chrome.storage.local.set({ focusActive:true, sessionStartTime:Date.now(), sessionDuration:duration, petActivity:'cycling', petMood:'happy' });
  chrome.alarms.create('pomodoroEnd', { delayInMinutes: duration });
  await enableBlocker();
  const { ambientSound='off' } = await chrome.storage.local.get('ambientSound');
  if (ambientSound !== 'off') await setAmbient(ambientSound);
  const tabs = await chrome.tabs.query({});
  tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type:'FOCUS_STARTED', duration }).catch(()=>{}));
  chrome.notifications.create({ type:'basic', iconUrl:'icons/icon128.png', title:`Focus started — ${duration}m 🎯`, message:'Mochi is cheering you on!' });
}
async function stopFocus() {
  await chrome.alarms.clear('pomodoroEnd');
  await chrome.storage.local.set({ focusActive:false, petActivity:'idle', petMood:'happy' });
  await disableBlocker();
  await setAmbient('off');
  const tabs = await chrome.tabs.query({});
  tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type:'FOCUS_STOPPED' }).catch(()=>{}));
}

// ─── Alarms ───────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'siteFlush') { await flushActive(); return; }

  if (alarm.name === 'pomodoroEnd') {
    const s = await chrome.storage.local.get(['focusDuration','autoStartBreaks','shortBreak','longBreak','pomodoroCount','longBreakEvery']);
    const focusDuration = s.focusDuration ?? 25;
    const autoStartBreaks = s.autoStartBreaks ?? false;
    const shortBreak = s.shortBreak ?? 5;
    const longBreak = s.longBreak ?? 15;
    const longBreakEvery = s.longBreakEvery ?? 4;
    const newCount = (s.pomodoroCount ?? 0) + 1;
    const isLong = newCount % longBreakEvery === 0;
    const breakMins = isLong ? longBreak : shortBreak;

    await addFocusMinutes(focusDuration);
    await updateStreak();
    await awardXP(Math.max(10, focusDuration));
    await disableBlocker();
    await setAmbient('off');
    await chrome.storage.local.set({ focusActive: false, petActivity: 'celebrating', petMood: 'excited', pomodoroCount: newCount });

    chrome.notifications.create({
      type:'basic', iconUrl:'icons/icon128.png',
      title: isLong ? 'Long break time! 🌸' : 'Session complete! 🎉',
      message: isLong
        ? `Great streak of ${longBreakEvery} sessions! Take a ${longBreak}-min break — bubble-pop mini-game is ready.`
        : 'Amazing work! Your pet is SO proud of you!'
    });

    const tabs = await chrome.tabs.query({});
    tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type: 'SESSION_COMPLETE', isLong }).catch(()=>{}));

    if (autoStartBreaks) {
      chrome.alarms.create('breakEnd', { delayInMinutes: breakMins });
    }
  }
  if (alarm.name === 'breakEnd') {
    chrome.notifications.create({ type:'basic', iconUrl:'icons/icon128.png', title:'Break over! ⏰', message:'Ready for the next focus session? 💪' });
  }
  if (alarm.name === 'dailyStreak') updateStreak();
  if (alarm.name === 'hydrationReminder') {
    chrome.notifications.create({ type:'basic', iconUrl:'icons/icon128.png', title:'Hydration check! 💧', message:'Drink some water and check your posture! 🌸' });
  }
});

chrome.alarms.create('dailyStreak', { periodInMinutes: 60 });
chrome.alarms.create('hydrationReminder', { periodInMinutes: 30 });

// ─── Messages ─────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch(message.type) {
      case 'START_FOCUS': {
        await startFocus(message.duration);
        sendResponse({ success:true }); break;
      }
      case 'STOP_FOCUS': {
        await stopFocus();
        sendResponse({ success:true }); break;
      }
      case 'UPDATE_BLOCKLIST': {
        await chrome.storage.local.set({ blocklist: message.blocklist });
        const { focusActive } = await chrome.storage.local.get('focusActive');
        if (focusActive) await enableBlocker();
        sendResponse({ success:true }); break;
      }
      case 'SET_BLOCK_ENABLED': {
        await chrome.storage.local.set({ blockEnabled: message.enabled });
        const { focusActive } = await chrome.storage.local.get('focusActive');
        if (focusActive && message.enabled) await enableBlocker(); else await disableBlocker();
        sendResponse({ success:true }); break;
      }
      case 'SET_AMBIENT': { await setAmbient(message.sound); sendResponse({ success:true }); break; }
      case 'GET_STATE': { const data = await chrome.storage.local.get(null); sendResponse(data); break; }
      case 'UPDATE_PET': { await chrome.storage.local.set(message.data); await checkEvolution(); sendResponse({ success:true }); break; }
      case 'AWARD_XP': { await awardXP(message.amount || 5); sendResponse({ success:true }); break; }
      case 'TOGGLE_PET_VISIBILITY': {
        const { petHidden=false } = await chrome.storage.local.get('petHidden');
        await chrome.storage.local.set({ petHidden: !petHidden });
        const tabs = await chrome.tabs.query({});
        tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type:'PET_VISIBILITY', hidden:!petHidden }).catch(()=>{}));
        sendResponse({ success:true, hidden:!petHidden }); break;
      }
      case 'OPEN_MINIGAME': {
        chrome.tabs.create({ url: chrome.runtime.getURL('minigame.html') });
        sendResponse({ success:true }); break;
      }
      case 'RESET_POMODORO_COUNT': {
        await chrome.storage.local.set({ pomodoroCount: 0 });
        sendResponse({ success:true }); break;
      }
    }
  })();
  return true;
});
