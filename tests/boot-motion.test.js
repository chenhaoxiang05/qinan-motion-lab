import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createBootSequence} from '../src/boot.js';

const near = (actual,expected,message) => assert.ok(Math.abs(actual - expected) < .003,`${message}: expected ${expected}, got ${actual}`);
const transformValue = (element,key) => Number(element.style.transform.match(new RegExp(`${key}\\(([-\\d.]+)`))?.[1]);

test('real Anime aligns local signal blocks, keeps the Chinese poster fixed, and opens a transparent window onto home',async t => {
  const dom = new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://qinan.test/',pretendToBeVisual:true});
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
  const brand = root.querySelector('.boot-signal-brand').outerHTML;
  const timelines = [];
  const boot = createBootSequence({
    root,
    stages:['界面','交互组件','场景'].map(label => ({label,ready:Promise.resolve()})),
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
    const deadline = Date.now() + 1800;
    while ((!timelines[index] || timelines[index].currentTime === 0) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve,10));
    assert.ok(timelines[index]?.currentTime > 0,`real engine starts phase ${index}`);
    timelines[index].pause();
    // Do not return Anime's thenable timeline from an async helper.
  };
  await started(0);
  const intro = timelines[0];
  intro.seek(150);
  near(transformValue(root.querySelector('.boot-signal-register'),'translateX'),-18/8,'registration midpoint');
  near(Number(root.querySelector('.boot-signal-register').style.opacity),.35 + .65 * 7/8,'registration contrast');
  intro.seek(525);
  near(transformValue(root.querySelector('.boot-signal-lime'),'translateX'),-72/16,'acid block midpoint');
  near(transformValue(root.querySelector('.boot-signal-blue'),'translateY'),56 * Math.pow(1 - (525-340)/410,4),'cobalt block midpoint');
  intro.seek(900);
  near(Number(root.querySelector('.boot-signal-lock').style.opacity),7/8,'brand registration lock');
  assert.equal(root.querySelector('.boot-signal-brand').outerHTML,brand,'Chinese word does not move, disappear or change contours');
  assert.equal(root.style.opacity,'','the whole screen never flashes through an opacity tween');
  assert.equal(root.style.backgroundColor,'','the whole screen never changes background color');

  assert.deepEqual(await boot.revealing,{variant:'first',reason:'ready'});
  assert.equal(root.dataset.phase,'revealing');
  assert.equal(root.hidden,false);
  assert.equal(w.document.querySelector('#home').hasAttribute('inert'),true);
  assert.equal(intro.cancelled,true,'intro cannot write over the reveal');
  await started(1);
  const reveal = timelines[1];
  reveal.seek(300);
  assert.match(root.style.clipPath,/polygon\(evenodd/);
  const coordinates = root.style.clipPath.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const outer = [0,0,100,0,100,100,0,100,0,0];
  const opening = [25,25,75,25,75,75,25,75,25,25];
  assert.equal(coordinates.length,20);
  coordinates.forEach((value,index) => near(value,[...outer,...opening][index],`window vertex ${index}`));
  assert.equal(root.hidden,false);
  assert.equal(w.document.querySelector('#home').hasAttribute('inert'),true,'visual overlap is not a click-through');
  assert.equal(root.querySelector('.boot-signal-brand').outerHTML,brand);
  reveal.seek(599);
  assert.equal(root.hidden,false,'completion cleanup is not used to fake the reveal midpoint');
  reveal.seek(600);
  assert.deepEqual(await boot.finished,{reason:'ready'});
  assert.equal(root.hidden,true);
  assert.equal(root.style.clipPath,'');
  assert.equal(w.document.querySelector('#home').hasAttribute('inert'),false);
  assert.ok(timelines.every(timeline => timeline.cancelled));
  const settled = root.innerHTML;
  await new Promise(resolve => setTimeout(resolve,40));
  assert.equal(root.innerHTML,settled,'no timeline writes after finish');
});
