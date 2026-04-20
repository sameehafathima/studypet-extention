// ====================================================
// StudyPet Offscreen Audio
// Web Audio API: noise (white/pink/brown) + rain + Lo-Fi beats
// No network, no files — everything synthesised.
// ====================================================

let ctx = null;
let sourceNode = null;
let gainNode = null;
let noiseBuffer = null;
let rainNodes = [];
let lofiTimer = null;

function getCtx() {
  if (!ctx) ctx = new (self.AudioContext || self.webkitAudioContext)();
  return ctx;
}

function makeNoiseBuffer(kind) {
  const c = getCtx();
  const bufferSize = c.sampleRate * 2;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const output = buffer.getChannelData(0);

  if (kind === 'white') {
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
  } else if (kind === 'pink') {
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179;
      b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522;
      b5 = -0.7616*b5 - w*0.0168980;
      output[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
      b6 = w*0.115926;
    }
  } else if (kind === 'brown') {
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02*w) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }
  }
  return buffer;
}

function stopAll() {
  if (sourceNode) { try { sourceNode.stop(); } catch(e){} sourceNode.disconnect(); sourceNode = null; }
  rainNodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} });
  rainNodes = [];
  if (lofiTimer) { clearInterval(lofiTimer); lofiTimer = null; }
  if (gainNode) { gainNode.disconnect(); gainNode = null; }
}

function playNoise(kind) {
  stopAll();
  const c = getCtx();
  gainNode = c.createGain();
  gainNode.gain.value = 0.25;
  gainNode.connect(c.destination);

  noiseBuffer = makeNoiseBuffer(kind);
  sourceNode = c.createBufferSource();
  sourceNode.buffer = noiseBuffer;
  sourceNode.loop = true;
  sourceNode.connect(gainNode);
  sourceNode.start();
}

function playRain() {
  stopAll();
  const c = getCtx();
  gainNode = c.createGain();
  gainNode.gain.value = 0.22;
  gainNode.connect(c.destination);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  filter.connect(gainNode);

  noiseBuffer = makeNoiseBuffer('brown');
  sourceNode = c.createBufferSource();
  sourceNode.buffer = noiseBuffer;
  sourceNode.loop = true;
  sourceNode.connect(filter);
  sourceNode.start();
  rainNodes.push(filter);

  const tickInterval = setInterval(() => {
    if (!ctx) { clearInterval(tickInterval); return; }
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.frequency.value = 800 + Math.random() * 1500;
    og.gain.setValueAtTime(0.08, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(og); og.connect(gainNode);
    osc.start(); osc.stop(ctx.currentTime + 0.09);
  }, 250);
  rainNodes.push({ stop: () => clearInterval(tickInterval), disconnect: () => {} });
}

// ─── Lo-Fi beat generator ─────────────────
// Mellow chord progression + soft kick + hi-hat vinyl crackle.
// All synthesised. Loops indefinitely.
const LOFI_CHORDS = [
  // Am7 — Fmaj7 — Cmaj7 — G — (classic sad-happy loop)
  [220.00, 261.63, 329.63, 392.00],
  [174.61, 220.00, 261.63, 329.63],
  [130.81, 164.81, 196.00, 246.94],
  [196.00, 246.94, 293.66, 392.00],
];

function playLofi() {
  stopAll();
  const c = getCtx();
  gainNode = c.createGain();
  gainNode.gain.value = 0.22;
  gainNode.connect(c.destination);

  // Vinyl crackle = very quiet pink noise through low-pass
  const crackleFilter = c.createBiquadFilter();
  crackleFilter.type = 'lowpass';
  crackleFilter.frequency.value = 4500;
  const crackleGain = c.createGain();
  crackleGain.gain.value = 0.06;
  crackleFilter.connect(crackleGain); crackleGain.connect(gainNode);

  noiseBuffer = makeNoiseBuffer('pink');
  sourceNode = c.createBufferSource();
  sourceNode.buffer = noiseBuffer;
  sourceNode.loop = true;
  sourceNode.connect(crackleFilter);
  sourceNode.start();
  rainNodes.push(crackleFilter, crackleGain);

  // Tempo: ~72 BPM → one beat ≈ 0.833s, chord every 4 beats (≈3.33s)
  const beatMs = 833;
  let step = 0;

  function softTone(freq, when, dur, vol) {
    const osc = c.createOscillator();
    const og = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // slight detune for warmth
    const osc2 = c.createOscillator();
    const og2 = c.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 1.005;
    og2.gain.value = 0.3;

    og.gain.setValueAtTime(0, when);
    og.gain.linearRampToValueAtTime(vol, when + 0.03);
    og.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(og); osc2.connect(og2); og2.connect(og);
    og.connect(gainNode);
    osc.start(when); osc2.start(when);
    osc.stop(when + dur + 0.05); osc2.stop(when + dur + 0.05);
  }

  function kick(when) {
    const osc = c.createOscillator();
    const og = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, when);
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.18);
    og.gain.setValueAtTime(0.5, when);
    og.gain.exponentialRampToValueAtTime(0.001, when + 0.25);
    osc.connect(og); og.connect(gainNode);
    osc.start(when); osc.stop(when + 0.3);
  }

  function hat(when) {
    const b = c.createBufferSource();
    const hbuf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
    const d = hbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
    b.buffer = hbuf;
    const hf = c.createBiquadFilter();
    hf.type = 'highpass'; hf.frequency.value = 6000;
    const hg = c.createGain(); hg.gain.value = 0.08;
    b.connect(hf); hf.connect(hg); hg.connect(gainNode);
    b.start(when);
  }

  lofiTimer = setInterval(() => {
    if (!ctx) { clearInterval(lofiTimer); return; }
    const now = ctx.currentTime;
    const chord = LOFI_CHORDS[step % LOFI_CHORDS.length];
    // Arpeggiate chord over 4 beats
    chord.forEach((f, i) => softTone(f, now + i * (beatMs/1000), 1.6, 0.12));
    // Bass on beat 1 one octave down
    softTone(chord[0] / 2, now, 1.8, 0.18);
    // Drum groove
    kick(now);
    hat(now + beatMs/1000 * 0.5);
    kick(now + beatMs/1000 * 2);
    hat(now + beatMs/1000 * 1.5);
    hat(now + beatMs/1000 * 2.5);
    hat(now + beatMs/1000 * 3.5);
    step++;
  }, beatMs * 4);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== 'offscreen') return;
  if (msg.type === 'PLAY_SOUND') {
    getCtx();
    if (msg.sound === 'rain') playRain();
    else if (msg.sound === 'lofi') playLofi();
    else if (['white','pink','brown'].includes(msg.sound)) playNoise(msg.sound);
    else stopAll();
  }
  if (msg.type === 'STOP_SOUND') stopAll();
});
