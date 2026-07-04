// Synthesized UI sound design + generative habitat ambience (Web Audio API).
// No audio assets are shipped — every sound is synthesized at runtime.

// ---- UI sounds ----
let uiCtx = null;
let uiEnabled = true;
try {
  if (localStorage.getItem("ee_sound") === "0") uiEnabled = false;
} catch (e) {}

function getUiCtx() {
  if (!uiCtx) uiCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (uiCtx.state === "suspended") uiCtx.resume();
  return uiCtx;
}

function envelope(gain, t0, peak, attack, decay) {
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone({ freq, duration = 0.25, type = "sine", peak = 0.08, attack = 0.005, slideTo = null }) {
  if (!uiEnabled) return;
  let c;
  try { c = getUiCtx(); } catch (e) { return; }
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  envelope(gain, t0, peak, attack, duration - attack);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
  // Waveform visualizer taps
  waveListeners.forEach((fn) => fn(duration, peak));
}

const waveListeners = new Set();

export const eeSound = {
  hover() {
    tone({ freq: 1200, duration: 0.1, peak: 0.04 });
  },
  click() {
    // Major third chord: A5 + C#6
    tone({ freq: 880, duration: 0.22, peak: 0.05 });
    tone({ freq: 1108.73, duration: 0.22, peak: 0.045, attack: 0.008 });
  },
  panelOpen() {
    // Perfect fifth sweep, sliding up an octave
    tone({ freq: 440, slideTo: 880, duration: 0.5, peak: 0.06, type: "sine", attack: 0.02 });
    tone({ freq: 659.25, slideTo: 1318.5, duration: 0.5, peak: 0.04, type: "triangle", attack: 0.03 });
  },
  tourTick() {
    tone({ freq: 620, duration: 0.18, peak: 0.05, type: "triangle" });
  },
  setEnabled(v) {
    uiEnabled = v;
    try { localStorage.setItem("ee_sound", v ? "1" : "0"); } catch (e) {}
  },
  isEnabled() { return uiEnabled; },
  onWave(fn) {
    waveListeners.add(fn);
    return () => waveListeners.delete(fn);
  },
};

// ---- Generative habitat ambience (ocean / forest / tundra / wetland) ----
let ambCtx = null, master = null, current = null, started = false, currentHabitat = null, ambEnabled = true;

function getAmbCtx() {
  if (!ambCtx) {
    ambCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = ambCtx.createGain();
    master.gain.value = 1;
    master.connect(ambCtx.destination);
  }
  if (ambCtx.state === "suspended") ambCtx.resume();
  return ambCtx;
}

function noiseBuffer(kind) {
  const c = getAmbCtx();
  const len = c.sampleRate * 3;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  if (kind === "brown") {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  } else {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function makeLayer(habitat) {
  const c = getAmbCtx();
  const out = c.createGain();
  out.gain.value = 0;
  out.connect(master);
  const nodes = [];
  const timers = [];

  function noiseThrough(kind, filterType, freq, q, gain) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(kind);
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q || 0.7;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(out);
    src.start();
    nodes.push(src, f, g);
    return { src, f, g };
  }
  function lfo(param, freq, depth, base) {
    const o = c.createOscillator();
    o.frequency.value = freq;
    const og = c.createGain();
    og.gain.value = depth;
    o.connect(og); og.connect(param);
    if (base !== undefined) param.value = base;
    o.start();
    nodes.push(o, og);
  }
  function blip(f0, f1, dur, gain, type) {
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  if (habitat === "ocean") {
    const n = noiseThrough("brown", "lowpass", 420, 0.6, 0.16);
    lfo(n.g.gain, 0.07, 0.1, 0.16);
    lfo(n.f.frequency, 0.045, 140, 420);
  } else if (habitat === "tundra") {
    const n = noiseThrough("white", "bandpass", 520, 0.8, 0.06);
    lfo(n.f.frequency, 0.05, 260, 560);
    lfo(n.g.gain, 0.09, 0.028, 0.055);
  } else if (habitat === "forest") {
    noiseThrough("brown", "lowpass", 300, 0.7, 0.055);
    const chirp = () => {
      if (!ambEnabled) return;
      const f0 = 1800 + Math.random() * 1600;
      blip(f0, f0 + 300 + Math.random() * 500, 0.14, 0.035, "sine");
      if (Math.random() < 0.5) setTimeout(() => blip(f0 * 1.1, f0 * 0.9, 0.1, 0.028, "sine"), 180);
    };
    timers.push(setInterval(chirp, 3200));
  } else {
    const n = noiseThrough("brown", "lowpass", 500, 0.6, 0.08);
    lfo(n.g.gain, 0.11, 0.03, 0.07);
    const drip = () => { if (ambEnabled) blip(950, 480, 0.09, 0.035, "sine"); };
    timers.push(setInterval(drip, 4200));
  }

  out.gain.setTargetAtTime(1, c.currentTime, 1.2);

  return {
    stop() {
      timers.forEach(clearInterval);
      out.gain.setTargetAtTime(0, c.currentTime, 0.7);
      setTimeout(() => {
        nodes.forEach((n) => {
          try { n.stop && n.stop(); } catch (e) {}
          try { n.disconnect(); } catch (e) {}
        });
        try { out.disconnect(); } catch (e) {}
      }, 2500);
    },
  };
}

export const eeAmbience = {
  start(h) {
    if (started) { this.setHabitat(h); return; }
    started = true;
    try { getAmbCtx(); } catch (e) { return; }
    currentHabitat = null;
    this.setHabitat(h || "forest");
  },
  setHabitat(h) {
    if (!started || h === currentHabitat) return;
    currentHabitat = h;
    const old = current;
    current = makeLayer(h);
    if (old) old.stop();
  },
  setEnabled(v) {
    ambEnabled = v;
    if (!master) return;
    master.gain.setTargetAtTime(v ? 1 : 0, getAmbCtx().currentTime, 0.5);
  },
  stop() {
    if (current) { current.stop(); current = null; currentHabitat = null; started = false; }
  },
};
