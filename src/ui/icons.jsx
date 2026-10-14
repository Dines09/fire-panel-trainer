// Line symbols for the keys and the display. All drawn on a 24 x 24 grid.
const S = ({ children, className = '', fill = 'none', sw = 2 }) => (
  <svg viewBox="0 0 24 24" className={className} fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Chevron = ({ dir, className }) => (
  <S className={className} sw={2.6}>
    <path d="M6 15l6-6 6 6" transform={`rotate(${{ up: 0, right: 90, down: 180, left: 270 }[dir]} 12 12)`} />
  </S>
);

export const Icon = {
  // fire alarm key: a sounder with sound waves
  sounder: p => <S {...p}><path d="M4 10v4h3l4 3V7l-4 3z" fill="currentColor" stroke="none" /><path d="M14.5 9.5a3.5 3.5 0 010 5M17 7a7 7 0 010 10" /></S>,
  pre: p => <S {...p}><path d="M12 5l8 14H4z" /><path d="M12 10v4" /><circle cx="12" cy="16.6" r=".6" fill="currentColor" /></S>,
  fault: p => <S {...p} sw={2.6}><path d="M12 5v9" /><circle cx="12" cy="18.5" r=".9" fill="currentColor" /></S>,
  dis: p => <S {...p}><circle cx="12" cy="12" r="7.5" /><path d="M6.8 6.8l10.4 10.4" /></S>,
  shortcut: p => <S {...p}><path d="M7 17L17 7M9.5 7H17v7.5" /></S>,
  multi: p => <S {...p} sw={2.2}><path d="M5 7l6 5-6 5zM12.5 7l6 5-6 5z" /></S>,
  reset: p => <S {...p} sw={2.2}><path d="M18.5 9A7 7 0 006 8.5M5.5 15A7 7 0 0018 15.5" /><path d="M6 4.5v4h4M18 19.5v-4h-4" /></S>,
  mute: p => <S {...p}><path d="M12 4.5a5 5 0 00-5 5V14l-1.8 2.6h13.6L17 14V9.5a5 5 0 00-5-5zM10.3 19a1.8 1.8 0 003.4 0" /><path d="M4 4l16 16" strokeWidth="2.4" /></S>,
  erase: p => <S {...p} sw={2.2}><path d="M19 12H6M10.5 7L5.5 12l5 5" /></S>,
  enter: p => <S {...p} sw={2.2}><path d="M18.5 6v6.5h-12M10.5 8.5l-4 4 4 4" /></S>,
  moon: p => <S {...p}><path d="M15.5 4.5a7.5 7.5 0 104 13 6.5 6.5 0 01-4-13z" /></S>,
  sun: p => <S {...p}><circle cx="12" cy="12" r="3.4" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" /></S>,
  usb: p => <S {...p} sw={1.6}><path d="M3 12h15M15 9.5l3 2.5-3 2.5M7 12l3-4h3M9 12l3 4h2.5" /><circle cx="14" cy="8" r="1" fill="currentColor" /><rect x="14.5" y="15" width="2" height="2" fill="currentColor" /></S>,
  power: p => <S {...p} sw={2.2}><path d="M12 4v7M7.5 6.8a6.5 6.5 0 109 0" /></S>,
};

// Row symbols on the display.
export function RowIcon({ kind }) {
  const cls = 'h-[22px] w-[22px]';
  switch (kind) {
    case 'fire':
    case 'firemuted':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M12.5 2.5c.6 3.4-2.9 5-3.6 8.3-1.3-.9-1.7-2.1-1.6-3.5C5.2 9.3 4 11.7 4 14.3 4 18.6 7.6 21.5 12 21.5s8-2.9 8-7.2c0-5.3-4.3-7-7.5-11.8z" fill="#d81e1e" />
          <path d="M12 12.5c.3 1.9-1.9 2.7-1.9 4.7 0 1.2.9 2.1 1.9 2.1s2-.9 2-2.1c0-2-1.4-2.7-2-4.7z" fill="#ffd9a0" />
          {kind === 'firemuted' && <path d="M3 3l18 18" stroke="#111" strokeWidth="2.4" strokeLinecap="round" />}
        </svg>
      );
    case 'fault':
    case 'warn':
      return (
        <svg viewBox="0 0 24 24" className={cls} aria-hidden="true">
          <path d="M12 3v11" stroke={kind === 'fault' ? '#e3b400' : '#e08a00'} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="12" cy="19.5" r="2.3" fill={kind === 'fault' ? '#e3b400' : '#e08a00'} />
        </svg>
      );
    case 'pre':
      return <svg viewBox="0 0 24 24" className={cls} aria-hidden="true"><path d="M12 3l10 17.5H2z" fill="#f08a1c" /><path d="M12 9.5v5.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /><circle cx="12" cy="17.6" r="1.2" fill="#fff" /></svg>;
    case 'dis':
      return <svg viewBox="0 0 24 24" className={cls} aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="#d9a400" strokeWidth="3" /><path d="M6 6l12 12" stroke="#d9a400" strokeWidth="3" /></svg>;
    case 'test':
      return <svg viewBox="0 0 24 24" className={cls} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="#d9a400" /><path d="M7 9.5h4M9 9.5v6M14 9.5h3.5M14 12.5h3M14 15.5h3.5M14 9.5v6" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>;
    case 'zone':
      return <svg viewBox="0 0 24 24" className={cls} aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="#5b6672" strokeWidth="2.2" /><circle cx="12" cy="12" r="2.6" fill="#5b6672" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" className={cls} aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="#5b6672" /><path d="M12 11v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="7.5" r="1.3" fill="#fff" /></svg>;
  }
}
