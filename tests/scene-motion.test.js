import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSealMotion } from '../src/scene-motion.js';

function controlledDriver() {
  const calls = [];
  return { calls, animate(state, options) {
    const call = { state, options, cancelled: false, cancel() { this.cancelled = true; },
      advance(progress) { state.progress = progress; options.onUpdate(); },
      finish() { state.progress = options.progress; options.onUpdate(); options.onComplete(); } };
    calls.push(call); return call;
  } };
}

test('six-part motion shares a promise during travel and runs the same path backwards', async () => {
  const driver = controlledDriver(), progress = [];
  const motion = createSealMotion({ animate: driver.animate, onUpdate: value => progress.push(value) });
  const forward = motion.toggle(); assert.strictEqual(motion.toggle(), forward);
  assert.equal(driver.calls.length, 1); assert.equal(driver.calls[0].options.duration, 1150);
  driver.calls[0].advance(.46); assert.equal(motion.progress, .46); assert.equal(motion.form, 'shield');
  driver.calls[0].finish(); assert.equal(await forward, 'slogan'); assert.equal(motion.busy, false);
  const reverse = motion.toggle(); assert.equal(driver.calls[1].options.progress, 0);
  assert.equal(driver.calls[1].state.progress, 1, 'reverse begins at the exact open terminal pose');
  driver.calls[1].advance(.64); driver.calls[1].finish();
  assert.equal(await reverse, 'shield'); assert.equal(motion.progress, 0);
  assert.ok(progress.includes(.46) && progress.includes(.64)); motion.dispose();
});

test('pause, focus and hidden lifecycle callers can settle to the requested readable terminal', async () => {
  const driver = controlledDriver(), motion = createSealMotion({ animate: driver.animate });
  for (const progress of [.09, .45, .77]) {
    const expected = motion.form === 'shield' ? 'slogan' : 'shield';
    const pending = motion.toggle(), call = driver.calls.at(-1);
    call.advance(progress); motion.settle();
    assert.equal(await pending, expected); assert.equal(call.cancelled, true);
    assert.equal(motion.progress, expected === 'slogan' ? 1 : 0);
    assert.equal(motion.busy, false);
  }
  motion.dispose();
});

test('immediate and mobile modes preserve terminal forms and do not create idle animations', async () => {
  const driver = controlledDriver(); let immediate = true;
  const motion = createSealMotion({ animate: driver.animate, immediate: () => immediate, duration: () => 800 });
  assert.equal(await motion.toggle(), 'slogan'); assert.equal(driver.calls.length, 0);
  assert.equal(await motion.toggle(), 'shield'); assert.equal(driver.calls.length, 0);
  immediate = false; const pending = motion.toggle(); assert.equal(driver.calls[0].options.duration, 800);
  motion.settle(); assert.equal(await pending, 'slogan'); motion.dispose();
});

test('dispose resolves an in-flight action and stale driver callbacks cannot mutate a newer action', async () => {
  const driver = controlledDriver(), updates = [];
  const motion = createSealMotion({ animate: driver.animate, onUpdate: value => updates.push(value) });
  const first = motion.toggle(); motion.settle(); assert.equal(await first, 'slogan');
  const second = motion.toggle(); driver.calls[0].options.onComplete();
  assert.equal(motion.busy, true, 'an obsolete completion cannot finish the reverse action');
  driver.calls[1].advance(.4); motion.dispose();
  assert.equal(await second, 'shield'); assert.equal(driver.calls[1].cancelled, true);
  const count = updates.length; driver.calls[1].options.onUpdate(); driver.calls[1].options.onComplete();
  assert.equal(updates.length, count); assert.equal(await motion.toggle(), 'shield');
});

test('a failed or synchronous animation driver always releases the control', async () => {
  const broken = createSealMotion({ animate() { throw new Error('driver failed'); } });
  assert.equal(await broken.toggle(), 'slogan'); assert.equal(broken.busy, false); broken.dispose();
  let cancelled = 0;
  const synchronous = createSealMotion({ animate(state, options) {
    state.progress = options.progress; options.onComplete(); return { cancel() { cancelled++; } };
  } });
  assert.equal(await synchronous.toggle(), 'slogan'); assert.equal(synchronous.busy, false); assert.equal(cancelled, 1);
  synchronous.dispose();
});
