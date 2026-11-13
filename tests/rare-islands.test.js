import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

test('real Rare UI islands preserve upload, score and review interactions', async t => {
  // Build the actual TSX/Motion adapter, keeping dependencies external so only
  // one React instance is used. The temporary module lives under ignored deps.
  const directory = await mkdtemp(path.resolve('node_modules/.qinan-rare-test-'));
  const outfile = path.join(directory, 'adapter.mjs');
  const dom = new JSDOM('<div id="upload"></div><div id="status"></div><div id="counter"></div><div id="faq"></div>', { url: 'http://localhost', pretendToBeVisual: true });
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
    const mediaListeners = new Set();
    const mediaQuery = { matches: false, addEventListener(type, listener) { if (type === 'change') mediaListeners.add(listener); }, removeEventListener(type, listener) { mediaListeners.delete(listener); }, addListener() {}, removeListener() {} };
    window.matchMedia = () => mediaQuery;
    install('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.ResizeObserver = globalThis.ResizeObserver;
    const { mountUpload, mountStatus, mountCounter, mountFaq } = await import(pathToFileURL(outfile).href);
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

    await t.test('counter updates the same island and exposes one current accessible score', async () => {
      const counterHost = document.querySelector('#counter');
      const counter = mountCounter(counterHost, { value: 0, label: '已答对', suffix: ' / 6', paused: false });
      const stableRoot = counterHost.querySelector('.qi-counter');
      const wheel = counterHost.querySelector('[data-slot="animated-counter-digit"]');
      assert.ok(wheel, 'the actual upstream digit wheel is mounted');
      assert.equal(wheel.closest('[aria-hidden="true"]').getAttribute('aria-hidden'), 'true');
      counter.update({ value: 3 });
      assert.strictEqual(counterHost.querySelector('.qi-counter'), stableRoot, 'updates preserve the island');
      assert.strictEqual(counterHost.querySelector('[data-slot="animated-counter-digit"]'), wheel, 'score changes update the existing wheel');
      assert.equal(counterHost.querySelector('.qi-counter-readable').textContent, '已答对 3 / 6');
      counter.update({ value: 4, paused: true });
      assert.equal(counterHost.querySelector('[data-slot="animated-counter"]').textContent, '4', 'pause immediately settles on the real value');
      assert.equal(counterHost.querySelector('[data-slot="animated-counter-digit"]'), null, 'a paused score cannot remain between faces');
      assert.equal(counterHost.querySelectorAll('.qi-counter-readable').length, 1);
      counter.destroy();
      counter.update({ value: 6 });
      assert.equal(counterHost.childElementCount, 0, 'late score updates do not remount a destroyed root');
    });

    await t.test('FAQ preserves controlled expansion, keyboard navigation and plain-text answers', async () => {
      const faqHost = document.querySelector('#faq');
      const items = [
        { id: 'why', question: '危险在哪里？', answer: '<img src=x onerror=alert(1)> 只是原样文本。' },
        { id: 'verify', question: '怎样核实？', answer: '拨打原来保存的号码。' },
      ];
      const selected = [];
      const faq = mountFaq(faqHost, { items, value: 'why', paused: true, onValueChange(value) { selected.push(value); faq.update({ value }); } });
      const buttons = [...faqHost.querySelectorAll('[data-slot="faq-question"]')];
      const region = faqHost.querySelector('[role="region"]');
      assert.equal(region.textContent, items[0].answer);
      assert.equal(faqHost.querySelector('img'), null, 'answer data is text, never parsed HTML');
      assert.equal(buttons[0].getAttribute('aria-controls'), region.id);
      assert.equal(region.getAttribute('aria-labelledby'), buttons[0].id);
      assert.notEqual(faqHost.querySelector('[data-slot="faq-answer"]').style.opacity, '0', 'paused open answers are visible immediately');
      buttons[0].focus();
      buttons[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      assert.strictEqual(document.activeElement, buttons[1]);
      buttons[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      assert.strictEqual(document.activeElement, buttons[0]);
      buttons[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      assert.strictEqual(document.activeElement, buttons[1]);
      buttons[1].click();
      assert.deepEqual(selected, ['verify']);
      assert.equal(faqHost.querySelector('[role="region"]').textContent, items[1].answer);
      buttons[1].click();
      assert.deepEqual(selected, ['verify', null]);
      assert.equal(faqHost.querySelector('[role="region"]'), null, 'paused closing has no lingering answer');
      faq.update({ value: 'why', paused: false });
      faq.update({ paused: true });
      assert.equal(faqHost.querySelector('[role="region"]').textContent, items[0].answer);
      assert.notEqual(faqHost.querySelector('[data-slot="faq-answer"]').style.opacity, '0', 'pausing during entrance removes stale opacity');
      faq.destroy();
      faq.update({ value: 'verify' });
      assert.equal(faqHost.childElementCount, 0);
      assert.equal(faqHost.classList.contains('rare-island'), false);
    });

    await t.test('system reduced motion shows final scores and expanded answers without hidden initial states', () => {
      mediaQuery.matches = true;
      for (const listener of mediaListeners) listener({ matches: true });
      const counterHost = document.querySelector('#counter');
      const faqHost = document.querySelector('#faq');
      const counter = mountCounter(counterHost, { value: 6, paused: false });
      const faq = mountFaq(faqHost, { items: [{ id: 'safe', question: '下一步？', answer: '独立核实。' }], value: 'safe', paused: false });
      assert.equal(counterHost.querySelector('[data-slot="animated-counter"]').textContent, '6');
      assert.equal(counterHost.querySelector('[data-slot="animated-counter-digit"]'), null);
      assert.equal(faqHost.querySelector('[role="region"]').textContent, '独立核实。');
      assert.equal(faqHost.querySelector('[data-slot="faq-answer"]').style.opacity, '');
      counter.destroy();
      faq.destroy();
    });
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
