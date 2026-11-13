const SESSION_KEY = 'qinan-boot-v7-complete';
const FIRST_VISIT_MS = 2400;
const RETURN_VISIT_MS = 400;
const FAIL_OPEN_MS = 4000;
const ASSEMBLED_HOLD_MS = 200;
const PIECE_POSITIONS = [
  [.12,.23,-14], [.39,.16,9], [.10,.45,-9], [.32,.66,14], [.14,.75,-5], [.44,.79,8],
  [.62,.19,12], [.86,.27,-11], [.70,.48,7], [.89,.57,-8], [.65,.73,-13], [.86,.77,10],
];

/**
 * A bounded, real-readiness-driven entrance. Each of the three milestones
 * releases four clipped pieces of the original 亲安 contours. Animation order
 * remains deterministic even if the lazy chunks settle in a different order.
 * `ready` is retained for callers with one combined readiness promise.
 */
export function createBootSequence({
  root = globalThis.document?.querySelector('#boot'),
  ready = Promise.resolve(),
  stages,
  createTimeline,
  motionPaused = false,
} = {}) {
  const doc = root?.ownerDocument ?? globalThis.document;
  const win = doc?.defaultView ?? globalThis.window;
  clearTimeout(win?.__qinanBootFailSafe);
  const label = root?.querySelector('[data-boot-stage]');
  const skipButton = root?.querySelector('[data-boot-skip]');
  const pieces = [...(root?.querySelectorAll('[data-boot-piece]') ?? [])];
  const word = root?.querySelector('.boot-complete-word');
  const previousFocus = doc?.activeElement;
  const milestones = (Array.isArray(stages) && stages.length ? stages : [{id:'interface',label:'界面',ready}])
    .map((item,index) => ({...item,id:item.id || `stage-${index}`,label:item.label || '界面',status:'pending',detail:''}));
  let resolveFinished;
  const finished = new Promise(resolve => { resolveFinished = resolve; });
  let complete = false;
  let minimumElapsed = false;
  let assembledHoldElapsed = false;
  let nextGroup = 0;
  let activeTimeline;
  let animationRevision = 0;
  let animating = false;
  let minimumTimer, deadlineTimer, groupTimer, holdTimer;
  let mediaQuery;
  let returning = false;
  const inertSiblings = [];

  function isolateInterface() {
    // Keep background settings from opening a native top-layer dialog above
    // this DOM overlay. Preserve pre-existing inert states on every branch.
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
    label?.setAttribute('role', 'status');
    label?.setAttribute('aria-live', 'polite');
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

  function updateDetail() {
    if (complete || !root) return;
    const pending = milestones.find(item => item.status === 'pending');
    root.dataset.phase = pending ? (nextGroup || animating ? 'assembling' : 'loading') : (nextGroup === milestones.length ? 'ready' : 'assembling');
    root.dataset.stage = pending?.id || 'ready';
    if (label) label.textContent = pending ? `正在准备${pending.label}` : '已就绪';
  }

  function cancelAnimation() {
    animationRevision++;
    clearTimeout(groupTimer);
    const timeline = activeTimeline;
    activeTimeline = undefined;
    animating = false;
    try { timeline?.cancel?.(); } catch { /* Cleanup cannot prevent navigation. */ }
  }

  function finish(reason) {
    if (complete) return;
    complete = true;
    clearTimeout(minimumTimer);
    clearTimeout(deadlineTimer);
    clearTimeout(holdTimer);
    cancelAnimation();
    skipButton?.removeEventListener('click', skip);
    doc?.removeEventListener('keydown', onKeyDown);
    win?.removeEventListener('resize', onResize);
    mediaQuery?.removeEventListener?.('change', onMotionChange);
    releaseInterface();
    if (doc?.documentElement) doc.documentElement.dataset.boot = 'ready';
    if (root) {
      const heldFocus = root.contains(doc?.activeElement);
      root.hidden = true;
      root.setAttribute('aria-busy', 'false');
      if (heldFocus) {
        doc.activeElement?.blur?.();
        if (previousFocus?.isConnected && !root.contains(previousFocus)) previousFocus.focus?.({ preventScroll: true });
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
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish('skip');
    }
  }
  function onMotionChange(event) { if (event.matches) finish('paused'); }
  function maybeFinish() { if (minimumElapsed && assembledHoldElapsed) finish('ready'); }

  function placePieces() {
    const svg = root?.querySelector('.boot-glyph');
    if (!svg) return;
    const width = win?.innerWidth || 1280;
    const height = win?.innerHeight || 800;
    const measured = svg.getBoundingClientRect();
    const svgWidth = measured.width || Math.min(width * (width < 700 ? .82 : .58), 820);
    const scale = svgWidth / 2200;
    const left = measured.width ? measured.left : (width - svgWidth) / 2;
    const top = measured.height ? measured.top : height * .46 - svgWidth / 4;
    const clamp = (value,low,high) => Math.max(low,Math.min(Math.max(low,high),value));
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (piece.dataset.state === 'assembled' || piece.dataset.state === 'animating') continue;
      const [px,py,angle] = PIECE_POSITIONS[i % PIECE_POSITIONS.length];
      const row = Number(piece.dataset.bootRow ?? Math.floor((i % 6) / 2));
      const column = Number(piece.dataset.bootColumn ?? i % 2);
      const cx = (i < 6 ? 70 : 1120) + 250 + column * 500;
      const cy = 225 + row * 330;
      const halfWidth = 270 * scale;
      const halfHeight = 190 * scale;
      const targetX = clamp(width * px,24 + halfWidth,width - 24 - halfWidth);
      const targetY = clamp(height * py,100 + halfHeight,height - 132 - halfHeight);
      const x = (targetX - left) / scale - cx;
      const y = (targetY - top) / scale - cy;
      piece.dataset.fromX = String(x);
      piece.dataset.fromY = String(y);
      piece.dataset.fromRotate = String(angle);
      piece.style.transformOrigin = `${cx}px ${cy}px`;
      piece.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${angle}deg) scale(.86)`;
      piece.style.opacity = '1';
      piece.dataset.state = 'waiting';
    }
  }
  function onResize() { if (!complete) placePieces(); }

  function markAssembled(targets) {
    for (const piece of targets) {
      piece.style.transform = 'translateX(0px) translateY(0px) rotate(0deg) scale(1)';
      piece.style.opacity = '1';
      piece.dataset.state = 'assembled';
    }
  }

  function assembleNext() {
    if (complete || animating) return;
    if (nextGroup === milestones.length) {
      root.dataset.assembled = 'true';
      // An uncut copy replaces the clipped pieces at identity, preserving all
      // original counters/holes and eliminating final antialiasing seams.
      if (word) {
        word.style.opacity = '1';
        for (const piece of pieces) piece.style.opacity = '0';
      }
      updateDetail();
      holdTimer = setTimeout(() => { assembledHoldElapsed = true; maybeFinish(); }, ASSEMBLED_HOLD_MS);
      return;
    }
    if (milestones[nextGroup].status === 'pending') { updateDetail(); return; }
    const group = nextGroup;
    const targets = milestones.length === 1 ? pieces : pieces.filter(piece => Number(piece.dataset.bootGroup) === group);
    const revision = ++animationRevision;
    animating = true;
    for (const target of targets) target.dataset.state = 'animating';
    updateDetail();
    const duration = returning ? 50 : 560;
    const stagger = returning ? 5 : 40;
    const span = duration + Math.max(0,targets.length - 1) * stagger;
    const onComplete = () => {
      if (complete || revision !== animationRevision || !animating) return;
      clearTimeout(groupTimer);
      // A watchdog completion also cancels a stalled engine before placing
      // the pieces, so it cannot write stale styles after the next stage.
      const timeline = activeTimeline;
      activeTimeline = undefined;
      animating = false;
      animationRevision++;
      try { timeline?.cancel?.(); } catch { /* Completion remains usable. */ }
      markAssembled(targets);
      nextGroup++;
      assembleNext();
    };
    if (!targets.length || typeof createTimeline !== 'function') { onComplete(); return; }
    try {
      const timeline = createTimeline({autoplay:false,onComplete});
      activeTimeline = timeline;
      timeline.add(targets, {
        translateX: target => [Number(target.dataset.fromX),0],
        translateY: target => [Number(target.dataset.fromY),0],
        rotate: target => [Number(target.dataset.fromRotate),0],
        scale: [.86,1],
        duration,
        delay: (_,index) => index * stagger,
        ease:'out(4)',
      }, 0);
      groupTimer = setTimeout(onComplete,span + 100);
      timeline.play();
    } catch { onComplete(); }
  }

  const controller = {finished,skip,setPaused(value) {if (value) finish('paused');},destroy() {finish('destroyed');}};
  // Observe all lazy promises even if the overlay is missing, skipped or
  // bypassed. Late resolutions never mutate the dismissed UI.
  const observeMilestones = () => milestones.forEach((item,index) => {
    const settled = (result,fallback = false) => {
      if (complete) return;
      item.status = fallback || result?.fallback ? 'fallback' : 'ready';
      item.detail = typeof result?.label === 'string' ? result.label : `${item.label}${item.status === 'fallback' ? '备用显示已就绪' : '已就绪'}`;
      const indicator = root?.querySelector(`[data-boot-milestone="${index}"]`);
      if (indicator) {
        indicator.dataset.state = item.status;
        indicator.setAttribute('aria-label',item.detail);
        const text = indicator.querySelector('[data-boot-milestone-label]');
        if (text) text.textContent = item.detail;
      }
      updateDetail();
      assembleNext();
    };
    Promise.resolve(item.ready).then(result => settled(result),() => settled(undefined,true));
  });
  if (!root || win?.__qinanBootExpired) {
    finish(root ? 'timeout' : 'ready');
    observeMilestones();
    return controller;
  }
  try { mediaQuery = win?.matchMedia?.('(prefers-reduced-motion: reduce)'); } catch { /* Optional API. */ }
  root.hidden = false;
  root.setAttribute('aria-busy', 'true');
  delete root.dataset.assembled;
  if (word) word.style.opacity = '0';
  for (const piece of pieces) delete piece.dataset.state;
  if (doc?.documentElement) doc.documentElement.dataset.boot = 'loading';
  updateDetail();
  if (motionPaused || mediaQuery?.matches) {
    finish('paused');
    observeMilestones();
    return controller;
  }
  try { returning = win?.sessionStorage.getItem(SESSION_KEY) === 'true'; } catch { /* Optional storage. */ }
  root.dataset.variant = returning ? 'return' : 'first';
  skipButton?.addEventListener('click', skip);
  doc?.addEventListener('keydown', onKeyDown);
  win?.addEventListener('resize', onResize);
  mediaQuery?.addEventListener?.('change', onMotionChange);
  isolateInterface();
  placePieces();
  minimumTimer = setTimeout(() => { minimumElapsed = true; maybeFinish(); },returning ? RETURN_VISIT_MS : FIRST_VISIT_MS);
  deadlineTimer = setTimeout(() => finish('timeout'),FAIL_OPEN_MS);
  observeMilestones();
  return controller;
}
