// Everything around the panel: the lesson guide, the "ship" box (what happens
// away from the panel) and the help page.
import { useState } from 'react';
import { LEVEL_NAME } from '../panel/engine.js';
import { ZONES, unitAt, unitName } from '../panel/site.js';
import { FAULT_CODES, SYSTEM_FAULTS } from '../panel/faults.js';

const btn = 'rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[12.5px] font-semibold text-ink active:bg-line disabled:opacity-40';
const cta = 'rounded-lg bg-accent px-3 py-1.5 text-[13px] font-bold text-[#1b1300] active:brightness-90';

// ------------------------------------------------------------------ guide
export function Guide({ g, inline }) {
  const html = s => ({ __html: s || '' });
  const action = g.action && <button type="button" className={`${cta} flex-none whitespace-nowrap`} onClick={g.action.run}>{g.action.label}</button>;
  const tone = g.mode === 'DONE' ? 'border-l-ok' : g.mode === 'FREE' ? 'border-l-accent2' : 'border-l-accent';
  const modeColor = g.mode === 'DONE' ? 'text-ok' : g.mode === 'FREE' ? 'text-accent2' : 'text-accent';
  if (inline) {
    return (
      <div className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line border-l-4 bg-panel px-2 py-0.5 ${tone}`}>
        {g.count && <span className={`flex-none text-[10.5px] font-extrabold ${modeColor}`}>{g.count}</span>}
        <div className="guide-text line-clamp-3 min-w-0 flex-1 text-[12px] leading-[14.5px] font-semibold" dangerouslySetInnerHTML={html(g.text)} />
        {action}
      </div>
    );
  }
  return (
    <section key={g.key} className={`guide-flash flex-none rounded-xl border border-line border-l-4 bg-panel px-3 py-2 ${tone}`}>
      <div className="flex items-center gap-2 text-[10.5px] text-muted">
        <span className={`font-extrabold tracking-wider ${modeColor}`}>{g.mode}</span>
        <span className="min-w-0 truncate">{g.title}{g.count ? ` · ${g.count}` : ''}</span>
        <div className="h-[3px] min-w-6 flex-1 overflow-hidden rounded bg-line">
          <div className={`h-full transition-[width] duration-300 ${g.mode === 'DONE' ? 'bg-ok' : 'bg-accent'}`} style={{ width: `${g.pct}%` }} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <div className="guide-text mt-1 text-[14px] leading-snug font-semibold" dangerouslySetInnerHTML={html(g.text)} />
          {g.sub && <div className="guide-text mt-1 text-[12px] leading-snug text-muted" dangerouslySetInnerHTML={html(g.sub)} />}
        </div>
        {action}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ ship box
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Outputs({ panel }) {
  const o = panel.out;
  const bells = o.bellsOff ? ['disabled', 'text-accent'] : o.bells ? ['RINGING', 'text-[#ff5a4d]']
    : o.delay ? [`start in ${mmss(o.delay.secs)} unless ${o.delay.phase === 't1' ? 'muted' : 'reset'}`, 'text-accent'] : ['quiet', 'text-muted'];
  const row = (label, [value, cls]) => (
    <div className="flex justify-between gap-2"><span className="text-muted">{label}</span><span className={`text-right font-bold ${cls}`}>{value}</span></div>
  );
  return (
    <div className="grid gap-0.5 rounded-lg bg-bg2 px-2.5 py-2 text-[12px]">
      {row('Alarm bells', bells)}
      {row('Panel buzzer', o.buzzer ? [{ fire: 'fire alarm', pre: 'pre-alarm', fault: 'fault', test: 'test' }[o.buzzer], 'text-[#ff5a4d]'] : ['quiet', 'text-muted'])}
      {row('Fire doors', o.doorsClosed ? ['closed', 'text-accent'] : ['held open', 'text-muted'])}
      {row('Ventilation', o.ventStopped ? ['stopped', 'text-accent'] : ['running', 'text-muted'])}
      {row('Access level', [LEVEL_NAME[panel.level], 'text-ink'])}
    </div>
  );
}

export function Ship({ panel, speed, setSpeed }) {
  const [zone, setZone] = useState(3);
  const [addr, setAddr] = useState(45);
  const z = ZONES.find(x => x.no === zone);
  const u = unitAt(zone, addr) || z.units[0];
  const mcp = u.type === 'MCP';
  const active = [
    ...[...panel.cond].map(([key, c]) => {
      const [zz, aa] = key.split(':').map(Number);
      const unit = unitAt(zz, aa);
      return { key, label: `${c.kind === 'pre' ? 'Smouldering' : unit.type === 'MCP' ? 'Pressed' : 'In alarm'}: ${unitName(unit)}`, clear: () => panel.fieldClear(zz, aa) };
    }),
    ...[...panel.causes].map(key => {
      const [kind, zz, aa] = key.split(':');
      const label = zz ? `${kind === 'dirty' ? 'Dirty' : 'Removed'}: ${unitName(unitAt(+zz, +aa))}` : SYSTEM_FAULTS[kind].label;
      return { key, label, clear: () => panel.fieldFault(key, false) };
    }),
  ];
  const sel = 'min-w-0 rounded-lg border border-line bg-panel2 px-2 py-1.5 text-[12.5px] font-semibold text-ink';
  return (
    <div className="grid gap-2.5 text-[12.5px]">
      <Outputs panel={panel} />

      <div className="grid gap-1.5">
        <div className="text-[10.5px] font-extrabold tracking-wider text-accent2">A DETECTOR OR CALL POINT</div>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-1.5">
          <select aria-label="Zone" className={sel} value={zone} onChange={e => { const n = +e.target.value; setZone(n); setAddr(ZONES.find(x => x.no === n).units[0].addr); e.target.blur(); }}>
            {ZONES.map(x => <option key={x.no} value={x.no}>Zone {x.no} · {x.name}</option>)}
          </select>
          <select aria-label="Unit" className={sel} value={u.addr} onChange={e => { setAddr(+e.target.value); e.target.blur(); }}>
            {z.units.map(x => <option key={x.addr} value={x.addr}>{x.addr} · {x.type} · {x.text}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className={`${btn} border-[#a33] !bg-[#5a1b1b]`} onClick={() => panel.fieldFire(u.zone, u.addr)}>
            {mcp ? 'Break the glass' : u.type === 'SMOKE' ? 'Smoke: fire alarm' : u.type === 'HEAT' ? 'Heat: fire alarm' : 'Flame: fire alarm'}
          </button>
          <button type="button" className={btn} disabled={mcp} onClick={() => panel.fieldPre(u.zone, u.addr)}>A little smoke: pre-alarm</button>
          <button type="button" className={btn} onClick={() => panel.fieldFault(`noanswer:${u.zone}:${u.addr}`, true)}>Remove from base: fault</button>
          <button type="button" className={btn} disabled={mcp} onClick={() => panel.fieldFault(`dirty:${u.zone}:${u.addr}`, true)}>Dirty sensor: warning</button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <div className="text-[10.5px] font-extrabold tracking-wider text-accent2">THE CENTRAL ITSELF</div>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(SYSTEM_FAULTS).map(([key, f]) => (
            <button key={key} type="button" className={`${btn} ${panel.causes.has(key) ? '!border-accent !text-accent' : ''}`} onClick={() => panel.fieldFault(key, !panel.causes.has(key))}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-extrabold tracking-wider text-accent2">HAPPENING NOW</span>
          {active.length > 1 && <button type="button" className="text-[11.5px] font-bold text-accent" onClick={() => { panel.fieldClear(); [...panel.causes].forEach(c => panel.fieldFault(c, false)); }}>Clear all</button>}
        </div>
        {!active.length && <div className="text-muted">Nothing. Smoke, heat and faults you start show here until you clear them.</div>}
        {active.map(a => (
          <div key={a.key} className="flex items-center justify-between gap-2 rounded-lg bg-bg2 py-1 pr-1 pl-2.5">
            <span className="min-w-0 truncate font-semibold">{a.label}</span>
            <button type="button" className={`${btn} flex-none !py-1`} onClick={a.clear}>Clear</button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-muted">Clock speed (delays and timers)</span>
        <div className="flex gap-1">
          {[1, 10, 60].map(s => (
            <button key={s} type="button" className={`${btn} !px-2 !py-1 ${speed === s ? '!border-accent !text-accent' : ''}`} onClick={() => setSpeed(s)}>{s}×</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ help
export function Help({ onForget, audio, onTestSound }) {
  const [armed, setArmed] = useState(false);
  const h3 = 'mt-4 mb-1.5 text-[11px] font-extrabold tracking-wider text-accent2 uppercase';
  const kbd = 'rounded border border-line bg-panel2 px-1.5 py-px font-mono text-[11.5px]';
  const keys = [['0-9', 'keypad'], ['Enter', '↵'], ['Backspace', '⌫ erase'], ['Arrows', '▲ ▼ ◄ ►'], ['Esc', 'ESC'], ['M', 'Menu'], ['S', 'Status'],
    ['Q', 'Mute'], ['R', 'Reset'], ['A', 'Multiple alarms'], ['F', 'Fire'], ['T', 'Fault'], ['D', 'Disablements'], ['+ −', 'day / night']];
  return (
    <div className="text-[13px] leading-relaxed">
      <p>A practice copy of the <b>Consilium Salwico Control Panel M 4.3</b>. Press the keys as on the real panel: the display, lamps, buzzer and bells answer the same way. Nothing here is connected to a real system.</p>

      <h3 className={h3}>How to use</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Lessons</b>: choose one at the top and follow the yellow highlights.</li>
        <li><b>Free practice</b>: use the <b>Ship</b> box to start smoke, break a call point or cause a fault, then deal with it on the panel.</li>
        <li><b>Access codes</b> on this trainer: <b>2222</b> for level 2B (operator), <b>3333</b> for level 3 (power user). Menu » 4 Login.</li>
        <li>Without a code you can look at alarms and silence the panel buzzer, nothing else.</li>
      </ul>

      <h3 className={h3}>Sound</h3>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} disabled={audio === 'off'} onClick={onTestSound}>🔊 Test sound (two beeps)</button>
        <span className="text-muted">{audio === 'off' ? 'Sound is switched off: tap 🔇 at the top.' : audio === 'on' ? 'Sound is running.' : 'Sound starts with your first tap.'}</span>
      </div>
      <p className="mt-1.5 text-muted">No beeps? Turn up the volume of the device, and check that the browser tab is not muted (right-click the tab). The panel buzzer is a high beep; the ship's bells ring when the alarm devices are activated.</p>

      <h3 className={h3}>Lamps</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>FIRE / Pre-Alarm / Fault</b>: flashing = not muted yet, steady = muted.</li>
        <li><b>Disablements</b>: steady yellow while anything is disabled.</li>
        <li><b>Zone</b>: steady = a zone or detector is disabled or in test, flashing = a zone or detector fault.</li>
        <li><b>Test</b>: a zone is in test mode. <b>Alarm device</b>: bells disabled (steady) or faulty (flashing). <b>Alarm delay off</b>: the alarm delay is disabled.</li>
      </ul>

      <h3 className={h3}>Keyboard</h3>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {keys.map(([key, what]) => <span key={key}><kbd className={kbd}>{key}</kbd> <span className="text-muted">{what}</span></span>)}
      </div>

      <h3 className={h3}>Fault codes used here</h3>
      <div className="grid gap-1.5">
        {Object.entries(FAULT_CODES).map(([code, f]) => (
          <div key={code} className="rounded-lg bg-bg2 px-2.5 py-1.5 text-[12px]">
            <b>{code} {f.name}</b><br /><span className="text-muted">Cause:</span> {f.cause}<br /><span className="text-muted">Remedy:</span> {f.remedy}
          </div>
        ))}
      </div>

      <h3 className={h3}>This sample ship</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>15 zones on 3 loops. The location texts are from a tanker's address list; the detector types are made up for training.</li>
        <li>One detector in alarm starts the <b>alarm delay</b> (2 minutes to mute, then 2 minutes to reset) before the bells ring. A call point or a second alarm rings the bells at once.</li>
        <li>Not included: periodic disablements, printing, USB and the service menu (level 4).</li>
        <li>Your own ship is programmed differently. Check its address list and cause/effect plan.</li>
      </ul>

      <h3 className={h3}>Panel memory</h3>
      <p className="text-muted">In free practice the panel keeps its disablements, settings and history when you close the app, as the real one does.</p>
      <button
        type="button" className={`${btn} mt-2 ${armed ? '!border-[#ff5a4d] !text-[#ff5a4d]' : ''}`}
        onClick={() => { if (armed) onForget(); else { setArmed(true); setTimeout(() => setArmed(false), 4000); } }}
      >
        {armed ? 'Tap again to clear the memory' : '↺ Clear panel memory and lesson ticks'}
      </button>

      <p className="mt-5 border-t border-line pt-3 text-[11.5px] text-muted">
        Developed by ETO. Unofficial training aid based on the Salwico Cargo User Guide (5100332-01A01). Not affiliated with or endorsed by Consilium. Always follow the manual on board and your company SMS.
      </p>
    </div>
  );
}
