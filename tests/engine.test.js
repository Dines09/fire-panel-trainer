// Logic tests for the panel: node tests/engine.test.js
import assert from 'node:assert/strict';
import { Panel } from '../src/panel/engine.js';

let passed = 0;
const failed = [];
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed.push(name); console.error(`FAIL  ${name}\n      ${e.message}`); }
}
const T0 = new Date(2026, 9, 14, 10, 0, 0).getTime();
const panel = (opts = {}) => new Panel({ now: T0, ...opts });
const keys = (p, s) => s.split(' ').forEach(k => p.key(k));
const login = (p, code = '2222', user = '1') => keys(p, `menu 4 ${user} ${code.split('').join(' ')} enter`);
const text = p => JSON.stringify(p.view());

test('normal: home screen, only Power lit, nothing sounding', () => {
  const p = panel();
  assert.equal(p.view().kind, 'home');
  assert.match(p.view().state, /normal operation/);
  const l = p.leds;
  assert.equal(l.power, 'on');
  for (const k of ['fire', 'fault', 'dis', 'prealarm', 'zone', 'test']) assert.equal(l[k], 'off', k);
  assert.deepEqual([p.out.buzzer, p.out.bells], [null, false]);
});

test('fire: display jumps to the fire list, FIRE flashes, buzzer sounds, delay starts', () => {
  const p = panel();
  keys(p, 'menu 5');
  p.fieldFire(3, 45);
  const v = p.view();
  assert.equal(v.title, 'FIRE ALARM 1(1)');
  assert.equal(v.rows[0].l1, 'FIRE ZONE 3 SMOKE 45');
  assert.equal(v.rows[0].l2, 'B-DECK CREW(11)');
  assert.equal(p.leds.fire, 'flash');
  assert.equal(p.out.buzzer, 'fire');
  assert.equal(p.out.bells, false);
  assert.deepEqual(p.out.delay, { phase: 't1', secs: 120 });
});

test('mute without login only silences the local buzzer', () => {
  const p = panel();
  p.fieldFire(3, 45);
  p.key('mute');
  assert.equal(p.out.buzzer, null);
  assert.equal(p.leds.fire, 'flash');
  assert.equal(p.out.delay.phase, 't1');
  assert.match(p.popup.text, /Local buzzer silenced/);
  p.key('reset'); // asks who you are, then carries on with the reset
  assert.match(p.view().note, /Access level 2B required/);
  keys(p, '1 2 2 2 2 enter');
  assert.equal(p.level, 2);
  assert.match(p.popup.text, /still in alarm condition/);
  assert.equal(p.fires.length, 1);
});

test('login: 2222 gives level 2B, 3333 level 3, a wrong code nothing', () => {
  const p = panel();
  login(p, '1234');
  assert.equal(p.level, 1);
  assert.match(p.popup.text, /Wrong access code/);
  keys(p, '2 2 2 2 enter');
  assert.equal(p.level, 2);
  assert.equal(p.view().title, 'MENU');
  login(p, '3333', '2');
  assert.equal(p.level, 3);
  keys(p, 'menu 4 0');
  assert.equal(p.level, 1);
});

test('mute at level 2B: FIRE steady, delay time 2 runs; reset needs the smoke gone', () => {
  const p = panel({ level: 2 });
  p.fieldFire(3, 45);
  p.key('mute');
  assert.equal(p.leds.fire, 'on');
  assert.equal(p.out.buzzer, null);
  assert.equal(p.out.delay.phase, 't2');
  p.key('reset');
  assert.match(p.popup.text, /still in alarm condition/);
  assert.equal(p.fires.length, 1);
  p.fieldClear(3, 45);
  p.key('reset');
  assert.equal(p.fires.length, 0);
  assert.equal(p.leds.fire, 'off');
  assert.equal(p.view().kind, 'home');
  assert.equal(p.out.delay, null);
});

test('alarm delay: bells start when time 1 runs out, and again after time 2', () => {
  const p = panel({ level: 2 });
  p.fieldFire(2, 16);
  p.tick(0, 119e3);
  assert.equal(p.out.bells, false);
  p.tick(0, 2e3);
  assert.equal(p.out.bells, true);
  p.key('mute');
  assert.equal(p.out.bells, false);

  const q = panel({ level: 2 });
  q.fieldFire(2, 16);
  q.key('mute');
  q.tick(0, 121e3);
  assert.equal(q.out.bells, true, 'not reset within time 2');
  q.key('mute');
  assert.equal(q.out.bells, false);
});

test('call point or second alarm: bells at once, no delay', () => {
  const p = panel({ level: 2 });
  p.fieldFire(4, 76);
  assert.equal(p.view().rows[0].l1, 'FIRE ZONE 4 MCP 76');
  assert.equal(p.out.bells, true);
  const q = panel();
  q.fieldFire(9, 3);
  assert.equal(q.out.bells, false);
  q.fieldFire(9, 5);
  assert.equal(q.out.bells, true);
  assert.equal(q.leds.multi, 'on');
});

test('several alarms: first and last always shown, Multiple Alarms steps through', () => {
  const p = panel({ level: 2 });
  for (const a of [1, 3, 4, 5, 6]) p.fieldFire(9, a);
  assert.equal(p.view().title, 'FIRE ALARM 1(5)');
  assert.deepEqual(p.view().rows.map(r => r.n), [1, 2, 5]);
  keys(p, 'multi multi multi');
  assert.equal(p.view().title, 'FIRE ALARM 4(5)');
  assert.deepEqual(p.view().rows.map(r => r.n), [1, 4, 5]);
  assert.equal(p.view().rows[1].sel, true);
  p.tick(31e3, 0);
  assert.equal(p.fireSel, 0, 'back to the first alarm after 30 s');
  p.fieldClear();
  keys(p, 'menu 2 4');
  assert.equal(p.fires.length, 0);
});

test('disable one detector through the menu; it stays silent and the lamp stays on', () => {
  const p = panel();
  keys(p, 'menu 3 1'); // not logged in: the panel lists the users and asks for the code
  assert.equal(p.view().title, 'LOGIN');
  assert.match(p.view().note, /Access level 2B required/);
  assert.equal(p.view().items.length, 3);
  keys(p, 'ok 2 2 2 2 enter');
  assert.equal(p.view().title, 'NEW DISABLEMENT'); // and goes straight on
  keys(p, '2 9 enter 1 4 enter enter 1');
  assert.equal(p.view().title, 'DISABLEMENT ACTIVATED');
  assert.equal(p.dis.length, 1);
  assert.equal(p.disName(p.dis[0]), 'ZONE 9 SMOKE 4');
  assert.equal(p.leds.dis, 'on');
  assert.equal(p.leds.zone, 'on');
  p.fieldFire(9, 4);
  assert.equal(p.fires.length, 0);
  p.fieldFire(9, 5); // the neighbour still works
  assert.equal(p.fires.length, 1);
  p.fieldClear();
  p.key('reset');
  keys(p, 'esc menu status esc');
  assert.equal(p.leds.dis, 'on', 'lamp stays on whatever is on the display');
  assert.match(p.view().state, /Disablements: 1/);
});

test('reconnect from the disablement list with RESET; lamp goes off', () => {
  const p = panel({ level: 2 });
  p.addDis({ kind: 'unit', zone: 9, addr: 4 });
  keys(p, 'dis 2');
  assert.equal(p.view().title, 'DISABLEMENT 1(1)');
  assert.equal(p.view().rows[0].l3, 'Permanent');
  p.key('reset');
  assert.equal(p.dis.length, 0);
  assert.equal(p.leds.dis, 'off');
  assert.equal(p.old.length, 1);
  keys(p, 'esc menu 3 4 0'); // old disablements: 0 reactivates
  assert.equal(p.dis.length, 1);
});

test('reconnecting a detector that still sees smoke gives a fire alarm', () => {
  const p = panel({ level: 2 });
  p.addDis({ kind: 'unit', zone: 9, addr: 4 });
  p.fieldFire(9, 4);
  assert.equal(p.fires.length, 0);
  keys(p, 'dis 2 reset');
  assert.equal(p.fires.length, 1);
  assert.equal(p.view().title, 'FIRE ALARM 1(1)');
});

test('an interval disables several detectors; a zone disablement leaves the call points on', () => {
  const p = panel({ level: 2 });
  keys(p, 'menu 3 1 2 down down ok 1 4 4 enter 4 7 enter 1'); // zone 3 by scrolling
  assert.deepEqual(p.dis.map(d => d.addr), [44, 45, 46, 47]);
  const q = panel({ level: 2 });
  keys(q, 'menu 3 1 1 1 4 erase 4 enter 2 1'); // 14 typed, erased, then zone 4: all detectors, permanent
  assert.equal(q.disName(q.dis[0]), 'ZONE 4 ALL DETECTORS');
  q.fieldFire(4, 73);
  assert.equal(q.fires.length, 0);
  q.fieldFire(4, 76); // MCP
  assert.equal(q.fires.length, 1);
});

test('timer disablement reconnects by itself', () => {
  const p = panel({ level: 2 });
  keys(p, 'menu 3 1 1 4 enter 2 2 0 0 3 0 enter');
  assert.equal(p.dis.length, 1);
  assert.match(p.view().lines.join(' '), /Timer - reconnects 10:30/);
  p.tick(0, 29 * 60e3);
  assert.equal(p.dis.length, 1);
  p.tick(0, 2 * 60e3);
  assert.equal(p.dis.length, 0);
  assert.equal(p.leds.dis, 'off');
});

test('disable from the fire list with 0 removes the alarm', () => {
  const p = panel({ level: 2 });
  p.fieldFire(5, 92);
  keys(p, '0 1');
  assert.equal(p.fires.length, 0);
  assert.equal(p.disName(p.dis[0]), 'ZONE 5 SMOKE 92');
});

test('bells, external controls and alarm delay can be disabled', () => {
  const p = panel({ level: 2 });
  keys(p, 'menu 3 1 4 ok');
  assert.equal(p.leds.alarmDev, 'on');
  keys(p, 'menu 3 1 5 1');
  assert.equal(p.leds.delayOff, 'on');
  keys(p, 'menu 3 1 3 1 2 ok');
  p.fieldFire(4, 76);
  assert.equal(p.out.bells, false);
  assert.equal(p.out.doorsClosed, false);
  assert.equal(p.out.ventStopped, true);
  p.fieldClear();
  p.key('reset');
  keys(p, 'menu 3 5 ok');
  assert.equal(p.dis.length, 0);
});

test('fault: flashes, mutes, and resets only when the cause is gone', () => {
  const p = panel({ level: 2 });
  p.fieldFault('noanswer:3:47', true);
  assert.equal(p.view().title, 'FAULT ALARM 1(1)');
  assert.equal(p.view().rows[0].l1, 'ZONE 3 SMOKE 47 NO ANSWER, FAULT(128)');
  assert.equal(p.leds.fault, 'flash');
  assert.equal(p.leds.zone, 'flash');
  assert.equal(p.out.buzzer, 'fault');
  p.key('mute');
  assert.equal(p.leds.fault, 'on');
  p.key('reset');
  assert.match(p.popup.text, /fault remains/);
  p.fieldFault('noanswer:3:47', false);
  p.key('reset');
  assert.equal(p.faults.length, 0);
  assert.equal(p.leds.fault, 'off');
});

test('fire has priority over a fault on the display and the buzzer', () => {
  const p = panel({ level: 2 });
  p.fieldFault('mains', true);
  p.fieldFire(2, 16);
  assert.equal(p.view().title, 'FIRE ALARM 1(1)');
  assert.equal(p.out.buzzer, 'fire');
  p.key('fault');
  assert.equal(p.view().rows[0].l1, 'CENTRAL 1 CHARGERM 4 MAINS POWER, FAULT(180)');
});

test('zone test mode: alarm shown, no bells, resets itself, Test lamp on', () => {
  const p = panel({ level: 2 });
  keys(p, 'menu 3 1 6');
  assert.equal(p.view().kind, 'pick'); // the zones as a list
  assert.equal(p.view().rows[0].label, 'ZONE 1');
  keys(p, 'down down down down ok');
  assert.match(p.view().lines[0], /Set ZONE 5 in test mode/);
  assert.deepEqual(p.view().choice, ['Abort', 'Confirm']);
  p.key('left'); // left arrow = Abort: back to the list, nothing set
  assert.deepEqual([p.view().kind, p.dis.length], ['pick', 0]);
  keys(p, 'ok ok');
  assert.equal(p.leds.test, 'on');
  assert.equal(p.leds.dis, 'on');
  p.fieldFire(5, 92);
  assert.equal(p.view().rows[0].l1, 'TEST ZONE 5 SMOKE 92');
  assert.equal(p.out.bells, false);
  assert.equal(p.out.buzzer, null);
  p.tick(0, 9e3);
  assert.equal(p.fires.length, 0);
  keys(p, 'menu 7 1');
  assert.match(text(p), /TEST ZONE 5 SMOKE 92/);
  keys(p, 'dis 2 reset');
  assert.equal(p.leds.test, 'off');
  p.fieldFire(5, 92);
  assert.equal(p.view().rows[0].l1, 'FIRE ZONE 5 SMOKE 92');
});

test('pre-alarm: mute only, clears with the smoke, turns into a fire alarm', () => {
  const p = panel({ level: 2 });
  p.fieldPre(2, 16);
  assert.equal(p.leds.prealarm, 'flash');
  assert.equal(p.out.buzzer, 'pre');
  keys(p, 'mute reset');
  assert.equal(p.leds.prealarm, 'on');
  assert.match(p.popup.text, /cannot be reset/);
  p.fieldFire(2, 16);
  assert.deepEqual([p.pre.length, p.fires.length], [0, 1]);
});

test('settings: level 3 for the delay times, lamp test lights every lamp', () => {
  const p = panel({ level: 2 });
  keys(p, 'menu 5 5');
  assert.match(p.view().note, /Access level 3 required/);
  assert.equal(p.view().items[1].sel, true); // Power User is offered
  keys(p, 'ok 3 3 3 3 enter');
  assert.equal(p.view().title, 'ALARM DELAY TIMES');
  keys(p, '1 3 0 enter');
  assert.equal(p.set.t1, 30);
  keys(p, 'menu 5 4');
  assert.equal(p.view().kind, 'lamp');
  assert.equal(p.leds.fire, 'on');
  assert.equal(p.out.buzzer, 'test');
  p.tick(7e3, 0);
  assert.equal(p.view().kind, 'menu');
  keys(p, 'menu 5 2 1 4 3 0 enter');
  assert.equal(p.view().clock, '14:30');
});

test('memory: disablements and settings come back, alarms do not', () => {
  const p = panel({ level: 2 });
  p.addDis({ kind: 'unit', zone: 9, addr: 4 });
  p.fieldFire(2, 16);
  p.set.beep = false;
  const q = panel({ saved: JSON.parse(JSON.stringify(p.save())) });
  assert.equal(q.dis.length, 1);
  assert.equal(q.leds.dis, 'on');
  assert.equal(q.set.beep, false);
  assert.equal(q.fires.length, 0);
  assert.equal(q.level, 1);
});

test('every menu entry opens without an error', () => {
  const p = panel({ level: 3 });
  const walk = (path, depth) => {
    keys(p, path);
    const v = p.view();
    assert.ok(v.kind, path);
    if (v.kind !== 'menu' || depth > 3) return;
    for (const it of v.items) walk(`${path} ${it.n}`, depth + 1);
  };
  walk('menu', 0);
  for (const k of ['status', 'fire', 'prealarm', 'fault', 'dis', 'shortcuts', 'day', 'night', 'up', 'down', 'left', 'right', 'erase', 'esc']) {
    p.key(k);
    p.view();
  }
});

console.log(`${passed} passed, ${failed.length} failed`);
if (failed.length) process.exit(1);
