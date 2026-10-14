// The front of the Control Panel M 4.3: lamps, keys and the display.
// Colours and positions follow the real unit: a charcoal housing with the
// system indicators on the left, a grey operating area holding the main
// indicators, the display and the alarm keys, the arrow keys on a grey lobe top
// right with ESC and OK beside them, and the dark keypad below.
// Two arrangements of the same parts: 'wide' is the real faceplate; 'tall'
// stacks them for a phone held upright. Both are drawn at a fixed size and
// scaled to fit.
import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { Lcd } from './Lcd.jsx';
import { Chevron, Icon } from './icons.jsx';

const Ctx = createContext(null);
export const SIZES = { wide: [1000, 424], tall: [520, 836] };

function Key({ k, label, className = '', style, children }) {
  const { press, hl } = useContext(Ctx);
  return (
    <button
      type="button" tabIndex={-1} aria-label={label || k} data-key={k} style={style}
      onPointerDown={e => { e.preventDefault(); press(k); }}
      onMouseDown={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
      className={`key ${hl.has(k) ? 'key-hl' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

const round = 'flex items-center justify-center rounded-full';

function Led({ id, color = 'yellow', label, boxed }) {
  const { leds, hl } = useContext(Ctx);
  return (
    <div className={`flex items-center gap-[8px] rounded-[5px] pr-[4px] text-[11.5px] font-semibold leading-none text-[#f2f3f4] ${hl.has('led:' + id) ? 'led-hl' : ''}`}>
      <span className={`lamp lamp-dot lamp-${color} h-[10px] w-[10px] flex-none rounded-full`} data-state={leds[id] || 'off'}><i className="lit" /></span>
      <span className={`whitespace-nowrap ${boxed ? 'w-[74px] bg-[#a39a86] px-[5px] py-[3px] text-[11px]' : ''}`}>{label}</span>
    </div>
  );
}

function SysLeds({ row }) {
  const groups = [
    [['power', 'Power', 'green']],
    [['sysFault', 'System fault'], ['test', 'Test'], ['warning', 'Warning'], ['zone', 'Zone']],
    [['alarmDev', 'Alarm device'], ['delayOff', 'Alarm delay off']],
  ];
  if (row) {
    return (
      <div className="flex flex-wrap gap-x-[16px] gap-y-[9px]">
        {groups.flat().map(([id, label, color]) => <Led key={id} id={id} label={label} color={color} />)}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[20px]">
      {groups.map((g, i) => (
        <div key={i} className="flex flex-col gap-[11px]">
          {g.map(([id, label, color]) => <Led key={id} id={id} label={label} color={color} />)}
        </div>
      ))}
      <div className="flex flex-col gap-[3px]">
        {[1, 2, 3].map(n => <Led key={n} id={'custom' + n} label={`Shortcut ${n}`} boxed />)}
      </div>
      <div className="mt-[6px] flex items-center gap-[10px] text-[#f2f3f4]" title="USB memory socket">
        <Icon.usb className="h-[18px] w-[26px]" />
        <span className="h-[15px] w-[30px] rounded-[2px] bg-[#77797d]" />
      </div>
    </div>
  );
}

// FIRE, Pre-Alarm, Fault, Disablements, Shortcuts: a label on the grey area with its lamp key.
function Indicators({ gap = 10, fireH = 62, h = 46 }) {
  const { leds } = useContext(Ctx);
  const items = [
    ['fire', 'FIRE', 'red', Icon.sounder], ['prealarm', 'Pre-Alarm', 'orange', Icon.pre], ['fault', 'Fault', 'yellow', Icon.fault],
    ['dis', 'Disablements', 'yellow', Icon.dis], ['shortcuts', 'Shortcuts', 'orange', Icon.shortcut],
  ];
  return (
    <div className="flex flex-col" style={{ gap }}>
      {items.map(([k, label, color, I]) => {
        const big = k === 'fire';
        const d = (big ? fireH : h) - 8;
        return (
          <Key key={k} k={k} label={label} className="key-ind w-full rounded-[14px] pr-[3px] pl-[12px]">
            <span style={{ height: big ? fireH : h }} className="flex w-full items-center justify-between" data-state={leds[k] || 'off'}>
              <span className={big ? 'ind-fire text-[31px] font-extrabold tracking-[1px]' : 'text-[16px] font-semibold text-white'}>{label}</span>
              <span className={`lamp lamp-${color} ${round} border-[2.5px] border-[#1b1c1f] text-[#1b1c1f]`} style={{ height: d, width: d }} data-state={leds[k] || 'off'}>
                <i className="lit" />
                <I className="relative h-[62%] w-[62%]" />
              </span>
            </span>
          </Key>
        );
      })}
    </div>
  );
}

function Tabs() {
  return (
    <div className="flex gap-[6px]">
      {[['status', 'Status'], ['menu', 'Menu']].map(([k, label]) => (
        <Key key={k} k={k} label={label} className="key-tab h-[38px] w-[134px] justify-start gap-[10px] rounded-t-[16px] pl-[7px] text-[15px] font-semibold">
          <span className="h-[26px] w-[26px] rounded-full border-[2.5px] border-[#1b1c1f] bg-[#cf2420] shadow-[inset_0_-3px_4px_rgba(0,0,0,.3)]" />
          {label}
        </Key>
      ))}
    </div>
  );
}

function Display({ vm }) {
  const dim = 0.5 + vm.dimmer * 0.0625; // level 8 = full brightness
  return (
    <div className="rounded-[14px] border border-[#84878c] bg-[#c3c5c9] p-[9px] shadow-[inset_0_1px_3px_rgba(255,255,255,.5)]">
      <div className="overflow-hidden rounded-[4px] border border-[#55585d] bg-black" style={{ filter: `brightness(${dim})` }}><Lcd vm={vm} /></div>
    </div>
  );
}

function AlarmKeys() {
  const { leds } = useContext(Ctx);
  const cap = 'text-[10px] font-bold tracking-[0.4px] text-[#1b1c1f]';
  return (
    <div className="flex items-end justify-center gap-[30px]">
      <div className="flex flex-col items-center gap-[2px]">
        <span className={`${cap} flex items-center gap-[6px]`}>
          <span className="lamp lamp-dot lamp-red h-[8px] w-[8px] rounded-full" data-state={leds.multi}><i className="lit" /></span>MULTIPLE ALARMS
        </span>
        {/* the printed frame around the key shows where "multiple alarms" belongs */}
        <div className="flex h-[48px] w-[150px] items-center justify-center rounded-[5px] border-[2.5px] border-[#2c2e32]">
          <Key k="multi" label="Multiple alarms" className={`key-light ${round} h-[42px] w-[42px]`}><Icon.multi className="h-[26px] w-[26px]" /></Key>
        </div>
      </div>
      <div className="flex flex-col items-center gap-[2px]">
        <span className={cap}>RESET</span>
        <Key k="reset" label="Reset" className={`key-reset ${round} h-[48px] w-[48px]`}><Icon.reset className="h-[28px] w-[28px]" /></Key>
      </div>
      <div className="flex flex-col items-center gap-[2px]">
        <span className={cap}>MUTE</span>
        <Key k="mute" label="Mute" className={`key-mute ${round} h-[48px] w-[48px]`}><Icon.mute className="h-[28px] w-[28px]" /></Key>
      </div>
    </div>
  );
}

// The four arrows sit close together in a cross on a grey lobe; ESC is above
// right of them and OK below right, both on the dark housing.
function Nav() {
  const sq = `key-nav ${round} h-[44px] w-[44px]`;
  const arrow = (dir, left, top) => (
    <Key k={dir} label={dir + ' arrow'} className={`${sq} !absolute`} style={{ left, top }}><Chevron dir={dir} className="h-[26px] w-[26px]" /></Key>
  );
  return (
    <div className="relative h-[150px] w-[150px]">
      <div className="pad absolute top-[-3px] left-[-8px] h-[156px] w-[116px] rounded-[58px]" />
      {arrow('up', 28, 4)}{arrow('left', 2, 53)}{arrow('right', 54, 53)}{arrow('down', 28, 102)}
      <Key k="esc" label="Escape" className={`${sq} !absolute text-[12px] font-bold`} style={{ left: 104, top: 0 }}>ESC</Key>
      <Key k="ok" label="OK" className={`${sq} !absolute text-[14px] font-bold`} style={{ left: 104, top: 104 }}>OK</Key>
    </div>
  );
}

const LETTERS = ['', '', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];

function Keypad() {
  const sq = `key-pad ${round} h-[46px] w-[46px]`;
  const digit = n => (
    <Key key={n} k={String(n)} label={String(n)} className={`${sq} flex-col leading-none`}>
      <span className="text-[19px] font-bold">{n}</span>
      {LETTERS[n] && <span className="text-[7.5px] font-semibold tracking-[0.3px] opacity-80">{LETTERS[n]}</span>}
    </Key>
  );
  return (
    <div className="flex flex-col items-center gap-[10px]">
      <div className="grid grid-cols-3 gap-[4px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit)}
        <Key k="erase" label="Erase" className={sq}><Icon.erase className="h-[26px] w-[26px]" /></Key>
        {digit(0)}
        <Key k="enter" label="Enter" className={sq}><Icon.enter className="h-[26px] w-[26px]" /></Key>
      </div>
      <div className="flex items-center">
        <Key k="night" label="Night mode, dimmer down" className={`key-pad ${round} h-[34px] w-[34px]`}><Icon.moon className="h-[20px] w-[20px]" /></Key>
        <span className="h-[2px] w-[22px] bg-[#8d8f93]" />
        <Key k="day" label="Day mode, dimmer up" className={`key-pad ${round} h-[34px] w-[34px]`}><Icon.sun className="h-[22px] w-[22px]" /></Key>
      </div>
    </div>
  );
}

const at = (left, top, width, height) => ({ position: 'absolute', left, top, width, height });

function Wide({ vm }) {
  return (
    <>
      <div className="pad rounded-[26px]" style={at(126, 44, 714, 372)} />
      <div style={at(18, 16, 104)}><SysLeds /></div>
      <div style={at(138, 58, 182)}><Indicators /></div>
      <div style={at(560, 8)}><Tabs /></div>
      <div style={at(334, 54)}><Display vm={vm} /></div>
      <div style={at(334, 349, 500)}><AlarmKeys /></div>
      <div style={at(846, 8)}><Nav /></div>
      <div style={at(846, 170)}><Keypad /></div>
    </>
  );
}

function Tall({ vm }) {
  return (
    <>
      <div className="pad rounded-[22px]" style={at(5, 98, 510, 464)} />
      <div className="pad rounded-b-[22px] !shadow-none" style={{ ...at(5, 540, 348, 291), background: '#9b9ea3' }} />
      <div style={at(16, 14, 490)}><SysLeds row /></div>
      <div style={at(238, 62)}><Tabs /></div>
      <div style={at(10, 106)}><Display vm={vm} /></div>
      <div style={at(8, 430, 340)}><AlarmKeys /></div>
      <div style={at(364, 406)}><Nav /></div>
      <div style={at(16, 572, 326)}><Indicators gap={7} fireH={54} h={38} /></div>
      <div style={at(362, 574)}><Keypad /></div>
    </>
  );
}

/** Scales its fixed-size child to the largest size that fits the box around it. */
function useFit(w, h) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    const fit = () => setScale(Math.max(0.1, Math.min(el.clientWidth / w, el.clientHeight / h)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);
  return [ref, scale];
}

export function Faceplate({ layout, vm, leds, hl, press }) {
  const [w, h] = SIZES[layout];
  const [ref, scale] = useFit(w, h);
  const dim = 0.6 + vm.dimmer * 0.05;
  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div style={{ width: w * scale, height: h * scale, visibility: scale ? 'visible' : 'hidden' }}>
        <div className="plate relative origin-top-left" style={{ width: w, height: h, transform: `scale(${scale})`, '--lamp-dim': dim }}>
          <Ctx.Provider value={{ press, hl, leds }}>
            {layout === 'wide' ? <Wide vm={vm} /> : <Tall vm={vm} />}
          </Ctx.Provider>
        </div>
      </div>
    </div>
  );
}
