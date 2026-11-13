const SESSION_KEY = 'qinan-boot-v8-complete';
const FIRST_VISIT_MS = 2400;
const RETURN_VISIT_MS = 400;
const FAIL_OPEN_MS = 4000;
const FIRST_HOLD_MS = 560;
const RETURN_HOLD_MS = 200;
const TYPE_FORMS = ['condensed','outline','final'];

/**
 * Real readiness advances a centered, readable typographic sequence. Original
 * QINAN polygon masters share their path topology: Anime interpolates the
 * letterforms themselves, while the Chinese word stays intact and legible.
 * `ready` remains supported for one combined readiness promise.
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
  const letters = [...(root?.querySelectorAll('[data-boot-letter]') ?? [])];
  const word = root?.querySelector('.boot-type-word');
  const echo = root?.querySelector('.boot-type-echo');
  const chinese = root?.querySelector('.boot-type-cn');
  const previousFocus = doc?.activeElement;
  const milestones = (Array.isArray(stages) && stages.length ? stages : [{id:'interface',label:'界面',ready}])
    .map((item,index) => ({...item,id:item.id || `stage-${index}`,label:item.label || '界面',status:'pending',detail:''}));
  let resolveFinished;
  const finished = new Promise(resolve => { resolveFinished = resolve; });
  let complete = false;
  let minimumElapsed = false;
  let finalHoldElapsed = false;
  let nextForm = 0;
  let activeTimeline;
  let animationRevision = 0;
  let animating = false;
  let minimumTimer, deadlineTimer, formTimer, holdTimer;
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
    root.dataset.phase = pending ? (nextForm || animating ? 'typing' : 'loading') : (nextForm === milestones.length ? 'ready' : 'typing');
    root.dataset.stage = pending?.id || 'ready';
    if (label) label.textContent = pending ? `正在准备${pending.label}` : '已就绪';
  }

  function cancelAnimation() {
    animationRevision++;
    clearTimeout(formTimer);
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
  function maybeFinish() { if (minimumElapsed && finalHoldElapsed) finish('ready'); }

  function resetTypography() {
    if (word) {
      word.style.transform = 'skewX(0deg)';
      word.style.fillOpacity = '1';
      word.style.strokeWidth = '0px';
      word.removeAttribute('mask');
    }
    if (echo) {
      echo.style.transform = 'translateX(0px)';
      echo.style.opacity = '0';
    }
    if (chinese) {
      chinese.style.fillOpacity = '1';
      chinese.style.strokeWidth = '0px';
    }
    for (const letter of letters) letter.setAttribute('d',letter.dataset.formWide || letter.getAttribute('d'));
    root.dataset.type = 'wide';
    delete root.dataset.typeSettled;
  }

  function finishForm(form,field) {
    for (const letter of letters) {
      const path = letter.dataset[field];
      if (path) letter.setAttribute('d',path);
    }
    if (word) {
      word.style.transform = `skewX(${form === 'condensed' ? -2 : 0}deg)`;
      word.style.fillOpacity = form === 'outline' ? '.06' : '1';
      word.style.strokeWidth = form === 'outline' ? '3.5px' : '0px';
      word.removeAttribute('mask');
    }
    if (echo) {
      echo.style.transform = 'translateX(0px)';
      echo.style.opacity = '0';
    }
    if (chinese) {
      chinese.style.fillOpacity = form === 'outline' ? '.18' : '1';
      chinese.style.strokeWidth = form === 'outline' ? '15.3px' : form === 'condensed' ? '5px' : '0px';
    }
  }

  function advanceTypography() {
    if (complete || animating) return;
    if (nextForm === milestones.length) {
      root.dataset.type = 'final';
      root.dataset.typeSettled = 'true';
      updateDetail();
      holdTimer = setTimeout(() => {finalHoldElapsed = true;maybeFinish();},returning ? RETURN_HOLD_MS : FIRST_HOLD_MS);
      return;
    }
    if (milestones[nextForm].status === 'pending') {updateDetail();return;}
    const formIndex = milestones.length === 1 ? 2 : Math.min(nextForm,2);
    const form = TYPE_FORMS[formIndex];
    const field = form === 'condensed' ? 'formCondensed' : form === 'outline' ? 'formWide' : 'formFinal';
    const span = returning ? [65,65,70][formIndex] : [680,680,480][formIndex];
    const revision = ++animationRevision;
    animating = true;
    root.dataset.type = form === 'final' ? 'cut' : form;
    if (word && form === 'final') word.setAttribute('mask','url(#boot-type-cut)');
    updateDetail();
    const onComplete = () => {
      if (complete || revision !== animationRevision || !animating) return;
      clearTimeout(formTimer);
      const timeline = activeTimeline;
      activeTimeline = undefined;
      animating = false;
      animationRevision++;
      try {timeline?.cancel?.();} catch {/* Completion remains usable. */}
      finishForm(form,field);
      nextForm++;
      advanceTypography();
    };
    if (!letters.length || !word || typeof createTimeline !== 'function') {onComplete();return;}
    try {
      const timeline = createTimeline({autoplay:false,onComplete});
      activeTimeline = timeline;
      // All masters use the same closed polygon commands and counter paths.
      // This is a real font-form change, not a stretched raster or a collection
      // of flying glyph fragments. No third-party font download is necessary.
      timeline.add(letters, {
        d: letter => [letter.getAttribute('d'),letter.dataset[field]],
        duration:span,
        ease:form === 'final' ? 'out(4)' : 'out(6)',
      },0);
      timeline.add(word, {
        skewX:[formIndex === 1 ? -2 : 0,form === 'condensed' ? -2 : 0],
        fillOpacity:[formIndex === 2 ? .06 : 1,form === 'outline' ? .06 : 1],
        strokeWidth:[formIndex === 2 ? 3.5 : 0,form === 'outline' ? 3.5 : 0],
        duration:span,
        ease:'out(4)',
      },0);
      // The Noto contours are scaled by .2287 inside each <use>. A 15.3-unit
      // local stroke produces the same ~3.5-unit visible outline as the Latin
      // word. Keep a dim fill throughout: the Chinese word never blinks out.
      if (chinese) timeline.add(chinese, {
        fillOpacity:[formIndex === 2 ? .18 : 1,form === 'outline' ? .18 : 1],
        strokeWidth:[formIndex === 1 ? 5 : formIndex === 2 ? 15.3 : 0,form === 'outline' ? 15.3 : form === 'condensed' ? 5 : 0],
        duration:span,
        ease:'out(4)',
      },0);
      if (echo && form !== 'condensed') timeline.add(echo, {
        translateX:[form === 'outline' ? -10 : 8,0],
        opacity:[.22,0],
        duration:span,
        ease:'out(3)',
      },0);
      formTimer = setTimeout(onComplete,span + 100);
      timeline.play();
    } catch {onComplete();}
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
      advanceTypography();
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
  resetTypography();
  milestones.forEach((item,index) => {
    const indicator = root.querySelector(`[data-boot-milestone="${index}"]`);
    if (indicator) {
      indicator.dataset.state = 'pending';
      indicator.setAttribute('aria-label',`正在准备${item.label}`);
      const text = indicator.querySelector('[data-boot-milestone-label]');
      if (text) text.textContent = item.label;
    }
  });
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
  mediaQuery?.addEventListener?.('change', onMotionChange);
  isolateInterface();
  minimumTimer = setTimeout(() => { minimumElapsed = true; maybeFinish(); },returning ? RETURN_VISIT_MS : FIRST_VISIT_MS);
  deadlineTimer = setTimeout(() => finish('timeout'),FAIL_OPEN_MS);
  observeMilestones();
  return controller;
}
