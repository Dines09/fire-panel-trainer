// The front of the Control Panel M 4.3: lamps, keys and the display.
// Two arrangements of the same parts: 'wide' follows the real faceplate
// (indicators left, display in the middle, keys right); 'tall' stacks them for
// a phone held upright. Both are drawn at a fixed size and scaled to fit.
import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { Lcd } from './Lcd.jsx';
import { Chevron, Icon } from './icons.jsx';

const Ctx = createContext(null);
export const SIZES = { wide: [1000, 424], tall: [520, 836] };

function Key({ k, label, className = '', children }) {
  const { press, hl } = useContext(Ctx);
  return (
    <button
      type="button" tabIndex={-1} aria-label={label || k} data-key={k}
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

function Led({ id, color = 'yellow', label }) {
  const { leds, hl } = useContext(Ctx);
  return (
    <div className={`flex items-center gap-[7px] rounded-[5px] pr-[4px] text-[11.5px] font-semibold leading-none text-[#22262b] ${hl.has('led:' + id) ? 'led-hl' : ''}`}>
      <span className={`lamp lamp-${color} h-[11px] w-[11px] flex-none rounded-full`} data-state={leds[id] || 'off'}><i className="lit" /></span>
      <span className="whitespace-nowrap">{label}</span>
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
        <div key={i} className="flex flex-col gap-[10px]">
          {g.map(([id, label, color]) => <Led key={id} id={id} label={label} color={color} />)}
        </div>
      ))}
      <div className="flex flex-col gap-[10px]">
        {[1, 2, 3].map(n => <Led key={n} id={'custom' + n} label={`Custom LED ${n}`} />)}
      </div>
      <div className="mt-[8px] flex items-center gap-[8px] text-[#22262b]" title="USB memory socket">
        <Icon.usb className="h-[18px] w-[26px]" />
        <span className="h-[13px] w-[30px] rounded-[2px] border-2 border-[#22262b] bg-[#cfd3d7]" />
      </div>
    </div>
  );
}

// FIRE, Pre-Alarm, Fault, Disablements, Shortcuts: each is a lamp and a key.
function Indicators({ gap = 9, fireH = 64, h = 46 }) {
  const { leds } = useContext(Ctx);
  const items = [
    ['fire', 'FIRE', 'red', Icon.sounder], ['prealarm', 'Pre-Alarm', 'orange', Icon.pre], ['fault', 'Fault', 'yellow', Icon.fault],
    ['dis', 'Disablements', 'yellow', Icon.dis], ['shortcuts', 'Shortcuts', 'orange', Icon.shortcut],
  ];
  return (
    <div className="flex flex-col" style={{ gap }}>
      {items.map(([k, label, color, I]) => {
        const big = k === 'fire';
        return (
          <Key key={k} k={k} label={label} className="ind w-full justify-between rounded-[14px] pl-[14px] pr-[5px]">
            <span style={{ height: big ? fireH : h }} className="flex w-full items-center justify-between" data-state={leds[k] || 'off'}>
              <span className={big ? 'ind-fire text-[30px] font-extrabold tracking-[1px]' : 'text-[16px] font-semibold'}>{label}</span>
              <span className={`lamp lamp-${color} ${round} border-2 border-[#22262b] text-[#22262b]`} style={{ height: (big ? fireH : h) - 10, width: (big ? fireH : h) - 10 }} data-state={leds[k] || 'off'}>
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
    <div className="flex gap-[8px]">
      {[['status', 'Status'], ['menu', 'Menu']].map(([k, label]) => (
        <Key key={k} k={k} label={label} className="h-[36px] w-[132px] justify-start gap-[10px] rounded-t-[14px] rounded-b-[4px] pl-[8px] text-[15px] font-semibold">
          <span className="h-[20px] w-[30px] rounded-full border-2 border-[#22262b] bg-[#dfe2e5]" />
          {label}
        </Key>
      ))}
    </div>
  );
}

function Display({ vm }) {
  const dim = 0.5 + vm.dimmer * 0.0625; // level 8 = full brightness
  return (
    <div className="rounded-[12px] bg-[#16191d] p-[12px] shadow-[inset_0_2px_6px_rgba(0,0,0,.8)]">
      <div className="overflow-hidden rounded-[3px]" style={{ filter: `brightness(${dim})` }}><Lcd vm={vm} /></div>
    </div>
  );
}

function AlarmKeys() {
  const { leds } = useContext(Ctx);
  const item = (k, label, I, extra = '') => (
    <div className="flex flex-col items-center gap-[4px]">
      <span className="text-[10.5px] font-bold tracking-[0.4px] text-[#22262b]">{label}</span>
      <Key k={k} label={label} className={`${round} h-[50px] w-[50px] ${extra}`}><I className="h-[28px] w-[28px]" /></Key>
    </div>
  );
  return (
    <div className="flex items-start justify-center gap-[34px]">
      <div className="flex flex-col items-center gap-[4px]">
        <span className="flex items-center gap-[6px] text-[10.5px] font-bold tracking-[0.4px] text-[#22262b]">
          <span className="lamp lamp-red h-[9px] w-[9px] rounded-full" data-state={leds.multi}><i className="lit" /></span>MULTIPLE ALARMS
        </span>
        <Key k="multi" label="Multiple alarms" className={`${round} h-[50px] w-[104px]`}><Icon.multi className="h-[28px] w-[28px]" /></Key>
      </div>
      {item('reset', 'RESET', Icon.reset, 'key-green')}
      {item('mute', 'MUTE', Icon.mute, 'key-red')}
    </div>
  );
}

// ESC top right, OK bottom right, arrows in a cross - as on the panel.
function Nav() {
  const sq = `${round} h-[46px] w-[46px]`;
  const arrow = dir => <Key k={dir} label={dir + ' arrow'} className={sq}><Chevron dir={dir} className="h-[26px] w-[26px]" /></Key>;
  return (
    <div className="grid grid-cols-3 gap-[4px]">
      <span />{arrow('up')}<Key k="esc" label="Escape" className={`${sq} text-[12px] font-bold`}>ESC</Key>
      {arrow('left')}<span />{arrow('right')}
      <span />{arrow('down')}<Key k="ok" label="OK" className={`${sq} text-[14px] font-bold`}>OK</Key>
    </div>
  );
}

const LETTERS = ['', '', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];

function Keypad() {
  const sq = `${round} h-[46px] w-[46px]`;
  const digit = n => (
    <Key key={n} k={String(n)} label={String(n)} className={`${sq} flex-col leading-none`}>
      <span className="text-[19px] font-bold">{n}</span>
      {LETTERS[n] && <span className="text-[7.5px] font-semibold tracking-[0.3px]">{LETTERS[n]}</span>}
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
        <Key k="night" label="Night mode, dimmer down" className={`${round} h-[34px] w-[34px]`}><Icon.moon className="h-[20px] w-[20px]" /></Key>
        <span className="h-[2px] w-[22px] bg-[#22262b]" />
        <Key k="day" label="Day mode, dimmer up" className={`${round} h-[34px] w-[34px]`}><Icon.sun className="h-[22px] w-[22px]" /></Key>
      </div>
    </div>
  );
}

const at = (left, top, width) => ({ position: 'absolute', left, top, width });

function Wide({ vm }) {
  return (
    <>
      <div style={at(16, 18, 106)}><SysLeds /></div>
      <div style={at(128, 44, 188)}><Indicators /></div>
      <div style={at(552, 8)}><Tabs /></div>
      <div style={at(326, 46)}><Display vm={vm} /></div>
      <div style={at(326, 350, 504)}><AlarmKeys /></div>
      <div style={at(842, 10)}><Nav /></div>
      <div style={at(842, 168)}><Keypad /></div>
    </>
  );
}

function Tall({ vm }) {
  return (
    <>
      <div style={at(16, 14, 490)}><SysLeds row /></div>
      <div style={at(240, 62)}><Tabs /></div>
      <div style={at(8, 100)}><Display vm={vm} /></div>
      <div style={at(8, 440, 340)}><AlarmKeys /></div>
      <div style={at(360, 408)}><Nav /></div>
      <div style={at(12, 568, 330)}><Indicators gap={7} fireH={54} h={38} /></div>
      <div style={at(360, 568)}><Keypad /></div>
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
