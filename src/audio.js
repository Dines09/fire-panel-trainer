// Panel buzzer and ship's alarm bells with the Web Audio API.
// Buzzer: fire = fast pulses, pre-alarm = slow pulses, fault = one short beep
// every two seconds, display test = steady tone. Bells = a looped ringing bell.

export const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Half a second of silence as a WAV file (8 kHz, 8-bit mono), made in memory.
function silentWavUrl() {
  const n = 4000, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

// [beep seconds, period seconds, frequency]
const PATTERNS = { fire: [0.16, 0.32, 2900], pre: [0.35, 1.2, 2500], fault: [0.14, 2, 2700] };

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.buzzer = null;
    this.bells = false;
    this.phase = 0;
    this.bellSrc = null;
    this.hum = null;
  }

  // Must be called from a user gesture (tap / key). Safe to call on every gesture.
  unlock() {
    // iPhone: the ring/silent switch mutes Web Audio unless the page uses the "playback"
    // audio session (Safari 16.4+), like a media player. Older iOS: a silent <audio> loop does the same.
    if (IS_IOS) this.iosSession();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (this.ctx && this.ctx.state === 'closed') this.ctx = null;
    if (this.ctx && this.stuck && IS_IOS) { // iOS PWA: a context that never came back after the background
      try { this.ctx.close(); } catch { /* ignore */ }
      this.ctx = null;
      this.stuck = false;
      this.bellSrc = null;
      this.hum = null;
      this.master = null;
    }
    if (!this.ctx) {
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch {
        try { this.ctx = new AC(); } catch { this.ctx = null; return; }
      }
    }
    const ctx = this.ctx;
    if (ctx.state !== 'running') {
      // iOS starts audio only when a sound is started inside the gesture: play one silent sample
      try {
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      } catch { /* ignore */ }
      const p = ctx.resume && ctx.resume();
      if (p && p.catch) p.catch(() => {});
      clearTimeout(this.stuckT);
      this.stuckT = setTimeout(() => { if (this.ctx === ctx && ctx.state !== 'running') this.stuck = true; }, 600);
    }
  }

  iosSession() {
    try {
      if (navigator.audioSession) {
        if (navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
        return;
      }
    } catch { /* fall back to the silent loop */ }
    if (!this.silentEl) {
      const a = document.createElement('audio');
      a.src = silentWavUrl();
      a.loop = true;
      a.setAttribute('playsinline', '');
      a.setAttribute('x-webkit-airplay', 'deny');
      a.preload = 'auto';
      this.silentEl = a;
      document.addEventListener('visibilitychange', () => { if (document.hidden) a.pause(); });
    }
    if (this.silentEl.paused && !document.hidden) {
      const p = this.silentEl.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  // Back from the background: try to resume (iOS may still need the next tap).
  wake() {
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
      const p = this.ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
  }

  /** 'off' = switched off, 'wait' = the browser has not let the sound start yet, 'on' = playing. */
  get state() { return !this.enabled ? 'off' : this.ctx && this.ctx.state === 'running' ? 'on' : 'wait'; }

  // Everything goes through one output; the compressor keeps buzzer and bells
  // together from distorting, so each can be loud on its own.
  get bus() {
    if (!this.master || this.master.context !== this.ctx) {
      const g = this.ctx.createGain(), comp = this.ctx.createDynamicsCompressor();
      g.connect(comp).connect(this.ctx.destination);
      this.master = g;
    }
    return this.master;
  }

  get live() {
    // a suspended context (resume pending) still plays when it starts; an interrupted or
    // closed one would play all queued beeps at once, so skip those
    return this.enabled && this.ctx && this.ctx.state !== 'closed' && this.ctx.state !== 'interrupted';
  }

  tone(dur = 0.12, vol = 0.3, freq = 2900, type = 'square') {
    if (!this.live) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol, t + Math.max(0.006, dur - 0.01));
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g).connect(this.bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  fx(name) {
    if (name === 'key') this.tone(0.035, 0.14, 2300);
    else if (name === 'ok') { this.tone(0.07, 0.2, 2100); setTimeout(() => this.tone(0.09, 0.2, 2800), 90); }
    else if (name === 'err') this.tone(0.28, 0.24, 520);
    else if (name === 'chirp') this.tone(0.12, 0.3, 2900);
  }

  /** Two clear beeps, to check that the sound gets through. */
  test() {
    this.tone(0.18, 0.4, 2400);
    setTimeout(() => this.tone(0.18, 0.4, 2900), 260);
  }

  // One second of a ringing bell: the hammer strikes ten times a second and each
  // strike excites a few inharmonic partials that die away. Built to loop cleanly.
  bellBuffer() {
    const ctx = this.ctx, sr = ctx.sampleRate, n = Math.floor(sr * 1.0);
    const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    const partials = [[1480, 0.5, 9], [2090, 1, 12], [3170, 0.7, 16], [4290, 0.45, 24], [5560, 0.25, 34]];
    const strikes = 10, gap = n / strikes;
    for (let s = 0; s < strikes; s++) {
      const start = Math.floor(s * gap);
      for (let i = 0; i < n; i++) { // tails wrap round the end of the loop
        const t = i / sr;
        let v = 0;
        for (const [f, a, decay] of partials) v += a * Math.exp(-decay * t) * Math.sin(2 * Math.PI * f * t);
        if (i < 90) v += (Math.random() * 2 - 1) * (1 - i / 90) * 1.5; // hammer click
        d[(start + i) % n] += v * 0.11;
      }
    }
    return buf;
  }

  setBells(on) {
    const want = on && this.live;
    if (want && !this.bellSrc) {
      try {
        if (!this.bellBuf || this.bellBuf.sampleRate !== this.ctx.sampleRate) this.bellBuf = this.bellBuffer();
        const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
        src.buffer = this.bellBuf;
        src.loop = true;
        g.gain.value = 0.85;
        src.connect(g).connect(this.bus);
        src.start();
        this.bellSrc = src;
      } catch { this.bellSrc = null; }
    } else if (!want && this.bellSrc) {
      try { this.bellSrc.stop(); } catch { /* ignore */ }
      this.bellSrc = null;
    }
  }

  setHum(on) {
    const want = on && this.live;
    if (want && !this.hum) {
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 2900;
      g.gain.value = 0.2;
      osc.connect(g).connect(this.bus);
      osc.start();
      this.hum = osc;
    } else if (!want && this.hum) {
      try { this.hum.stop(); } catch { /* ignore */ }
      this.hum = null;
    }
  }

  /** Call often with what the panel wants to sound: { buzzer, bells }. */
  update(dt, out) {
    if (out.buzzer !== this.buzzer) { this.buzzer = out.buzzer; this.phase = 0; this.fresh = true; }
    this.setBells(out.bells);
    this.setHum(out.buzzer === 'test');
    const p = PATTERNS[this.buzzer];
    if (!p) return;
    this.phase += dt;
    if (this.fresh || this.phase >= p[1]) {
      if (!this.fresh) this.phase -= p[1];
      this.fresh = false;
      this.tone(p[0], 0.36, p[2]);
    }
  }

  stopAll() {
    this.setBells(false);
    this.setHum(false);
  }
}
