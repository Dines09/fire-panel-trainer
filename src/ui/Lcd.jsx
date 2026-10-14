// The 4.3" display, drawn at its real 480 x 272 pixels from Panel.view().
// The faceplate scales it; nothing in here knows about the screen size.
import { RowIcon } from './icons.jsx';

const HEAD = {
  fire: 'bg-[#cf1b1b] text-white',
  fault: 'bg-[#f3c300] text-[#141414]',
  dis: 'bg-[#f3c300] text-[#141414]',
  pre: 'bg-[#f08a1c] text-[#141414]',
  plain: 'bg-[#f6f7f4] text-[#141414] border-b-2 border-[#141414]',
};
const LAMP = { red: '#e01515', green: '#12b53a', blue: '#1746e0', white: '#ffffff', black: '#050505' };

function Header({ vm }) {
  const tone = vm.tone || 'plain';
  return (
    <div className={`flex h-[36px] flex-none items-stretch ${HEAD[tone]}`}>
      <div className="flex min-w-0 flex-1 items-center truncate pl-[10px] text-[19px] font-bold tracking-[0.5px]">{vm.title}</div>
      <div className={`flex flex-none flex-col items-end justify-center pr-[8px] leading-none whitespace-nowrap ${tone === 'plain' ? '' : 'lcd-clock bg-[#f6f7f4] text-[#141414]'}`}>
        <span className="text-[14px] font-bold">{vm.clock}</span>
        <span className="mt-[2px] text-[9.5px]">{vm.date}</span>
      </div>
    </div>
  );
}

function Footer({ lines = [] }) {
  if (!lines.length) return null;
  return (
    <div className="flex-none border-t border-[#141414] px-[8px] py-[3px] text-[10.5px] leading-[13px] text-[#1c1c1c]">
      {lines.map((l, i) => <div key={i} className="truncate">{l}</div>)}
    </div>
  );
}

function Rows({ vm }) {
  if (!vm.rows.length) return <div className="flex flex-1 items-center justify-center text-[15px] text-[#444]">{vm.empty}</div>;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {vm.rows.map(r => (
        <div key={r.n} className={`flex h-1/3 min-h-0 overflow-hidden border-b border-[#c9ccc6] px-[6px] py-[3px] ${r.sel ? 'bg-[#1d2b4f] text-white' : ''}`}>
          <div className="w-[22px] flex-none text-[14px] font-bold leading-[18px]">{r.n}</div>
          <div className="flex w-[40px] flex-none flex-col items-center">
            <RowIcon kind={r.icon} />
            <span className="mt-[1px] text-[10px] leading-none">{r.time}</span>
          </div>
          <div className="min-w-0 flex-1 pl-[6px] leading-[16px]">
            <div className="lcd-clamp text-[13px] font-bold">{r.l1}</div>
            <div className="truncate text-[12.5px]">{r.l2}</div>
            <div className="truncate text-[12.5px]">{r.l3}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Menu({ vm }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-[10px] pt-[5px]">
      {vm.note && <div className="mb-[3px] truncate text-[11.5px] text-[#333]">{vm.note}</div>}
      {vm.items.map(it => (
        <div key={it.n} className={`flex h-[23px] flex-none items-center text-[15px] ${it.sel ? 'font-bold' : ''}`}>
          <span className="w-[18px] font-bold">{it.n}</span>
          <span className="w-[20px] text-[12px]">{it.sel ? '▶' : ''}</span>
          <span className="min-w-0 flex-1 truncate">{it.label}</span>
          {it.more && <span className="pl-[6px] text-[13px]">»</span>}
        </div>
      ))}
    </div>
  );
}

// A scrolling list to choose from, one line per entry.
function Pick({ vm }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-[8px] pt-[3px]">
      <div className="mb-[2px] px-[4px] text-[11.5px] text-[#333]">{vm.note}</div>
      {vm.rows.map(r => (
        <div key={r.n} className={`flex h-[26px] flex-none items-center px-[6px] text-[14px] ${r.sel ? 'bg-[#1d2b4f] font-bold text-white' : ''}`}>
          <span className="w-[18px] text-[11px]">{r.sel ? '▶' : ''}</span>
          <span className="w-[82px] flex-none font-bold">{r.label}</span>
          <span className="min-w-0 flex-1 truncate">{r.text}</span>
          <span className="pl-[6px] text-[11.5px]">{r.state}</span>
        </div>
      ))}
    </div>
  );
}

function Form({ vm }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-[7px] px-[14px]">
      {vm.fields.map(([label, value, active], i) => (
        <div key={i} className="flex items-center text-[14px]">
          <span className="w-[178px] flex-none">{label}</span>
          {active
            ? <span className="min-w-[70px] border-2 border-[#141414] bg-white px-[7px] py-[1px] text-[17px] font-bold tracking-[2px]">{value}<span className="lcd-cursor">▏</span></span>
            : <span className="min-w-0 truncate font-bold">{value}</span>}
        </div>
      ))}
      {vm.bar != null && (
        <div className="flex gap-[4px] pl-[178px]">
          {Array.from({ length: 9 }, (_, i) => <span key={i} className={`h-[14px] w-[16px] border border-[#141414] ${i < vm.bar ? 'bg-[#141414]' : ''}`} />)}
        </div>
      )}
      {vm.hint != null && <div className="h-[16px] truncate pl-[178px] text-[12px] text-[#333]">{vm.hint}</div>}
    </div>
  );
}

function Detail({ vm }) {
  return (
    <div className="min-h-0 flex-1 px-[12px] pt-[7px]">
      <div className="lcd-clamp mb-[5px] text-[14px] font-bold leading-[17px]">{vm.head}</div>
      {vm.lines.map(([label, value], i) => (
        <div key={i} className="flex text-[13px] leading-[19px]">
          <span className="w-[96px] flex-none text-[#333]">{label}</span>
          <span className="min-w-0 truncate">{value}</span>
        </div>
      ))}
    </div>
  );
}

function Status({ vm }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-[10px] pt-[6px]">
      {vm.groups.map(([name, counts], i) => (
        <div key={name} className={`flex h-[40px] flex-none items-center border-b border-[#c9ccc6] px-[6px] text-[14px] ${i === vm.sel ? 'bg-[#1d2b4f] text-white' : ''}`}>
          <span className="w-[150px] font-bold">{name}</span>
          {counts.map(([label, n]) => <span key={label} className="w-[140px]">{label}: <b>{n}</b></span>)}
        </div>
      ))}
      <div className="pt-[8px] pl-[6px] text-[12.5px] text-[#333]">{vm.note}</div>
    </div>
  );
}

function Home({ vm }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[6px] text-center">
      <div className="text-[11px] uppercase tracking-[3px] text-[#555]">Fire detection system</div>
      <div className="text-[23px] font-bold tracking-[1px]">{vm.name}</div>
      <div className={`mt-[6px] px-[12px] py-[3px] text-[13.5px] font-bold ${vm.normal ? 'text-[#0b6b2b]' : 'bg-[#f3c300] text-[#141414]'}`}>{vm.state}</div>
      <div className="text-[12px] text-[#333]">{vm.level}</div>
    </div>
  );
}

const POPUP = { err: 'border-[#cf1b1b]', ok: 'border-[#0b7d32]', info: 'border-[#141414]' };

export function Lcd({ vm }) {
  if (vm.kind === 'lamp') return <div className="h-[272px] w-[480px]" style={{ background: LAMP[vm.phase] }} />;
  const Body = { list: Rows, menu: Menu, pick: Pick, form: Form, detail: Detail, status: Status, home: Home }[vm.kind];
  return (
    <div className="lcd relative flex h-[272px] w-[480px] flex-col overflow-hidden bg-[#f6f7f4] text-[#141414]">
      <Header vm={vm} />
      {Body ? <Body vm={vm} /> : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[6px] px-[18px] text-center">
          {vm.lines.map((l, i) => <div key={i} className={i ? 'text-[13.5px]' : 'text-[16px] font-bold'}>{l}</div>)}
          {vm.choice && (
            <div className="mt-[10px] flex gap-[26px]">
              {vm.choice.map((c, i) => (
                <span key={c} className={`min-w-[112px] border-2 border-[#141414] px-[10px] py-[4px] text-[14px] font-bold ${i ? 'bg-[#1d2b4f] text-white' : 'bg-white'}`}>
                  <span className="mr-[8px] text-[10.5px] font-normal">{i ? 'OK' : 'ESC'}</span>{c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <Footer lines={vm.footer} />
      {vm.popup && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f6f7f4]/55">
          <div className={`max-w-[400px] whitespace-pre-line border-[3px] bg-white px-[18px] py-[11px] text-center text-[14.5px] font-bold leading-[20px] shadow-[3px_3px_0_rgba(0,0,0,.35)] ${POPUP[vm.popup.tone]}`}>
            {vm.popup.text}
          </div>
        </div>
      )}
    </div>
  );
}
