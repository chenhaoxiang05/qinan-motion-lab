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
    const { mountUpload, mountStatus, mountCounter, mountFaq, mountMaterialTabs, mountMatrixField } = await import(pathToFileURL(outfile).href);
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

    await t.test('Gooey material tabs retain controlled selection, native semantics and keyboard activation', () => {
      const tabsHost = document.createElement('div');
      tabsHost.setAttribute('role', 'tablist');
      tabsHost.setAttribute('aria-label', '选择材料类型');
      tabsHost.innerHTML = '<button>原生选项</button>';
      document.body.append(tabsHost);
      const selected = [];
      const tabs = mountMaterialTabs(tabsHost, { value: 'audio', paused: true, onChange(value) { selected.push(value); tabs.update({ value }); } });
      const buttons = [...tabsHost.querySelectorAll('[role="tab"]')];
      const root = tabsHost.querySelector('[data-slot="gooey-nav"]');
      assert.equal(tabsHost.getAttribute('role'), null, 'the fallback host must not create a nested tablist');
      assert.equal(tabsHost.querySelectorAll('[role="tablist"]').length, 1);
      assert.deepEqual(buttons.map(button => button.id), ['type-audio', 'type-video', 'type-image', 'type-chat']);
      assert.ok(buttons.every(button => button.getAttribute('aria-controls') === 'uploadPanel'));
      assert.ok(tabsHost.querySelector('svg [id^="gooey-neck-"]'), 'the upstream curved SVG seam is really mounted');
      assert.equal(root.dataset.paused, 'true');
      buttons[0].focus();
      buttons[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      assert.strictEqual(document.activeElement, buttons[1]);
      assert.equal(buttons[1].getAttribute('aria-selected'), 'true');
      buttons[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      assert.strictEqual(document.activeElement, buttons[3]);
      buttons[3].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      assert.strictEqual(document.activeElement, buttons[0]);
      buttons[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      assert.strictEqual(document.activeElement, buttons[3]);
      buttons[3].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      assert.strictEqual(document.activeElement, buttons[0]);
      buttons[2].click();
      assert.deepEqual(selected, ['video', 'chat', 'audio', 'chat', 'audio', 'image']);
      assert.equal(buttons[2].getAttribute('aria-selected'), 'true');
      assert.deepEqual(buttons.map(button => button.tabIndex), [-1, -1, 0, -1]);
      assert.strictEqual(tabsHost.querySelector('[data-slot="gooey-nav"]'), root, 'material changes preserve the same mounted island');
      assert.strictEqual(tabsHost.querySelector('#type-image'), buttons[2], 'material labels are never replaced during a morph');
      buttons[2].click();
      assert.equal(selected.length, 6, 'selecting the active material does not restart its work');
      tabs.update({ disabled: true, paused: false });
      buttons[0].click();
      buttons[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      assert.equal(selected.length, 6, 'disabled tabs cannot switch by pointer or synthetic keyboard');
      assert.ok(buttons.every(button => button.disabled));
      tabs.update({ disabled: false, paused: false, value: 'chat' });
      tabs.update({ disabled: false, paused: true, value: 'video' });
      assert.equal(buttons[1].getAttribute('aria-selected'), 'true');
      assert.equal(root.dataset.paused, 'true');
      assert.deepEqual([...tabsHost.querySelectorAll('[data-slot="gooey-nav-segment"]')].map(segment => segment.style.marginLeft), ['0px', '5px', '5px', '-1px'], 'pausing a morph immediately settles the final selection geometry');
      assert.ok(buttons.every(button => button.textContent.length > 0 && button.style.opacity !== '0'), 'labels remain visible throughout selection changes');
      tabs.destroy();
      tabs.update({ value: 'chat' });
      assert.equal(tabsHost.childElementCount, 0);
      assert.equal(tabsHost.getAttribute('role'), 'tablist', 'fallback semantics are restored on teardown');
      assert.equal(tabsHost.getAttribute('aria-label'), '选择材料类型');
      assert.equal(tabsHost.classList.contains('qi-material-tabs-host'), false);
      tabsHost.remove();
    });

    await t.test('Matrix field caps canvas resolution and stops frames on pause, visibility, reduced motion and destroy', () => {
      const originalRaf = window.requestAnimationFrame;
      const originalCancel = window.cancelAnimationFrame;
      const originalGetContext = window.HTMLCanvasElement.prototype.getContext;
      const originalMatchMedia = window.matchMedia;
      const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
      const originalDpr = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
      const pending = new Map();
      let serial = 0, draws = 0, arcs = 0, hidden = false;
      const cancelled = [];
      const mobile = { matches: false, listeners: new Set(), addEventListener(_, fn) { this.listeners.add(fn); }, removeEventListener(_, fn) { this.listeners.delete(fn); } };
      const reduce = { ...mobile, listeners: new Set() };
      const context = { clearRect() { draws++; }, setTransform() {}, beginPath() {}, arc() { arcs++; }, fill() {} };
      window.HTMLCanvasElement.prototype.getContext = () => context;
      window.requestAnimationFrame = callback => { const id = ++serial; pending.set(id, callback); return id; };
      window.cancelAnimationFrame = id => { cancelled.push(id); pending.delete(id); };
      window.matchMedia = query => query.includes('prefers-reduced-motion') ? reduce : mobile;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 4 });
      const matrixHost = document.createElement('div');
      document.body.append(matrixHost);
      let matrix;
      const tick = now => {
        const current = [...pending.values()]; pending.clear(); current.forEach(callback => callback(now));
      };
      try {
        matrix = mountMatrixField(matrixHost, { paused: true });
        const canvas = matrixHost.querySelector('canvas');
        const field = matrixHost.querySelector('[data-slot="matrix-orb"]');
        assert.ok(canvas);
        assert.equal(matrixHost.getAttribute('aria-hidden'), 'true');
        assert.equal(matrixHost.textContent, '', 'decorative field has no invented detection status');
        assert.equal(canvas.width, 380, '190px field caps devicePixelRatio at 2');
        assert.equal(arcs, 169, 'desktop rendering uses only a 13 × 13 field');
        assert.equal(pending.size, 0, 'initial paused mount never starts a frame loop');
        matrix.update({ paused: false, activePortal: 'check' });
        const start = performance.now();
        tick(start + 25);
        assert.ok(draws > 1);
        assert.equal(pending.size, 1);
        assert.equal(field.dataset.activePortal, 'check');
        const beforePause = draws;
        matrix.update({ paused: true });
        assert.equal(pending.size, 0);
        assert.ok(cancelled.length > 0);
        tick(start + 1000);
        assert.equal(draws, beforePause, 'pausing retains the last frame without drawing');
        matrix.update({ paused: false, activePortal: 'history' });
        assert.strictEqual(matrixHost.querySelector('canvas'), canvas, 'portal changes retain the same canvas');
        assert.equal(field.dataset.activePortal, 'history');
        hidden = true; document.dispatchEvent(new window.Event('visibilitychange'));
        assert.equal(pending.size, 0, 'hidden documents cannot keep ambient frames alive');
        hidden = false; document.dispatchEvent(new window.Event('visibilitychange'));
        assert.equal(pending.size, 1);
        reduce.matches = true; reduce.listeners.forEach(listener => listener());
        assert.equal(pending.size, 0, 'a live reduced-motion change stops the loop');
        reduce.matches = false; reduce.listeners.forEach(listener => listener());
        assert.equal(pending.size, 1);
        mobile.matches = true;
        const previousArcs = arcs;
        mobile.listeners.forEach(listener => listener());
        assert.equal(arcs - previousArcs, 81, 'mobile redraw uses a smaller 9 × 9 field');
        const mobileStart = performance.now();
        const mobileDraws = draws;
        for (const offset of [8, 16, 24, 40, 48, 56, 64, 80]) tick(mobileStart + offset);
        assert.ok(draws - mobileDraws <= 2, 'mobile canvas painting stays at or below 30fps');
        const stale = [...pending.values()][0];
        matrix.destroy();
        assert.equal(pending.size, 0);
        assert.equal(mobile.listeners.size, 0);
        assert.equal(reduce.listeners.size, 0);
        const afterDestroy = draws;
        stale?.(performance.now() + 2000);
        window.dispatchEvent(new window.Event('resize'));
        document.dispatchEvent(new window.Event('visibilitychange'));
        matrix.update({ paused: false });
        assert.equal(draws, afterDestroy, 'stale callbacks and updates never draw after unmount');
        assert.equal(pending.size, 0);
        assert.equal(matrixHost.childElementCount, 0);
        assert.equal(matrixHost.hasAttribute('aria-hidden'), false, 'the adapter restores its host attributes');

        window.HTMLCanvasElement.prototype.getContext = () => null;
        matrix = mountMatrixField(matrixHost, { paused: false });
        assert.ok(matrixHost.querySelector('[data-slot="matrix-orb-fallback"]'), 'canvas-unavailable browsers keep a visible static field');
        assert.equal(pending.size, 0);
      } finally {
        matrix?.destroy(); matrixHost.remove();
        window.requestAnimationFrame = originalRaf;
        window.cancelAnimationFrame = originalCancel;
        window.HTMLCanvasElement.prototype.getContext = originalGetContext;
        window.matchMedia = originalMatchMedia;
        if (originalHidden) Object.defineProperty(document, 'hidden', originalHidden); else delete document.hidden;
        if (originalDpr) Object.defineProperty(window, 'devicePixelRatio', originalDpr); else delete window.devicePixelRatio;
      }
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
    await t.test('the local usage guide reuses the actual counter and FAQ across all four examples', async () => {
      const {guideMarkup,mountUsageGuide}=await import('../src/usage-guide.js');
      const dialog=document.createElement('dialog'),guideHost=document.createElement('div');
      guideHost.innerHTML=guideMarkup();dialog.append(guideHost);document.body.append(dialog);
      const starts=[];
      const guide=mountUsageGuide(guideHost,{islands:{mountCounter,mountFaq},motionEnabled:()=>false,onStart:kind=>starts.push(kind)});
      try {
        const counterRoot=guideHost.querySelector('.qi-counter');assert.ok(counterRoot);
        for(const kind of ['audio','video','image','chat']) {
          guideHost.querySelector(`[data-guide-kind="${kind}"]`).click();
          guideHost.querySelector('[data-guide-step="2"]').click();
          assert.strictEqual(guideHost.querySelector('.qi-counter'),counterRoot);
          assert.equal(guideHost.querySelector('.qi-counter-readable').textContent,'3 / 3');
          assert.ok(guideHost.querySelector('[data-guide-faq] [data-slot="faq-question"]'));
          assert.ok(guideHost.querySelector('[data-guide-faq] [role="region"]').textContent.length>15);
          guideHost.querySelector('[data-guide-next]').click();
        }
        assert.deepEqual(starts,['audio','video','image','chat']);
      } finally {guide.destroy();assert.equal(guideHost.querySelector('.rare-island'),null);dialog.remove();}
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
