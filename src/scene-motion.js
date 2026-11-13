/** A single reversible progress value keeps the whole seal and its frame on one mechanical path. */
export function createSealMotion({ animate, onUpdate = () => {}, immediate = () => false, duration = () => 1350 } = {}) {
  const state = { progress: 0 };
  let form = 'shield', target = null, animation = null, pending = null, resolvePending = null, disposed = false;

  function finish() {
    if (!target) return;
    form = target;
    state.progress = form === 'slogan' ? 1 : 0;
    target = null; animation = null;
    const resolve = resolvePending;
    pending = null; resolvePending = null;
    onUpdate(state.progress);
    resolve?.(form);
  }
  function settle() {
    animation?.cancel?.();
    finish();
  }
  return {
    get progress() { return state.progress; },
    get form() { return form; },
    get busy() { return pending !== null; },
    toggle() {
      if (disposed) return Promise.resolve(form);
      if (pending) return pending;
      target = form === 'shield' ? 'slogan' : 'shield';
      const promise = new Promise(resolve => { resolvePending = resolve; });
      pending = promise;
      if (immediate()) finish();
      else {
        try {
          const created = animate(state, {
            progress: target === 'slogan' ? 1 : 0,
            duration: duration(), ease: 'linear',
            onUpdate: () => { if (!disposed && pending === promise) onUpdate(state.progress); },
            onComplete: () => { if (pending === promise) finish(); }
          });
          // A synchronous driver may already have completed or been interrupted.
          if (pending === promise) animation = created;
          else created?.cancel?.();
        } catch { finish(); }
      }
      return promise;
    },
    settle,
    dispose() { if (disposed) return; settle(); disposed = true; }
  };
}
