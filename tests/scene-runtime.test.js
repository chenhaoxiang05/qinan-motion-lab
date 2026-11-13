import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import * as THREE from 'three';

// Keep real Three geometry/materials and Anime; substitute only GPU operations
// and the environment bake so renderer lifecycle contracts run without WebGL.
test('the transparent seal renderer and its recovery paths leave the ambient layer independent', async t => {
  const repo = fileURLToPath(new URL('../', import.meta.url));
  const temp = await mkdtemp(join(repo, 'node_modules/.seal-runtime-'));
  const dom = new JSDOM('<div class="stage-background" data-ambient-state="running"></div><div id="world"></div><div id="sculptureAnchor"></div><div class="intro-copy"></div>', { pretendToBeVisual: true });
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
  let renderer, controller, mode = 'normal';
  const warnings = [], originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  class Renderer {
    constructor(options) { renderer = this; this.options = options; this.mode = mode; this.domElement = w.document.createElement('canvas'); this.disposals = 0; this.renders = 0; this.debug = {}; this.scenes = new Set(); }
    setClearColor(color, alpha) { this.clearColor = color; this.clearAlpha = alpha; }
    setRenderTarget() {} clear() { this.clears = (this.clears || 0) + 1; } setPixelRatio() {} setSize() {}
    compile(scene) {
      assert.ok(scene instanceof THREE.Scene);
      if (this.mode === 'shader-error') this.debug.onShaderError({}, {}, {}, {});
    }
    render(scene) {
      if (this.mode === 'first-draw-error' || this.failNext) { this.failNext = false; throw new Error('GPU draw failed'); }
      this.renders++; this.scenes.add(scene); this.sculpture = scene.children.find(child => child.isGroup);
      assert.equal(scene.background, null, 'onscreen scene must never paint an opaque background');
      assert.ok(this.sculpture, 'render only the seal scene');
    }
    dispose() { this.disposals++; }
  }
  install('__sealTestRenderer', Renderer);
  install('__sealTestEnvironment', class { fromScene() { return { texture: new THREE.Texture(), dispose() {} }; } dispose() {} });
  t.after(async () => {
    controller?.dispose(); const { engine } = await import('animejs'); engine.pause(); callbacks.clear(); dom.window.close(); console.warn = originalWarn;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
    await rm(temp, { recursive: true, force: true });
  });
  const sourcePath = join(repo, 'src/scene.js');
  const source = (await readFile(sourcePath, 'utf8')).replace('new THREE.WebGLRenderer(', 'new globalThis.__sealTestRenderer(').replace('new THREE.PMREMGenerator(', 'new globalThis.__sealTestEnvironment(');
  const output = await build({ stdin: { contents: source, resolveDir: dirname(sourcePath), sourcefile: sourcePath }, bundle: true, write: false, platform: 'node', format: 'esm', external: ['three', 'animejs'], logLevel: 'silent' });
  const bundle = join(temp, 'scene.mjs'); await writeFile(bundle, output.outputFiles[0].text);
  const { createSanctuary } = await import(pathToFileURL(bundle).href);
  const host = w.document.querySelector('#world'), html = w.document.documentElement;
  const ambient = w.document.querySelector('.stage-background');
  html.style.setProperty('--field-title-bottom', '412px');
  const assertIndependent = () => {
    assert.equal(ambient.dataset.ambientState, 'running');
    assert.equal(html.style.getPropertyValue('--field-title-bottom'), '412px');
    assert.equal(html.classList.contains('scene-ambient-paused'), false);
  };
  const assertFallback = () => {
    assert.equal(host.querySelector('canvas'), null, 'remove the failed GPU canvas');
    assert.equal(host.querySelectorAll('.scene-fallback').length, 1);
    assert.equal(host.querySelectorAll('[data-seal-core]').length, 1);
    assert.equal(host.querySelector('.scene-fallback').style.background, '');
    assert.equal(html.dataset.sceneRenderer, 'fallback');
    assert.equal(renderer.disposals, 1); assertIndependent();
  };
  const release = () => { controller.dispose(); controller.dispose(); assert.equal(renderer.disposals, 1); assert.equal(host.children.length, 0); assertIndependent(); };

  await t.test('alpha canvas draws only the seal, preserves entrance, parallax and paused lifecycle', () => {
    controller = createSanctuary(host);
    assert.equal(renderer.options.alpha, true); assert.equal(renderer.clearAlpha, 0);
    assert.equal(renderer.clearColor, 0x000000); assert.equal(renderer.scenes.size, 1);
    assert.equal(renderer.renders, renderer.clears); assert.equal(html.dataset.sceneRenderer, 'webgl');
    const scene = [...renderer.scenes][0]; assert.ok(scene.environment, 'keep studio reflections');
    assert.equal(scene.environmentIntensity, .65);
    controller.setEntranceProgress(0); frame(); frame(); assert.equal(renderer.sculpture.visible, false);
    controller.pause(); controller.setEntranceProgress(0); assert.equal(renderer.sculpture.visible, false, 'pause cannot expose prepared artwork');
    controller.resume(); controller.setEntranceProgress(1); frame(); frame(); assert.equal(renderer.sculpture.visible, true);
    const rotation = renderer.sculpture.rotation.y;
    controller.setPortalFocus({ x: .5, y: 0 }, 'practice'); frame(); frame();
    assert.notEqual(renderer.sculpture.rotation.y, rotation, 'portal hover still tilts the seal');
    controller.setPortalFocus(null); controller.pointerPulse(.3, .5); assert.equal(renderer.scenes.size, 1);
    frame(); const beforeDrag = renderer.sculpture.rotation.y;
    const pointer = (target, type, x, y) => { const event = new w.Event(type); Object.assign(event, { pointerId: 7, button: 0, clientX: x, clientY: y }); target.dispatchEvent(event); };
    pointer(renderer.domElement, 'pointerdown', 620, 290); pointer(w, 'pointermove', 650, 300); frame();
    assert.notEqual(renderer.sculpture.rotation.y, beforeDrag, 'drag continues to rotate the seal');
    assert.equal(renderer.domElement.classList.contains('grabbing'), true);
    pointer(w, 'pointerup', 650, 300); assert.equal(renderer.domElement.classList.contains('grabbing'), false);
    for (const action of ['pause', 'focus', 'hidden']) {
      if (action === 'pause') controller.pause();
      if (action === 'focus') controller.focus(true);
      if (action === 'hidden') { Object.defineProperty(w.document, 'hidden', { configurable: true, value: true }); w.document.dispatchEvent(new w.Event('visibilitychange')); }
      const held = renderer.renders; frame(); frame(); assert.equal(renderer.renders, held, `${action} stops seal frames`); assertIndependent();
      if (action === 'pause') controller.resume();
      if (action === 'focus') controller.focus(false);
      if (action === 'hidden') { Object.defineProperty(w.document, 'hidden', { configurable: true, value: false }); w.document.dispatchEvent(new w.Event('visibilitychange')); }
      frame(); frame(); assert.ok(renderer.renders > held);
    }
    release();
  });

  for (const failure of ['shader-error', 'first-draw-error']) await t.test(`${failure} recovers during initialization without an opaque or abandoned canvas`, async () => {
    mode = failure; controller = createSanctuary(host); assertFallback();
    controller.setEntranceProgress(0); assert.equal(host.querySelector('.scene-fallback-shield').style.opacity, '0');
    controller.setEntranceProgress(1); assert.equal(await controller.toggleForm(), 'slogan');
    assert.equal(host.querySelectorAll('[data-slogan-line]').length, 2); release();
  });

  await t.test('a later render failure preserves current entrance and focused fallback state', () => {
    mode = 'normal'; controller = createSanctuary(host); controller.setEntranceProgress(.5);
    renderer.failNext = true; controller.focus(true); assertFallback();
    assert.equal(host.querySelector('.scene-fallback-shield').style.opacity, '0.5');
    assert.equal(host.querySelector('.scene-fallback').style.opacity, '0.36');
    const held = renderer.renders; frame(); frame(); assert.equal(renderer.renders, held); release();
  });

  await t.test('context loss settles an in-progress form and keeps both slogan lines operable', async () => {
    mode = 'normal'; controller = createSanctuary(host); const pending = controller.toggleForm(); frame();
    const event = new w.Event('webglcontextlost', { cancelable: true }); renderer.domElement.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true); assert.equal(await pending, 'slogan'); assertFallback();
    assert.equal(host.querySelectorAll('[data-slogan-line]').length, 2);
    assert.equal(await controller.toggleForm(), 'shield');
    const held = renderer.renders; frame(); frame(); assert.equal(renderer.renders, held); release();
  });
  assert.equal(warnings.length, 3, 'only explicitly simulated renderer failures warn');
});
