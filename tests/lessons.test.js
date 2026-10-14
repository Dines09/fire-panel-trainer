// Walks every lesson the way a trainee would: presses the highlighted key,
// taps the guide's button, and checks that each step is reached in turn.
//   node tests/lessons.test.js
import { Panel } from '../src/panel/engine.js';
import { LESSONS } from '../src/lessons.js';

let failed = 0;
for (const lesson of LESSONS) {
  const p = new Panel({ now: new Date(2026, 9, 14, 10, 0, 0).getTime(), level: lesson.level, idle: false });
  if (lesson.setup) lesson.setup(p);
  p.settle();
  let presses = 0, problem = '';
  lesson.steps.forEach((step, i) => {
    if (problem || step.final) return;
    if (step.on) step.on(p);
    if (step.ack) return;
    if (step.act) step.act.run(p);
    for (let n = 0; n < 40 && !step.done(p); n++) {
      const keys = typeof step.hl === 'function' ? step.hl(p) : step.hl || [];
      if (keys.length && !keys[0].startsWith('led:')) { p.key(keys[0]); presses++; }
      else p.tick(500, 500); // nothing to press: the step waits for the panel
    }
    if (!step.done(p)) problem = `stuck at step ${i + 1}: ${step.t.replace(/<[^>]+>/g, '').slice(0, 70)}`;
  });
  const last = lesson.steps[lesson.steps.length - 1];
  if (!problem && !last.final) problem = 'last step is not marked final';
  if (!problem && (p.fires.length || p.faults.length || p.cond.size)) problem = 'ends with an alarm or fault still active';
  console.log(`${problem ? 'FAIL' : 'ok  '}  ${lesson.id.padEnd(8)} ${String(lesson.steps.length - 1).padStart(2)} steps, ${String(presses).padStart(2)} key presses  ${problem}`);
  if (problem) failed++;
}
if (failed) process.exit(1);
