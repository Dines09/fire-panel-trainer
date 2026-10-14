// Control Panel M 4.3 - the panel's logic, with no drawing in it.
//
// Keys go in with key(), time with tick(), and things that happen out on the
// ship (smoke, a broken call point, a removed detector) with the field*()
// methods. view() describes what the display shows, leds and out what the
// lamps, buzzer and bells do. Behaviour follows the Salwico Cargo User Guide
// (5100332-01A01); where the guide leaves a detail open the choice is noted.
import { ZONES, TYPE_GROUPS, groupLabel, matchType, zoneByNo, unitAt, unitName, unitKey } from './site.js';
import { FAULT_CODES, SYSTEM_FAULTS } from './faults.js';

export const LEVEL_NAME = { 1: '1', 2: '2B', 3: '3', 4: '4' };
const CODES = { 2: '2222', 3: '3333' };
const USERS = [[2, 'Operator', 'access level 2B'], [3, 'Power User', 'access level 3'], [4, 'Service', 'access level 4']];
const MODES = [['perm', 'Permanent disablement'], ['timer', 'Timer disablement'], ['clock', 'Clock disablement'], ['periodic', 'Periodic disablement']];
const EXT_GROUPS = { ALL: 'All groups (Doors, Fire, etc.)', DOORS: 'Doors', FIRE: 'Fire', FAULT: 'Fault', VENT: 'Ventilation', IND: 'Indication' };

const MIN = 60e3, HOUR = 3600e3;
const LAMP_MS = 6000;
export const DIMMER = 8; // dimmer level of a new panel (1-9)
export const LAMP_PHASES = ['red', 'green', 'blue', 'white', 'black', 'white'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const hhmm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const dateStr = t => { const d = new Date(t); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const isDigit = k => k.length === 1 && k >= '0' && k <= '9';
const isOk = k => k === 'ok' || k === 'enter' || k === 'right';

// Menu tree (user guide 4.1.3.3). Item: [number, label, target, required level].
// Targets: m = menu, list, wiz = disablement steps, confirm, set, act, s = screen.
export const MENUS = {
  main: ['MENU', [
    [1, 'Fault Alarms', { m: 'faults' }], [2, 'Fire Alarms', { m: 'fires' }], [3, 'Disablements', { m: 'dis' }],
    [4, 'Login', { s: 'login' }], [5, 'Settings', { m: 'settings' }], [6, 'Service Menu', { m: 'service' }],
    [7, 'History', { m: 'history' }], [8, 'Maintenance', { m: 'maint' }],
  ]],
  faults: ['FAULT ALARMS', [
    [1, 'Fault List', { list: 'fault' }], [2, 'Warning List', { list: 'warning' }], [3, 'Reset All Faults', { act: 'resetAllFaults' }, 2],
  ]],
  fires: ['FIRE ALARMS', [
    [1, 'Fire List', { s: 'fire' }], [2, 'Pre-Alarm List', { list: 'pre' }],
    [3, 'Resound (restart bells)', { act: 'resound' }, 2], [4, 'Reset All Fire Alarms', { act: 'resetAllFires' }, 2],
  ]],
  dis: ['DISABLEMENTS', [
    [1, 'New disablement', { m: 'newdis' }, 2], [2, 'Disablement list', { list: 'dis' }], [3, 'Periodic Disable list', { list: 'periodic' }],
    [4, 'Old Disablements', { list: 'old' }], [5, 'Remove all disablements', { confirm: 'removeAll' }, 2],
  ]],
  newdis: ['NEW DISABLEMENT', [
    [1, 'Zones', { wiz: 'zone' }], [2, 'Detectors & Manual Call Points', { wiz: 'unit' }], [3, 'External Controls', { m: 'ext' }],
    [4, 'Alarm Device (Bells etc.)', { confirm: 'devices' }], [5, 'Alarm Delay', { wiz: 'delay' }], [6, 'Test Mode', { wiz: 'test' }],
  ]],
  ext: ['EXTERNAL CONTROLS', [[1, 'External Controls', { m: 'extgrp' }], [2, 'Alarm Transfer', { confirm: 'transfer' }]]],
  extgrp: ['EXTERNAL CONTROLS', Object.entries(EXT_GROUPS).map(([g, label], i) => [i + 1, label, { confirm: 'ext:' + g }])],
  settings: ['SETTINGS', [
    [1, 'Set Dimmer', { set: 'dimmer' }], [2, 'Set Time', { set: 'time' }], [3, 'Set Date', { set: 'date' }],
    [4, 'Test display', { act: 'lampTest' }], [5, 'Alarm Delay Times', { m: 'delays' }, 3],
    [6, 'Keyboard Beep', { set: 'beep' }], [7, 'Cause Effect in Test Mode', { set: 'ce' }],
  ]],
  delays: ['ALARM DELAY TIMES', [[1, 'Alarm Delay Time 1 (mute)', { set: 't1' }], [2, 'Alarm Delay Time 2 (reset)', { set: 't2' }]]],
  service: ['SERVICE', [
    [1, 'System Details', { s: 'system' }], [2, 'Centrals', {}, 4], [3, 'Modules', {}, 4], [4, 'Zones', { list: 'zones' }],
    [5, 'Loops', {}, 4], [6, 'Configuration', {}, 4], [7, 'Firmware', {}, 4], [8, 'System Log', {}, 4],
  ]],
  history: ['HISTORY', [
    [1, 'Fire History List', { list: 'hFire' }], [2, 'Fault History List', { list: 'hFault' }],
    [3, 'Disable History List', { list: 'hDis' }], [4, 'Common History List', { list: 'hAll' }],
  ]],
  maint: ['MAINTENANCE', [[1, 'Lightly Contaminated Detectors', { list: 'light' }], [2, 'Heavily Contaminated Detectors', { list: 'heavy' }]]],
  shortcuts: ['SHORTCUTS', [[1, 'New disablement', { m: 'newdis' }, 2], [2, 'Disablement list', { list: 'dis' }], [3, 'Test display', { act: 'lampTest' }]]],
};

// title, header colour, text when empty, footer lines
const LISTS = {
  fault: ['FAULT ALARM', 'fault', 'No fault alarms.', ['RESET=Reset current entry, MUTE=Mute all', 'OK=Details, 1=Print item, 2=Print all']],
  warning: ['WARNING', 'fault', 'No warnings.', ['OK=Details, 1=Print item, 2=Print all']],
  pre: ['PRE-ALARM', 'pre', 'No pre-alarms.', ['MUTE=Mute pre-alarms (cannot be reset).', 'OK=Details.']],
  dis: ['DISABLEMENT', 'dis', 'No disablements.', ['RESET=Reconnect current entry.', 'OK=Details, 1=Print item, 2=Print all']],
  periodic: ['PERIODIC DISABLE', 'dis', 'No periodic disablements.', ['RESET=Remove current entry.']],
  old: ['OLD DISABLEMENT', 'plain', 'No old disablements.', ['0=Reactivate (permanent only), OK=Details.']],
  hFire: ['FIRE HISTORY', 'plain', 'No fire alarms recorded.', ['Last 200 fire alarms. 1=Print item, 2=Print all']],
  hFault: ['FAULT HISTORY', 'plain', 'No faults recorded.', ['Last 200 fault alarms. 1=Print item, 2=Print all']],
  hDis: ['DISABLE HISTORY', 'plain', 'No disablements recorded.', ['Last 200 disablements. 1=Print item, 2=Print all']],
  hAll: ['COMMON HISTORY', 'plain', 'No events recorded.', ['Last 1000 events. 1=Print item, 2=Print all']],
  light: ['LIGHTLY CONTAMINATED', 'plain', 'No lightly contaminated detectors.', ['1=Print item, 2=Print all']],
  heavy: ['HEAVILY CONTAMINATED', 'plain', 'No heavily contaminated detectors.', ['1=Print item, 2=Print all']],
  zones: ['ZONE', 'plain', '', ['OK=Loop units in the zone.']],
  zunits: ['LOOP UNIT', 'plain', '', ['Left arrow = back to the zones.']],
};
const HIST_CAT = { hFire: 'fire', hFault: 'fault', hDis: 'dis' };
const HAS_DETAIL = new Set(['fault', 'warning', 'pre', 'dis', 'old', 'hFire', 'hFault', 'hDis', 'hAll']);
const SETTINGS = {
  dimmer: 'SET DIMMER', time: 'SET TIME', date: 'SET DATE', beep: 'KEYBOARD BEEP',
  ce: 'CAUSE EFFECT IN TEST MODE', t1: 'ALARM DELAY TIME 1 (MUTE)', t2: 'ALARM DELAY TIME 2 (RESET)',
};

export class Panel {
  constructor(opts) {
    this.subs = new Set();
    this.rev = 0;
    this.onFx = null; // sound hook: 'key' | 'ok' | 'err' | 'alarm' | 'chirp'
    this.init(opts);
  }

  /** idle = false switches off the display time-outs, so a lesson step is never pulled away. */
  init({ now = Date.now(), level = 1, idle = true, name = 'M/T TRAINING SHIP', saved = null } = {}) {
    this.now = now;
    this.level = level;
    this.idle = idle;
    this.name = name;
    this.seq = 0;
    this.fires = [];
    this.pre = [];
    this.faults = [];
    this.warnings = [];
    this.dis = [];
    this.old = [];
    this.hist = [];
    this.set = { dimmer: DIMMER, beep: true, ce: false, t1: 120, t2: 120 };
    this.cond = new Map(); // "zone:addr" -> { kind: 'fire' | 'pre', clearAt? }  what the unit senses
    this.causes = new Set(); // fault causes that are still present
    this.cnt = {}; // counters the lessons look at
    this.fireSel = 0;
    this.stack = [{ t: 'home' }];
    this.popup = null;
    this.lamp = null;
    this.delay = null; // alarm delay running: { phase: 't1' | 't2', left: ms }
    this.bellsTrig = false; // alarm devices have been activated
    this.bellsMuted = false; // ... and silenced with MUTE
    this.buzzMuted = false; // local buzzer silenced
    this.idleMs = 0;
    if (saved) this.load(saved);
    this.bump();
  }

  subscribe = fn => { this.subs.add(fn); return () => this.subs.delete(fn); };
  bump() { this.rev++; for (const fn of this.subs) fn(); }
  fx(name) { if (this.onFx) this.onFx(name); }
  count(name) { this.cnt[name] = (this.cnt[name] || 0) + 1; }

  // ------------------------------------------------------------ small helpers
  get top() { return this.stack[this.stack.length - 1]; }
  go(screen) { this.stack.push(screen); }
  back() { if (this.stack.length > 1) this.stack.pop(); }
  goTop() { this.stack = [{ t: this.fires.length ? 'fire' : 'home' }]; }
  open(screen) { this.goTop(); if (screen.t !== this.top.t) this.go(screen); }
  /** A new fault or pre-alarm takes the display, unless there is a fire or the user is entering something. */
  show(screen) { if (!this.fires.length && !['wiz', 'login', 'set', 'confirm'].includes(this.top.t)) this.open(screen); }

  say(text, tone = 'info', ms = 3500) {
    this.popup = { text, tone, left: ms };
    if (tone !== 'info') this.fx(tone);
  }

  need(level) {
    if (this.level >= level) return true;
    this.count('denied');
    this.say(level === 4 ? 'Access level 4 required.\nService personnel only.' : `Access level ${LEVEL_NAME[level]} required.\nMenu » 4 Login`, 'err');
    return false;
  }

  log(cat, text, sub = '') {
    this.hist.unshift({ id: ++this.seq, at: this.now, cat, text, sub });
    if (this.hist.length > 1000) this.hist.length = 1000;
  }

  has(kind, grp) { return this.dis.some(d => d.kind === kind && (!grp || d.grp === grp || d.grp === 'ALL')); }
  inTest(zone) { return this.dis.some(d => d.kind === 'test' && d.zone === zone); }
  unitDisabled(u) {
    return this.dis.some(d => d.zone === u.zone &&
      ((d.kind === 'unit' && d.addr === u.addr) || (d.kind === 'zone' && matchType(d.dtype, u.type))));
  }

  get realFires() { return this.fires.filter(f => !f.test); }

  // ------------------------------------------------------------ lamps and outputs
  get leds() {
    if (this.lamp) return new Proxy({}, { get: () => 'on' });
    const st = (list, any = list.length > 0) => (list.some(x => !x.muted) ? 'flash' : any ? 'on' : 'off');
    const on = v => (v ? 'on' : 'off');
    return {
      power: 'on',
      fire: st(this.fires),
      prealarm: st(this.pre),
      fault: st(this.faults),
      dis: on(this.dis.length),
      shortcuts: 'off',
      multi: on(this.fires.length > 1),
      sysFault: 'off',
      test: on(this.has('test')),
      warning: on(this.warnings.length),
      zone: this.faults.some(f => f.zone) ? 'flash' : on(this.dis.some(d => d.kind === 'unit' || d.kind === 'zone' || d.kind === 'test')),
      alarmDev: this.faults.some(f => f.dev) ? 'flash' : on(this.has('devices')),
      delayOff: on(this.has('delay')),
    };
  }

  get out() {
    const real = this.realFires;
    const testBells = this.set.ce && this.fires.some(f => f.test);
    const bells = !this.has('devices') && ((real.length > 0 && this.bellsTrig && !this.bellsMuted) || testBells);
    const unmuted = list => list.some(x => !x.muted);
    let buzzer = null;
    if (this.lamp) buzzer = 'test';
    else if (!this.buzzMuted) buzzer = unmuted(this.fires) ? 'fire' : unmuted(this.pre) ? 'pre' : unmuted(this.faults) ? 'fault' : null;
    return {
      buzzer,
      bells,
      bellsOff: this.has('devices'),
      delay: this.delay ? { phase: this.delay.phase, secs: Math.ceil(this.delay.left / 1000) } : null,
      doorsClosed: real.length > 0 && !this.has('ext', 'DOORS'),
      ventStopped: real.length > 0 && !this.has('ext', 'VENT'),
    };
  }

  // ------------------------------------------------------------ the ship (field) side
  fieldFire(zone, addr) { this.sense(zone, addr, 'fire'); }
  fieldPre(zone, addr) { this.sense(zone, addr, 'pre'); }

  sense(zone, addr, kind) {
    const u = unitAt(zone, addr);
    if (!u || (kind === 'pre' && u.type === 'MCP')) return;
    // test gas drifts away by itself; real smoke stays until someone clears it
    this.cond.set(unitKey(u), { kind, clearAt: kind === 'fire' && this.inTest(zone) ? this.now + 8000 : null });
    this.evaluate();
    this.settle();
  }

  fieldClear(zone, addr) {
    if (zone == null) this.cond.clear(); else this.cond.delete(`${zone}:${addr}`);
    this.evaluate();
    this.settle();
  }

  /** key: 'mains' | 'battery' | 'earth' | 'bell' | 'noanswer:zone:addr' | 'dirty:zone:addr' */
  fieldFault(key, on) {
    const [kind, z, a] = key.split(':');
    const unit = z ? unitAt(+z, +a) : null;
    if (z && !unit) return;
    if (!on) {
      this.causes.delete(key);
      if (kind === 'dirty') this.warnings = this.warnings.filter(w => w.key !== key); // cleaned or replaced
    } else if (!this.causes.has(key)) {
      this.causes.add(key);
      // came back before the old fault was reset: that entry is still in the list
      if (this.faults.some(f => f.key === key) || this.warnings.some(w => w.key === key)) return this.settle();
      if (kind === 'dirty') {
        this.warnings.push({ id: ++this.seq, key, code: 130, name: FAULT_CODES[130].name, src: unitName(unit), sub: unit.text, at: this.now, muted: true, unit });
        this.log('fault', `WARNING ${unitName(unit)} DIRTY SENSOR`, unit.text);
      } else {
        const def = unit ? { code: 128, src: unitName(unit), sub: unit.text, zone: true } : SYSTEM_FAULTS[kind];
        if (!def) { this.causes.delete(key); return; }
        const f = { id: ++this.seq, key, code: def.code, name: FAULT_CODES[def.code].name, src: def.src, sub: def.sub, at: this.now, muted: false, zone: !!def.zone, dev: !!def.dev };
        this.faults.push(f);
        this.buzzMuted = false;
        this.log('fault', `${f.src} ${f.name}, FAULT(${f.code})`, f.sub);
        this.show({ t: 'list', kind: 'fault', sel: this.faults.length - 1 });
      }
    }
    this.settle();
  }

  // ------------------------------------------------------------ alarms
  evaluate() {
    const kindOf = x => (this.cond.get(unitKey(x)) || {}).kind;
    this.fires = this.fires.filter(f => !this.unitDisabled(f));
    this.pre = this.pre.filter(p => !this.unitDisabled(p));
    for (const [key, c] of this.cond) {
      const [z, a] = key.split(':').map(Number);
      const u = unitAt(z, a);
      if (!u || this.unitDisabled(u)) continue; // a disabled unit reports nothing
      const same = x => x.zone === z && x.addr === a;
      if (c.kind === 'fire') {
        this.pre = this.pre.filter(p => !same(p));
        if (!this.fires.some(same)) this.raiseFire(u);
      } else if (!this.fires.some(same) && !this.pre.some(same)) this.raisePre(u);
    }
    // a pre-alarm stays only while the unit is at pre-alarm level (5.3)
    this.pre = this.pre.filter(p => kindOf(p) === 'pre');
    // test alarms reset themselves; one left behind when test mode ends is dropped
    this.fires = this.fires.filter(f => !f.test || (kindOf(f) === 'fire' && this.inTest(f.zone)));
    if (!this.realFires.length) { this.delay = null; this.bellsTrig = false; this.bellsMuted = false; }
  }

  raiseFire(u) {
    const test = this.inTest(u.zone);
    const f = { id: ++this.seq, zone: u.zone, addr: u.addr, type: u.type, text: u.text, at: this.now, muted: test, test };
    this.fires.push(f);
    this.log('fire', `${test ? 'TEST' : 'FIRE'} ${unitName(u)}`, u.text);
    if (test) this.fx('chirp');
    else {
      this.buzzMuted = false;
      this.bellsMuted = false;
      // Cause/effect of this sample ship: a call point or a second alarm rings the
      // bells at once; one detector alone starts the alarm delay.
      if (this.has('delay') || u.type === 'MCP' || this.realFires.length > 1 || !this.set.t1) { this.bellsTrig = true; this.delay = null; }
      else if (!this.bellsTrig && !this.delay) this.delay = { phase: 't1', left: this.set.t1 * 1000 };
      this.fx('alarm');
    }
    // fire takes the display, whatever was on it
    this.stack = [{ t: 'fire' }];
    if (test || this.fires.length === 1) this.fireSel = this.fires.indexOf(f);
  }

  raisePre(u) {
    this.pre.push({ id: ++this.seq, zone: u.zone, addr: u.addr, type: u.type, text: u.text, at: this.now, muted: false });
    this.buzzMuted = false;
    this.log('fire', `PRE-ALARM ${unitName(u)}`, u.text);
    this.show({ t: 'list', kind: 'pre', sel: this.pre.length - 1 });
  }

  doMute() {
    const s = this.top;
    const unmuted = list => list.some(x => !x.muted);
    const onList = s.t === 'list' && (s.kind === 'fault' || s.kind === 'pre') ? s.kind : null;
    // ringing bells count too: after a resound, or when delay time 2 ran out
    const what = onList === 'fault' && this.faults.length ? 'fault' : onList === 'pre' && this.pre.length ? 'pre'
      : unmuted(this.fires) || this.out.bells ? 'fire' : unmuted(this.pre) ? 'pre' : unmuted(this.faults) ? 'fault' : null;
    if (!what) return;
    if (this.level < 2) {
      // without a code only the local buzzer can be silenced (5.1)
      this.buzzMuted = true;
      this.count('muteLocal');
      this.say('Local buzzer silenced.\nLog in to mute the alarm: Menu » 4 Login');
      return;
    }
    if (what === 'fire') {
      this.fires.forEach(f => { f.muted = true; });
      this.bellsMuted = true;
      if (s.t !== 'detail') this.goTop(); // muted from inside a menu: back to the fire list
      // muted in time: delay time 2 now runs, the time allowed to reset the alarm
      if (this.delay && this.delay.phase === 't1') this.delay = this.set.t2 ? { phase: 't2', left: this.set.t2 * 1000 } : null;
      this.log('fire', 'Fire alarm muted');
    } else if (what === 'pre') this.pre.forEach(p => { p.muted = true; });
    else { this.faults.forEach(f => { f.muted = true; }); this.log('fault', 'Faults muted'); }
  }

  doReset() {
    const s = this.top;
    if (s.t === 'list' && s.kind === 'fault') return this.resetFault(this.faults[s.sel]);
    if (s.t === 'list' && s.kind === 'dis') return this.reconnect(this.dis[s.sel]);
    if (s.t === 'list' && s.kind === 'pre') return this.pre.length ? this.say('A pre-alarm cannot be reset.\nIt clears when the smoke level drops.', 'err') : undefined;
    if (s.t === 'detail' && s.kind === 'fault') return this.resetFault(this.faults.find(f => f.id === s.id));
    if (s.t === 'detail' && s.kind === 'dis') return this.reconnect(this.dis.find(d => d.id === s.id));
    if (this.fires.length) {
      const f = s.t === 'detail' && s.kind === 'fire' ? this.fires.find(x => x.id === s.id) : this.fires[this.fireSel];
      if (s.t !== 'detail' && this.level >= 2) this.goTop();
      return this.resetFire(f);
    }
  }

  resetFire(f) {
    if (!f || !this.need(2)) return false;
    const stuck = !f.test && (this.cond.get(unitKey(f)) || {}).kind === 'fire';
    if (stuck) {
      this.count('resetFail');
      this.say(`Reset not possible.\n${unitName(f)} is still in alarm condition.`, 'err', 4500);
      return false;
    }
    this.fires = this.fires.filter(x => x !== f);
    this.log('fire', `Reset: FIRE ${unitName(f)}`, f.text);
    this.evaluate();
    if (!this.fires.length) { this.goTop(); this.say('Fire alarm reset.', 'ok', 2200); }
    return true;
  }

  resetAllFires() {
    if (!this.fires.length) return this.say('No fire alarms.');
    const n = this.fires.length;
    for (const f of [...this.fires]) {
      if (!f.test && (this.cond.get(unitKey(f)) || {}).kind === 'fire') continue;
      this.fires = this.fires.filter(x => x !== f);
      this.log('fire', `Reset: FIRE ${unitName(f)}`, f.text);
    }
    this.evaluate();
    const left = this.fires.length;
    if (left) { this.count('resetFail'); this.say(`${n - left} of ${n} fire alarms reset.\n${left} still in alarm condition.`, 'err', 4500); }
    else { this.goTop(); this.say('All fire alarms reset.', 'ok', 2200); }
  }

  resound() {
    if (!this.realFires.length) return this.say('No fire alarms.');
    this.bellsTrig = true;
    this.bellsMuted = false;
    this.delay = null;
    this.log('fire', 'Resound: alarm devices restarted');
    this.say('Alarm devices restarted.', 'ok', 2200);
  }

  resetFault(f) {
    if (!f || !this.need(2)) return false;
    if (this.causes.has(f.key)) {
      this.count('resetFail');
      this.say(`Reset not possible - the fault remains.\nCheck fault code ${f.code} in the fault code list.`, 'err', 4500);
      return false;
    }
    this.faults = this.faults.filter(x => x !== f);
    this.log('fault', `Reset: ${f.src} ${f.name}`, f.sub);
    if (!this.faults.length) this.say('Fault reset.', 'ok', 2200);
    return true;
  }

  resetAllFaults() {
    if (!this.faults.length) return this.say('No fault alarms.');
    const n = this.faults.length;
    this.faults = this.faults.filter(f => this.causes.has(f.key));
    const left = this.faults.length;
    this.log('fault', `Reset all faults: ${n - left} of ${n} reset`);
    if (left) { this.count('resetFail'); this.say(`${n - left} of ${n} faults reset.\n${left} remain - the cause is still there.`, 'err', 4500); }
    else this.say('All faults reset.', 'ok', 2200);
  }

  // ------------------------------------------------------------ disablements
  disName(d) {
    switch (d.kind) {
      case 'unit': { const u = unitAt(d.zone, d.addr); return u ? unitName(u) : `ZONE ${d.zone} UNIT ${d.addr}`; }
      case 'zone': return `ZONE ${d.zone} ${groupLabel(d.dtype).toUpperCase()}`;
      case 'test': return `ZONE ${d.zone} TEST MODE`;
      case 'devices': return 'ALARM DEVICES (BELLS ETC.)';
      case 'ext': return `EXTERNAL CONTROLS: ${EXT_GROUPS[d.grp].toUpperCase()}`;
      case 'transfer': return 'ALARM TRANSFER OUTPUT';
      default: return 'ALARM DELAY';
    }
  }

  disSub(d) {
    if (d.kind === 'unit') return (unitAt(d.zone, d.addr) || {}).text || '';
    return d.zone ? (zoneByNo(d.zone) || {}).name || '' : '';
  }

  disMode(d) {
    if (d.kind === 'test') return `Test mode - ends ${hhmm(d.until)}`;
    if (d.mode === 'timer') return `Timer - reconnects ${hhmm(d.until)}`;
    if (d.mode === 'clock') return `Clock - reconnects ${hhmm(d.until)}`;
    return 'Permanent';
  }

  addDis(d) {
    const same = x => x.kind === d.kind && x.zone === d.zone && x.addr === d.addr && x.dtype === d.dtype && x.grp === d.grp;
    if (this.dis.some(same)) return false;
    const e = { id: ++this.seq, at: this.now, mode: 'perm', until: null, ...d };
    this.dis.push(e);
    this.log('dis', `Disabled: ${this.disName(e)}`, this.disMode(e));
    this.evaluate();
    return true;
  }

  removeDis(d, why = 'Reconnected') {
    this.dis = this.dis.filter(x => x !== d);
    if (d.kind !== 'test') { this.old.unshift({ ...d, removed: this.now }); this.old.length = Math.min(this.old.length, 150); }
    this.log('dis', `${why}: ${this.disName(d)}`, this.disSub(d));
    this.evaluate(); // a reconnected unit that still sees smoke alarms at once
  }

  reconnect(d) {
    if (!d || !this.need(2)) return false;
    this.removeDis(d, d.kind === 'test' ? 'Test mode ended' : 'Reconnected');
    if (!this.fires.length) this.say(this.dis.length ? 'Disablement removed.' : 'Disablement removed.\nNo disablements left.', 'ok', 2400);
    return true;
  }

  // confirm screens: [title, question lines, what OK does]
  confirmDef(act) {
    const [kind, grp] = act.split(':');
    if (kind === 'removeAll') return ['REMOVE ALL DISABLEMENTS', [`${this.dis.length} active disablement(s) will be reconnected.`], () => {
      if (!this.dis.length) return this.say('No disablements.');
      for (const d of [...this.dis]) this.removeDis(d);
      this.goTop();
      if (!this.fires.length) this.say('All disablements removed.', 'ok', 2400);
    }];
    if (kind === 'test') {
      const z = zoneByNo(+grp);
      return ['TEST MODE', [`Set ZONE ${z.no} in test mode?`, z.name, 'Alarms are shown, bells and outputs stay off.'], () => {
        if (!this.addDis({ kind: 'test', zone: z.no, mode: 'timer', until: this.now + 2 * HOUR })) return this.say('This zone is already in test mode.');
        this.ack([`ZONE ${z.no} TEST MODE`, z.name, 'Returns to normal after 2 hours.']);
      }];
    }
    const d = kind === 'ext' ? { kind, grp } : { kind };
    const warn = kind === 'devices' ? 'Bells and other alarm devices will NOT sound on a fire alarm.'
      : kind === 'transfer' ? 'The alarm transfer output will NOT be activated on a fire alarm.'
        : 'These outputs will NOT be activated on a fire alarm.';
    return ['NEW DISABLEMENT', [this.disName(d), warn], () => {
      if (!this.addDis(d)) return this.say('Already disabled.');
      this.ack([this.disName(d), 'Permanent']);
    }];
  }

  /** Acknowledgement of a new disablement (5.7.3); OK goes on to the list. */
  ack(lines) {
    this.fx('ok');
    this.stack = [{ t: this.fires.length ? 'fire' : 'home' }, { t: 'menu', m: 'dis', sel: 1 },
      { t: 'ack', lines }];
  }

  startWiz(target, preset = {}) {
    const step = { zone: 'zone', unit: 'zone', test: 'zone', delay: 'mode' }[target];
    this.go({ t: 'wiz', target, step, buf: '', sel: 0, zi: 0, ...preset });
  }

  wizUnits(s) {
    const z = zoneByNo(s.zone);
    return z ? z.units.filter(u => matchType(s.dtype, u.type)) : [];
  }

  // step through a list of numbers with the arrows
  stepNum(buf, list, k) {
    if (!list.length) return buf;
    const i = list.indexOf(+buf);
    const next = i < 0 ? 0 : (i + (k === 'down' ? 1 : -1) + list.length) % list.length;
    return String(list[next]);
  }

  wizKey(s, k) {
    const edit = max => {
      if (isDigit(k)) { s.buf = s.fresh ? k : (s.buf + k).slice(0, max); s.fresh = false; return true; }
      if (k === 'erase') { s.buf = s.fresh ? '' : s.buf.slice(0, -1); s.fresh = false; return true; }
      return false;
    };
    const pick = n => {
      if (isDigit(k) && +k >= 1 && +k <= n) return +k - 1;
      if (k === 'up' || k === 'down') s.sel = (s.sel + (k === 'down' ? 1 : n - 1)) % n;
      return isOk(k) ? s.sel : -1;
    };
    if (k === 'left') {
      const order = { unit: ['zone', 'dtype', 'addr', 'addr2', 'mode', 'time'], zone: ['zone', 'dtype', 'mode', 'time'], test: ['zone'], delay: ['mode', 'time'] }[s.target];
      const i = order.indexOf(s.step);
      if (i <= 0 || s.fromList) return this.back();
      s.step = order[i - 1];
      s.buf = s.step === 'zone' ? '' : s.step === 'addr' ? String(s.a1 || '') : s.step === 'addr2' ? String(s.a2 || s.a1 || '') : '';
      s.sel = 0;
      s.fresh = false;
      return;
    }
    switch (s.step) {
      case 'zone': { // the list of zones: scroll to one, or type its number, then OK
        if (isDigit(k)) {
          const two = s.buf + k;
          s.buf = s.buf && zoneByNo(+two) ? two : k; // 1 then 2 = zone 12
          const i = ZONES.findIndex(z => z.no === +s.buf);
          if (i >= 0) s.zi = i; else s.buf = '';
          return;
        }
        if (k === 'erase') { s.buf = ''; return; }
        if (k === 'up' || k === 'down') { s.zi = (s.zi + (k === 'down' ? 1 : ZONES.length - 1)) % ZONES.length; s.buf = ''; return; }
        if (!isOk(k)) return;
        const z = ZONES[s.zi];
        s.zone = z.no;
        if (s.target === 'test') {
          if (this.inTest(z.no)) return this.say('This zone is already in test mode.');
          return this.go({ t: 'confirm', act: 'test:' + z.no }); // Abort or OK
        }
        s.step = 'dtype'; s.sel = 0; s.buf = '';
        return;
      }
      case 'dtype': {
        const i = pick(TYPE_GROUPS.length);
        if (i < 0) return;
        s.dtype = TYPE_GROUPS[i][0];
        if (!this.wizUnits(s).length) return this.say(`No ${TYPE_GROUPS[i][1].toLowerCase()} in zone ${s.zone}.`, 'err');
        s.step = s.target === 'zone' ? 'mode' : 'addr'; s.sel = 0; s.buf = '';
        return;
      }
      case 'addr':
      case 'addr2': {
        const first = s.step === 'addr';
        const addrs = this.wizUnits(s).map(u => u.addr).filter(a => first || a >= s.a1);
        if (edit(3)) return;
        if (k === 'up' || k === 'down') { s.buf = this.stepNum(s.buf, addrs, k); s.fresh = false; return; }
        if (!isOk(k)) return;
        if (!addrs.includes(+s.buf)) {
          return this.say(!s.buf ? 'Enter a detector address.' : first ? `No such unit at address ${s.buf} in zone ${s.zone}.` : `Enter an address from ${s.a1} upwards.`, 'err');
        }
        if (first) { s.a1 = +s.buf; s.step = 'addr2'; s.fresh = true; } // "to" starts as the same address
        else { s.a2 = +s.buf; s.step = 'mode'; s.sel = 0; s.buf = ''; }
        return;
      }
      case 'mode': {
        const i = pick(MODES.length);
        if (i < 0) return;
        s.mode = MODES[i][0];
        if (s.mode === 'periodic') return this.say('Periodic disablements are not part of this trainer.');
        if (s.mode === 'perm') return this.wizDone(s);
        s.step = 'time'; s.buf = '';
        return;
      }
      default: { // time, hh:mm
        if (edit(4) || !isOk(k)) return;
        if (s.buf.length < 4) return this.say('Enter the time as four digits: hh mm', 'err');
        const h = +s.buf.slice(0, 2), m = +s.buf.slice(2);
        if (h > 23 || m > 59 || (s.mode === 'timer' && !h && !m)) return this.say('Time not valid (max 23:59).', 'err');
        if (s.mode === 'timer') s.until = this.now + h * HOUR + m * MIN;
        else {
          const d = new Date(this.now);
          d.setHours(h, m, 0, 0);
          if (d.getTime() <= this.now) d.setDate(d.getDate() + 1); // next time that clock time occurs
          s.until = d.getTime();
        }
        return this.wizDone(s);
      }
    }
  }

  wizDone(s) {
    const base = { mode: s.mode, until: s.until || null };
    let made = [];
    if (s.target === 'delay') made = [{ kind: 'delay', ...base }];
    else if (s.target === 'zone') made = [{ kind: 'zone', zone: s.zone, dtype: s.dtype, ...base }];
    else made = this.wizUnits(s).filter(u => u.addr >= s.a1 && u.addr <= s.a2).map(u => ({ kind: 'unit', zone: u.zone, addr: u.addr, ...base }));
    const added = made.filter(d => this.addDis(d));
    if (!added.length) return this.say('Already disabled.');
    const first = this.dis.find(d => d.kind === added[0].kind && d.zone === added[0].zone && d.addr === added[0].addr);
    const lines = [this.disName(first) + (added.length > 1 ? ` - ${added[added.length - 1].addr}` : ''), this.disSub(first), this.disMode(first)];
    if (this.top.t === 'wiz') this.ack(lines.filter(Boolean)); // not when a fire took the display meanwhile
  }

  // ------------------------------------------------------------ keys
  key(k) {
    this.idleMs = 0;
    if (this.lamp) return; // display test running
    const hadPopup = !!this.popup;
    this.popup = null;
    this.fx('key');
    if (!(hadPopup && (k === 'ok' || k === 'enter' || k === 'esc'))) this.handle(k); // those keys just close a message
    this.settle();
  }

  handle(k) {
    switch (k) {
      case 'day':
      case 'night':
        this.set.dimmer = clamp(this.set.dimmer + (k === 'day' ? 1 : -1), 1, 9);
        return this.say(`Dimmer level ${this.set.dimmer}`, 'info', 1200);
      case 'esc': return this.top.t === 'confirm' ? this.back() : this.goTop(); // on a question, ESC = Abort
      case 'menu': return this.open({ t: 'menu', m: 'main', sel: 0 });
      case 'status': return this.open({ t: 'status', sel: 0 });
      case 'shortcuts': return this.open({ t: 'menu', m: 'shortcuts', sel: 0 });
      case 'fire': return this.open({ t: 'fire' });
      case 'prealarm': return this.open({ t: 'list', kind: 'pre', sel: 0 });
      case 'fault': return this.open({ t: 'list', kind: 'fault', sel: 0 });
      case 'dis': return this.open({ t: 'menu', m: 'dis', sel: this.dis.length ? 1 : 0 });
      case 'multi':
        if (!this.fires.length) return;
        this.goTop();
        this.fireSel = (this.fireSel + 1) % this.fires.length;
        return;
      case 'mute': return this.doMute();
      case 'reset': return this.doReset();
      default: return this.screenKey(this.top, k);
    }
  }

  move(s, n, k, wrap) {
    if (!n) return;
    const d = k === 'down' ? 1 : -1;
    s.sel = wrap ? (s.sel + d + n) % n : clamp(s.sel + d, 0, n - 1);
  }

  screenKey(s, k) {
    if (k === 'left' && s.t !== 'wiz' && s.t !== 'login') return this.back();
    switch (s.t) {
      case 'fire':
        if (k === 'up' || k === 'down') this.fireSel = clamp(this.fireSel + (k === 'down' ? 1 : -1), 0, Math.max(0, this.fires.length - 1));
        else if (isOk(k) && this.fires.length) this.go({ t: 'detail', kind: 'fire', id: this.fires[this.fireSel].id });
        else if (k === '0' && this.fires.length && this.need(2)) { // disable from the fire list (5.7.5)
          const f = this.fires[this.fireSel];
          this.startWiz('unit', { step: 'mode', zone: f.zone, dtype: f.type, a1: f.addr, a2: f.addr, fromList: true });
        }
        return;
      case 'menu': {
        const items = MENUS[s.m][1];
        if (k === 'up' || k === 'down') return this.move(s, items.length, k, true);
        const i = isDigit(k) ? items.findIndex(it => it[0] === +k) : isOk(k) ? s.sel : -1;
        if (i < 0) return;
        s.sel = i;
        return this.choose(items[i]);
      }
      case 'list': {
        const rows = this.rows(s);
        if (k === 'up' || k === 'down') return this.move(s, rows.length, k);
        if (k === '1' || k === '2') return this.say('No printer connected.', 'err');
        if (!rows.length) return;
        if (s.kind === 'old' && k === '0') return this.reactivate(this.old[s.sel]);
        if (!isOk(k)) return;
        if (s.kind === 'zones') return this.go({ t: 'list', kind: 'zunits', zone: ZONES[s.sel].no, sel: 0 });
        if (HAS_DETAIL.has(s.kind)) this.go({ t: 'detail', kind: s.kind, id: rows[s.sel].id });
        return;
      }
      case 'status':
        if (k === 'up' || k === 'down') return this.move(s, 3, k, true);
        if (k === '1') return this.say('No USB memory connected.', 'err');
        if (k === '2') return this.go({ t: 'menu', m: 'maint', sel: 0 });
        if (isOk(k)) this.go([{ t: 'fire' }, { t: 'list', kind: 'fault', sel: 0 }, { t: 'list', kind: 'dis', sel: 0 }][s.sel]);
        return;
      case 'login': return this.loginKey(s, k);
      case 'wiz': return this.wizKey(s, k);
      case 'confirm':
        if (k === 'ok' || k === 'enter') this.confirmDef(s.act)[2]();
        return;
      case 'ack':
        if (isOk(k)) { this.back(); this.go({ t: 'list', kind: 'dis', sel: Math.max(0, this.dis.length - 1) }); }
        return;
      case 'set': return this.setKey(s, k);
      case 'detail':
      case 'system':
        if (k === 'ok' || k === 'enter') this.back();
        return;
      default:
    }
  }

  choose([, , to, level]) {
    if (level && !this.need(level)) return;
    if (to.m) this.go({ t: 'menu', m: to.m, sel: 0 });
    else if (to.list) this.go({ t: 'list', kind: to.list, sel: 0 });
    else if (to.s === 'login') this.go({ t: 'login', step: 'user', sel: 0, code: '' });
    else if (to.s) this.go({ t: to.s });
    else if (to.wiz) this.startWiz(to.wiz);
    else if (to.confirm) this.go({ t: 'confirm', act: to.confirm });
    else if (to.set) this.go({ t: 'set', what: to.set, buf: '', val: this.set[to.set] });
    else if (to.act) this[to.act]();
  }

  reactivate(d) {
    if (!d || !this.need(2)) return;
    if (d.mode !== 'perm') return this.say('Only permanent disablements can be reactivated.', 'err');
    const { removed, id, at, ...rest } = d;
    if (!this.addDis(rest)) return this.say('Already disabled.');
    this.old = this.old.filter(x => x !== d);
    this.ack([this.disName(rest), this.disSub(rest), 'Permanent'].filter(Boolean));
  }

  loginKey(s, k) {
    if (s.step === 'user') {
      if (k === 'left') return this.back();
      if (k === '0' && this.level > 1) {
        this.level = 1;
        this.log('io', 'Logged out');
        this.back();
        return this.say('Logged out.\nAccess level 1', 'ok', 2400);
      }
      if (k === 'up' || k === 'down') return this.move(s, USERS.length, k, true);
      const i = isDigit(k) && +k >= 1 && +k <= USERS.length ? +k - 1 : isOk(k) ? s.sel : -1;
      if (i >= 0) { s.sel = i; s.step = 'code'; s.code = ''; }
      return;
    }
    if (k === 'left') { s.step = 'user'; s.code = ''; return; }
    if (isDigit(k)) { s.code = (s.code + k).slice(0, 4); return; }
    if (k === 'erase') { s.code = s.code.slice(0, -1); return; }
    if (k !== 'ok' && k !== 'enter') return;
    const level = USERS[s.sel][0];
    if (s.code.length === 4 && s.code === CODES[level]) {
      this.level = level;
      this.log('io', `Login: ${USERS[s.sel][1]}, access level ${LEVEL_NAME[level]}`);
      this.back();
      return this.say(`Login OK.\nAccess level ${LEVEL_NAME[level]}`, 'ok', 2600);
    }
    s.code = '';
    this.count('badCode');
    this.say('Wrong access code.', 'err');
  }

  setKey(s, k) {
    const done = msg => { this.back(); this.say(msg, 'ok', 2200); };
    const bool = s.what === 'beep' || s.what === 'ce';
    if (bool) {
      if (k === 'up' || k === 'down') s.val = !s.val;
      else if (k === '1' || k === '0') s.val = k === '1';
      else if (k === 'ok' || k === 'enter') { this.set[s.what] = s.val; done(`${SETTINGS[s.what]}: ${s.val ? 'ON' : 'OFF'}`); }
      return;
    }
    if (s.what === 'dimmer') {
      if (k === 'up' || k === 'down') s.val = clamp(s.val + (k === 'up' ? 1 : -1), 1, 9);
      else if (isDigit(k) && k !== '0') s.val = +k;
      else if (k === 'ok' || k === 'enter') return done(`Dimmer level ${s.val}`);
      this.set.dimmer = s.val; // shown at once
      return;
    }
    const len = s.what === 'time' ? 4 : s.what === 'date' ? 6 : 3;
    if (isDigit(k)) { s.buf = (s.buf + k).slice(0, len); return; }
    if (k === 'erase') { s.buf = s.buf.slice(0, -1); return; }
    if (k !== 'ok' && k !== 'enter') return;
    const d = new Date(this.now);
    if (s.what === 'time') {
      const h = +s.buf.slice(0, 2), m = +s.buf.slice(2);
      if (s.buf.length < 4 || h > 23 || m > 59) return this.say('Enter the time as hh mm.', 'err');
      d.setHours(h, m, 0, 0);
    } else if (s.what === 'date') {
      const dd = +s.buf.slice(0, 2), mm = +s.buf.slice(2, 4), yy = 2000 + +s.buf.slice(4);
      const t = new Date(yy, mm - 1, dd, d.getHours(), d.getMinutes(), d.getSeconds());
      if (s.buf.length < 6 || t.getMonth() !== mm - 1 || t.getDate() !== dd) return this.say('Enter the date as dd mm yy.', 'err');
      d.setTime(t.getTime());
    } else {
      if (!s.buf || +s.buf > 120) return this.say('Enter 0 to 120 seconds.\nMax 2 minutes acc. to SOLAS.', 'err');
      this.set[s.what] = +s.buf;
      return done(`${SETTINGS[s.what]}: ${+s.buf} s`);
    }
    // timed disablements keep their remaining time when the clock is changed
    const shift = d.getTime() - this.now;
    this.dis.forEach(x => { if (x.until) x.until += shift; });
    this.now = d.getTime();
    done(s.what === 'time' ? `Time set: ${hhmm(this.now)}` : `Date set: ${dateStr(this.now)}`);
  }

  lampTest() {
    this.lamp = { t: 0 };
    this.count('lamp');
  }

  // ------------------------------------------------------------ time
  tick(realMs, simMs = realMs) {
    let dirty = false;
    const minute = Math.floor(this.now / MIN);
    this.now += simMs;
    if (Math.floor(this.now / MIN) !== minute) dirty = true;
    if (this.popup && (this.popup.left -= realMs) <= 0) { this.popup = null; dirty = true; }
    if (this.lamp) {
      const phase = Math.floor(this.lamp.t / 1000);
      this.lamp.t += realMs;
      if (this.lamp.t >= LAMP_MS) this.lamp = null;
      if (!this.lamp || Math.floor(this.lamp.t / 1000) !== phase) dirty = true;
    }
    if (this.delay) {
      const secs = Math.ceil(this.delay.left / 1000);
      this.delay.left -= simMs;
      if (this.delay.left <= 0) {
        // not muted (T1) or not reset (T2) in time: the alarm devices start
        this.delay = null;
        this.bellsTrig = true;
        this.bellsMuted = false;
        this.log('fire', 'Alarm delay ended: alarm devices activated');
        dirty = true;
      } else if (Math.ceil(this.delay.left / 1000) !== secs) dirty = true;
    }
    for (const d of [...this.dis]) {
      if (d.until && this.now >= d.until) { this.removeDis(d, d.kind === 'test' ? 'Test mode ended' : 'Time out, reconnected'); dirty = true; }
    }
    let cleared = false;
    for (const [key, c] of this.cond) if (c.clearAt && this.now >= c.clearAt) { this.cond.delete(key); cleared = true; }
    if (cleared) { this.evaluate(); dirty = true; }
    if (this.idle) {
      const was = this.idleMs;
      this.idleMs += realMs;
      const passed = ms => was < ms && this.idleMs >= ms;
      // the list returns to the first fire alarm after 30 s without a key (4.1.2)
      if (passed(30e3) && this.fires.length && this.fireSel) { this.fireSel = 0; dirty = true; }
      if (passed(120e3) && this.stack.length > 1) { this.goTop(); dirty = true; }
      if (passed(30 * MIN) && this.level > 1) { this.level = 1; this.log('io', 'No key for 30 minutes: logged out'); dirty = true; }
    }
    if (dirty) this.settle();
  }

  /** Tidy up after any change: screens whose content has gone, selections past the end. */
  settle() {
    this.fireSel = clamp(this.fireSel, 0, Math.max(0, this.fires.length - 1));
    for (;;) {
      const s = this.top;
      if (s.t === 'detail' && !this.detailItem(s)) this.stack.pop();
      else if (s.t === 'fire' && !this.fires.length && this.stack.length === 1) this.stack = [{ t: 'home' }];
      else break;
    }
    if (this.stack[0].t === 'home' && this.fires.length) this.stack[0] = { t: 'fire' };
    else if (this.stack[0].t === 'fire' && !this.fires.length && this.stack.length > 1) this.stack[0] = { t: 'home' };
    const s = this.top;
    if (s.t === 'list') s.sel = clamp(s.sel, 0, Math.max(0, this.rows(s).length - 1));
    this.bump();
  }

  // ------------------------------------------------------------ what the display shows
  histRows(kind) {
    const cat = HIST_CAT[kind];
    return this.hist.filter(h => !cat || h.cat === cat).slice(0, cat ? 200 : 1000)
      .map(h => ({ id: h.id, icon: h.cat === 'io' ? 'info' : h.cat, time: hhmm(h.at), l1: h.text, l2: h.sub, l3: dateStr(h.at) }));
  }

  rows(s) {
    const fault = (f, word) => ({ id: f.id, icon: word === 'WARNING' ? 'warn' : 'fault', time: hhmm(f.at), l1: `${f.src} ${f.name}, ${word}(${f.code})`, l2: f.sub, l3: f.muted && word === 'FAULT' ? 'Muted' : '' });
    switch (s.kind) {
      case 'fault': return this.faults.map(f => fault(f, 'FAULT'));
      case 'warning': return this.warnings.map(f => fault(f, 'WARNING'));
      case 'heavy': return this.warnings.map(w => ({ id: w.id, icon: 'warn', time: hhmm(w.at), l1: unitName(w.unit), l2: w.unit.text, l3: 'Replace the detector' }));
      case 'pre': return this.pre.map(p => ({ id: p.id, icon: 'pre', time: hhmm(p.at), l1: `PRE-ALARM ${unitName(p)}`, l2: p.text, l3: p.muted ? 'Muted' : '' }));
      case 'dis': return this.dis.map(d => ({ id: d.id, icon: d.kind === 'test' ? 'test' : 'dis', time: hhmm(d.at), l1: this.disName(d), l2: this.disSub(d), l3: this.disMode(d) }));
      case 'old': return this.old.map(d => ({ id: d.id, icon: 'dis', time: hhmm(d.removed), l1: this.disName(d), l2: this.disSub(d), l3: d.mode === 'perm' ? 'Was permanent' : `Was a ${d.mode} disablement` }));
      case 'zones': return ZONES.map(z => ({
        id: z.no, icon: 'zone', l1: `ZONE ${z.no}  ${z.name}`, l2: `${z.units.length} loop units, loop ${z.loop}`,
        l3: this.inTest(z.no) ? 'In test mode' : z.units.some(u => this.unitDisabled(u)) ? 'Disablement active' : 'Normal',
      }));
      case 'zunits': return ((zoneByNo(s.zone) || {}).units || []).map(u => ({
        id: u.addr, icon: 'zone', l1: unitName(u), l2: u.text,
        l3: this.fires.some(f => f.zone === u.zone && f.addr === u.addr) ? 'In alarm' : this.unitDisabled(u) ? 'Disabled' : 'Normal',
      }));
      case 'periodic':
      case 'light': return [];
      default: return this.histRows(s.kind);
    }
  }

  detailItem(s) {
    if (s.kind === 'fire') return this.fires.find(f => f.id === s.id);
    if (s.kind === 'fault') return this.faults.find(f => f.id === s.id);
    if (s.kind === 'warning') return this.warnings.find(f => f.id === s.id);
    if (s.kind === 'pre') return this.pre.find(f => f.id === s.id);
    if (s.kind === 'dis') return this.dis.find(f => f.id === s.id);
    if (s.kind === 'old') return this.old.find(f => f.id === s.id);
    return this.hist.find(h => h.id === s.id);
  }

  fireRows() {
    const n = this.fires.length;
    let show = this.fires.map((_, i) => i);
    if (n > 3) { // the first and the last fire alarm are always on the display (5.4.4)
      const mid = this.fireSel === 0 ? 1 : this.fireSel === n - 1 ? n - 2 : this.fireSel;
      show = [0, mid, n - 1];
    }
    return show.map(i => {
      const f = this.fires[i];
      return {
        n: i + 1, sel: i === this.fireSel, icon: f.test ? 'test' : f.muted ? 'firemuted' : 'fire', time: hhmm(f.at),
        l1: `${f.test ? 'TEST' : 'FIRE'} ${unitName(f)}`, l2: f.text, l3: (zoneByNo(f.zone) || {}).name || '',
      };
    });
  }

  view() {
    const v = this.screenView(this.top);
    return { clock: hhmm(this.now), date: dateStr(this.now), popup: this.popup, dimmer: this.set.dimmer, ...v };
  }

  screenView(s) {
    if (this.lamp) return { kind: 'lamp', phase: LAMP_PHASES[Math.min(LAMP_PHASES.length - 1, Math.floor(this.lamp.t / 1000))] };
    const cursor = (buf, len, sep) => {
      let out = '';
      for (let i = 0; i < len; i++) out += (sep && i && i % 2 === 0 ? sep : '') + (buf[i] || '_');
      return out;
    };
    switch (s.t) {
      case 'home': {
        const parts = [];
        if (this.pre.length) parts.push(`Pre-alarms: ${this.pre.length}`);
        if (this.faults.length) parts.push(`Faults: ${this.faults.length}`);
        if (this.warnings.length) parts.push(`Warnings: ${this.warnings.length}`);
        if (this.dis.length) parts.push(`Disablements: ${this.dis.length}`);
        return {
          kind: 'home', title: 'SALWICO CARGO', name: this.name, normal: !parts.length,
          state: parts.length ? parts.join('   ') : 'System in normal operation',
          level: `Access level ${LEVEL_NAME[this.level]}`,
          footer: ['Press Menu for the main menu, Status for the system status.'],
        };
      }
      case 'fire': {
        const n = this.fires.length;
        return {
          kind: 'list', tone: 'fire', title: n ? `FIRE ALARM ${this.fireSel + 1}(${n})` : 'FIRE ALARM', rows: this.fireRows(), empty: 'No fire alarms.',
          footer: ['MUTE=Silence bells (and local buzzer).', 'RESET=Reset Fire Alarm, OK=Details.'],
        };
      }
      case 'list': {
        const [title, tone, empty, footer] = LISTS[s.kind];
        const rows = this.rows(s), n = rows.length;
        const first = clamp(s.sel - 1, 0, Math.max(0, n - 3));
        return {
          kind: 'list', tone, empty, footer,
          title: (s.kind === 'zunits' ? `ZONE ${s.zone} UNIT` : title) + (n ? ` ${s.sel + 1}(${n})` : ''),
          rows: rows.slice(first, first + 3).map((r, i) => ({ ...r, n: first + i + 1, sel: first + i === s.sel })),
        };
      }
      case 'detail': {
        const x = this.detailItem(s);
        const when = t => [['Time', hhmm(t)], ['Date', dateStr(t)]];
        if (s.kind === 'fire' || s.kind === 'pre') {
          return {
            kind: 'detail', tone: s.kind, title: s.kind === 'fire' ? 'FIRE ALARM DETAILS' : 'PRE-ALARM DETAILS',
            head: `${s.kind === 'pre' ? 'PRE-ALARM' : x.test ? 'TEST' : 'FIRE'} ${unitName(x)}`,
            lines: [...when(x.at), ['Location', x.text], ['Zone', `${x.zone}  ${(zoneByNo(x.zone) || {}).name || ''}`], ['State', x.muted ? 'Muted' : 'Not muted']],
            footer: [s.kind === 'fire' ? 'RESET=Reset Fire Alarm, OK=Back.' : 'OK=Back.'],
          };
        }
        if (s.kind === 'fault' || s.kind === 'warning') {
          return {
            kind: 'detail', tone: 'fault', title: s.kind === 'fault' ? 'FAULT DETAILS' : 'WARNING DETAILS', head: `${x.src} ${x.name}`,
            lines: [...when(x.at), ['Location', x.sub], ['Fault code', String(x.code)], ['State', s.kind === 'warning' ? 'Warning' : x.muted ? 'Muted' : 'Not muted']],
            footer: [s.kind === 'fault' ? 'RESET=Reset current entry, OK=Back.' : 'OK=Back.'],
          };
        }
        if (s.kind === 'dis' || s.kind === 'old') {
          return {
            kind: 'detail', tone: s.kind === 'dis' ? 'dis' : 'plain', title: 'DISABLEMENT DETAILS', head: this.disName(x),
            lines: [...when(x.at), ['Location', this.disSub(x) || '-'], ['Type', s.kind === 'old' ? `Removed ${hhmm(x.removed)}` : this.disMode(x)]],
            footer: [s.kind === 'dis' ? 'RESET=Reconnect, OK=Back.' : 'OK=Back.'],
          };
        }
        return { kind: 'detail', tone: 'plain', title: 'EVENT DETAILS', head: x.text, lines: [...when(x.at), ['Text', x.sub || '-']], footer: ['OK=Back.'] };
      }
      case 'menu': {
        const [title, items] = MENUS[s.m];
        const counts = s.m === 'main' ? { 1: this.faults.length, 2: this.fires.length, 3: this.dis.length } : {};
        const nums = items.map(it => it[0]);
        return {
          kind: 'menu', title,
          items: items.map(([n, label], i) => ({ n, label: label + (n in counts ? `  (${counts[n]})` : ''), sel: i === s.sel, more: true })),
          footer: [`Select a menu with ${nums[0]}-${nums[nums.length - 1]} (or arrows + OK).`],
        };
      }
      case 'status':
        return {
          kind: 'status', title: 'STATUS', sel: s.sel,
          groups: [
            ['Alarms', [['Fire', this.fires.length], ['Pre-Alarms', this.pre.length]]],
            ['Maintenance', [['Faults', this.faults.length], ['Warnings', this.warnings.length]]],
            ['Disablements', [['Active', this.dis.length], ['Periodic', 0]]],
          ],
          note: `Access level ${LEVEL_NAME[this.level]}`,
          footer: ['OK=Open list. 1=Upload system log to USB memory,', '2=Maintenance menu.'],
        };
      case 'login':
        if (s.step === 'user') {
          return {
            kind: 'menu', title: 'LOGIN', note: `Current access level: ${LEVEL_NAME[this.level]}`,
            items: USERS.map(([, name, lvl], i) => ({ n: i + 1, label: `${name}  (${lvl})`, sel: i === s.sel })),
            footer: [this.level > 1 ? 'Select user with 1-3 (or arrows + OK). 0=Log out.' : 'Select user with 1-3 (or arrows + OK).'],
          };
        }
        return {
          kind: 'form', title: 'LOGIN',
          fields: [['User', `${USERS[s.sel][1]} (${USERS[s.sel][2]})`], ['Access code', cursor('*'.repeat(s.code.length), 4), true]],
          footer: ['Enter the four-digit access code and press Enter.'],
        };
      case 'wiz': return this.wizView(s);
      case 'confirm': {
        const [title, lines] = this.confirmDef(s.act);
        return { kind: 'text', tone: 'dis', title, lines, choice: ['Abort', 'Confirm'], footer: ['OK=Confirm, ESC=Abort.'] };
      }
      case 'ack':
        return { kind: 'text', tone: 'dis', title: 'DISABLEMENT ACTIVATED', lines: s.lines, footer: ['OK=Disablement list, ESC=Home.'] };
      case 'set': {
        const title = SETTINGS[s.what];
        if (s.what === 'beep' || s.what === 'ce') {
          return { kind: 'menu', title, items: [{ n: 1, label: 'ON', sel: s.val }, { n: 0, label: 'OFF', sel: !s.val }], footer: ['Select with 1/0 or arrows, confirm with OK.'] };
        }
        if (s.what === 'dimmer') return { kind: 'form', title, fields: [['Level (1-9)', String(s.val), true]], bar: s.val, footer: ['Change with arrows or 1-9, confirm with OK.'] };
        if (s.what === 'time') return { kind: 'form', title, fields: [['Time now', hhmm(this.now)], ['New time (hh:mm)', cursor(s.buf, 4, ':'), true]], footer: ['Enter four digits and press Enter.'] };
        if (s.what === 'date') return { kind: 'form', title, fields: [['Date now', dateStr(this.now)], ['New date (dd.mm.yy)', cursor(s.buf, 6, '.'), true]], footer: ['Enter six digits and press Enter.'] };
        return { kind: 'form', title, fields: [['Set to', `${this.set[s.what]} s`], ['New time (seconds)', s.buf || '_', true]], footer: ['0-120 seconds, confirm with Enter.'] };
      }
      default: // system details
        return {
          kind: 'detail', tone: 'plain', title: 'SYSTEM DETAILS', head: this.name,
          lines: [['System', 'Salwico Cargo'], ['Centrals', '1'], ['Loops', '3'], ['Zones', String(ZONES.length)],
            ['Loop units', String(ZONES.reduce((n, z) => n + z.units.length, 0))], ['Configured', 'Training configuration']],
          footer: ['OK=Back.'],
        };
    }
  }

  wizView(s) {
    const title = { zone: 'DISABLE ZONE', unit: 'DISABLE DETECTORS & MCP', test: 'TEST MODE', delay: 'DISABLE ALARM DELAY' }[s.target];
    const z = zoneByNo(s.zone);
    const done = [];
    if (s.zone && s.step !== 'zone') done.push(['Zone', `${s.zone}  ${z.name}`]);
    if (s.dtype && s.step !== 'dtype' && s.step !== 'zone') done.push(['Type', groupLabel(s.dtype)]);
    const shown = v => (v === '' ? '_' : v);
    if (s.step === 'zone') {
      const first = clamp(s.zi - 3, 0, Math.max(0, ZONES.length - 7));
      return {
        kind: 'pick', tone: 'dis', title, note: `Select zone  ${s.zi + 1}(${ZONES.length})`,
        rows: ZONES.slice(first, first + 7).map((zn, i) => ({
          n: zn.no, label: `ZONE ${zn.no}`, text: zn.name, sel: first + i === s.zi,
          state: this.inTest(zn.no) ? 'Test' : zn.units.some(u => this.unitDisabled(u)) ? 'Disabled' : '',
        })),
        footer: ['Select the zone with the arrows (or its number), then OK.'],
      };
    }
    if (s.step === 'dtype' || s.step === 'mode') {
      const items = s.step === 'dtype' ? TYPE_GROUPS : MODES;
      return {
        kind: 'menu', tone: 'dis', title, note: done.map(d => d.join(': ')).join('   '),
        items: items.map(([, label], i) => ({ n: i + 1, label, sel: i === s.sel })),
        footer: [`Select with 1-${items.length} (or arrows + OK).`],
      };
    }
    if (s.step === 'addr' || s.step === 'addr2') {
      const first = s.step === 'addr';
      const u = unitAt(s.zone, +s.buf);
      const ok = u && matchType(s.dtype, u.type);
      return {
        kind: 'form', tone: 'dis', title,
        fields: [...done, ['Address', first ? shown(s.buf) : String(s.a1), first], ['to address', first ? '' : shown(s.buf), !first]],
        hint: s.buf ? (ok ? `${u.type}  ${u.text}` : 'No such unit') : '',
        footer: [first ? 'Enter the detector address (or arrows), then Enter.' : 'Enter = this detector only, or type the last address.'],
      };
    }
    if (s.zone) done.push(['Address', s.a1 === s.a2 ? String(s.a1) : `${s.a1} - ${s.a2}`]);
    return {
      kind: 'form', tone: 'dis', title,
      fields: [...done.slice(-2), [s.mode === 'timer' ? 'Disable for (hh:mm)' : 'Reconnect at (hh:mm)', (s.buf.slice(0, 2).padEnd(2, '_')) + ':' + (s.buf.slice(2).padEnd(2, '_')), true]],
      hint: s.mode === 'timer' ? 'Max 23 hours 59 minutes' : 'Next time the clock shows this time',
      footer: ['Enter four digits and press Enter.'],
    };
  }

  // ------------------------------------------------------------ memory
  // Like the real panel, disablements, settings and history survive a restart.
  save() {
    return { v: 1, dis: this.dis, old: this.old, hist: this.hist.slice(0, 300), set: this.set, seq: this.seq, savedAt: Date.now(), clock: this.now };
  }

  load(j) {
    if (!j || j.v !== 1) return;
    const shift = this.now - (j.clock || this.now); // timers go on from where they stopped
    this.dis = (j.dis || []).filter(d => d.kind !== 'test').map(d => ({ ...d, until: d.until ? d.until + shift : null }));
    this.old = j.old || [];
    this.hist = j.hist || [];
    this.set = { ...this.set, ...j.set };
    this.seq = j.seq || 0;
  }
}
