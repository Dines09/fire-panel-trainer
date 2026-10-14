// Learning-mode lessons.
// Step: { t, sub, hl, done(p), ack, act: { label, run(p) }, on(p), final }
//   hl   keys / lamps to highlight: a list, or a function of the panel
//   on   runs once when the step starts (for example: a detector goes into alarm)
//   act  a button in the guide for something done away from the panel
import { DIMMER, MENUS } from './panel/engine.js';

const k = s => `<span class="k">${s}</span>`;
const top = p => p.top;
const final = (t, sub) => ({ t, sub, final: true });

/** The next key on the way down a menu path, e.g. nav('3', '1', '2'). */
function nav(...path) {
  return p => {
    const st = p.stack;
    if (!st[1] || st[1].t !== 'menu' || st[1].m !== 'main') return ['menu'];
    let cur = st[1];
    for (let i = 0; i < path.length; i++) {
      const next = st[i + 2];
      if (!next) return [path[i]];
      const item = MENUS[cur.m][1].find(it => String(it[0]) === path[i]);
      const to = (item && item[2]) || {};
      const ok = (to.m && next.t === 'menu' && next.m === to.m) || (to.list && next.t === 'list' && next.kind === to.list) ||
        (to.wiz && next.t === 'wiz' && next.target === to.wiz) || (to.s && next.t === to.s) || (to.confirm && next.t === 'confirm') || (to.set && next.t === 'set');
      if (!ok) return ['left']; // wrong turn: one menu back
      if (next.t !== 'menu') return [];
      cur = next;
    }
    return [];
  };
}
const inMenu = (p, m) => top(p).t === 'menu' && top(p).m === m;
const inList = (p, kind) => top(p).t === 'list' && top(p).kind === kind;
const inWiz = (p, target, step) => top(p).t === 'wiz' && top(p).target === target && (!step || top(p).step === step);

const loginHl = (code = '2222', user = '1') => p => {
  const s = top(p);
  if (s.t !== 'login') return nav('4')(p);
  if (s.step === 'user') return [user];
  return s.code.length < 4 ? [code[s.code.length]] : ['enter'];
};

/** Type a number into the step that is open, then Enter. */
const typeHl = digits => p => {
  const buf = top(p).fresh ? '' : top(p).buf || '';
  if (buf === digits) return [top(p).step === 'zone' ? 'ok' : 'enter'];
  return digits.startsWith(buf) ? [digits[buf.length]] : ['erase'];
};

const allMuted = p => p.fires.length > 0 && p.fires.every(f => f.muted);

export const LESSONS = [
  {
    id: 'tour', title: 'Know the panel', level: 1,
    steps: [
      { t: 'This is the <b>Control Panel M 4.3</b>. The green <b>Power</b> lamp is on: power supply is OK. The display shows the home screen.', sub: 'With no alarm, no fault and no disablement, Power is the only lamp lit.', hl: ['led:power'], ack: true },
      { t: 'The four main indicators: <b>FIRE</b> (red), <b>Pre-Alarm</b> (orange), <b>Fault</b> (yellow), <b>Disablements</b> (yellow).', sub: 'Flashing = new, not yet muted. Steady = muted. Each one is also a key that opens its list.', hl: ['fire', 'prealarm', 'fault', 'dis'], ack: true },
      { t: `Press ${k('Status')} for a summary of alarms, faults and disablements.`, hl: ['status'], done: p => top(p).t === 'status' },
      { t: `Press ${k('ESC')} to go back to the top screen.`, sub: 'ESC always takes you home, from anywhere.', hl: ['esc'], done: p => top(p).t === 'home' },
      { t: `Press ${k('Menu')} to open the main menu.`, hl: ['menu'], done: p => inMenu(p, 'main') },
      { t: `Move with ${k('▼')} ${k('▲')} and open with ${k('OK')}, or just press the number. Open <b>7 History</b>.`, hl: ['7', 'down', 'up', 'ok'], done: p => inMenu(p, 'history') },
      { t: `Press ${k('◄')} to go one menu back.`, hl: ['left'], done: p => inMenu(p, 'main') },
      { t: `Press ${k('ESC')} to leave the menu.`, hl: ['esc'], done: p => top(p).t === 'home' },
      { t: `Try ${k('☀')} and ${k('☾')} below the keypad: they change the brightness of the display and lamps.`, hl: ['day', 'night'], done: p => p.set.dimmer !== DIMMER },
      final('You know the layout ✔', 'Next: log in, so that you are allowed to mute, reset and disable.'),
    ],
  },
  {
    id: 'login', title: 'Log in (access level 2B)', level: 1,
    steps: [
      { t: 'Without a code you can only look at alarms and silence the panel buzzer. To mute, reset or disable you must log in.', sub: 'Level 2B = operator (code 2222). Level 3 = power user (code 3333).', ack: true },
      { t: `Press ${k('Menu')}.`, hl: ['menu'], done: p => inMenu(p, 'main') },
      { t: `Press ${k('4')} for <b>Login</b>.`, hl: nav('4'), done: p => top(p).t === 'login' },
      { t: `Choose the user: press ${k('1')} for <b>Operator</b>.`, hl: loginHl(), done: p => top(p).t === 'login' && top(p).step === 'code' || p.level >= 2 },
      { t: `Type the code ${k('2')} ${k('2')} ${k('2')} ${k('2')} and press ${k('↵')}.`, sub: 'Typed a wrong digit? The ⌫ key erases it.', hl: loginHl(), done: p => p.level >= 2 },
      { t: 'Login OK: you are at access level 2B.', sub: 'The panel logs you out by itself after 30 minutes without a key press. To log out now: Menu » 4 Login » 0.', ack: true },
      final('Logged in ✔', 'Use the same steps with user 2 and code 3333 for level 3.'),
    ],
  },
  {
    id: 'fire', title: 'Fire alarm: mute and reset', level: 1,
    steps: [
      { t: 'A smoke detector in a B-deck cabin is about to go into alarm. Watch the panel and listen.', ack: true },
      { t: '<b>FIRE</b> flashes red and the panel buzzer sounds. The display shows the zone, the detector and where it is.', sub: 'FIRE ZONE 3 SMOKE 45 = zone 3, smoke detector, address 45, B-DECK CREW(11).', on: p => p.fieldFire(3, 45), hl: ['fire'], ack: true },
      { t: `Press ${k('MUTE')}.`, hl: ['mute'], done: p => p.cnt.muteLocal > 0 || allMuted(p) },
      { t: 'Only the panel buzzer went quiet: FIRE still flashes, because you are not logged in. Log in: <b>Menu » 4 » 1</b>, code <b>2222</b>, then ↵.', sub: 'The alarm delay is still running: the ship\'s bells start by themselves if the alarm is not muted in time.', hl: loginHl(), done: p => p.level >= 2 },
      { t: `Now press ${k('MUTE')} again.`, hl: ['mute'], done: allMuted },
      { t: 'FIRE is now <b>steady</b> red: the alarm is muted (acknowledged). It stays lit until the alarm is reset.', sub: 'Muting does not put the fire out. Send someone to check the place at once.', ack: true },
      { t: `Press ${k('OK')} to see the details: time, date and location.`, hl: ['ok'], done: p => top(p).t === 'detail' },
      { t: 'The fire party reports: burnt toast in the cabin, no fire.', sub: 'An alarm cannot be reset while the detector still senses smoke.', act: { label: 'Smoke has cleared ▸', run: p => p.fieldClear(3, 45) }, done: p => !p.cond.size },
      { t: `Press ${k('RESET')} to reset the fire alarm.`, hl: ['reset'], done: p => !p.fires.length },
      final('Fire alarm reset ✔ FIRE lamp is off and the panel is back to normal.', 'Order to remember: MUTE, investigate, clear the cause, RESET.'),
    ],
  },
  {
    id: 'mcp', title: 'Manual call point: why RESET fails', level: 2,
    steps: [
      { t: 'Someone breaks the glass of the manual call point in the A-deck passage. You are already logged in (level 2B).', ack: true },
      { t: 'A call point means a person saw a fire: on this ship the bells ring at once, with no alarm delay.', sub: 'FIRE ZONE 4 MCP 76, A-DECK PASSAGE ST\'BD.', on: p => p.fieldFire(4, 76), ack: true },
      { t: `Press ${k('MUTE')} to silence the bells and the buzzer.`, hl: ['mute'], done: allMuted },
      { t: `Now try ${k('RESET')}.`, hl: ['reset'], done: p => p.cnt.resetFail > 0 || !p.fires.length },
      { t: '<b>Reset not possible</b>: the call point is still pressed in.', sub: 'The same happens with a detector that still senses smoke or heat.', act: { label: 'Reset the call point with its key ▸', run: p => p.fieldClear(4, 76) }, done: p => !p.cond.size },
      { t: `Press ${k('RESET')} again.`, hl: ['reset'], done: p => !p.fires.length },
      final('Alarm reset ✔', 'If RESET does not work, the cause is still there. Find it first.'),
    ],
  },
  {
    id: 'multi', title: 'Several fire alarms', level: 2,
    steps: [
      { t: 'A fire in the engine room workshop spreads smoke: three detectors go into alarm one after the other.', ack: true },
      { t: 'The title shows <b>FIRE ALARM 1(3)</b>: entry 1 of 3. The first and the last alarm are always on the display.', sub: 'The first alarm tells you where the fire started.', on: p => { p.fieldFire(9, 3); p.fieldFire(9, 5); p.fieldFire(10, 23); }, hl: ['led:multi'], ack: true },
      { t: `Press ${k('MULTIPLE ALARMS')} to step to the next alarm.`, sub: 'On the real panel the list jumps back to the first alarm after 30 seconds without a key.', hl: ['multi'], done: p => p.fireSel === 1 },
      { t: `Step once more, with ${k('MULTIPLE ALARMS')} or ${k('▼')}.`, hl: ['multi', 'down'], done: p => p.fireSel === 2 },
      { t: `Press ${k('MUTE')}: it mutes all fire alarms together.`, hl: ['mute'], done: allMuted },
      { t: 'The fire party has put the fire out and ventilated the space.', act: { label: 'Fire out, smoke cleared ▸', run: p => p.fieldClear() }, done: p => !p.cond.size },
      { t: 'Reset them all in one go: <b>Menu » 2 Fire Alarms » 4 Reset All Fire Alarms</b>.', sub: `Or press ${k('RESET')} once for each alarm.`, hl: nav('2', '4'), done: p => !p.fires.length },
      final('All fire alarms reset ✔'),
    ],
  },
  {
    id: 'disable', title: 'Disable a detector (hot work)', level: 2,
    steps: [
      { t: 'Welding is planned in the engine room workshop. With a hot work permit, detector <b>ZONE 9 SMOKE 4</b> is to be disabled so that it gives no false alarm.', sub: 'A disabled detector cannot detect a real fire. Disable as little as possible, for as short as possible.', ack: true },
      { t: 'Open <b>Menu » 3 Disablements » 1 New disablement » 2 Detectors & Manual Call Points</b>.', hl: nav('3', '1', '2'), done: p => inWiz(p, 'unit') },
      { t: `The zones are listed. Go to <b>zone 9</b> with ${k('▼')}, or press ${k('9')}, then ${k('OK')}.`, sub: 'Typing the zone number jumps straight to it.', hl: typeHl('9'), done: p => inWiz(p, 'unit') && top(p).step !== 'zone' },
      { t: `Detector type: press ${k('1')} for <b>Smoke detectors</b>.`, hl: ['1'], done: p => inWiz(p, 'unit') && !['zone', 'dtype'].includes(top(p).step) },
      { t: `Address: type ${k('4')} and press ${k('↵')}.`, sub: 'The display shows the location text of the address you typed.', hl: typeHl('4'), done: p => inWiz(p, 'unit') && !['zone', 'dtype', 'addr'].includes(top(p).step) },
      { t: `“to address” lets you disable several detectors at once. For one detector just press ${k('↵')}.`, hl: ['enter'], done: p => inWiz(p, 'unit', 'mode') || p.dis.length > 0 },
      { t: `Press ${k('1')} for <b>Permanent disablement</b>.`, sub: 'Permanent = until someone reconnects it. Timer and Clock reconnect by themselves.', hl: ['1'], done: p => p.dis.length > 0 },
      { t: 'Disablement activated. The yellow <b>Disablements</b> lamp and the <b>Zone</b> lamp are lit, and stay lit as long as anything is disabled.', hl: ['dis', 'led:zone'], ack: true },
      { t: `Press ${k('OK')} to see it in the disablement list.`, hl: ['ok'], done: p => inList(p, 'dis') },
      { t: 'Welding starts and smoke reaches the disabled detector.', act: { label: 'Welding smoke at the detector ▸', run: p => p.fieldFire(9, 4) }, done: p => p.cond.size > 0 },
      { t: 'No alarm: the panel ignores a disabled detector. A real fire there would go unnoticed too.', sub: 'That is why a fire watch stands by during hot work.', ack: true },
      { t: 'The work is finished and the space is ventilated.', act: { label: 'Work done, smoke cleared ▸', run: p => p.fieldClear() }, done: p => !p.cond.size },
      final('Detector disabled ✔ Do not forget it: the next lesson reconnects it.', 'Log every disablement, and hand it over at the change of watch.'),
    ],
  },
  {
    id: 'enable', title: 'Reconnect (enable) a detector', level: 2,
    setup: p => p.addDis({ kind: 'unit', zone: 9, addr: 4 }),
    steps: [
      { t: 'The yellow <b>Disablements</b> lamp is lit: detector ZONE 9 SMOKE 4 is still disabled from the hot work.', sub: 'First make sure there is no smoke left. A reconnected detector that still senses smoke alarms at once.', hl: ['dis'], ack: true },
      { t: `Press the ${k('Disablements')} key.`, sub: 'The long way: Menu » 3 Disablements.', hl: ['dis'], done: p => inMenu(p, 'dis') || inList(p, 'dis') },
      { t: `Press ${k('2')} for the <b>Disablement list</b>.`, hl: ['2'], done: p => inList(p, 'dis') || !p.dis.length },
      { t: `The entry is selected. Press ${k('RESET')} to reconnect it.`, sub: 'With several entries, choose one with ▲ ▼ first.', hl: ['reset'], done: p => !p.dis.length },
      final('Reconnected ✔ The Disablements and Zone lamps are off.', 'Menu » 3 » 5 removes all disablements at once. Menu » 3 » 4 lists old ones; 0 switches one on again.'),
    ],
  },
  {
    id: 'zone', title: 'Disable a zone for a set time', level: 2,
    steps: [
      { t: 'The galley is to be steam-cleaned for half an hour. Disable the detectors of <b>zone 4 (A-deck)</b> with a timer, so that they reconnect by themselves.', ack: true },
      { t: 'Open <b>Menu » 3 Disablements » 1 New disablement » 1 Zones</b>.', hl: nav('3', '1', '1'), done: p => inWiz(p, 'zone') },
      { t: `Go to <b>zone 4</b> in the list with ${k('▼')}, or press ${k('4')}, then ${k('OK')}.`, hl: typeHl('4'), done: p => inWiz(p, 'zone') && top(p).step !== 'zone' },
      { t: `Press ${k('2')} for <b>All detectors</b>.`, sub: '“All detectors” does not include the manual call points: they stay in service.', hl: ['2'], done: p => inWiz(p, 'zone', 'mode') || inWiz(p, 'zone', 'time') },
      { t: `Press ${k('2')} for <b>Timer disablement</b>.`, hl: ['2'], done: p => inWiz(p, 'zone', 'time') },
      { t: `Type the time as hh mm: ${k('0')} ${k('0')} ${k('3')} ${k('0')}, then ${k('↵')}.`, sub: 'Timer = for this long. Clock = until this time of day. Longest: 23 h 59 min.', hl: typeHl('0030'), done: p => p.dis.some(d => d.kind === 'zone') },
      { t: 'The acknowledgement shows when the zone reconnects. A call point in the zone still works: try it.', act: { label: 'Break the glass of MCP 76 ▸', run: p => p.fieldFire(4, 76) }, done: p => p.fires.length > 0 },
      { t: `Fire alarm from the call point. Press ${k('MUTE')}.`, hl: ['mute'], done: allMuted },
      { t: 'It was only a test.', act: { label: 'Reset the call point with its key ▸', run: p => p.fieldClear() }, done: p => !p.cond.size },
      { t: `Press ${k('RESET')}.`, hl: ['reset'], done: p => !p.fires.length },
      { t: 'Half an hour passes…', sub: 'Look at the Disablements lamp.', act: { label: '⏩ 30 minutes later ▸', run: p => p.tick(0, 31 * 60e3) }, done: p => !p.dis.length },
      final('The timer ran out and the zone reconnected by itself ✔', 'A timed disablement cannot be forgotten. Prefer it to a permanent one.'),
    ],
  },
  {
    id: 'fault', title: 'Fault: mute, find the cause, reset', level: 2,
    steps: [
      { t: 'A crew member takes the smoke detector in his cabin out of its base…', ack: true },
      { t: '<b>Fault</b> flashes yellow, the buzzer beeps slowly and the <b>Zone</b> lamp flashes. Read the text: which unit, what fault, which code.', sub: 'ZONE 3 SMOKE 47 NO ANSWER, FAULT(128) = the panel has lost contact with that detector.', on: p => p.fieldFault('noanswer:3:47', true), hl: ['fault', 'led:zone'], ack: true },
      { t: `Press ${k('MUTE')} to silence the buzzer.`, sub: 'On the fault list MUTE mutes all faults.', hl: ['mute'], done: p => p.faults.length > 0 && p.faults.every(f => f.muted) },
      { t: `Fault is steady now. Press ${k('OK')} for the details.`, hl: ['ok'], done: p => top(p).t === 'detail' },
      { t: `The fault code is 128. Its cause and remedy are in the fault code list (see Help). Now try ${k('RESET')}.`, hl: ['reset'], done: p => p.cnt.resetFail > 0 || !p.faults.length },
      { t: '<b>Reset not possible</b>: the fault is still there.', sub: 'A fault does not go away by pressing keys. Someone has to repair it.', act: { label: 'Refit the detector in its base ▸', run: p => p.fieldFault('noanswer:3:47', false) }, done: p => !p.causes.size },
      { t: `Press ${k('RESET')} again.`, hl: ['reset'], done: p => !p.faults.length },
      final('Fault reset ✔ Fault and Zone lamps are off.', 'The Fault key opens the fault list at any time. Menu » 1 » 3 resets all faults.'),
    ],
  },
  {
    id: 'test', title: 'Detector test with zone test mode', level: 2,
    steps: [
      { t: 'For the routine detector test, put the zone in <b>test mode</b>: the alarms are shown and recorded, but bells and outputs stay quiet.', sub: 'Other zones keep working normally.', ack: true },
      { t: 'Open <b>Menu » 3 Disablements » 1 New disablement » 6 Test Mode</b>.', hl: nav('3', '1', '6'), done: p => inWiz(p, 'test') || p.has('test') },
      { t: `The zones are listed. Go to <b>zone 5</b> with ${k('▼')}, or press ${k('5')}, then ${k('OK')}.`, hl: typeHl('5'), done: p => top(p).t === 'confirm' || p.has('test') },
      { t: `The panel asks before it acts: <b>Abort</b> or <b>OK</b>. Press ${k('OK')} to confirm.`, sub: 'ESC = Abort takes you back to the list with nothing changed.', hl: ['ok'], done: p => p.has('test') },
      { t: 'Zone 5 is in test mode. Three lamps confirm it: <b>Disablements</b>, <b>Test</b> and <b>Zone</b>.', sub: 'The zone returns to normal by itself after 2 hours.', hl: ['dis', 'led:test', 'led:zone'], ack: true },
      { t: 'Hold the test gas to smoke detector 92 (upper deck gymnasium).', act: { label: 'Test gas at detector 92 ▸', run: p => p.fieldFire(5, 92) }, done: p => p.fires.length > 0 },
      { t: 'The display shows <b>TEST ZONE 5 SMOKE 92</b>. No bells. The alarm resets itself when the gas has gone.', done: p => !p.fires.length },
      { t: 'Every tested detector is in the history: <b>Menu » 7 History » 1 Fire History List</b>.', hl: nav('7', '1'), done: p => inList(p, 'hFire') },
      { t: `Testing done. End test mode: press ${k('Disablements')}, then ${k('2')} for the list, then ${k('RESET')}.`, sub: 'Make sure no detector is still in alarm before you end test mode.', hl: p => (inList(p, 'dis') ? ['reset'] : inMenu(p, 'dis') ? ['2'] : ['dis']), done: p => !p.has('test') },
      final('Test mode ended ✔ All three lamps are off.', 'Record the test in the fire detector test record.'),
    ],
  },
  {
    id: 'lamp', title: 'Lamp and display test', level: 1,
    steps: [
      { t: 'The display test proves that every lamp, the display and the buzzer work. No login is needed.', ack: true },
      { t: 'Open <b>Menu » 5 Settings » 4 Test display</b>.', hl: nav('5', '4'), done: p => p.cnt.lamp > 0 },
      { t: 'All lamps light, the display shows its colours and the buzzer sounds. Check that no lamp stays dark.', done: p => p.cnt.lamp > 0 && !p.lamp },
      final('Display test done ✔', 'The Settings menu also sets dimmer, time, date and the key beep.'),
    ],
  },
];
