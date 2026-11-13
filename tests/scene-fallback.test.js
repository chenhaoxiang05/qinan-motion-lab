import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createSanctuary, sculpturePlacement } from '../src/scene.js';

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

test('WebGL failure retains six readable local plates, both forms and full controller compatibility', async t => {
  environment(t, '<div id="world"><div class="scene-placeholder">安</div></div>');
  const host = document.querySelector('#world'), scene = fallback(host);
  assert.ok(host.classList.contains('webgl-ready')); assert.equal(host.querySelector('canvas'), null);
  assert.equal(host.querySelector('.scene-fallback-shield svg').style.width, '100%');
  assert.equal(host.querySelectorAll('[data-plate]').length, 6);
  assert.equal(host.querySelector('svg text'), null, 'glyphs are bundled outlines, never device fonts');
  assert.equal(host.querySelector('.scene-fallback').style.background, '', 'the CSS equipment field stays visible');
  scene.setEntranceProgress(0); scene.pause();
  assert.match(host.querySelector('.scene-fallback-shield').style.transform, /scale\(1\)/);
  scene.focus(true); assert.equal(host.querySelector('.scene-fallback').style.opacity, '0.36');
  scene.setPortalFocus({ x: 1, y: -1 }, 'practice'); scene.pointerPulse(.5, .5);
  assert.equal(await scene.toggleForm(), 'slogan');
  assert.equal(host.querySelectorAll('.scene-fallback-slogan [data-plate]').length, 6);
  assert.equal(host.querySelectorAll('.scene-fallback-slogan path[fill="#e9eadd"]').length, 6);
  assert.equal(await scene.toggleForm(), 'shield'); scene.dispose(); scene.dispose();
  assert.equal(host.querySelector('.scene-fallback'), null); assert.equal(host.classList.contains('webgl-ready'), false);
});

test('both fallback layouts follow the DOM anchor and detach their scroll listener on disposal', async t => {
  const dom = environment(t, '<div id="world"></div><div id="sculptureAnchor"></div>');
  let top = 120;
  document.querySelector('#sculptureAnchor').getBoundingClientRect = () => ({ left: 420, top, width: 400, height: 360 });
  assert.deepEqual(sculpturePlacement(), { x: 620, y: 300, size: 316.8 });
  const host = document.querySelector('#world'), scene = fallback(host), sculpture = host.querySelector('.scene-fallback-shield');
  const closedWidth = parseFloat(sculpture.style.width);
  assert.equal(sculpture.style.left, '620px'); assert.equal(sculpture.style.top, '300px');
  top = -50; dom.window.dispatchEvent(new dom.window.Event('scroll')); assert.equal(sculpture.style.top, '130px');
  await scene.toggleForm(); assert.ok(parseFloat(sculpture.style.width) > closedWidth);
  assert.equal(sculpture.style.left, '620px'); assert.equal(sculpture.style.top, '130px');
  scene.dispose(); top = 0; dom.window.dispatchEvent(new dom.window.Event('scroll'));
  assert.equal(sculpture.style.top, '130px');
});
