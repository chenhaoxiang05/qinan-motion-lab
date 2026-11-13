const SESSION_KEY = 'qinan-boot-complete';
const FIRST_VISIT_MS = 2400;
const RETURN_VISIT_MS = 400;
const FAIL_OPEN_MS = 4000;

/**
 * A single, bounded entrance sequence. Readiness is supplied by the caller, so
 * the boot screen never invents download or analysis progress. The returned
 * promise is also the gate for the initial route/native dialog.
 */
export function createBootSequence({
  root = globalThis.document?.querySelector('#boot'),
  ready = Promise.resolve(),
  motionPaused = false,
} = {}) {
  const doc = root?.ownerDocument ?? globalThis.document;
  const win = doc?.defaultView ?? globalThis.window;
  clearTimeout(win?.__qinanBootFailSafe);
  const label = root?.querySelector('[data-boot-stage]');
  const skipButton = root?.querySelector('[data-boot-skip]');
  const previousFocus = doc?.activeElement;
  let resolveFinished;
  const finished = new Promise(resolve => { resolveFinished = resolve; });
  let complete = false;
  let readyToShow = false;
  let minimumElapsed = false;
  let minimumTimer;
  let deadlineTimer;
  let mediaQuery;
  const inertSiblings = [];

  function isolateInterface() {
    // The boot overlay is not a native dialog: without inert, Tab can reach a
    // background button and open a native top-layer dialog above the overlay.
    // Walk ancestor branches too, so embedding the root does not weaken this.
    let branch = root;
    while (branch?.parentElement) {
      const parent = branch.parentElement;
      for (const sibling of parent.children) {
        if (sibling === branch || /^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(sibling.tagName)) continue;
        inertSiblings.push([sibling, sibling.getAttribute('inert')]);
        sibling.setAttribute('inert', '');
      }
      if (parent === doc.body) break;
      branch = parent;
    }
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    if (label) {
      label.setAttribute('role', 'status');
      label.setAttribute('aria-live', 'polite');
    }
    skipButton?.focus({ preventScroll: true });
  }

  function releaseInterface() {
    for (const [sibling, previous] of inertSiblings) {
      if (previous === null) sibling.removeAttribute('inert');
      else sibling.setAttribute('inert', previous);
    }
    inertSiblings.length = 0;
    root?.removeAttribute('aria-modal');
  }

  function stage(phase, text) {
    if (complete || !root) return;
    root.dataset.phase = phase;
    if (label) label.textContent = text;
  }

  function finish(reason) {
    if (complete) return;
    complete = true;
    clearTimeout(minimumTimer);
    clearTimeout(deadlineTimer);
    skipButton?.removeEventListener('click', skip);
    doc?.removeEventListener('keydown', onKeyDown);
    mediaQuery?.removeEventListener?.('change', onMotionChange);
    releaseInterface();
    if (doc?.documentElement) doc.documentElement.dataset.boot = 'ready';
    if (root) {
      const heldFocus = root.contains(doc?.activeElement);
      root.hidden = true;
      root.setAttribute('aria-busy', 'false');
      // Do not leave keyboard focus inside a now-hidden skip control.
      if (heldFocus) {
        doc.activeElement?.blur?.();
        if (previousFocus?.isConnected && !root.contains(previousFocus)) {
          previousFocus.focus?.({ preventScroll: true });
        }
      }
      if (reason !== 'destroyed') {
        try { win?.sessionStorage.setItem(SESSION_KEY, 'true'); } catch { /* Storage is optional. */ }
      }
    }
    resolveFinished({ reason });
  }

  function skip() { finish('skip'); }
  function onKeyDown(event) {
    if (event.key === 'Tab' && skipButton) {
      event.preventDefault();
      skipButton.focus({ preventScroll: true });
      return;
    }
    if (event.key !== 'Escape') return;
    event.preventDefault();
    finish('skip');
  }
  function onMotionChange(event) {
    if (event.matches) finish('paused');
  }

  const controller = {
    finished,
    skip,
    setPaused(value) { if (value) finish('paused'); },
    destroy() { finish('destroyed'); },
  };

  // Missing markup must not block navigation or leave a document-wide state.
  if (!root) {
    finish('ready');
    Promise.resolve(ready).catch(() => {});
    return controller;
  }

  if (win?.__qinanBootExpired) {
    finish('timeout');
    Promise.resolve(ready).catch(() => {});
    return controller;
  }

  try { mediaQuery = win?.matchMedia?.('(prefers-reduced-motion: reduce)'); } catch { /* Optional API. */ }
  root.hidden = false;
  root.setAttribute('aria-busy', 'true');
  if (doc?.documentElement) doc.documentElement.dataset.boot = 'loading';
  stage('loading', '加载界面');

  if (motionPaused || mediaQuery?.matches) {
    finish('paused');
    // Observe a rejected lazy load even when motion bypasses the entrance.
    Promise.resolve(ready).catch(() => {});
    return controller;
  }

  let returning = false;
  try { returning = win?.sessionStorage.getItem(SESSION_KEY) === 'true'; } catch { /* Storage is optional. */ }
  skipButton?.addEventListener('click', skip);
  doc?.addEventListener('keydown', onKeyDown);
  mediaQuery?.addEventListener?.('change', onMotionChange);
  isolateInterface();
  minimumTimer = setTimeout(() => {
    minimumElapsed = true;
    if (readyToShow) finish('ready');
  }, returning ? RETURN_VISIT_MS : FIRST_VISIT_MS);
  deadlineTimer = setTimeout(() => finish('timeout'), FAIL_OPEN_MS);

  Promise.resolve().then(() => stage('scene', '准备场景'));
  const onReady = () => {
    if (complete) return;
    readyToShow = true;
    stage('ready', '已就绪');
    if (minimumElapsed) finish('ready');
  };
  // A failed optional scene also leaves the interface usable. Its fallback is
  // owned by the caller; a rejected chunk must never trap the boot overlay.
  Promise.resolve(ready).then(onReady, onReady);
  return controller;
}
