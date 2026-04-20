// StudyPet v4 — Bubble Pop Break Game
(() => {
  const stage = document.getElementById('stage');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const comboEl = document.getElementById('combo');
  const startOverlay = document.getElementById('start-overlay');
  const endOverlay = document.getElementById('end-overlay');

  let score = 0, combo = 0, maxCombo = 0, timeLeft = 30, timerInterval, spawnInterval;
  let running = false;

  function reset() {
    score = 0; combo = 0; maxCombo = 0; timeLeft = 30;
    scoreEl.textContent = '0'; timeEl.textContent = '30'; comboEl.textContent = '0';
    stage.innerHTML = '';
  }

  function spawn() {
    if (!running) return;
    const roll = Math.random();
    const kind = roll < 0.08 ? 'golden' : roll < 0.22 ? 'bad' : 'normal';
    const size = kind === 'golden' ? 56 : 36 + Math.random() * 36;
    const b = document.createElement('div');
    b.className = 'bubble' + (kind === 'golden' ? ' golden' : kind === 'bad' ? ' bad' : '');
    b.style.width = size + 'px'; b.style.height = size + 'px';
    const x = Math.random() * (window.innerWidth - size - 20) + 10;
    const y = window.innerHeight + 20;
    b.style.left = x + 'px'; b.style.top = y + 'px';
    b.textContent = kind === 'golden' ? '★' : kind === 'bad' ? '✗' : '';
    stage.appendChild(b);

    const drift = (Math.random() - 0.5) * 40;
    const duration = 4500 + Math.random() * 3500;
    const endY = -size - 20;
    const startT = performance.now();

    function step(now) {
      if (!b.isConnected) return;
      const p = Math.min(1, (now - startT) / duration);
      const ny = y + (endY - y) * p;
      const nx = x + drift * p;
      b.style.top = ny + 'px';
      b.style.left = nx + 'px';
      if (p >= 1) { b.remove(); return; }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    b.addEventListener('click', () => {
      if (!running || !b.isConnected) return;
      const rect = b.getBoundingClientRect();
      let pts = 0;
      if (kind === 'golden') { pts = 5 + Math.floor(combo / 3); combo += 2; }
      else if (kind === 'bad') { pts = -2; combo = 0; }
      else { pts = 1 + Math.floor(combo / 5); combo += 1; }
      maxCombo = Math.max(maxCombo, combo);
      score = Math.max(0, score + pts);
      scoreEl.textContent = score;
      comboEl.textContent = combo;
      showPop(rect.left + rect.width/2, rect.top, (pts >= 0 ? '+' : '') + pts);
      b.remove();
    });
  }

  function showPop(x, y, text) {
    const p = document.createElement('div');
    p.className = 'pop';
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.textContent = text;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 600);
  }

  function start() {
    reset();
    running = true;
    startOverlay.style.display = 'none';
    endOverlay.style.display = 'none';
    spawnInterval = setInterval(spawn, 550);
    timerInterval = setInterval(() => {
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) end();
    }, 1000);
  }

  function end() {
    running = false;
    clearInterval(timerInterval); clearInterval(spawnInterval);
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-combo').textContent = maxCombo + 'x';

    // Persist high score + award pet XP
    try {
      chrome.storage.local.get(['bubbleHighScore'], d => {
        const best = Math.max(d.bubbleHighScore || 0, score);
        chrome.storage.local.set({ bubbleHighScore: best });
        document.getElementById('final-best').textContent = best;
      });
      chrome.runtime.sendMessage({ type: 'AWARD_XP', amount: Math.min(20, Math.floor(score / 3)) });
    } catch(e) {
      document.getElementById('final-best').textContent = score;
    }

    // Title line
    const title = document.getElementById('end-title');
    const sub = document.getElementById('end-sub');
    if (score >= 60) { title.textContent = 'Amazing! ✨'; sub.textContent = 'Mochi is doing a happy dance!'; }
    else if (score >= 30) { title.textContent = 'Nice one!'; sub.textContent = 'You earned your break. Back to focus?'; }
    else { title.textContent = 'Good try!'; sub.textContent = 'Refreshing break — now go crush those books!'; }

    endOverlay.style.display = 'flex';
    // clear stage
    stage.innerHTML = '';
  }

  document.getElementById('start-btn').addEventListener('click', start);
  document.getElementById('retry-btn').addEventListener('click', start);
  document.getElementById('close-btn').addEventListener('click', () => {
    try { window.close(); } catch(e){}
    try { chrome.tabs?.getCurrent(t => t && chrome.tabs.remove(t.id)); } catch(e){}
  });
})();
