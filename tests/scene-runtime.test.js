import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import * as THREE from 'three';

// Real scene geometry/materials and Anime; replace only the GPU renderer/environment bake.
test('scene entrance, ambient clocks and context loss preserve complete readable terminal states', async t => {
  const repo = fileURLToPath(new URL('../', import.meta.url));
  const temp = await mkdtemp(join(repo, 'node_modules/.seal-runtime-'));
  const dom = new JSDOM('<div id="world"></div><div id="sculptureAnchor"></div><div class="intro-copy"></div>', { pretendToBeVisual: true });
  const w = dom.window, previous = new Map(), callbacks = new Map(); let nextFrame = 0, now = 0;
  const install = (key, value) => { previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, value }); };
  const raf = fn => { const id = ++nextFrame; callbacks.set(id, fn); return id; };
  const caf = id => callbacks.delete(id);
  const frame = (delta = 16) => { now += delta; const ready = [...callbacks.values()]; callbacks.clear(); ready.forEach(fn => fn(now)); };
  w.requestAnimationFrame = raf; w.cancelAnimationFrame = caf;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.Path2D = class { constructor(path) { this.path = path; } };
  w.HTMLCanvasElement.prototype.getContext = function(type) {
    assert.equal(type, '2d'); return new Proxy({ canvas: this }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  };
  w.document.querySelector('#sculptureAnchor').getBoundingClientRect = () => ({ left: 420, top: 110, width: 400, height: 360 });
  for (const [key, value] of Object.entries({ window: w, document: w.document, requestAnimationFrame: raf, cancelAnimationFrame: caf, getComputedStyle: w.getComputedStyle.bind(w), HTMLElement: w.HTMLElement, SVGElement: w.SVGElement, NodeList: w.NodeList, HTMLCollection: w.HTMLCollection })) install(key, value);
  let renderer, controller;
  class Renderer {
    constructor() { renderer = this; this.domElement = w.document.createElement('canvas'); this.disposals = 0; }
    setRenderTarget() {} clear() {} clearDepth() {} setPixelRatio() {} setSize() {}
    render(scene) {
      if (scene.children.some(child => child.material?.uniforms?.uTime)) this.uniforms = scene.children[0].material.uniforms;
      else this.sculpture = scene.children.find(child => child.isGroup);
    }
    dispose() { this.disposals++; }
  }
  install('__sealTestRenderer', Renderer);
  install('__sealTestEnvironment', class { constructor() {} fromScene() { return { texture: new THREE.Texture(), dispose() {} }; } dispose() {} });
  t.after(async () => {
    controller?.dispose(); const { engine } = await import('animejs'); engine.pause(); callbacks.clear(); dom.window.close();
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
    await rm(temp, { recursive: true, force: true });
  });
  const sourcePath = join(repo, 'src/scene.js');
  const source = (await readFile(sourcePath, 'utf8')).replace('new THREE.WebGLRenderer(', 'new globalThis.__sealTestRenderer(').replace('new THREE.PMREMGenerator(', 'new globalThis.__sealTestEnvironment(');
  const output = await build({ stdin: { contents: source, resolveDir: dirname(sourcePath), sourcefile: sourcePath }, bundle: true, write: false, platform: 'node', format: 'esm', external: ['three', 'animejs'], logLevel: 'silent' });
  const bundle = join(temp, 'scene.mjs'); await writeFile(bundle, output.outputFiles[0].text);
  const { createSanctuary } = await import(pathToFileURL(bundle).href);
  controller = createSanctuary(w.document.querySelector('#world'));
  assert.equal(w.document.documentElement.dataset.sceneRenderer, 'webgl');
  controller.setEntranceProgress(0); frame(); frame();
  assert.equal(renderer.sculpture.visible, false);
  assert.equal(renderer.uniforms.uTime.value, 0); assert.equal(renderer.uniforms.uAmbientTime.value, 0);
  assert.equal(w.document.documentElement.classList.contains('scene-ambient-paused'), true);
  controller.pause(); controller.setEntranceProgress(0); assert.equal(renderer.sculpture.visible, false, 'manual pause cannot reveal prepared artwork');
  controller.resume(); controller.setEntranceProgress(1); frame(); frame();
  assert.equal(renderer.sculpture.visible, true); assert.ok(renderer.uniforms.uTime.value > 0);
  const ambient = renderer.uniforms.uAmbientTime.value, time = renderer.uniforms.uTime.value;
  controller.setPortalFocus({ x: .5, y: 0 }, 'practice'); frame(); frame();
  assert.equal(renderer.uniforms.uAmbientTime.value, ambient, 'hover freezes the automatic packet phase');
  assert.ok(renderer.uniforms.uTime.value > time, 'the rest of the equipment field keeps moving');
  controller.setPortalFocus(null); frame(); assert.ok(renderer.uniforms.uAmbientTime.value > ambient);
  for (const action of ['pause', 'focus', 'hidden']) {
    if (action === 'pause') controller.pause();
    if (action === 'focus') controller.focus(true);
    if (action === 'hidden') { Object.defineProperty(w.document, 'hidden', { configurable: true, value: true }); w.document.dispatchEvent(new w.Event('visibilitychange')); }
    const held = renderer.uniforms.uTime.value; frame(); frame(); assert.equal(renderer.uniforms.uTime.value, held);
    if (action === 'pause') controller.resume();
    if (action === 'focus') controller.focus(false);
    if (action === 'hidden') { Object.defineProperty(w.document, 'hidden', { configurable: true, value: false }); w.document.dispatchEvent(new w.Event('visibilitychange')); }
    frame(); frame(); assert.ok(renderer.uniforms.uTime.value > held);
  }
  const pending = controller.toggleForm(); frame();
  renderer.domElement.dispatchEvent(new w.Event('webglcontextlost', { cancelable: true }));
  assert.equal(await pending, 'slogan');
  assert.equal(w.document.querySelectorAll('[data-seal-core]').length, 1);
  assert.equal(w.document.querySelectorAll('[data-slogan-line]').length, 2);
  assert.equal(w.document.documentElement.dataset.sceneRenderer, 'fallback');
  assert.equal(renderer.disposals, 1);
  assert.equal(await controller.toggleForm(), 'shield');
  controller.dispose(); controller.dispose(); assert.equal(renderer.disposals, 1);
  assert.equal(w.document.querySelector('.scene-fallback'), null);
});
