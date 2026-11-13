const SESSION_KEY = 'qinan-boot-v10-complete';
const FIRST_LOCK_MS = 1400;
const RETURN_LOCK_MS = 150;
const FIRST_REVEAL_MS = 600;
const RETURN_REVEAL_MS = 300;
const FAIL_OPEN_MS = 4000;
const CLOSED_WINDOW = 'polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)';
const OPEN_WINDOW = 'polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)';

/**
 * A fixed, readable signal poster, followed by a window onto the homepage.
 * The real readiness labels are independent of the short graphic sequence:
 * slow resources leave a complete, still poster until ready or the deadline.
 * `revealing` opens the background; `finished` releases input and starts home.
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
  const previousFocus = doc?.activeElement;
  const lime = root?.querySelector('.boot-signal-lime');
  const blue = root?.querySelector('.boot-signal-blue');
  const registration = root?.querySelector('.boot-signal-register');
  const lock = root?.querySelector('.boot-signal-lock');
  const code = root?.querySelector('.boot-signal-code');
  const milestones = (Array.isArray(stages) && stages.length ? stages : [{id:'interface',label:'界面',ready}])
    .map((item,index) => ({...item,id:item.id || `stage-${index}`,label:item.label || '界面',status:'pending'}));
  let resolveFinished, resolveRevealing;
  const finished = new Promise(resolve => {resolveFinished = resolve;});
  const revealing = new Promise(resolve => {resolveRevealing = resolve;});
  let complete = false;
  let revealStarted = false;
  let revealDelivered = false;
  let posterLocked = false;
  let revision = 0;
  let introTimeline, revealTimeline, revealTimer, deadlineTimer, lockTimer;
  const phaseTimers = [];
  let mediaQuery;
  let returning = false;
  try {returning = win?.sessionStorage.getItem(SESSION_KEY) === 'true';} catch {/* Optional storage. */}
  const variant = returning ? 'return' : 'first';
  const inertSiblings = [];

  function isolateInterface() {
    // A DOM overlay does not prevent a background button from opening a
    // native top-layer dialog. Preserve, then temporarily inert its siblings.
    let branch = root;
    while (branch?.parentElement) {
      const parent = branch.parentElement;
      for (const sibling of parent.children) {
        if (sibling === branch || /^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(sibling.tagName)) continue;
        inertSiblings.push([sibling,sibling.getAttribute('inert')]);
        sibling.setAttribute('inert','');
      }
      if (parent === doc.body) break;
      branch = parent;
    }
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    label?.setAttribute('role','status');
    label?.setAttribute('aria-live','polite');
    skipButton?.focus({preventScroll:true});
  }

  function releaseInterface() {
    for (const [sibling,previous] of inertSiblings) {
      if (previous === null) sibling.removeAttribute('inert');
      else sibling.setAttribute('inert',previous);
    }
    inertSiblings.length = 0;
    root?.removeAttribute('aria-modal');
  }

  function deliverReveal(reason) {
    if (revealDelivered) return;
    revealDelivered = true;
    resolveRevealing({variant,reason});
  }

  function cancelTimeline(timeline) {
    try {timeline?.cancel?.();} catch {/* Cleanup must not block navigation. */}
  }

  function settlePoster() {
    for (const target of [lime,blue,registration,lock,code]) {
      if (!target) continue;
      target.style.transform = 'translateX(0px) translateY(0px)';
      target.style.opacity = '1';
    }
  }

  function finish(reason) {
    if (complete) return;
    complete = true;
    revision++;
    clearTimeout(deadlineTimer);clearTimeout(lockTimer);clearTimeout(revealTimer);
    for (const timer of phaseTimers) clearTimeout(timer);
    cancelTimeline(introTimeline);cancelTimeline(revealTimeline);
    introTimeline = undefined;revealTimeline = undefined;
    skipButton?.removeEventListener('click',skip);
    doc?.removeEventListener('keydown',onKeyDown);
    mediaQuery?.removeEventListener?.('change',onMotionChange);
    releaseInterface();
    if (doc?.documentElement) doc.documentElement.dataset.boot = 'ready';
    if (root) {
      const heldFocus = root.contains(doc?.activeElement);
      root.hidden = true;
      root.setAttribute('aria-busy','false');
      root.style.clipPath = '';
      settlePoster();
      if (heldFocus) {
        doc.activeElement?.blur?.();
        if (previousFocus?.isConnected && !root.contains(previousFocus)) previousFocus.focus?.({preventScroll:true});
      }
      if (reason !== 'destroyed') {
        try {win?.sessionStorage.setItem(SESSION_KEY,'true');} catch {/* Optional storage. */}
      }
    }
    // Skip/fallback callers receive both promises in the same turn. If a
    // normal reveal already began, its original event remains immutable.
    deliverReveal(reason);
    resolveFinished({variant,reason});
  }

  function skip() {finish('skip');}
  function onKeyDown(event) {
    if (event.key === 'Tab' && skipButton) {
      event.preventDefault();skipButton.focus({preventScroll:true});
    } else if (event.key === 'Escape') {
      event.preventDefault();finish('skip');
    }
  }
  function onMotionChange(event) {if (event.matches) finish('paused');}

  function updateDetail() {
    if (complete || !root) return;
    const pending = milestones.find(item => item.status === 'pending');
    root.dataset.stage = pending?.id || 'ready';
    if (label) label.textContent = pending ? `正在准备${pending.label}` : '已就绪';
  }

  function beginReveal() {
    if (complete || revealStarted || !posterLocked || milestones.some(item => item.status === 'pending')) return;
    revealStarted = true;
    root.dataset.phase = 'revealing';
    const token = revision;
    const duration = returning ? RETURN_REVEAL_MS : FIRST_REVEAL_MS;
    const onComplete = () => {if (!complete && token === revision) finish('ready');};
    // Reveal the equipment field; the homepage starts after finished releases input.
    deliverReveal('ready');
    revealTimer = setTimeout(onComplete,duration);
    if (typeof createTimeline !== 'function') {root.style.clipPath = OPEN_WINDOW;return;}
    try {
      revealTimeline = createTimeline({autoplay:false,onComplete});
      revealTimeline.add(root,{clipPath:[CLOSED_WINDOW,OPEN_WINDOW],duration,ease:'inOut(3)'},0);
      revealTimeline.play();
    } catch {
      cancelTimeline(revealTimeline);revealTimeline = undefined;
      root.style.clipPath = OPEN_WINDOW;
    }
  }

  function lockPoster() {
    if (complete) return;
    cancelTimeline(introTimeline);introTimeline = undefined;
    settlePoster();
    posterLocked = true;
    root.dataset.phase = 'locked';
    beginReveal();
  }

  function startPoster() {
    root.dataset.phase = returning ? 'locked' : 'positioning';
    root.style.clipPath = CLOSED_WINDOW;
    if (returning) {settlePoster();return;}
    if (registration) {registration.style.transform = 'translateX(-18px)';registration.style.opacity = '.35';}
    if (lime) lime.style.transform = 'translateX(-72px)';
    if (blue) blue.style.transform = 'translateY(56px)';
    if (lock) lock.style.opacity = '0';
    if (code) {code.style.transform = 'translateY(8px)';code.style.opacity = '.45';}
    phaseTimers.push(setTimeout(() => {if (!complete) root.dataset.phase = 'aligning';},300));
    phaseTimers.push(setTimeout(() => {if (!complete) root.dataset.phase = 'locking';},750));
    if (typeof createTimeline !== 'function') {settlePoster();return;}
    try {
      introTimeline = createTimeline({autoplay:false});
      if (registration) introTimeline.add(registration,{translateX:[-18,0],opacity:[.35,1],duration:300,ease:'out(3)'},0);
      if (lime) introTimeline.add(lime,{translateX:[-72,0],duration:450,ease:'out(4)'},300);
      if (blue) introTimeline.add(blue,{translateY:[56,0],duration:410,ease:'out(4)'},340);
      if (lock) introTimeline.add(lock,{opacity:[0,1],duration:300,ease:'out(3)'},750);
      if (code) introTimeline.add(code,{translateY:[8,0],opacity:[.45,1],duration:250,ease:'out(3)'},780);
      introTimeline.play();
    } catch {cancelTimeline(introTimeline);introTimeline = undefined;settlePoster();}
  }

  const controller = {revealing,finished,skip,setPaused(value) {if (value) finish('paused');},destroy() {finish('destroyed');}};
  // Rejections are observed even when motion is bypassed or the page is left.
  const observeMilestones = () => milestones.forEach((item,index) => {
    const settled = (result,fallback = false) => {
      if (complete) return;
      item.status = fallback || result?.fallback ? 'fallback' : 'ready';
      const detail = typeof result?.label === 'string' ? result.label : `${item.label}${item.status === 'fallback' ? '备用显示已就绪' : '已就绪'}`;
      const indicator = root?.querySelector(`[data-boot-milestone="${index}"]`);
      if (indicator) {
        indicator.dataset.state = item.status;
        indicator.setAttribute('aria-label',detail);
        const text = indicator.querySelector('[data-boot-milestone-label]');
        if (text) text.textContent = detail;
      }
      updateDetail();beginReveal();
    };
    Promise.resolve(item.ready).then(result => settled(result),() => settled(undefined,true));
  });
  if (!root || win?.__qinanBootExpired) {
    finish(root ? 'timeout' : 'ready');observeMilestones();return controller;
  }
  try {mediaQuery = win?.matchMedia?.('(prefers-reduced-motion: reduce)');} catch {/* Optional API. */}
  root.hidden = false;
  root.setAttribute('aria-busy','true');
  root.dataset.variant = variant;
  milestones.forEach((item,index) => {
    const indicator = root.querySelector(`[data-boot-milestone="${index}"]`);
    if (indicator) {
      indicator.dataset.state = 'pending';indicator.setAttribute('aria-label',`正在准备${item.label}`);
      const text = indicator.querySelector('[data-boot-milestone-label]');if (text) text.textContent = item.label;
    }
  });
  if (doc?.documentElement) doc.documentElement.dataset.boot = 'loading';
  updateDetail();
  if (motionPaused || mediaQuery?.matches) {finish('paused');observeMilestones();return controller;}
  skipButton?.addEventListener('click',skip);
  doc?.addEventListener('keydown',onKeyDown);
  mediaQuery?.addEventListener?.('change',onMotionChange);
  isolateInterface();
  deadlineTimer = setTimeout(() => finish('timeout'),FAIL_OPEN_MS);
  lockTimer = setTimeout(lockPoster,returning ? RETURN_LOCK_MS : FIRST_LOCK_MS);
  startPoster();observeMilestones();
  return controller;
}
