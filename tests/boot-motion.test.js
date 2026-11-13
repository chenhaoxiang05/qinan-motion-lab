import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createBootSequence} from '../src/boot.js';

const numbers = path => path.match(/-?\d+(?:\.\d+)?/g).map(Number);
const pending = () => {let resolve;const promise = new Promise(done => {resolve = done;});return {promise,resolve};};
const near = (actual,expected,message) => assert.ok(Math.abs(actual - expected) < .002,`${message}: expected ${expected}, got ${actual}`);

test('real Anime morphs actual font contours and Chinese outline, then restores a complete solid lockup', async t => {
  const dom = new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'), {url:'https://qinan.test/',pretendToBeVisual:true});
  const w = dom.window;
  const previous = new Map();
  for (const key of ['window','document','HTMLElement','Element','SVGElement','Node','NodeList','HTMLCollection','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) {
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    const value = ['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key) ? w[key].bind(w) : w[key];
    Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  w.matchMedia = () => ({matches:false,addEventListener() {},removeEventListener() {}});
  const {createTimeline,engine} = await import('animejs');
  const root = w.document.querySelector('#boot');
  const timelines = [];
  const interaction = pending(),scene = pending();
  const boot = createBootSequence({
    root,
    stages:[
      {id:'interface',label:'界面',ready:Promise.resolve()},
      {id:'interaction',label:'交互组件',ready:interaction.promise},
      {id:'scene',label:'场景',ready:scene.promise},
    ],
    createTimeline(options) {const timeline = createTimeline(options);timelines.push(timeline);return timeline;},
  });
  t.after(() => {
    boot.destroy();engine.pause();dom.window.close();
    for (const [key,descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis,key,descriptor);
      else delete globalThis[key];
    }
  });
  const started = async index => {
    const deadline = Date.now() + 1500;
    while ((!timelines[index] || timelines[index].currentTime === 0) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve,10));
    assert.ok(timelines[index]?.currentTime > 0,`real engine starts typographic phase ${index}`);
    timelines[index].pause();
  };
  const letter = root.querySelector('[data-boot-letter="0"]');
  const chinese = root.querySelector('.boot-type-cn');
  const originalChinese = [...root.querySelectorAll('#boot-cn-qin,#boot-cn-an')].map(path => path.getAttribute('d'));
  const from = numbers(letter.dataset.formWide),to = numbers(letter.dataset.formCondensed);
  await started(0);
  const first = timelines[0];
  first.seek(340);
  const midpoint = numbers(letter.getAttribute('d'));
  // out(6) at half time has traversed 63/64 of each vertex movement. Checking
  // the path coordinates catches implementations that only scale the SVG.
  assert.equal(midpoint.length,from.length);
  midpoint.forEach((value,index) => near(value,from[index] + (to[index] - from[index]) * 63/64,`letter vertex ${index}`));
  assert.notEqual(letter.getAttribute('d'),letter.dataset.formWide);
  near(Number(chinese.style.fillOpacity),1,'Chinese remains filled during the first weight change');
  near(parseFloat(chinese.style.strokeWidth),5 * 15/16,'Chinese weight is interpolated by the real engine');
  first.seek(679);
  numbers(letter.getAttribute('d')).forEach((value,index) => near(value,to[index],`font approaches target before cleanup ${index}`));
  first.seek(680);
  assert.equal(letter.getAttribute('d'),letter.dataset.formCondensed);

  interaction.resolve();
  await started(1);
  const second = timelines[1];
  second.seek(340);
  near(Number(chinese.style.fillOpacity),1 + (.18 - 1) * 15/16,'Chinese outline retains a visible fill');
  near(parseFloat(chinese.style.strokeWidth),5 + (15.3 - 5) * 15/16,'Chinese outline stroke grows continuously');
  // Child <use> scales original Noto coordinates; compensate its stroke so
  // this outline remains comparable to the large Latin glyphs on screen.
  const scale = Number(chinese.querySelector('use').getAttribute('transform').match(/scale\(([-\d.]+)/)[1]);
  near(15.3 * scale,3.4994680812,'Chinese final outline is about 3.5 SVG units wide');
  assert.ok(Number(chinese.style.fillOpacity) >= .18);
  assert.deepEqual([...root.querySelectorAll('#boot-cn-qin,#boot-cn-an')].map(path => path.getAttribute('d')),originalChinese);
  second.seek(680);
  near(Number(chinese.style.fillOpacity),.18,'outline endpoint');

  scene.resolve();
  await started(2);
  const last = timelines[2];
  assert.equal(root.querySelector('.boot-type-word').getAttribute('mask'),'url(#boot-type-cut)');
  last.seek(240);
  near(Number(chinese.style.fillOpacity),.18 + .82 * 15/16,'Chinese fill returns continuously');
  near(parseFloat(chinese.style.strokeWidth),15.3 / 16,'Chinese stroke recedes continuously');
  last.seek(480);
  assert.equal(root.dataset.typeSettled,'true');
  assert.equal(root.dataset.type,'final');
  assert.equal(root.querySelector('.boot-type-word').hasAttribute('mask'),false);
  assert.equal(chinese.style.fillOpacity,'1');
  assert.equal(parseFloat(chinese.style.strokeWidth),0);
  for (const path of root.querySelectorAll('[data-boot-letter]')) assert.equal(path.getAttribute('d'),path.dataset.formFinal);
  assert.equal(root.querySelectorAll('[data-boot-piece]').length,0);
  boot.skip();
  assert.deepEqual(await boot.finished,{reason:'skip'});
  assert.ok(timelines.every(timeline => timeline.cancelled));
  const finalMarkup = root.innerHTML;
  await new Promise(resolve => setTimeout(resolve,40));
  assert.equal(root.innerHTML,finalMarkup,'dismissed typography cannot receive stale animation writes');
});
