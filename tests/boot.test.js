import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {createBootSequence} from '../src/boot.js';

const glyph = readFileSync(new URL('../src/boot-glyph.svg',import.meta.url),'utf8');
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}
function setup(t, {returning = false, reduced = false, blockedStorage = false} = {}) {
  const dom = new JSDOM(`<button id="before">入口</button><div id="boot" hidden>${glyph}<h2 data-boot-title>正在加载亲安</h2><span data-boot-stage></span>${[0,1,2].map(i=>`<div data-boot-milestone="${i}"><span data-boot-milestone-label></span></div>`).join('')}<button data-boot-skip>跳过</button></div>`, {url:'https://qinan.test/'});
  const {window:w} = dom;
  const listeners = new Set();
  w.matchMedia = () => ({matches:reduced, addEventListener(type, fn) {listeners.add(fn);}, removeEventListener(type, fn) {listeners.delete(fn);}});
  if (returning) w.sessionStorage.setItem('qinan-boot-v8-complete', 'true');
  if (blockedStorage) Object.defineProperty(w, 'sessionStorage', {get() {throw new Error('Storage blocked');}});
  t.mock.timers.enable({apis:['setTimeout']});
  const root = w.document.querySelector('#boot');
  t.after(() => dom.window.close());
  return {w, root, listeners, create:options => createBootSequence({root,...options})};
}

function fakeAnime({automatic = false} = {}) {
  const timelines = [];
  const createTimeline = options => {
    let timer;
    const timeline = {
      options,items:[],cancelled:0,
      add(targets,parameters,at = 0) {
        this.items.push({targets:Array.isArray(targets) ? targets : [targets],parameters,at});
        return this;
      },
      play() {
        if (automatic) timer = setTimeout(() => options.onComplete(),Math.max(0,...this.items.map(item => item.at + item.parameters.duration)));
        return this;
      },
      cancel() {this.cancelled++;clearTimeout(timer);},
      complete() {options.onComplete();},
    };
    timelines.push(timeline);
    return timeline;
  };
  return {timelines,createTimeline};
}

function stagedReadiness() {
  const pending = [deferred(),deferred(),deferred()];
  const stages = ['界面','交互组件','场景'].map((label,index) => ({id:`stage-${index}`,label,ready:pending[index].promise}));
  return {pending,stages};
}

test('first visit waits 2.4 seconds and real readiness, then releases the initial route', async t => {
  const {w, root, create, listeners} = setup(t);
  const scene = deferred();
  const boot = create({ready:scene.promise});
  let routeOpened = false;
  boot.finished.then(() => {routeOpened = true;});
  assert.equal(root.hidden, false);
  assert.equal(w.document.documentElement.dataset.boot, 'loading');
  assert.equal(root.querySelector('[data-boot-stage]').textContent, '正在准备界面');
  await flush();
  assert.equal(root.dataset.phase, 'loading');
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
  assert.equal(w.sessionStorage.getItem('qinan-boot-v8-complete'), 'true');
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
  await flush();
  t.mock.timers.tick(200);
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
  w.sessionStorage.removeItem('qinan-boot-v8-complete');
  const next = create({ready:new Promise(() => {})});
  next.destroy();next.destroy();next.skip();
  assert.deepEqual(await next.finished, {reason:'destroyed'});
  assert.equal(w.sessionStorage.getItem('qinan-boot-v8-complete'), null, 'HMR cleanup does not count as a completed visit');
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

test('real milestones drive ordered whole-word typography when chunks settle out of order', async t => {
  const {root,create} = setup(t);
  const {pending,stages} = stagedReadiness();
  const anime = fakeAnime();
  const boot = create({stages,createTimeline:anime.createTimeline});
  const word = root.querySelector('.boot-type-word');
  const letters = [...root.querySelectorAll('[data-boot-letter]')];
  const chinese = root.querySelector('.boot-type-cn').outerHTML;
  pending[2].resolve();await flush();
  assert.equal(anime.timelines.length, 0);
  assert.equal(root.querySelector('[data-boot-milestone="2"]').dataset.state, 'ready');
  assert.equal(root.querySelector('[data-boot-stage]').textContent, '正在准备界面');
  pending[0].resolve();await flush();
  assert.equal(anime.timelines.length, 1);
  assert.equal(root.dataset.type, 'condensed');
  assert.equal(anime.timelines[0].items[0].targets.length, 5);
  assert.equal(root.querySelector('[data-boot-stage]').textContent, '正在准备交互组件');
  pending[1].resolve({fallback:true,label:'基础交互已就绪'});await flush();
  assert.equal(root.querySelector('[data-boot-milestone="1"]').dataset.state, 'fallback');
  assert.equal(root.querySelector('[data-boot-milestone="1"] [data-boot-milestone-label]').textContent, '基础交互已就绪');
  assert.equal(anime.timelines.length, 1);
  anime.timelines[0].complete();
  assert.equal(anime.timelines.length, 2);
  assert.equal(root.dataset.type, 'outline');
  for (const letter of letters) assert.equal(letter.getAttribute('d'), letter.dataset.formCondensed);
  anime.timelines[1].complete();
  assert.equal(root.dataset.type, 'cut');
  assert.equal(word.getAttribute('mask'), 'url(#boot-type-cut)');
  for (const letter of letters) assert.equal(letter.getAttribute('d'), letter.dataset.formWide);
  anime.timelines[2].complete();
  assert.equal(root.dataset.typeSettled, 'true');
  assert.equal(root.dataset.type, 'final');
  assert.equal(word.hasAttribute('mask'), false);
  assert.equal(word.style.fillOpacity, '1');
  for (const letter of letters) assert.equal(letter.getAttribute('d'), letter.dataset.formFinal);
  assert.equal(root.querySelector('.boot-type-cn').outerHTML, chinese, 'Chinese contours never become flying pieces or disappear');
  assert.equal(root.querySelector('[data-boot-title]').textContent, '正在加载亲安');
  t.mock.timers.tick(2399);assert.equal(root.hidden, false);
  t.mock.timers.tick(1);assert.deepEqual(await boot.finished, {reason:'ready'});
});

test('fast milestones produce a 2.4-second typographic ident and a 400ms same-tab refresh', async t => {
  const {w,root,create} = setup(t);
  const stages = ['界面','交互组件','场景'].map((label,index) => ({id:`stage-${index}`,label,ready:Promise.resolve()}));
  const firstAnime = fakeAnime({automatic:true});
  const first = create({stages,createTimeline:firstAnime.createTimeline});
  await flush();
  for (const duration of [680,680,480]) t.mock.timers.tick(duration);
  assert.equal(firstAnime.timelines.length, 3);
  assert.equal(root.dataset.typeSettled, 'true');
  t.mock.timers.tick(559);assert.equal(root.hidden, false);
  t.mock.timers.tick(1);assert.deepEqual(await first.finished, {reason:'ready'});
  assert.equal(w.sessionStorage.getItem('qinan-boot-v8-complete'), 'true');
  const repeatAnime = fakeAnime({automatic:true});
  const repeat = create({stages,createTimeline:repeatAnime.createTimeline});
  await flush();
  for (const duration of [65,65,70]) t.mock.timers.tick(duration);
  assert.equal(root.dataset.typeSettled, 'true');
  t.mock.timers.tick(199);assert.equal(root.hidden, false);
  t.mock.timers.tick(1);assert.deepEqual(await repeat.finished, {reason:'ready'});
});

test('the final word holds for at least 200ms after delayed readiness in a returning tab', async t => {
  const {root,create} = setup(t, {returning:true});
  const {pending,stages} = stagedReadiness();
  const anime = fakeAnime();
  const boot = create({stages,createTimeline:anime.createTimeline});
  pending[0].resolve();pending[1].resolve();await flush();
  anime.timelines[0].complete();anime.timelines[1].complete();
  t.mock.timers.tick(1500);
  assert.equal(root.dataset.typeSettled, undefined);
  assert.equal(root.hidden, false);
  pending[2].resolve();await flush();anime.timelines[2].complete();
  t.mock.timers.tick(199);assert.equal(root.hidden, false);
  t.mock.timers.tick(1);assert.deepEqual(await boot.finished, {reason:'ready'});
});

test('skip cancels the active font variation and ignores late callbacks and milestones', async t => {
  const {w,root,create} = setup(t);
  const {pending,stages} = stagedReadiness();
  const anime = fakeAnime();
  const boot = create({stages,createTimeline:anime.createTimeline});
  pending[0].resolve();await flush();
  const old = anime.timelines[0];
  boot.skip();assert.deepEqual(await boot.finished, {reason:'skip'});
  assert.equal(old.cancelled, 1);
  const markup = root.innerHTML;
  old.complete();pending[1].reject(new Error('late failure'));pending[2].resolve();await flush();
  t.mock.timers.tick(10000);
  assert.equal(anime.timelines.length, 1);
  assert.equal(root.innerHTML, markup);
  assert.equal(root.hidden, true);
  assert.equal(w.document.querySelector('#before').hasAttribute('inert'), false);
});

test('pausing the final font variation cancels its late completion and releases background controls', async t => {
  const {w,root,create} = setup(t);
  const anime = fakeAnime();
  const stages = ['界面','交互组件','场景'].map(label => ({label,ready:Promise.resolve()}));
  const boot = create({stages,createTimeline:anime.createTimeline});await flush();
  anime.timelines[0].complete();anime.timelines[1].complete();
  const last = anime.timelines[2];
  boot.setPaused(true);assert.deepEqual(await boot.finished, {reason:'paused'});
  assert.equal(last.cancelled, 1);
  last.complete();t.mock.timers.tick(10000);
  assert.equal(root.dataset.typeSettled, undefined);
  assert.equal(root.hidden, true);
  assert.equal(w.document.querySelector('#before').hasAttribute('inert'), false);
});

test('a never-ready milestone remains pending until the four-second fail-open', async t => {
  const {root,create} = setup(t);
  const {pending,stages} = stagedReadiness();
  const anime = fakeAnime({automatic:true});
  const boot = create({stages,createTimeline:anime.createTimeline});
  pending[0].resolve();pending[1].resolve();await flush();
  t.mock.timers.tick(680);t.mock.timers.tick(680);
  assert.equal(anime.timelines.length, 2);
  assert.equal(root.querySelector('[data-boot-stage]').textContent, '正在准备场景');
  assert.equal(root.querySelector('[data-boot-milestone="2"]').dataset.state, 'pending');
  t.mock.timers.tick(2639);assert.equal(root.hidden, false);
  t.mock.timers.tick(1);assert.deepEqual(await boot.finished, {reason:'timeout'});
  assert.equal(root.dataset.typeSettled, undefined, 'timeout does not claim missing readiness');
});

test('animation construction failure settles the word without stranding the interface', async t => {
  const {root,create} = setup(t);
  const stages = ['界面','交互组件','场景'].map(label => ({label,ready:Promise.resolve()}));
  const boot = create({stages,createTimeline() {throw new Error('animation unavailable');}});await flush();
  assert.equal(root.dataset.typeSettled, 'true');
  t.mock.timers.tick(2400);assert.deepEqual(await boot.finished, {reason:'ready'});
});

test('v7 visit history does not suppress the new v8 entrance', async t => {
  const {w,root,create} = setup(t);
  w.sessionStorage.setItem('qinan-boot-v7-complete', 'true');
  const boot = create();await flush();
  t.mock.timers.tick(400);assert.equal(root.hidden, false);
  assert.equal(root.dataset.variant, 'first');
  t.mock.timers.tick(2000);await boot.finished;
  assert.equal(w.sessionStorage.getItem('qinan-boot-v7-complete'), 'true');
});

test('published ident embeds matching original closed font forms and intact Chinese contours', () => {
  const source = new JSDOM(glyph);
  const page = new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
  const commands = path => path.match(/[MLZ]/g).join('');
  const numbers = path => path.match(/-?\d+(?:\.\d+)?/g).map(Number);
  try {
    const svg = page.window.document.querySelector('#boot .boot-glyph');
    assert.equal(svg.querySelectorAll('[data-boot-piece]').length, 0);
    assert.equal(svg.querySelectorAll('clipPath').length, 0);
    assert.equal(svg.querySelectorAll('[data-boot-letter]').length, 5);
    for (const letter of svg.querySelectorAll('[data-boot-letter]')) {
      const sourceLetter = source.window.document.querySelector(`[data-boot-letter="${letter.dataset.bootLetter}"]`);
      for (const form of ['formWide','formCondensed','formFinal']) {
        assert.equal(letter.dataset[form], sourceLetter.dataset[form]);
        assert.equal(commands(letter.dataset[form]), commands(letter.dataset.formWide));
        assert.equal(numbers(letter.dataset[form]).length, numbers(letter.dataset.formWide).length);
        assert.ok(numbers(letter.dataset[form]).every(Number.isFinite));
      }
      assert.equal(letter.getAttribute('d'), letter.dataset.formWide, 'the complete word is visible on first paint');
      assert.equal(letter.getAttribute('fill-rule'), 'evenodd');
      assert.notEqual(letter.dataset.formWide, letter.dataset.formCondensed, 'font masters differ in actual contours');
    }
    for (const id of ['boot-cn-qin','boot-cn-an']) {
      assert.equal(svg.querySelector(`#${id}`).getAttribute('d'), source.window.document.querySelector(`#${id}`).getAttribute('d'));
      assert.ok(svg.querySelector(`#${id}`).getAttribute('d').split('M').length > 2);
    }
    assert.equal(svg.querySelectorAll('.boot-type-cn use').length, 2);
    assert.equal(svg.querySelector('.boot-type-cn').hasAttribute('opacity'), false);
    assert.equal(svg.querySelectorAll('image').length, 0);
    assert.equal(page.window.document.querySelector('[data-boot-title]').textContent, '正在加载亲安');
  } finally {source.window.close();page.window.close();}
});
