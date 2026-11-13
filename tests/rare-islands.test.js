import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

test('real Rare UI islands commit picker state synchronously and dispose their React roots', async () => {
  // Build the actual TSX/Motion adapter, keeping dependencies external so only
  // one React instance is used. The temporary module lives under ignored deps.
  const directory = await mkdtemp(path.resolve('node_modules/.qinan-rare-test-'));
  const outfile = path.join(directory, 'adapter.mjs');
  const dom = new JSDOM('<div id="upload"></div><div id="status"></div>', { url: 'http://localhost', pretendToBeVisual: true });
  const globals = new Map();
  const install = (name, value) => {
    globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  };
  try {
    await build({ entryPoints: ['src/rare-islands.jsx'], bundle: true, format: 'esm', outfile, packages: 'external', loader: { '.css': 'empty' }, logLevel: 'silent' });
    for (const name of ['window', 'document', 'HTMLElement', 'SVGElement', 'Element', 'Node', 'Image', 'screen', 'navigator']) install(name, dom.window[name]);
    install('getComputedStyle', dom.window.getComputedStyle.bind(dom.window));
    install('requestAnimationFrame', dom.window.requestAnimationFrame.bind(dom.window));
    install('cancelAnimationFrame', dom.window.cancelAnimationFrame.bind(dom.window));
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    install('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.ResizeObserver = globalThis.ResizeObserver;
    const { mountUpload, mountStatus } = await import(pathToFileURL(outfile).href);
    const host = document.querySelector('#upload');
    const statusHost = document.querySelector('#status');
    let choices = 0;
    let removals = 0;
    const upload = mountUpload(host, {
      kind: 'image', paused: true, detail: '不超过100 MB',
      onChoose() { choices++; assert.equal(host.querySelector('.qi-upload').dataset.open, 'true', 'phase two is committed before opening the native picker'); },
      onRemove() { removals++; },
    });
    assert.ok(host.querySelector('[data-slot="folder"] svg'), 'actual Rare folder SVG is mounted');
    assert.match(host.textContent, /不超过100 MB/, 'file constraints remain visible before selection');
    host.querySelector('[data-upload-action="choose"]').click();
    assert.equal(choices, 1, 'a single folder click activates exactly once');
    upload.update({ open: false, file: { name: 'example.wav', size: 2048 }, kind: 'audio', url: 'blob:example' });
    assert.equal(host.querySelector('.qi-file-name').textContent, 'example.wav');
    assert.ok(host.querySelector('audio[controls]'), 'native audio controls are preserved');
    host.querySelector('[data-upload-action="remove"]').click();
    assert.equal(removals, 1);
    assert.equal(choices, 1, 'remove never triggers the file picker');
    upload.update({ disabled: true });
    host.querySelector('[data-upload-action="choose"]').click();
    assert.equal(choices, 1, 'disabled picker cannot activate');
    const status = mountStatus(statusHost, { state: 'loading', label: '正在核验', paused: true });
    assert.equal(statusHost.querySelector('[data-slot="ai-status"]').dataset.state, 'analyzing');
    status.update({ state: 'success', label: '已完成' });
    assert.equal(statusHost.querySelector('[data-slot="ai-status"]').dataset.state, 'done');
    upload.destroy();
    status.destroy();
    upload.update({ open: true });
    assert.equal(host.childElementCount, 0, 'destroyed upload cannot render stale state');
    assert.equal(statusHost.childElementCount, 0);
    assert.equal(host.classList.contains('rare-island'), false);
  } finally {
    // React schedules a final passive cleanup task after synchronous unmount.
    await new Promise(resolve => setTimeout(resolve, 40));
    dom.window.close();
    for (const [name, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
    await rm(directory, { recursive: true, force: true });
  }
});
