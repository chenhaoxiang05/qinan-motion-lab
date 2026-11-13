import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createBootSequence} from '../src/boot.js';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
function setup(t, {returning = false, reduced = false, blockedStorage = false} = {}) {
  const dom = new JSDOM('<button id="before">入口</button><div id="boot" hidden><span data-boot-stage></span><button data-boot-skip>跳过</button></div>', {url:'https://qinan.test/'});
  const {window:w} = dom;
  const listeners = new Set();
  w.matchMedia = () => ({matches:reduced, addEventListener(type, fn) {listeners.add(fn);}, removeEventListener(type, fn) {listeners.delete(fn);}});
  if (returning) w.sessionStorage.setItem('qinan-boot-complete', 'true');
  if (blockedStorage) Object.defineProperty(w, 'sessionStorage', {get() {throw new Error('Storage blocked');}});
  t.mock.timers.enable({apis:['setTimeout']});
  const root = w.document.querySelector('#boot');
  t.after(() => dom.window.close());
  return {w, root, listeners, create:options => createBootSequence({root,...options})};
}

test('first visit waits 2.4 seconds and real readiness, then releases the initial route', async t => {
  const {w, root, create, listeners} = setup(t);
  const scene = deferred();
  const boot = create({ready:scene.promise});
  let routeOpened = false;
  boot.finished.then(() => {routeOpened = true;});
  assert.equal(root.hidden, false);
  assert.equal(w.document.documentElement.dataset.boot, 'loading');
  assert.equal(root.querySelector('[data-boot-stage]').textContent, '加载界面');
  await flush();
  assert.equal(root.dataset.phase, 'scene');
  scene.resolve();
  await flush();
  assert.equal(root.querySelector('[data-boot-stage]').textContent, '已就绪');
  t.mock.timers.tick(2399);
  await flush();
  assert.equal(routeOpened, false);
  t.mock.timers.tick(1);
  assert.deepEqual(await boot.finished, {reason:'ready'});
  assert.equal(routeOpened, true);
  assert.equal(root.hidden, true);
  assert.equal(w.document.documentElement.dataset.boot, 'ready');
  assert.equal(w.sessionStorage.getItem('qinan-boot-complete'), 'true');
  assert.equal(listeners.size, 0);
});

test('a returning tab uses a 0.4-second entrance, but does not reveal before scene readiness', async t => {
  const {root, create} = setup(t, {returning:true});
  const scene = deferred();
  const boot = create({ready:scene.promise});
  t.mock.timers.tick(400);
  await flush();
  assert.equal(root.hidden, false);
  scene.resolve();
  assert.deepEqual(await boot.finished, {reason:'ready'});
  assert.equal(root.hidden, true);
});

test('a hanging scene cannot hold the page for more than four seconds', async t => {
  const {w, root, create} = setup(t);
  const scene = deferred();
  const boot = create({ready:scene.promise});
  await flush();
  t.mock.timers.tick(3999);
  assert.equal(root.hidden, false);
  t.mock.timers.tick(1);
  assert.deepEqual(await boot.finished, {reason:'timeout'});
  assert.equal(root.hidden, true);
  const label = root.querySelector('[data-boot-stage]').textContent;
  scene.resolve();
  await flush();
  assert.equal(root.querySelector('[data-boot-stage]').textContent, label, 'late readiness cannot mutate a dismissed overlay');
  assert.equal(w.document.documentElement.dataset.boot, 'ready');
});

test('skip and Escape finish immediately, restore focus and detach their listeners', async t => {
  const {w, root, create, listeners} = setup(t);
  w.document.querySelector('#before').focus();
  const boot = create({ready:new Promise(() => {})});
  root.querySelector('button').focus();
  const escape = new w.KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true});
  root.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true);
  assert.deepEqual(await boot.finished, {reason:'skip'});
  assert.equal(w.document.activeElement.id, 'before');
  assert.equal(listeners.size, 0);
  assert.equal(w.document.querySelector('#before').hasAttribute('inert'), false);
  const later = new w.KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true});
  w.document.dispatchEvent(later);
  assert.equal(later.defaultPrevented, false);
  t.mock.timers.tick(10000);
  assert.equal(root.hidden, true);
  const second = create({ready:new Promise(() => {})});
  root.querySelector('button').click();
  assert.deepEqual(await second.finished, {reason:'skip'});
});

test('reduced motion bypasses the sequence even when the optional scene fails', async t => {
  const reduced = setup(t, {reduced:true});
  reduced.w.document.querySelector('#before').focus();
  const boot = reduced.create({ready:Promise.reject(new Error('optional scene failed'))});
  assert.equal(reduced.root.hidden, true);
  assert.deepEqual(await boot.finished, {reason:'paused'});
  assert.equal(reduced.w.document.activeElement.id, 'before', 'motion bypass does not take focus');
  assert.equal(reduced.w.document.querySelector('#before').hasAttribute('inert'), false);
});

test('saved manual pause and a live pause bypass the sequence', async t => {
  const {root, create, listeners} = setup(t);
  const manual = create({motionPaused:true});
  assert.deepEqual(await manual.finished, {reason:'paused'});
  const live = create({ready:new Promise(() => {})});
  live.setPaused(false);
  assert.equal(root.hidden, false);
  live.setPaused(true);
  assert.deepEqual(await live.finished, {reason:'paused'});
  assert.equal(listeners.size, 0);
});

test('a reduced-motion change dismisses the overlay and destroy is idempotent', async t => {
  const {w, root, create, listeners} = setup(t);
  const boot = create({ready:new Promise(() => {})});
  for (const listener of [...listeners]) listener({matches:true});
  assert.deepEqual(await boot.finished, {reason:'paused'});
  assert.equal(root.hidden, true);
  w.sessionStorage.removeItem('qinan-boot-complete');
  const next = create({ready:new Promise(() => {})});
  next.destroy();next.destroy();next.skip();
  assert.deepEqual(await next.finished, {reason:'destroyed'});
  assert.equal(w.sessionStorage.getItem('qinan-boot-complete'), null, 'HMR cleanup does not count as a completed visit');
  t.mock.timers.tick(10000);
  assert.equal(root.hidden, true);
  assert.equal(listeners.size, 0);
});

test('blocked storage and rejected optional scene do not trap the boot screen', async t => {
  const {root, create} = setup(t, {blockedStorage:true});
  const boot = create({ready:Promise.reject(new Error('chunk unavailable'))});
  await flush();
  t.mock.timers.tick(2400);
  assert.deepEqual(await boot.finished, {reason:'ready'});
  assert.equal(root.hidden, true);
});

test('missing boot markup resolves immediately', async () => {
  const boot = createBootSequence({root:null, ready:new Promise(() => {})});
  assert.deepEqual(await boot.finished, {reason:'ready'});
});

test('the inline download failsafe is cleared, and an expired failsafe cannot replay boot', async t => {
  const {w, root, create} = setup(t);
  let inlineFired = false;
  w.__qinanBootFailSafe = setTimeout(() => {inlineFired = true;}, 4500);
  const boot = create({ready:new Promise(() => {})});
  t.mock.timers.tick(4500);
  assert.deepEqual(await boot.finished, {reason:'timeout'});
  assert.equal(inlineFired, false);
  w.__qinanBootExpired = true;
  const late = create({ready:new Promise(() => {})});
  assert.deepEqual(await late.finished, {reason:'timeout'});
  assert.equal(root.hidden, true);
});

test('boot isolates keyboard interaction and restores all previous inert states', async t => {
  const {w, root, create} = setup(t);
  const doc = w.document;
  const existingInert = doc.createElement('section');
  existingInert.setAttribute('inert', 'previous-value');
  doc.body.append(existingInert);
  const before = doc.querySelector('#before');
  before.focus();
  const boot = create({ready:new Promise(() => {})});
  const skip = root.querySelector('[data-boot-skip]');
  assert.equal(doc.activeElement, skip);
  assert.equal(root.getAttribute('role'), 'dialog');
  assert.equal(root.getAttribute('aria-modal'), 'true');
  assert.equal(before.hasAttribute('inert'), true);
  assert.equal(existingInert.hasAttribute('inert'), true);
  for (const shiftKey of [false, true]) {
    const tab = new w.KeyboardEvent('keydown', {key:'Tab', shiftKey, bubbles:true, cancelable:true});
    skip.dispatchEvent(tab);
    assert.equal(tab.defaultPrevented, true);
    assert.equal(doc.activeElement, skip);
  }
  boot.destroy();
  assert.deepEqual(await boot.finished, {reason:'destroyed'});
  assert.equal(before.hasAttribute('inert'), false);
  assert.equal(existingInert.getAttribute('inert'), 'previous-value');
  assert.equal(root.hasAttribute('aria-modal'), false);
  assert.equal(doc.activeElement, before);
});

test('timeout restores interaction and focus even when scene readiness never settles', async t => {
  const {w, create} = setup(t);
  const before = w.document.querySelector('#before');
  before.focus();
  const boot = create({ready:new Promise(() => {})});
  assert.equal(before.hasAttribute('inert'), true);
  t.mock.timers.tick(4000);
  await boot.finished;
  assert.equal(before.hasAttribute('inert'), false);
  assert.equal(w.document.activeElement, before);
});
