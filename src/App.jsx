import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Panel } from './panel/engine.js';
import { LESSONS } from './lessons.js';
import { Sound } from './audio.js';
import { store } from './store.js';
import { BigDisplay, Faceplate, H as PLATE_H, W as PLATE_W } from './ui/Faceplate.jsx';
import { Guide, Help, Ship } from './ui/Side.jsx';

const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'enter', NumpadEnter: 'enter', Backspace: 'erase', Escape: 'esc',
  KeyM: 'menu', KeyS: 'status', KeyQ: 'mute', KeyR: 'reset', KeyA: 'multi', KeyF: 'fire', KeyT: 'fault', KeyD: 'dis', KeyP: 'prealarm',
};
const tbtn = 'flex h-[30px] min-w-[32px] flex-none items-center justify-center rounded-lg border border-line bg-panel2 px-2 text-[13px] font-bold text-ink active:bg-line';

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  return v;
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-full w-full max-w-[520px] flex-col rounded-2xl border border-line bg-panel shadow-2xl">
        <div className="flex flex-none items-center justify-between border-b border-line py-2 pr-2 pl-4">
          <h2 className="text-[15px] font-extrabold">{title}</h2>
          <button type="button" className={tbtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const sound = useMemo(() => new Sound(), []);
  const panel = useMemo(() => new Panel({ saved: store.get('panel', null) }), []);
  useSyncExternalStore(panel.subscribe, () => panel.rev);

  // Opening the app always starts in free practice, like walking up to the real panel.
  const [lessonId, setLessonId] = useState('free');
  const [idx, setIdx] = useState(0);
  const [run, setRun] = useState(0); // counts lesson starts, so a restart re-runs the first step
  const [done, setDone] = useState(() => store.get('done', []));
  const [soundOn, setSoundOn] = useState(() => store.get('sound', true));
  const [speed, setSpeed] = useState(1);
  const [sheet, setSheet] = useState(null); // 'help' | 'ship'
  const [zoom, setZoom] = useState(false); // the display enlarged
  const [install, setInstall] = useState(null);
  // The Ship box on a laptop: 'pinned' = fixed beside the panel, 'open' = slid over it until
  // you click elsewhere, 'closed' = out of the way (opened again with the Ship button).
  const [ship, setShipState] = useState(() => (store.get('shipPinned', true) ? 'pinned' : 'closed'));
  const setShip = s => { setShipState(s); store.set('shipPinned', s === 'pinned'); };
  const drawer = useRef(null);
  const [audio, setAudio] = useState('wait'); // 'off' | 'wait' (browser has not started it yet) | 'on'
  const live = useRef({});
  live.current = { speed, sheet, lessonId };

  const { w, h } = useViewport();
  const mode = w >= 1000 && h >= 560 ? 'desk' : w > h ? 'land' : 'port';
  const rotate = mode === 'port' && w < 640; // a phone held upright: the panel needs it sideways
  const tablet = mode === 'port' && !rotate; // upright tablet: room for the Ship box under the panel

  const lesson = LESSONS.find(l => l.id === lessonId) || null;
  const step = lesson ? lesson.steps[idx] : null;
  const finished = !!(step && step.final);

  const press = useCallback(k => {
    sound.unlock();
    panel.key(k);
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch { /* ignore */ } }
  }, [panel, sound]);

  const start = useCallback(id => {
    const l = LESSONS.find(x => x.id === id);
    if (live.current.lessonId === 'free') store.set('panel', panel.save());
    if (l) {
      panel.init({ level: l.level, idle: false }); // every lesson starts from a clean panel
      if (l.setup) l.setup(panel);
      panel.settle();
    } else panel.init({ saved: store.get('panel', null) });
    setSpeed(1);
    setLessonId(l ? id : 'free');
    setIdx(0);
    setRun(r => r + 1);
  }, [panel]);

  // ---- clock, sound and the flashing of the lamps
  useEffect(() => {
    panel.onFx = name => { if (name !== 'key' || panel.set.beep) sound.fx(name); };
    let last = performance.now();
    const tick = setInterval(() => {
      const now = performance.now(), dt = Math.min(1000, now - last);
      last = now;
      panel.tick(dt, dt * live.current.speed);
      sound.update(dt / 1000, document.hidden ? { buzzer: null, bells: false } : panel.out);
      setAudio(sound.state); // same value = no re-render
    }, 50);
    const root = document.documentElement;
    const blink = setInterval(() => { root.dataset.blink = root.dataset.blink === '1' ? '0' : '1'; }, 500);
    // Audio may only start inside a user gesture; iOS accepts touchend / click, others pointerdown.
    const unlock = () => sound.unlock();
    const events = ['pointerdown', 'touchend', 'click', 'keydown'];
    events.forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
    const onVis = () => { if (!document.hidden) sound.wake(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(tick);
      clearInterval(blink);
      events.forEach(ev => document.removeEventListener(ev, unlock, { capture: true }));
      document.removeEventListener('visibilitychange', onVis);
      sound.stopAll();
    };
  }, [panel, sound]);

  useEffect(() => { sound.enabled = soundOn; store.set('sound', soundOn); }, [sound, soundOn]);
  useEffect(() => { window.firePanel = panel; }, [panel]); // for the browser console and tests

  // ---- free practice keeps the panel's memory
  useEffect(() => {
    if (lessonId !== 'free') return undefined;
    let t = 0;
    const save = () => store.set('panel', panel.save());
    const un = panel.subscribe(() => { clearTimeout(t); t = setTimeout(save, 800); });
    window.addEventListener('pagehide', save);
    return () => { un(); clearTimeout(t); window.removeEventListener('pagehide', save); };
  }, [panel, lessonId, run]);

  // ---- computer keyboard
  useEffect(() => {
    const onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || live.current.sheet) return;
      if (['SELECT', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const k = /^[0-9]$/.test(e.key) ? e.key : e.key === '+' ? 'day' : e.key === '-' ? 'night' : KEYMAP[e.code];
      if (!k) return;
      e.preventDefault();
      if (e.repeat && k !== 'up' && k !== 'down') return;
      press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  // ---- lesson steps
  const stepStart = useRef(0);
  useEffect(() => {
    stepStart.current = performance.now();
    if (!step) return;
    if (step.on) step.on(panel);
    if (step.final) setDone(d => { const next = d.includes(lessonId) ? d : [...d, lessonId]; store.set('done', next); return next; });
  }, [run, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!step || step.ack || step.final || !step.done) return undefined;
    let gone = false;
    const check = () => {
      // a short pause, so a step that is already true does not flash past unread
      if (gone || performance.now() - stepStart.current < 500 || !step.done(panel)) return;
      gone = true;
      setIdx(idx + 1);
    };
    const un = panel.subscribe(check);
    const poll = setInterval(check, 250);
    return () => { un(); clearInterval(poll); };
  }, [run, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- an unpinned Ship box closes when you go back to the panel
  useEffect(() => {
    if (ship !== 'open') return undefined;
    const away = e => { if (drawer.current && !drawer.current.contains(e.target) && !e.target.closest('[data-ship-toggle]')) setShip('closed'); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [ship]);

  // ---- install as an app
  useEffect(() => {
    const before = e => { e.preventDefault(); setInstall(e); };
    const after = () => setInstall(null);
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('appinstalled', after);
    return () => { window.removeEventListener('beforeinstallprompt', before); window.removeEventListener('appinstalled', after); };
  }, []);

  const hl = useMemo(() => {
    const keys = step && !finished ? (typeof step.hl === 'function' ? step.hl(panel) : step.hl) : null;
    return new Set(keys || []);
  }, [step, finished, panel.rev]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- what the guide says
  const guide = (() => {
    if (!lesson) {
      return {
        key: 'free', mode: 'FREE', title: 'Free practice', pct: 0,
        text: 'Free practice: use the panel any way you like.',
        sub: mode === 'desk' ? 'Start smoke, a call point or a fault in the Ship box, then deal with it on the panel. Codes: 2222 (level 2B), 3333 (level 3).'
          : 'Open <b>Ship</b> to start smoke, a call point or a fault. Tap the display to read it bigger. Codes: 2222 (level 2B), 3333 (level 3).',
      };
    }
    const n = lesson.steps.length - 1;
    const i = LESSONS.indexOf(lesson);
    const next = LESSONS[i + 1];
    let action = null;
    if (finished) action = next ? { label: `Next: ${next.title} ▸`, run: () => start(next.id) } : { label: 'Free practice ▸', run: () => start('free') };
    else if (step.act) action = { label: step.act.label, run: () => { sound.unlock(); step.act.run(panel); } };
    else if (step.ack) action = { label: 'Got it ▸', run: () => setIdx(idx + 1) };
    return {
      key: `${run}.${idx}`, mode: finished ? 'DONE' : 'LEARN', title: lesson.title, count: `${Math.min(idx + 1, n)}/${n}`,
      pct: finished ? 100 : (idx / n) * 100, text: step.t, sub: step.sub, action,
    };
  })();

  // switching the sound on answers with two beeps, so you know it gets through
  const toggleSound = () => {
    const on = !soundOn;
    sound.enabled = on;
    setSoundOn(on);
    if (on) { sound.unlock(); sound.test(); }
  };
  // full screen hides the browser bars (more room for the panel) and, on a phone, holds it sideways
  const fullscreen = async () => {
    const d = document;
    try {
      if (d.fullscreenElement) { await d.exitFullscreen(); return; }
      if (d.documentElement.requestFullscreen) await d.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch { /* not available (iPhone Safari) */ }
  };
  const standalone = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  const forget = () => {
    store.del('panel');
    store.del('done');
    setDone([]);
    setSheet(null);
    live.current.lessonId = 'lesson'; // so start() does not save the memory back
    start('free');
  };

  const picker = (
    <select
      aria-label="Lesson" value={lessonId} onChange={e => { start(e.target.value); e.target.blur(); }}
      className={`pick h-[30px] min-w-0 rounded-lg border border-line bg-panel2 pr-6 pl-2 text-[13px] font-semibold text-ink ${mode === 'land' ? 'w-[128px] flex-none' : 'flex-1'}`}
    >
      <option value="free">Free practice (no guide)</option>
      {LESSONS.map((l, i) => <option key={l.id} value={l.id}>{done.includes(l.id) ? '✓' : `${i + 1}.`} {l.title}</option>)}
    </select>
  );
  const tools = (
    <div className="flex flex-none gap-1.5">
      {lesson && <button type="button" className={tbtn} title="Restart lesson" aria-label="Restart lesson" onClick={() => start(lessonId)}>↺</button>}
      {mode !== 'desk' && !tablet && <button type="button" className={tbtn} title="Ship: start smoke, call points and faults" onClick={() => setSheet('ship')}>Ship</button>}
      {mode === 'desk' && ship !== 'pinned' && (
        <button type="button" data-ship-toggle className={`${tbtn} ${ship === 'open' ? '!border-accent2 !text-accent2' : ''}`} title="Ship: start smoke, call points and faults" onClick={() => setShip(ship === 'open' ? 'closed' : 'open')}>Ship</button>
      )}
      <button
        type="button" className={`${tbtn} ${audio === 'off' ? 'opacity-50' : audio === 'wait' ? '!border-accent' : ''}`} aria-label="Sound on or off"
        title={audio === 'off' ? 'Sound is off: tap to switch it on' : audio === 'wait' ? 'Sound starts with your first tap or key' : 'Sound is on: tap to switch it off'}
        onClick={toggleSound}
      >
        {audio === 'off' ? '🔇' : audio === 'wait' ? '🔈' : '🔊'}
      </button>
      {mode !== 'land' && <button type="button" className={tbtn} title="Enlarge the display (or tap the display)" aria-label="Enlarge the display" onClick={() => setZoom(true)}>🔍</button>}
      {!standalone && document.documentElement.requestFullscreen && <button type="button" className={tbtn} title="Full screen" aria-label="Full screen" onClick={fullscreen}>⛶</button>}
      {install && <button type="button" className={`${tbtn} !border-accent !bg-accent !text-[#1b1300]`} onClick={async () => { install.prompt(); try { await install.userChoice; } catch { /* ignore */ } setInstall(null); }}>⤓ Install</button>}
      <button type="button" className={`${tbtn} font-serif italic`} title="Help" aria-label="Help" onClick={() => setSheet('help')}>i</button>
    </div>
  );
  const vm = panel.view();
  const plate = <Faceplate vm={vm} leds={panel.leds} hl={hl} press={press} onDisplay={() => setZoom(true)} />;
  const shipBox = (
    <section className="rounded-xl border border-line bg-panel px-3 py-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-extrabold">Ship <span className="font-medium text-muted">· away from the panel</span></h2>
        {mode === 'desk' && (
          <>
            <button
              type="button" className={`${tbtn} !h-[26px] !min-w-[28px] !px-1.5 ${ship === 'pinned' ? '!border-accent2 !text-accent2' : ''}`}
              title={ship === 'pinned' ? 'Pinned: stays open. Click to unpin.' : 'Pin: keep this box open beside the panel'} aria-label="Pin the Ship box" aria-pressed={ship === 'pinned'}
              onClick={() => setShip(ship === 'pinned' ? 'open' : 'pinned')}
            >
              <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill={ship === 'pinned' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7" /></svg>
            </button>
            <button type="button" className={`${tbtn} !h-[26px] !min-w-[28px] !px-1.5`} title="Collapse" aria-label="Collapse the Ship box" onClick={() => setShip('closed')}>»</button>
          </>
        )}
      </div>
      <Ship panel={panel} speed={speed} setSpeed={setSpeed} />
    </section>
  );

  return (
    <div className="app flex h-dvh flex-col overflow-hidden bg-bg text-ink select-none">
      <header className="flex min-h-[42px] flex-none items-center gap-1.5 border-b border-line bg-bg2 px-2 py-1">
        <div className={`flex flex-none items-center gap-1.5 text-[13px] font-extrabold whitespace-nowrap ${mode === 'land' ? 'hidden' : ''}`}>
          <span className="text-[#ff5a4d]">◆</span>{mode === 'land' ? '' : 'Fire Panel Trainer'}
        </div>
        {picker}
        {mode === 'land' && <Guide g={guide} inline />}
        {tools}
      </header>

      {mode === 'desk' ? (
        <main className="relative flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex-none px-4 pt-3"><Guide g={guide} bar /></div>
            <div className="min-h-0 flex-1 p-4">{plate}</div>
          </div>
          {ship === 'pinned' && <aside className="w-[360px] flex-none overflow-y-auto border-l border-line bg-bg2 p-3">{shipBox}</aside>}
          {ship === 'open' && <aside ref={drawer} className="absolute top-0 right-0 bottom-0 z-20 w-[360px] overflow-y-auto border-l border-line bg-bg2 p-3 shadow-[-12px_0_30px_rgba(0,0,0,.55)]">{shipBox}</aside>}
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col">
          {mode === 'port' && <div className="flex-none px-2 pt-2"><Guide g={guide} /></div>}
          {tablet ? (
            <>
              <div className="flex-none p-2" style={{ height: (w - 16) * PLATE_H / PLATE_W + 16 }}>{plate}</div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">{shipBox}</div>
            </>
          ) : <div className={`min-h-0 flex-1 ${mode === 'land' ? 'p-1' : 'p-2'}`}>{plate}</div>}
        </main>
      )}

      {sheet === 'ship' && <Sheet title="Ship · what happens away from the panel" onClose={() => setSheet(null)}><Ship panel={panel} speed={speed} setSpeed={setSpeed} /></Sheet>}
      {sheet === 'help' && <Sheet title="Help" onClose={() => setSheet(null)}><Help onForget={forget} audio={audio} onTestSound={() => { sound.unlock(); sound.test(); }} /></Sheet>}
      {zoom && <BigDisplay vm={vm} onClose={() => setZoom(false)} />}
      {rotate && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-bg px-8 text-center">
          <div className="rotate-phone text-[54px]">📱</div>
          <b className="text-[18px]">Turn your phone sideways</b>
          <span className="text-[14px] text-muted">The panel is used in landscape, like the real one on the bulkhead.</span>
        </div>
      )}
    </div>
  );
}
