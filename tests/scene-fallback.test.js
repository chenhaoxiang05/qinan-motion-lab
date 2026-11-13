import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createSanctuary, sculpturePlacement } from '../src/scene.js';
import { SEAL_LAYOUT, SEAL_BOUNDS } from '../src/scene-geometry.js';

function environment(t, html) {
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const previousWindow = globalThis.window, previousDocument = globalThis.document;
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  dom.window.HTMLCanvasElement.prototype.getContext = () => { throw new Error('WebGL unavailable'); };
  t.after(() => { dom.window.close(); globalThis.window = previousWindow; globalThis.document = previousDocument; });
  return dom;
}
function fallback(host) {
  const originalError = console.error;
  try { console.error = () => {}; return createSanctuary(host); }
  finally { console.error = originalError; }
}

test('WebGL failure retains an intact local seal, complete lines and entrance visibility control', async t => {
  environment(t, '<div id="world"><div class="scene-placeholder">安</div></div>');
  const host = document.querySelector('#world'), scene = fallback(host);
  assert.ok(host.classList.contains('webgl-ready')); assert.equal(host.querySelector('canvas'), null);
  assert.equal(document.documentElement.dataset.sceneRenderer, 'fallback');
  assert.equal(host.querySelectorAll('[data-seal-core]').length, 1);
  assert.equal(host.querySelectorAll('[data-plate]').length, 0);
  assert.equal(host.querySelector('svg text'), null, 'glyphs are bundled outlines, never device fonts');
  assert.equal(host.querySelector('.scene-fallback').style.background, '', 'the CSS equipment field stays visible');
  scene.setEntranceProgress(0); scene.pause();
  assert.equal(host.querySelector('.scene-fallback-shield').style.visibility, 'hidden', 'pause must not expose a prepared seal');
  assert.equal(host.querySelector('.scene-fallback-shield').style.opacity, '0');
  scene.setEntranceProgress(1);
  assert.equal(host.querySelector('.scene-fallback-shield').style.visibility, 'visible');
  assert.equal(host.querySelector('.scene-fallback-shield').style.opacity, '1');
  scene.focus(true); assert.equal(host.querySelector('.scene-fallback').style.opacity, '0.36');
  scene.setPortalFocus({ x: 1, y: -1 }, 'practice'); scene.pointerPulse(.5, .5);
  assert.equal(await scene.toggleForm(), 'slogan');
  assert.equal(host.querySelectorAll('.scene-fallback-slogan [data-seal-core]').length, 1);
  assert.equal(host.querySelectorAll('.scene-fallback-slogan [data-slogan-line]').length, 2);
  assert.equal(await scene.toggleForm(), 'shield'); scene.dispose(); scene.dispose();
  assert.equal(host.querySelector('.scene-fallback'), null); assert.equal(host.classList.contains('webgl-ready'), false);
  assert.equal(document.documentElement.dataset.sceneRenderer, undefined);
});

test('both forms keep one anchor scale, preserve phone text size and detach placement observers', async t => {
  const dom = environment(t, '<div id="world"></div><div id="sculptureAnchor"></div>');
  let top = 120;
  document.querySelector('#sculptureAnchor').getBoundingClientRect = () => ({ left: 420, top, width: 400, height: 360 });
  assert.deepEqual(sculpturePlacement(), { x: 620, y: 300, size: 316.8 });
  const host = document.querySelector('#world'), scene = fallback(host), sculpture = host.querySelector('.scene-fallback-shield');
  const closedWidth = parseFloat(sculpture.style.width);
  assert.equal(sculpture.style.left, '620px'); assert.equal(sculpture.style.top, '300px');
  top = -50; dom.window.dispatchEvent(new dom.window.Event('scroll')); assert.equal(sculpture.style.top, '130px');
  await scene.toggleForm(); assert.equal(parseFloat(sculpture.style.width), closedWidth, 'opening does not zoom the whole scene');
  assert.equal(sculpture.style.left, '620px'); assert.equal(sculpture.style.top, '130px');
  for (const width of [320, 390, 430]) {
    document.querySelector('#sculptureAnchor').getBoundingClientRect = () => ({ left: 18, top: 120, width: width - 36, height: 330 });
    const size = sculpturePlacement().size;
    assert.ok(size / Math.max(SEAL_BOUNDS.width, SEAL_BOUNDS.height) * SEAL_LAYOUT.glyphHeight * .98 >= 28, `slogan budget at ${width}px`);
  }
  scene.dispose(); top = 0; dom.window.dispatchEvent(new dom.window.Event('scroll'));
  assert.equal(sculpture.style.top, '130px');
});

test('fallback ambient animation pauses for preparation, focus, hidden tabs and manual motion preference', t => {
  const dom = environment(t, '<div id="world"></div>'), scene = fallback(document.querySelector('#world'));
  const paused = () => document.documentElement.classList.contains('scene-ambient-paused');
  assert.equal(paused(), false);
  scene.setEntranceProgress(0); assert.equal(paused(), true);
  scene.setEntranceProgress(1); assert.equal(paused(), false);
  scene.focus(true); assert.equal(paused(), true); scene.focus(false); assert.equal(paused(), false);
  scene.pause(); assert.equal(paused(), true); scene.resume(); assert.equal(paused(), false);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new dom.window.Event('visibilitychange')); assert.equal(paused(), true);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  document.dispatchEvent(new dom.window.Event('visibilitychange')); assert.equal(paused(), false);
  scene.dispose(); assert.equal(paused(), false);
});
