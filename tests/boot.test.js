import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {createBootSequence} from '../src/boot.js';

const KEY = 'qinan-boot-v14-complete';
const glyph = readFileSync(new URL('../src/boot-glyph.svg',import.meta.url),'utf8');
const flush = async () => {await Promise.resolve();await Promise.resolve();};
function deferred() {let resolve,reject;const promise = new Promise((yes,no) => {resolve = yes;reject = no;});return {promise,resolve,reject};}
function fakeAnime() {
  const timelines = [];
  const createTimeline = options => {
    const timeline = {options,items:[],cancelled:0,
      add(targets,parameters,at = 0) {this.items.push({targets:Array.isArray(targets) ? targets : [targets],parameters,at});return this;},
      play() {return this;},cancel() {this.cancelled++;},complete() {options.onComplete?.();},
    };
    timelines.push(timeline);return timeline;
  };
  return {timelines,createTimeline};
}
function setup(t,{returning = false,reduced = false,blockedStorage = false} = {}) {
  const dom = new JSDOM(`<button id="before">入口</button><div id="boot" hidden>${glyph}<h2 data-boot-title>正在加载亲安</h2><span data-boot-stage></span>${[0,1,2].map(i=>`<div data-boot-milestone="${i}"><span data-boot-milestone-label></span></div>`).join('')}<button data-boot-skip>跳过</button></div>`,{url:'https://qinan.test/'});
  const w = dom.window;
  const listeners = new Set();
  w.matchMedia = () => ({matches:reduced,addEventListener(type,fn) {listeners.add(fn);},removeEventListener(type,fn) {listeners.delete(fn);}});
  if (returning) w.sessionStorage.setItem(KEY,'true');
  if (blockedStorage) Object.defineProperty(w,'sessionStorage',{get() {throw new Error('Storage blocked');}});
  t.mock.timers.enable({apis:['setTimeout']});
  const root = w.document.querySelector('#boot');
  const anime = fakeAnime();
  t.after(() => dom.window.close());
  return {w,root,listeners,anime,create:options => createBootSequence({root,createTimeline:anime.createTimeline,...options})};
}
function stagesFrom(promises) {return ['界面','交互组件','场景'].map((label,index) => ({id:`stage-${index}`,label,ready:promises[index]}));}


test('first visit locks its poster at 1.4s, reveals the home underneath, and releases input at 2s',async t => {
  const {w,root,create,anime,listeners} = setup(t);
  const brand = root.querySelector('.boot-signal-brand').outerHTML;
  const boot = create({stages:stagesFrom([Promise.resolve(),Promise.resolve(),Promise.resolve()])});
  let finished = false,revealed = false;
  boot.finished.then(() => {finished = true;});boot.revealing.then(() => {revealed = true;});
  await flush();
  assert.equal(root.dataset.phase,'positioning');
  assert.equal(root.querySelector('[data-boot-stage]').textContent,'已就绪');
  t.mock.timers.tick(300);assert.equal(root.dataset.phase,'aligning');
  t.mock.timers.tick(450);assert.equal(root.dataset.phase,'locking');
  t.mock.timers.tick(649);await flush();assert.equal(revealed,false);
  t.mock.timers.tick(1);
  assert.deepEqual(await boot.revealing,{variant:'first',reason:'ready'});
  assert.equal(root.dataset.phase,'revealing');
  assert.equal(finished,false);
  assert.equal(root.hidden,false);
  assert.equal(w.document.querySelector('#before').hasAttribute('inert'),true,'home can animate but cannot receive clicks during the reveal');
  assert.equal(root.querySelector('.boot-signal-brand').outerHTML,brand,'large Chinese contours and fill never morph or flash');
  assert.equal(anime.timelines.length,2);
  assert.equal(anime.timelines[1].items[0].parameters.duration,600);
  assert.deepEqual(Object.keys(anime.timelines[1].items[0].parameters).sort(),['clipPath','duration','ease']);
  t.mock.timers.tick(599);await flush();assert.equal(finished,false);
  t.mock.timers.tick(1);
  assert.deepEqual(await boot.finished,{variant:'first',reason:'ready'});
  assert.equal(root.hidden,true);
  assert.equal(w.document.documentElement.dataset.boot,'ready');
  assert.equal(w.document.querySelector('#before').hasAttribute('inert'),false);
  assert.equal(w.sessionStorage.getItem(KEY),'true');
  assert.equal(listeners.size,0);
});

test('returning tabs use a 150ms poster and a 300ms reveal, 450ms in total',async t => {
  const {root,create,anime} = setup(t,{returning:true});
  const boot = create();await flush();
  let revealed = false;boot.revealing.then(() => {revealed = true;});
  t.mock.timers.tick(149);await flush();assert.equal(revealed,false);
  t.mock.timers.tick(1);
  assert.deepEqual(await boot.revealing,{variant:'return',reason:'ready'});
  assert.equal(anime.timelines.length,1,'refresh does not replay the initial color-block positioning');
  assert.equal(anime.timelines[0].items[0].parameters.duration,300);
  t.mock.timers.tick(299);assert.equal(root.hidden,false);
  t.mock.timers.tick(1);assert.deepEqual(await boot.finished,{variant:'return',reason:'ready'});
});

test('slow real readiness leaves a complete still poster, then opens the window immediately when ready',async t => {
  const {root,create,anime} = setup(t);
  const scene = deferred();
  const boot = create({stages:stagesFrom([Promise.resolve(),Promise.resolve(),scene.promise])});
  await flush();t.mock.timers.tick(1400);
  assert.equal(root.dataset.phase,'locked');
  assert.equal(root.querySelector('[data-boot-stage]').textContent,'正在准备场景');
  for (const selector of ['.boot-signal-lime','.boot-signal-blue','.boot-signal-code','.boot-signal-lock']) {
    assert.equal(root.querySelector(selector).style.opacity,'1');
    assert.equal(root.querySelector(selector).style.transform,'translateX(0px) translateY(0px)');
  }
  const poster = root.innerHTML;
  t.mock.timers.tick(900);await flush();
  assert.equal(root.innerHTML,poster,'no retry animation or text glitch runs during a slow load');
  assert.equal(anime.timelines.length,1);
  scene.resolve({fallback:true,label:'备用场景已就绪'});await flush();
  assert.deepEqual(await boot.revealing,{variant:'first',reason:'ready'});
  assert.equal(root.querySelector('[data-boot-milestone="2"]').dataset.state,'fallback');
  assert.equal(root.querySelector('[data-boot-milestone="2"] [data-boot-milestone-label]').textContent,'备用场景已就绪');
  t.mock.timers.tick(600);assert.deepEqual(await boot.finished,{variant:'first',reason:'ready'});
});

test('out-of-order readiness is reflected accurately and never opens the window early',async t => {
  const {root,create,anime} = setup(t);
  const ready = [deferred(),deferred(),deferred()];
  const boot = create({stages:stagesFrom(ready.map(item => item.promise))});
  ready[2].resolve();await flush();
  assert.equal(root.querySelector('[data-boot-milestone="2"]').dataset.state,'ready');
  assert.equal(root.querySelector('[data-boot-stage]').textContent,'正在准备界面');
  t.mock.timers.tick(1400);assert.equal(root.dataset.phase,'locked');
  ready[0].resolve();await flush();
  assert.equal(root.querySelector('[data-boot-stage]').textContent,'正在准备交互组件');
  assert.equal(anime.timelines.length,1);
  ready[1].reject(new Error('optional chunk failed'));await flush();
  assert.deepEqual(await boot.revealing,{variant:'first',reason:'ready'});
  assert.equal(root.querySelector('[data-boot-milestone="1"]').dataset.state,'fallback');
  t.mock.timers.tick(600);await boot.finished;
});

test('a never-ready scene resolves both lifecycle promises at the four-second deadline',async t => {
  const {w,root,create} = setup(t);
  const scene = deferred();
  const boot = create({ready:scene.promise});
  t.mock.timers.tick(3999);assert.equal(root.hidden,false);
  t.mock.timers.tick(1);
  assert.deepEqual(await boot.revealing,{variant:'first',reason:'timeout'});
  assert.deepEqual(await boot.finished,{variant:'first',reason:'timeout'});
  assert.equal(root.hidden,true);
  assert.equal(w.document.querySelector('#before').hasAttribute('inert'),false);
  const markup = root.innerHTML;
  scene.resolve();await flush();assert.equal(root.innerHTML,markup);
});

test('the four-second cap still applies when readiness arrives during the last 600ms',async t => {
  const {root,create,anime} = setup(t);
  const scene = deferred();const boot = create({ready:scene.promise});
  t.mock.timers.tick(3800);scene.resolve();await flush();
  assert.deepEqual(await boot.revealing,{variant:'first',reason:'ready'});
  t.mock.timers.tick(200);assert.deepEqual(await boot.finished,{variant:'first',reason:'timeout'});
  assert.equal(root.hidden,true);assert.equal(anime.timelines[1].cancelled,1);
  anime.timelines[1].complete();t.mock.timers.tick(1000);assert.equal(root.hidden,true);
});

test('skip and Escape settle both promises immediately and restore focus',async t => {
  const {w,root,create,listeners} = setup(t);
  const before = w.document.querySelector('#before');before.focus();
  const boot = create({ready:new Promise(() => {})});
  const escape = new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});
  root.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented,true);
  assert.deepEqual(await boot.revealing,{variant:'first',reason:'skip'});
  assert.deepEqual(await boot.finished,{variant:'first',reason:'skip'});
  assert.equal(w.document.activeElement,before);assert.equal(listeners.size,0);
  const later = new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});
  w.document.dispatchEvent(later);assert.equal(later.defaultPrevented,false);
  const repeat = create({ready:new Promise(() => {})});
  root.querySelector('[data-boot-skip]').click();
  assert.deepEqual(await repeat.revealing,{variant:'return',reason:'skip'});
  assert.deepEqual(await repeat.finished,{variant:'return',reason:'skip'});
});

test('skip during the reveal cancels its timeline and ignores its late completion',async t => {
  const {w,root,create,anime} = setup(t);
  const boot = create();await flush();t.mock.timers.tick(1400);
  const event = await boot.revealing;
  boot.skip();assert.deepEqual(await boot.finished,{variant:'first',reason:'skip'});
  const markup = root.innerHTML;
  const clip = root.style.clipPath;
  anime.timelines[1].complete();t.mock.timers.tick(10000);await flush();
  assert.deepEqual(event,{variant:'first',reason:'ready'},'an already delivered reveal event is immutable');
  assert.equal(root.innerHTML,markup);assert.equal(root.style.clipPath,clip);
  assert.equal(w.document.querySelector('#before').hasAttribute('inert'),false);
});

test('reduced motion bypasses both phases without taking focus and observes failed lazy promises',async t => {
  const {w,root,create,anime} = setup(t,{reduced:true});
  const before = w.document.querySelector('#before');before.focus();
  const boot = create({ready:Promise.reject(new Error('optional chunk failed'))});
  assert.deepEqual(await boot.revealing,{variant:'first',reason:'paused'});
  assert.deepEqual(await boot.finished,{variant:'first',reason:'paused'});
  assert.equal(root.hidden,true);assert.equal(w.document.activeElement,before);
  assert.equal(before.hasAttribute('inert'),false);assert.equal(anime.timelines.length,0);
});

test('manual pause and a live motion preference change settle both phases and detach listeners',async t => {
  const {root,create,listeners} = setup(t);
  const saved = create({motionPaused:true});
  assert.deepEqual(await saved.revealing,{variant:'first',reason:'paused'});
  assert.deepEqual(await saved.finished,{variant:'first',reason:'paused'});
  const live = create({ready:new Promise(() => {})});
  live.setPaused(false);assert.equal(root.hidden,false);
  for (const listener of [...listeners]) listener({matches:true});
  assert.deepEqual(await live.revealing,{variant:'return',reason:'paused'});
  assert.deepEqual(await live.finished,{variant:'return',reason:'paused'});assert.equal(listeners.size,0);
});

test('pause during reveal releases the page without stale animation writes',async t => {
  const {root,create,anime} = setup(t);
  const boot = create();await flush();t.mock.timers.tick(1400);await boot.revealing;
  boot.setPaused(true);assert.deepEqual(await boot.finished,{variant:'first',reason:'paused'});
  const snapshot = root.innerHTML;anime.timelines[1].complete();t.mock.timers.tick(10000);
  assert.equal(root.innerHTML,snapshot);assert.equal(root.hidden,true);
});

test('boot traps Tab and restores exact pre-existing inert attributes on destroy',async t => {
  const {w,root,create,listeners} = setup(t);
  const before = w.document.querySelector('#before');before.focus();
  const old = w.document.createElement('section');old.setAttribute('inert','original-value');w.document.body.append(old);
  const boot = create({ready:new Promise(() => {})});
  const skip = root.querySelector('[data-boot-skip]');
  assert.equal(w.document.activeElement,skip);assert.equal(root.getAttribute('aria-modal'),'true');
  for (const shiftKey of [true,false]) {
    const tab = new w.KeyboardEvent('keydown',{key:'Tab',shiftKey,bubbles:true,cancelable:true});skip.dispatchEvent(tab);
    assert.equal(tab.defaultPrevented,true);assert.equal(w.document.activeElement,skip);
  }
  boot.destroy();boot.destroy();
  assert.deepEqual(await boot.revealing,{variant:'first',reason:'destroyed'});
  assert.deepEqual(await boot.finished,{variant:'first',reason:'destroyed'});
  assert.equal(before.hasAttribute('inert'),false);assert.equal(old.getAttribute('inert'),'original-value');
  assert.equal(root.hasAttribute('aria-modal'),false);assert.equal(w.document.activeElement,before);
  assert.equal(w.sessionStorage.getItem(KEY),null);assert.equal(listeners.size,0);
});

test('blocked storage and animation failures retain the bounded readiness lifecycle',async t => {
  const {root,create} = setup(t,{blockedStorage:true});
  const boot = create({ready:Promise.reject(new Error('scene failed')),createTimeline() {throw new Error('engine failed');}});
  await flush();t.mock.timers.tick(1400);
  assert.deepEqual(await boot.revealing,{variant:'first',reason:'ready'});
  assert.match(root.style.clipPath,/polygon\(evenodd/);
  t.mock.timers.tick(600);assert.deepEqual(await boot.finished,{variant:'first',reason:'ready'});
  assert.equal(root.hidden,true);
});

test('missing markup and an expired download failsafe resolve both promises immediately',async t => {
  const missing = createBootSequence({root:null,ready:Promise.reject(new Error('late chunk'))});
  assert.deepEqual(await missing.revealing,{variant:'first',reason:'ready'});
  assert.deepEqual(await missing.finished,{variant:'first',reason:'ready'});
  const {w,root,create} = setup(t);w.__qinanBootExpired = true;
  const late = create({ready:new Promise(() => {})});
  assert.deepEqual(await late.revealing,{variant:'first',reason:'timeout'});
  assert.deepEqual(await late.finished,{variant:'first',reason:'timeout'});assert.equal(root.hidden,true);
});

test('the module clears the inline download failsafe and v13 history cannot suppress the new poster',async t => {
  const {w,root,create} = setup(t);
  let inlineFired = false;w.__qinanBootFailSafe = setTimeout(() => {inlineFired = true;},4500);
  w.sessionStorage.setItem('qinan-boot-v13-complete','true');
  const boot = create();await flush();
  t.mock.timers.tick(450);assert.equal(root.hidden,false);assert.equal(root.dataset.variant,'first');
  t.mock.timers.tick(950);await boot.revealing;t.mock.timers.tick(600);await boot.finished;
  t.mock.timers.tick(3000);assert.equal(inlineFired,false);
  assert.equal(w.sessionStorage.getItem('qinan-boot-v13-complete'),'true');
});

test('published poster keeps intact Chinese dominant and uses no glyph variants or fetched imagery',() => {
  const source = new JSDOM(glyph);
  const page = new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
  try {
    const svg = page.window.document.querySelector('#boot .boot-glyph');
    assert.equal(svg.getAttribute('viewBox'),'0 0 1200 640');
    assert.equal(svg.querySelectorAll('[data-boot-letter],[data-boot-piece],[data-form-wide]').length,0);
    assert.equal(svg.querySelectorAll('clipPath,mask,image').length,0);
    assert.equal(svg.querySelectorAll('.boot-signal-brand use').length,2);
    assert.equal(svg.querySelector('.boot-signal-brand').getAttribute('fill'),'#f1f0e5');
    assert.equal(svg.querySelector('.boot-signal-blue').getAttribute('fill'),'#275dff');
    for (const id of ['boot-cn-qin','boot-cn-an']) {
      assert.equal(svg.querySelector(`#${id}`).getAttribute('d'),source.window.document.querySelector(`#${id}`).getAttribute('d'));
      assert.ok(svg.querySelector(`#${id}`).getAttribute('d').split('M').length > 2,'counters stay intact');
    }
    assert.equal(page.window.document.querySelector('[data-boot-title]').textContent,'正在加载亲安');
  } finally {source.window.close();page.window.close();}
});
