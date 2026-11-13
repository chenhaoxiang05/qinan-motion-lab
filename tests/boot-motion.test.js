import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createBootSequence } from '../src/boot.js';

test('real Anime.js moves boot glyphs without a retained base translation and cancels on skip', async t => {
  const dom = new JSDOM(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), {
    url: 'https://qinan.test/', pretendToBeVisual: true,
  });
  const w = dom.window;
  const previous = new Map();
  for (const key of ['window', 'document', 'HTMLElement', 'Element', 'SVGElement', 'Node', 'NodeList', 'HTMLCollection', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'].includes(key) ? w[key].bind(w) : w[key];
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const { createTimeline, engine } = await import('animejs');
  const root = w.document.querySelector('#boot');
  const timelines = [];
  const neverReady = new Promise(() => {});
  const boot = createBootSequence({
    root,
    stages: [
      { id: 'interface', label: '界面', ready: Promise.resolve() },
      { id: 'interaction', label: '交互组件', ready: neverReady },
      { id: 'scene', label: '场景', ready: neverReady },
    ],
    createTimeline(options) {
      const timeline = createTimeline(options);
      timelines.push(timeline);
      return timeline;
    },
  });
  t.after(() => {
    boot.destroy();
    engine.pause();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  // Anime must receive its first engine frame before a paused timeline seek
  // renders its children. This exercises the actual engine, not a fake clock.
  const deadline = Date.now() + 1500;
  while ((!timelines[0] || timelines[0].currentTime === 0) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(timelines.length, 1);
  const timeline = timelines[0];
  assert.ok(timeline.currentTime > 0, 'the real engine starts the first milestone');
  timeline.pause();

  const piece = root.querySelector('[data-boot-piece="0"]');
  const value = name => Number(piece.style.transform.match(new RegExp(`${name}\\(([-\\d.]+)`))?.[1]);
  timeline.seek(280);
  // At half of a 560ms out(4) tween, 1/16 of each initial offset remains.
  // A translate(x,y) base plus Anime's translateX/Y would preserve the full
  // scattered offset until the completion callback visibly snapped it away.
  assert.doesNotMatch(piece.style.transform, /translate\(/, 'no original combined translation survives the tween');
  for (const [property, initial] of [['translateX', piece.dataset.fromX], ['translateY', piece.dataset.fromY], ['rotate', piece.dataset.fromRotate]]) {
    assert.ok(Math.abs(value(property) - Number(initial) / 16) < .001, `${property} is interpolated at the real midpoint`);
  }
  assert.ok(Math.abs(value('scale') - .99125) < .001);

  timeline.seek(560);
  assert.equal(value('translateX'), 0);
  assert.equal(value('translateY'), 0);
  assert.equal(value('rotate'), 0);
  assert.equal(value('scale'), 1, 'the first piece reaches identity before the staggered group completes');
  assert.equal(piece.dataset.state, 'animating', 'identity comes from interpolation, not markAssembled cleanup');

  boot.skip();
  assert.deepEqual(await boot.finished, { reason: 'skip' });
  assert.equal(timeline.cancelled, true);
  assert.equal(root.hidden, true);
  assert.equal(w.document.documentElement.dataset.boot, 'ready');
  const skippedStyle = piece.style.transform;
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(piece.style.transform, skippedStyle, 'a skipped timeline cannot write stale styles');
});
