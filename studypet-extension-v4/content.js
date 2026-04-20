// ====================================================
// StudyPet v3.0 — Content Script
// Features: wander, cursor-follow, typing react, gifts,
// hydration/posture reminders, context chatter, talk panel,
// double-click flip, plus new unique features
// ====================================================
(function () {
  if (document.getElementById('studypet-overlay')) return;
  if (window.top !== window.self) return;

  function getPetSVG(mood, activity, flip) {
    mood = mood || 'happy'; activity = activity || 'idle';
    const faces = {
      happy: `<ellipse cx="28" cy="36" rx="5" ry="6" fill="#9d174d" opacity="0.8"/>
        <ellipse cx="44" cy="36" rx="5" ry="6" fill="#9d174d" opacity="0.8"/>
        <ellipse cx="28" cy="34" rx="2" ry="2.5" fill="white" opacity="0.6"/>
        <ellipse cx="44" cy="34" rx="2" ry="2.5" fill="white" opacity="0.6"/>
        <path d="M 26 44 Q 36 50 46 44" stroke="#9d174d" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      sad: `<ellipse cx="28" cy="38" rx="5" ry="4" fill="#9d174d" opacity="0.7"/>
        <ellipse cx="44" cy="38" rx="5" ry="4" fill="#9d174d" opacity="0.7"/>
        <path d="M 26 48 Q 36 43 46 48" stroke="#9d174d" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      excited: `<ellipse cx="28" cy="35" rx="6" ry="7" fill="#9d174d" opacity="0.9"/>
        <ellipse cx="44" cy="35" rx="6" ry="7" fill="#9d174d" opacity="0.9"/>
        <ellipse cx="36" cy="46" rx="6" ry="4" fill="#f9a8d4" opacity="0.6"/>
        <path d="M 28 44 Q 36 52 44 44" stroke="#9d174d" stroke-width="2.5" fill="#fce7f3" stroke-linecap="round"/>`,
      sleeping: `<path d="M 22 37 Q 34 37 34 37" stroke="#9d174d" stroke-width="3" stroke-linecap="round"/>
        <path d="M 38 37 Q 50 37 50 37" stroke="#9d174d" stroke-width="3" stroke-linecap="round"/>
        <path d="M 28 46 Q 36 50 44 46" stroke="#9d174d" stroke-width="2" fill="none" stroke-linecap="round"/>
        <text x="50" y="20" font-size="10" fill="#f9a8d4" font-family="sans-serif" font-weight="bold">z</text>
        <text x="57" y="12" font-size="7" fill="#f9a8d4" font-family="sans-serif">z</text>`
    };
    const legs = {
      idle: `<ellipse cx="26" cy="62" rx="8" ry="5" fill="#fbcfe8"/><ellipse cx="46" cy="62" rx="8" ry="5" fill="#fbcfe8"/>`,
      cycling: `<ellipse cx="22" cy="62" rx="8" ry="5" fill="#fbcfe8" transform="rotate(-20,22,62)"/>
        <ellipse cx="50" cy="62" rx="8" ry="5" fill="#fbcfe8" transform="rotate(20,50,62)"/>`,
      running: `<ellipse cx="20" cy="64" rx="9" ry="4" fill="#fbcfe8" transform="rotate(-30,20,64)"/>
        <ellipse cx="52" cy="60" rx="9" ry="4" fill="#fbcfe8" transform="rotate(40,52,60)"/>`,
      celebrating: `<ellipse cx="26" cy="58" rx="8" ry="5" fill="#fbcfe8" transform="rotate(-40,26,58)"/>
        <ellipse cx="46" cy="58" rx="8" ry="5" fill="#fbcfe8" transform="rotate(40,46,58)"/>`,
      sleeping: `<ellipse cx="28" cy="63" rx="8" ry="4" fill="#fbcfe8"/><ellipse cx="44" cy="63" rx="8" ry="4" fill="#fbcfe8"/>`
    };
    const tr = flip ? 'style="transform:scaleX(-1);transform-origin:center"' : '';
    return `<svg id="sp-pet-svg" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" ${tr}>
      <ellipse cx="36" cy="70" rx="20" ry="4" fill="#f9a8d4" opacity="0.3"/>
      <ellipse cx="36" cy="50" rx="18" ry="16" fill="#fce7f3"/>
      <ellipse cx="20" cy="46" rx="6" ry="4" fill="#f9a8d4" opacity="0.5"/>
      <ellipse cx="52" cy="46" rx="6" ry="4" fill="#f9a8d4" opacity="0.5"/>
      <ellipse cx="36" cy="30" rx="20" ry="18" fill="#fce7f3"/>
      <ellipse cx="18" cy="16" rx="7" ry="10" fill="#fce7f3" transform="rotate(-15,18,16)"/>
      <ellipse cx="18" cy="16" rx="4" ry="6" fill="#f9a8d4" transform="rotate(-15,18,16)" opacity="0.7"/>
      <ellipse cx="54" cy="16" rx="7" ry="10" fill="#fce7f3" transform="rotate(15,54,16)"/>
      <ellipse cx="54" cy="16" rx="4" ry="6" fill="#f9a8d4" transform="rotate(15,54,16)" opacity="0.7"/>
      <ellipse cx="54" cy="55" rx="8" ry="6" fill="#fbcfe8" transform="rotate(20,54,55)"/>
      ${faces[mood] || faces.happy}
      ${legs[activity] || legs.idle}
      <ellipse cx="36" cy="42" rx="3" ry="2" fill="#f9a8d4"/>
    </svg>`;
  }

  // Context-aware messages
  function getContextMessages() {
    const host = location.hostname.replace('www.', '');
    const map = {
      'youtube.com':   ['Ooh, a video? 👀', 'Is this for studying? 🎓', 'Don\'t go down the rabbit hole! 🐰'],
      'github.com':    ['Look at you coding! 💻', 'Push those commits! 🚀', 'Open source hero! 🦸'],
      'wikipedia.org': ['Research mode! 📖', 'Wiki rabbit hole incoming! 🐰', 'Learning new things! 🧠'],
      'google.com':    ['Searching for answers! 🔍', 'Research mode! 📚', 'Find what you need! 🎯'],
      'reddit.com':    ['Reddit break? 🛑', 'Just 5 more minutes... 😅', 'Back to studying soon? 🥺'],
      'twitter.com':   ['Quick social check! ⏱️', 'Don\'t lose track of time! ⌚'],
      'x.com':         ['Quick scroll break! ⏱️', 'Back soon? 🥺'],
      'docs.google.com': ['Working on a doc! 📝', 'Writing something great? ✍️'],
      'notion.so':     ['Planning mode! 🗂️', 'Notetaking champion! 🏆'],
      'stackoverflow.com': ['Debug mode! 🐛', 'The answer is out there! 💡'],
      'coursera.org':  ['Online learning! 🎓', 'New skills unlocked! ⭐'],
      'khanacademy.org': ['Khan Academy! Great choice! 🌟', 'You\'re amazing! ✨'],
    };
    return map[host] || ['Stay focused! 💪', 'You got this! ⭐', 'Keep it up! 🌸', 'I believe in you! 💖'];
  }

  const GIFTS = ['🍓','🌸','⭐','🍪','💎','🎀','🌙','✨','🍰','🎵','🌈','💐'];

  // Build overlay HTML
  const overlay = document.createElement('div');
  overlay.id = 'studypet-overlay';
  overlay.innerHTML = `
    <button id="sp-hide-btn" title="Hide">×</button>
    <div id="sp-pet-container" class="sp-anim-idle">
      <div id="sp-bubble"></div>
      ${getPetSVG('happy','idle',false)}
      <div id="sp-status-badge">Idle</div>
    </div>
    <div id="sp-talk-panel">
      <div id="sp-talk-header">
        <span id="sp-talk-title">💬 Chat with Mochi</span>
        <button id="sp-talk-close">×</button>
      </div>
      <div id="sp-talk-messages"></div>
      <div id="sp-talk-input-row">
        <input id="sp-talk-input" type="text" placeholder="Say something..." maxlength="120"/>
        <button id="sp-talk-send">➤</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const petContainer = document.getElementById('sp-pet-container');
  const bubble = document.getElementById('sp-bubble');
  const statusBadge = document.getElementById('sp-status-badge');
  const talkPanel = document.getElementById('sp-talk-panel');
  const talkMessages = document.getElementById('sp-talk-messages');
  const talkInput = document.getElementById('sp-talk-input');

  // State
  let currentMood = 'happy', currentActivity = 'idle', bubbleTimeout = null;
  let petFlipped = false, isFlipping = false;
  let petX = window.innerWidth - 100, petY = window.innerHeight - 180;
  let isDragging = false, dragStart = null;
  let wanderAnimId = null, wanderTarget = null, wanderTimer = null;
  let isFollowingCursor = false, followTimeout = null;
  let typingCount = 0, typingTimer = null, lastTypingBurst = 0;
  let petName = 'Mochi';

  function setPos(x, y) {
    petX = Math.max(8, Math.min(window.innerWidth - 88, x));
    petY = Math.max(8, Math.min(window.innerHeight - 130, y));
    overlay.style.left = petX + 'px';
    overlay.style.top = petY + 'px';
    overlay.style.right = 'auto';
    overlay.style.bottom = 'auto';
  }

  function applyPosition(pos) {
    if (pos && pos.left != null) setPos(pos.left, pos.top || petY);
    else setPos(window.innerWidth - 100, window.innerHeight - 180);
  }

  function refreshSVG() {
    const old = document.getElementById('sp-pet-svg');
    if (!old) return;
    const d = document.createElement('div');
    d.innerHTML = getPetSVG(currentMood, currentActivity, petFlipped);
    old.replaceWith(d.firstElementChild);
  }

  function updatePet(mood, activity) {
    currentMood = mood; currentActivity = activity;
    const classes = ['sp-anim-idle','sp-anim-cycling','sp-anim-running','sp-anim-celebrating','sp-anim-sad','sp-anim-sleeping','sp-anim-eating','sp-anim-excited'];
    petContainer.classList.remove(...classes);
    petContainer.classList.add('sp-anim-' + activity);
    refreshSVG();
    const labels = { idle:'Idle', cycling:'Studying!', running:'Following!', celebrating:'Yay!!', sad:'Worried', sleeping:'Sleeping', eating:'Eating', excited:'Excited!' };
    statusBadge.textContent = labels[activity] || activity;
  }

  function showBubble(msg, dur) {
    if (!msg) {
      const msgs = getContextMessages();
      msg = msgs[Math.floor(Math.random() * msgs.length)];
    }
    bubble.textContent = msg;
    bubble.classList.add('sp-visible');
    clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => bubble.classList.remove('sp-visible'), dur || 3000);
  }

  // ── 1. WANDER along edges ──
  function getEdgeTarget() {
    const W = window.innerWidth, H = window.innerHeight, m = 20;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) return { x: m + Math.random() * (W - 120), y: m };
    if (edge === 1) return { x: m + Math.random() * (W - 120), y: H - 130 };
    if (edge === 2) return { x: m, y: m + Math.random() * (H - 150) };
    return { x: W - 88, y: m + Math.random() * (H - 150) };
  }

  function doWander() {
    if (!wanderTarget || isDragging || isFollowingCursor) return;
    const dx = wanderTarget.x - petX, dy = wanderTarget.y - petY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 6) {
      wanderTarget = null;
      if (currentActivity === 'running') updatePet(currentMood, 'idle');
      scheduleWander();
      return;
    }
    const speed = 1.1;
    if (dx > 3) petFlipped = false;
    else if (dx < -3) petFlipped = true;
    setPos(petX + (dx / dist) * speed, petY + (dy / dist) * speed);
    refreshSVG();
    wanderAnimId = requestAnimationFrame(doWander);
  }

  function startWander() {
    if (isDragging || isFollowingCursor) return;
    wanderTarget = getEdgeTarget();
    if (currentActivity === 'idle') updatePet(currentMood, 'running');
    doWander();
  }

  function scheduleWander() {
    clearTimeout(wanderTimer);
    wanderTimer = setTimeout(() => { if (!isDragging && !isFollowingCursor) startWander(); }, 6000 + Math.random() * 14000);
  }
  scheduleWander();

  // ── 2. CURSOR FOLLOW ──
  const FOLLOW_DIST = 150;
  document.addEventListener('mousemove', (e) => {
    const cx = e.clientX, cy = e.clientY;
    const dx = cx - (petX + 36), dy = cy - (petY + 36);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < FOLLOW_DIST && !isDragging && !talkPanel.classList.contains('sp-open')) {
      if (!isFollowingCursor) {
        isFollowingCursor = true;
        cancelAnimationFrame(wanderAnimId);
        wanderTarget = null;
        updatePet(currentMood, 'running');
        showBubble('Found you! 👀');
      }
      clearTimeout(followTimeout);
      const speed = Math.min(2.2, dist * 0.05);
      if (dx > 3) petFlipped = false; else if (dx < -3) petFlipped = true;
      if (dist > 30) setPos(petX + (dx / dist) * speed, petY + (dy / dist) * speed);
      refreshSVG();
      followTimeout = setTimeout(() => {
        isFollowingCursor = false;
        updatePet(currentMood, 'idle');
        scheduleWander();
      }, 2000);
    }
  });

  // ── 3. TYPING REACTION ──
  document.addEventListener('keydown', () => {
    const el = document.activeElement;
    if (!el) return;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) {
      typingCount++;
      clearTimeout(typingTimer);
      if (typingCount > 12) {
        const now = Date.now();
        if (now - lastTypingBurst > 9000) {
          lastTypingBurst = now;
          updatePet('excited', 'cycling');
          showBubble('You\'re typing so fast! ⌨️🔥');
          setTimeout(() => { if (currentActivity === 'cycling' && !isFollowingCursor) updatePet('happy', 'idle'); }, 4500);
        }
      }
      typingTimer = setTimeout(() => { typingCount = 0; }, 3000);
    }
  });

  // ── 4. RANDOM GIFTS ──
  function dropGift() {
    const gift = document.createElement('div');
    gift.className = 'sp-gift';
    gift.textContent = GIFTS[Math.floor(Math.random() * GIFTS.length)];
    const gx = 80 + Math.random() * (window.innerWidth - 160);
    const gy = 80 + Math.random() * (window.innerHeight - 200);
    gift.style.cssText = `left:${gx}px;top:${gy}px`;
    document.body.appendChild(gift);
    showBubble('A gift appeared! 🎁 Click it!', 5000);
    gift.addEventListener('click', () => {
      gift.classList.add('sp-gift-collected');
      updatePet('excited', 'celebrating');
      showBubble('+50 XP! Collected! 🎉');
      try {
        chrome.storage.local.get(['petXP','petLevel'], d => {
          let xp = (d.petXP || 0) + 50, lvl = d.petLevel || 1;
          if (xp >= lvl * 100) { xp -= lvl * 100; lvl++; showBubble('Level Up! Lv.' + lvl + ' 🎊', 5000); }
          chrome.storage.local.set({ petXP: xp, petLevel: lvl });
        });
      } catch(e){}
      setTimeout(() => { if (gift.parentNode) gift.remove(); updatePet('happy','idle'); }, 1500);
    });
    setTimeout(() => {
      if (gift.parentNode) { gift.style.opacity='0'; setTimeout(() => gift.remove(), 600); }
    }, 13000);
  }
  setTimeout(dropGift, 2 * 60 * 1000);
  setInterval(dropGift, 3.5 * 60 * 1000);

  // ── 5. HYDRATION & POSTURE REMINDERS ──
  const reminders = [
    ['💧 Drink some water! Hydration = brainpower! 🧠', 5000],
    ['🪑 Sit up straight! Posture check! 🌸', 5000],
    ['👁️ 20-20-20 rule: look 20ft away for 20 secs!', 6000],
    ['🙆 Stretch your neck & arms! 30-second stretch!', 5000],
    ['💧 Time for water! Your brain is 73% water! 💙', 5000],
    ['🌬️ Take 3 deep breaths with me~ 1... 2... 3...', 7000],
    ['🧘 Unclench your jaw! Relax your shoulders! 😌', 5000],
  ];
  let remIdx = 0;
  setInterval(() => {
    const [msg, dur] = reminders[remIdx % reminders.length]; remIdx++;
    showBubble(msg, dur);
    updatePet('excited', 'idle');
  }, 28 * 60 * 1000);

  // ── 6. CONTEXT CHATTER ──
  setTimeout(() => showBubble(getContextMessages()[0]), 3500);
  setInterval(() => {
    if (Math.random() < 0.35 && currentActivity === 'idle') {
      const msgs = getContextMessages();
      showBubble(msgs[Math.floor(Math.random() * msgs.length)]);
    }
  }, 50000);

  // ── 7. TALK PANEL ──
  document.getElementById('sp-talk-close').addEventListener('click', () => talkPanel.classList.remove('sp-open'));

  function addMsg(text, from) {
    const el = document.createElement('div');
    el.className = 'sp-talk-msg sp-talk-' + from;
    el.textContent = text;
    talkMessages.appendChild(el);
    talkMessages.scrollTop = talkMessages.scrollHeight;
  }

  const replies = [
    { keys:['hi','hello','hey','hiya'], r:['Hello!! 🌸', 'Hii!! 💖', 'Hey study buddy! 👋'] },
    { keys:['how are','how r u','how do you'], r:['Fluffy and fabulous! ✨', 'Super happy! 💪', 'Best day ever! 🌸'] },
    { keys:['name','who are'], r:['I\'m ' + petName + '! Your study pet! 🐾', petName + ', at your service! 💖'] },
    { keys:['study','focus','work','homework'], r:['Let\'s do this! 💪', 'I\'ll cheer you on! 📚✨', 'You can do it! 🌟'] },
    { keys:['tired','sleepy','exhausted'], r:['Take a short break! 💆', 'Power nap! 20 mins max! 😴', 'Drink water first! 💧'] },
    { keys:['stuck','hard','difficult','help'], r:['Break it into steps! 🧩', 'Try explaining it out loud! 🎤', 'You\'ve solved harder things! 💪'] },
    { keys:['love','cute','adorable'], r:['I love you too!! 💖💖', 'You\'re my fav human! 🥰', 'Blushing so hard!! 🌸'] },
    { keys:['food','hungry','snack','eat'], r:['Feed me too! 🍓 Nom nom!', 'Snack = valid study strategy! 🍎', 'Fuel up! Brain needs energy! ⚡'] },
    { keys:['bored','boring'], r:['Try the Pomodoro timer! ⏱️', 'Set a small goal first! 🎯', 'I believe the interesting part is coming! 🌈'] },
    { keys:['good','great','awesome','yay','did it'], r:['YAYYY!! I\'m so proud!! 🎉', 'AMAZING!! You did it!! 💫', 'THAT\'S MY HUMAN!! 🌟'] },
  ];

  function getReply(text) {
    const lower = text.toLowerCase();
    for (const { keys, r } of replies) {
      if (keys.some(k => lower.includes(k))) return r[Math.floor(Math.random() * r.length)];
    }
    const fallback = [
      'Hmm 🤔 I\'m a pet not a professor, but I believe in you! 💖',
      'That\'s interesting! Tell me more! 👂',
      'Ask me how you\'re feeling or about studying! 🌸',
      'Meeep! (That\'s pet for "I\'m listening"!) 🐾',
      'I\'m not sure, but I\'m here for you! 💕'
    ];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  function sendTalk() {
    const text = talkInput.value.trim(); if (!text) return;
    addMsg(text, 'user'); talkInput.value = '';
    setTimeout(() => {
      const r = getReply(text);
      addMsg(r, 'pet');
      showBubble(r.length > 40 ? r.slice(0, 38) + '...' : r);
    }, 400 + Math.random() * 500);
  }
  document.getElementById('sp-talk-send').addEventListener('click', sendTalk);
  talkInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendTalk(); });

  // ── 8. DOUBLE-CLICK FLIP / TALK TOGGLE ──
  petContainer.addEventListener('dblclick', (e) => {
    if (e.shiftKey) { talkPanel.classList.toggle('sp-open'); talkInput.focus(); return; }
    if (isFlipping) return;
    isFlipping = true;
    petContainer.classList.add('sp-flip-anim');
    showBubble('Wheee! 🌀 Did a backflip!');
    updatePet('excited', 'celebrating');
    setTimeout(() => {
      petContainer.classList.remove('sp-flip-anim');
      isFlipping = false;
      updatePet('happy', 'idle');
    }, 700);
  });

  // Long press opens talk panel
  let lpTimer = null;
  petContainer.addEventListener('mousedown', () => { lpTimer = setTimeout(() => { talkPanel.classList.add('sp-open'); talkInput.focus(); showBubble('What\'s up? 💬'); }, 700); });
  petContainer.addEventListener('mouseup', () => clearTimeout(lpTimer));
  petContainer.addEventListener('mouseleave', () => clearTimeout(lpTimer));

  // Single click = speak
  petContainer.addEventListener('click', () => { if (!isDragging) showBubble(); });

  // Hide button
  document.getElementById('sp-hide-btn').addEventListener('click', e => {
    e.stopPropagation();
    overlay.style.display = 'none';
    try { chrome.storage.local.set({ petHidden: true }); } catch(_){}
  });

  // Drag
  petContainer.addEventListener('mousedown', e => {
    if (e.detail > 1) return;
    dragStart = { mx: e.clientX, my: e.clientY, px: petX, py: petY };
    cancelAnimationFrame(wanderAnimId); wanderTarget = null;
  });
  window.addEventListener('mousemove', e => {
    if (!dragStart) return;
    const dx = e.clientX - dragStart.mx, dy = e.clientY - dragStart.my;
    if (!isDragging && Math.abs(dx) + Math.abs(dy) > 4) isDragging = true;
    if (isDragging) setPos(dragStart.px + dx, dragStart.py + dy);
  });
  window.addEventListener('mouseup', () => {
    if (isDragging) {
      try { chrome.storage.local.set({ petPosition: { left: petX, top: petY } }); } catch(_){}
      setTimeout(() => { isDragging = false; scheduleWander(); }, 60);
    }
    dragStart = null;
  });

  // Idle nap
  setInterval(() => {
    if (currentActivity === 'idle' && !isDragging && Math.random() < 0.2) {
      updatePet('sleeping', 'sleeping');
      showBubble('Zzz... little nap... 😴');
      setTimeout(() => { if (currentActivity === 'sleeping') { updatePet('happy', 'idle'); showBubble('Refreshed! ✨'); } }, 10000);
    }
  }, 70000);

  // Load state
  try {
    chrome.storage.local.get(['petMood','petActivity','petHidden','petPosition','petName'], d => {
      if (d.petHidden) overlay.style.display = 'none';
      petName = d.petName || 'Mochi';
      document.getElementById('sp-talk-title').textContent = '💬 Chat with ' + petName;
      applyPosition(d.petPosition);
      updatePet(d.petMood || 'happy', d.petActivity || 'idle');
    });
  } catch(e) { setPos(petX, petY); }

  try {
    chrome.storage.onChanged.addListener(changes => {
      if (changes.petHidden) overlay.style.display = changes.petHidden.newValue ? 'none' : '';
      if (changes.petPosition) applyPosition(changes.petPosition.newValue);
      if (changes.petName) { petName = changes.petName.newValue || 'Mochi'; document.getElementById('sp-talk-title').textContent = '💬 Chat with ' + petName; }
      if (changes.petMood || changes.petActivity) updatePet(changes.petMood?.newValue || currentMood, changes.petActivity?.newValue || currentActivity);
    });
    chrome.runtime.onMessage.addListener(m => {
      if (m.type === 'FOCUS_STARTED') { updatePet('happy','cycling'); showBubble("Let's study together! 💪"); cancelAnimationFrame(wanderAnimId); }
      if (m.type === 'FOCUS_STOPPED') { updatePet('happy','idle'); showBubble('Good break! 🌸'); scheduleWander(); }
      if (m.type === 'SESSION_COMPLETE') { updatePet('excited','celebrating'); showBubble('Amazing!! You did it!! 🎉'); setTimeout(()=>updatePet('happy','idle'), 5000); }
      if (m.type === 'PET_VISIBILITY') overlay.style.display = m.hidden ? 'none' : '';
    });
  } catch(e){}

})();
