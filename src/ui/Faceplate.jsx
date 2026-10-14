// The front of the Control Panel M 4.3, drawn after a photograph of the real
// unit. All positions are in the photo's pixels (1220 x 630 around the panel),
// so every key, lamp and print sits where it does on the panel. The drawing
// is scaled to fit the screen; the display inside is the real 480 x 272 view,
// shrunk to the size of the glass (394 x 223).
import { createContext, memo, useContext, useLayoutEffect, useRef, useState } from 'react';
import { Lcd } from './Lcd.jsx';
import { Chevron, Icon } from './icons.jsx';

const Ctx = createContext(null);
export const W = 1220, H = 630;
const LCD = { x: 525, y: 152, w: 394 }; // the glass of the display

/** A key: an invisible touch area (box) with the visible knob inside it. */
function Key({ k, label, box, className = '', children }) {
  const { press, hl } = useContext(Ctx);
  const [x, y, w, h] = box;
  return (
    <button
      type="button" tabIndex={-1} aria-label={label || k} data-key={k}
      style={{ left: x, top: y, width: w, height: h }}
      onPointerDown={e => { e.preventDefault(); press(k); }}
      onMouseDown={e => e.preventDefault()}
      onContextMenu={e => e.preventDefault()}
      className={`hit ${hl.has(k) ? 'is-hl' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

// a key centred on (cx, cy), w x h; the touch area is a little larger than the knob
const K = (k, label, cx, cy, w, h, knob, children, pad = 6) => (
  <Key key={k} k={k} label={label} box={[cx - w / 2 - pad, cy - h / 2 - pad, w + 2 * pad, h + 2 * pad]}>
    <span className={`knob ${knob}`} style={{ width: w, height: h }}>{children}</span>
  </Key>
);

// Symbols printed on the keys, as on the panel: each sits inside a printed ring.
const round = (children, sw = 5) => (
  <svg viewBox="0 0 100 100" className="face" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="50" cy="50" r="36" strokeWidth="4.5" />
    {children}
  </svg>
);
const FACE = {
  fire: round(<><circle cx="37" cy="50" r="5.5" fill="currentColor" stroke="none" /><path d="M44.7 40.8a12 12 0 0 1 0 18.4M49.9 34.7a20 20 0 0 1 0 30.6M55 28.5a28 28 0 0 1 0 43" /></>, 5.5),
  prealarm: round(<path d="M50 29L71 65H29Z" strokeWidth="6" />),
  fault: round(<><path d="M50 29V54" strokeWidth="9" /><circle cx="50" cy="68" r="5.5" fill="currentColor" stroke="none" /></>),
  dis: round(<path d="M27 55H41L61 37M60 55H73" strokeWidth="6.5" />),
  shortcuts: round(<path d="M33 67L64 36M45 35H65V55" strokeWidth="6.5" />),
};
// the three alarm keys are rounded oblongs, the symbol inside an oval ring
const oval = (stroke, children) => (
  <svg viewBox="0 0 120 96" className="face" aria-hidden="true">
    <ellipse cx="60" cy="48" rx="41" ry="33" fill="none" stroke={stroke} strokeWidth="6" />
    {children}
  </svg>
);
const MULTI = oval('#46545a', <path d="M37 32L58 48L37 64ZM60 32L81 48L60 64Z" fill="#46545a" />);
const RESET = oval('#1c8a42', (
  <g fill="none" stroke="#1c8a42" strokeWidth="7" strokeLinecap="round">
    <path d="M37 44C42 32 68 28 79 38" /><path d="M83 52C78 64 52 68 41 58" />
    <path d="M71 29L82 39L68 43Z" fill="#1c8a42" strokeWidth="3" strokeLinejoin="round" />
    <path d="M49 67L38 57L52 53Z" fill="#1c8a42" strokeWidth="3" strokeLinejoin="round" />
  </g>
));
const MUTE = oval('#c8482f', (
  <g fill="none" stroke="#c8482f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M49 38a11 11 0 0 1 22 0v10l5 8H44l5-8z" /><path d="M56 61a4 4 0 0 0 8 0" /><path d="M58 24v3" />
    <path d="M37 70L83 26" strokeWidth="6" />
  </g>
));

function Led({ id, cx, cy, color = 'yellow' }) {
  const { leds, hl } = useContext(Ctx);
  return (
    <span className={`led lamp lamp-${color} ${hl.has('led:' + id) ? 'led-hl' : ''}`} style={{ left: cx - 5, top: cy - 5 }} data-state={leds[id] || 'off'}>
      <i className="lit" />
    </span>
  );
}

// The slate operating area is one moulded shape: a rounded rectangle whose top
// edge runs on into a lobe round the arrow keys, with a thin arm out to OK.
const SLATE = 'M265 111H1026C1067 111 1095 146 1095 186C1095 227 1067 261 1026 261H993Q975 261 975 279V503Q975 521 957 521H265Q247 521 247 503V129Q247 111 265 111Z';

// Everything printed or moulded: frame, screws, the slate and grey areas, labels.
// It never changes, so it is drawn once.
const Print = memo(function Print() {
  const screw = (cx, cy) => (
    <g key={`${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r="15" fill="url(#screwRing)" stroke="#0c0c0d" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="9.5" fill="url(#screwHead)" stroke="#111" strokeWidth="1" />
      <path d={`M${cx - 4} ${cy - 2.3}l4 -2.3l4 2.3v4.6l-4 2.3l-4 -2.3z`} fill="#121213" />
    </g>
  );
  const ledText = (y, t, bold) => <text x="130" y={y + 5.5} className={bold ? 'pt-led b' : 'pt-led'}>{t}</text>;
  const slot = y => (
    <g key={y}>
      <rect x="127" y={y} width="112" height="19" rx="2" fill="#3b3536" />
      <rect x="232" y={y} width="7" height="19" rx="1.5" fill="#5e5859" />
    </g>
  );
  const pill = (y, h) => <rect key={y} x="256" y={y} width="186" height={h} rx={h > 40 ? 15 : 12} fill="rgba(0,0,0,.05)" stroke="#26333a" strokeWidth="2.5" />;
  return (
    <svg className="print" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <defs>
        <linearGradient id="frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3b3d" /><stop offset=".06" stopColor="#2c2c2e" /><stop offset=".94" stopColor="#262627" /><stop offset="1" stopColor="#1a1a1b" />
        </linearGradient>
        <linearGradient id="bevel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1b1d" /><stop offset="1" stopColor="#2a292b" />
        </linearGradient>
        <linearGradient id="slate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#55686e" /><stop offset="1" stopColor="#5c6f75" />
        </linearGradient>
        <linearGradient id="grey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d0d2d1" /><stop offset="1" stopColor="#c4c6c4" />
        </linearGradient>
        <radialGradient id="screwRing" cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#4a4a4d" /><stop offset="1" stopColor="#202022" /></radialGradient>
        <radialGradient id="screwHead" cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#5b5b5f" /><stop offset="1" stopColor="#262628" /></radialGradient>
        <linearGradient id="badge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3c" /><stop offset=".42" stopColor="#0c0c0d" /><stop offset="1" stopColor="#050505" />
        </linearGradient>
        <linearGradient id="usb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4f4f4" /><stop offset="1" stopColor="#b9b9b9" /></linearGradient>
        {/* the fine matte grain of the printed membrane: grey noise, kept inside the shape */}
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 -1.3 1.05" result="g" />
          <feComposite in="g" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>

      {/* moulded frame, with a recessed black face inside */}
      <rect x="9" y="10" width="1200" height="605" rx="13" fill="url(#frame)" stroke="#0b0b0c" strokeWidth="2" />
      <rect x="22" y="22" width="1174" height="581" rx="9" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="2" />
      <rect x="60" y="52" width="1100" height="522" rx="6" fill="url(#bevel)" />
      <rect x="67" y="60" width="1086" height="506" rx="4" fill="#151213" stroke="#0a0909" strokeWidth="2" />
      <rect x="67" y="60" width="1086" height="506" rx="4" fill="#000" filter="url(#grain)" opacity=".14" />
      {[[38, 76], [1180, 83], [37, 538], [1180, 538]].map(([x, y]) => screw(x, y))}

      {/* system indicators */}
      {ledText(88, 'Power')}
      {ledText(145, 'System fault', true)}{ledText(170, 'Test', true)}{ledText(195, 'Warning', true)}{ledText(220, 'Zone', true)}
      {ledText(270, 'Alarm device')}{ledText(295, 'Alarm delay off')}
      <path d="M118 346v86M114 346h4M114 432h4" stroke="#3a3536" strokeWidth="2" fill="none" />
      {[357, 382, 408].map(slot)}
      <g stroke="#d9d9d9" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M86 500h24M95 500l5-6h5M98 500l5 5h4" /><path d="M108 496l5 4-5 4z" fill="#d9d9d9" />
        <circle cx="85" cy="500" r="2.6" fill="#d9d9d9" /><circle cx="106" cy="494" r="1.8" fill="#d9d9d9" />
        <rect x="106" y="503.5" width="3.4" height="3.4" fill="#d9d9d9" />
      </g>
      <rect x="139" y="485" width="58" height="31" rx="3" fill="url(#usb)" stroke="#777" />
      <rect x="146" y="492" width="44" height="17" rx="1.5" fill="#101010" />
      <rect x="150" y="496" width="36" height="5" fill="#f0f0f0" />

      <text x="259" y="100" className="pt-title">Fire Detection System</text>
      <circle cx="988" cy="81" r="3.5" fill="#3c2c26" />

      {/* Status / Menu tabs, then the slate area in one piece, with its arm out to OK */}
      <rect x="690" y="77" width="122" height="44" rx="11" fill="#3e464d" />
      <rect x="822" y="77" width="124" height="44" rx="11" fill="#3e464d" />
      <path d="M1068 222L1110 252" stroke="#55686e" strokeWidth="15" strokeLinecap="round" />
      <path d={SLATE} fill="url(#slate)" />
      <path d={SLATE} fill="#000" filter="url(#grain)" opacity=".4" />
      <path d="M1068 222L1110 252" stroke="#000" strokeWidth="15" strokeLinecap="round" filter="url(#grain)" opacity=".4" />

      {/* main indicators: printed outlines, the keys sit on their right ends */}
      {pill(146, 58)}{pill(233, 37)}{pill(289, 37)}{pill(345, 37)}{pill(402, 37)}

      {/* light grey surround of the display, the glass, and the alarm keys' print */}
      <rect x="482" y="135" width="479" height="369" rx="13" fill="url(#grey)" stroke="#a9acab" strokeWidth="1.5" />
      <rect x="482" y="135" width="479" height="369" rx="13" fill="#000" filter="url(#grain)" opacity=".3" />
      <rect x="520" y="147" width="404" height="233" rx="3" fill="#2b2a2c" />
      <text x="666" y="412" className="pt-small">MULTIPLE ALARMS</text>
      <text x="800" y="412" className="pt-small">RESET</text>
      <text x="891" y="412" className="pt-small">MUTE</text>
      <path d="M632 461H600V425H732V461H700" fill="none" stroke="#56686e" strokeWidth="5" strokeLinejoin="round" />

      {/* dimmer keys are joined by a short double line */}
      <path d="M1054 525h15M1054 533h15" stroke="#3a393d" strokeWidth="2" />

      {/* maker's badge: white lettering on black */}
      <rect x="543" y="538" width="122" height="24" rx="4" fill="url(#badge)" stroke="#000" strokeWidth="1.5" />
      <rect x="546" y="540" width="116" height="7" rx="3" fill="rgba(255,255,255,.12)" />
      <g fill="none" stroke="#fff" strokeWidth="1.6">
        <path d="M563 545a8 8 0 1 0 0 11" /><path d="M564 548a5 5 0 1 0 0 6" /><path d="M565 551h3" />
      </g>
      <text x="610" y="556" className="pt-badge">Consilium</text>
    </svg>
  );
});

const LETTERS = ['', '_', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];

function Keys() {
  const { leds } = useContext(Ctx);
  // FIRE, Pre-Alarm, Fault, Disablements, Shortcuts: the whole printed outline is the key
  const ind = (k, label, y, h, color) => {
    const big = k === 'fire', d = big ? 58 : 40;
    return (
      <Key key={k} k={k} label={label} box={[254, y - 2, 210, h + 4]} className="ind">
        <span className={big ? 'ind-label ind-fire' : 'ind-label'} data-state={leds[k] || 'off'} style={{ left: big ? 24 : 20, fontSize: big ? 35 : 19 }}>{label}</span>
        <span className={`knob lamp lamp-${color} ${big ? 'knob-white' : 'knob-grey'}`} data-state={leds[k] || 'off'} style={{ width: d, height: d, left: 178 - d / 2, top: (h + 4) / 2 - d / 2 }}>
          <i className="lit" />
          {FACE[k]}
        </span>
      </Key>
    );
  };
  const tab = (k, label, x, w) => (
    <Key key={k} k={k} label={label} box={[x, 77, w, 36]} className="tab">
      <span className="knob knob-oval" style={{ width: 46, height: 33, left: 2, top: 2 }}><i /></span>
      <span className="tab-label">{label}</span>
    </Key>
  );
  const digit = (n, cx, cy) => K(String(n), String(n), cx, cy, 44, 44, 'knob-black flex-col', (
    <>
      <span className="text-[22px] leading-[20px] font-bold">{n}</span>
      {LETTERS[n] && <span className="text-[8px] leading-[9px] font-bold tracking-[0.3px]">{LETTERS[n]}</span>}
    </>
  ), 3);
  const arrow = (dir, cx, cy) => K(dir, dir + ' arrow', cx, cy, 44, 44, 'knob-nav', <Chevron dir={dir} className="h-[32px] w-[32px] chevron" />, 3);
  const cols = [1009, 1061, 1113], rows = [320, 371, 423, 478];
  return (
    <>
      {ind('fire', 'FIRE', 146, 58, 'red')}
      {ind('prealarm', 'Pre-Alarm', 233, 37, 'orange')}
      {ind('fault', 'Fault', 289, 37, 'yellow')}
      {ind('dis', 'Disablements', 345, 37, 'yellow')}
      {ind('shortcuts', 'Shortcuts', 402, 37, 'orange')}
      {tab('status', 'Status', 690, 122)}
      {tab('menu', 'Menu', 822, 124)}

      {K('multi', 'Multiple alarms', 666, 462, 62, 50, 'knob-white knob-pill', MULTI)}
      {K('reset', 'Reset', 800, 460, 62, 50, 'knob-white knob-pill', RESET)}
      {K('mute', 'Mute', 891, 460, 62, 50, 'knob-white knob-pill', MUTE)}

      {arrow('up', 1028, 147)}{arrow('left', 988, 188)}{arrow('right', 1066, 188)}{arrow('down', 1027, 229)}
      {K('esc', 'Escape', 1112, 123, 46, 46, 'knob-nav text-[15px] font-bold', 'ESC')}
      {K('ok', 'OK', 1110, 252, 46, 46, 'knob-nav text-[16px] font-bold', 'OK')}

      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => digit(n, cols[(n - 1) % 3], rows[Math.floor((n - 1) / 3)]))}
      {K('erase', 'Erase', cols[0], rows[3], 44, 44, 'knob-black', <Icon.erase className="h-[28px] w-[28px]" />, 3)}
      {digit(0, cols[1], rows[3])}
      {K('enter', 'Enter', cols[2], rows[3], 44, 44, 'knob-black', <Icon.enter className="h-[28px] w-[28px]" />, 3)}
      {K('night', 'Night mode, dimmer down', 1036, 529, 36, 36, 'knob-black', <Icon.moon className="h-[20px] w-[20px]" />, 4)}
      {K('day', 'Day mode, dimmer up', 1087, 529, 36, 36, 'knob-black', <Icon.sun className="h-[22px] w-[22px]" />, 4)}
    </>
  );
}

function Leds() {
  return (
    <>
      <Led id="power" cx={103} cy={93} color="green" />
      {[['sysFault', 150], ['test', 175], ['warning', 200], ['zone', 225], ['alarmDev', 275], ['delayOff', 300]].map(([id, y]) => <Led key={id} id={id} cx={103} cy={y} />)}
      {[366, 391, 417].map((y, i) => <Led key={y} id={'custom' + (i + 1)} cx={101} cy={y} />)}
      <Led id="multi" cx={600} cy={407} color="red" />
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

export function Faceplate({ vm, leds, hl, press, onDisplay }) {
  const [ref, scale] = useFit(W, H);
  const dim = 0.6 + vm.dimmer * 0.05;
  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div style={{ width: W * scale, height: H * scale, visibility: scale ? 'visible' : 'hidden' }}>
        <div className="plate relative origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})`, '--lamp-dim': dim }}>
          <Ctx.Provider value={{ press, hl, leds }}>
            <Print />
            {/* the display: tap it to see it big */}
            <div className="absolute cursor-zoom-in overflow-hidden" style={{ left: LCD.x, top: LCD.y, width: LCD.w, height: LCD.w * 272 / 480 }} onClick={onDisplay} title="Tap to enlarge the display">
              <div className="origin-top-left" style={{ transform: `scale(${LCD.w / 480})`, filter: `brightness(${0.5 + vm.dimmer * 0.0625})` }}><Lcd vm={vm} /></div>
            </div>
            <Leds />
            <Keys />
          </Ctx.Provider>
        </div>
      </div>
    </div>
  );
}

/** The display on its own, as large as the screen allows (for reading on a phone). */
export function BigDisplay({ vm, onClose }) {
  const [ref, scale] = useFit(480, 272);
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black/80 p-3" onPointerDown={onClose}>
      <div ref={ref} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div style={{ width: 480 * scale, height: 272 * scale }}>
          <div className="origin-top-left overflow-hidden rounded-[4px] border-[6px] border-[#2b2a2c]" style={{ width: 492, height: 284, transform: `scale(${scale * 480 / 492})` }}>
            <div style={{ filter: `brightness(${0.5 + vm.dimmer * 0.0625})` }}><Lcd vm={vm} /></div>
          </div>
        </div>
      </div>
      <div className="flex-none text-[12px] text-[#c9d2d8]">Tap anywhere to go back to the panel</div>
    </div>
  );
}
