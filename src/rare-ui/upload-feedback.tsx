import React, { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { animate } from 'animejs';
import { useMotionPaused } from './motion-settings';

const DEADLINE = 260;
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeEnvironment(listener: () => void) {
  const media = window.matchMedia?.(MOTION_QUERY);
  document.addEventListener('visibilitychange', listener);
  if (media?.addEventListener) media.addEventListener('change', listener);
  else media?.addListener?.(listener);
  return () => {
    document.removeEventListener('visibilitychange', listener);
    if (media?.removeEventListener) media.removeEventListener('change', listener);
    else media?.removeListener?.(listener);
  };
}

function useFeedbackPaused() {
  const manual = useMotionPaused();
  const environment = useSyncExternalStore(subscribeEnvironment,
    () => document.hidden || !!window.matchMedia?.(MOTION_QUERY).matches, () => false);
  return manual || environment;
}

function clearMotion(node: HTMLElement | null) {
  if (!node) return;
  node.style.removeProperty('opacity');
  node.style.removeProperty('transform');
  delete node.dataset.feedbackRunning;
}

/** Animate a private clock, so canceling cannot leave a DOM engine's queued
 * render writing an old opacity back after React has committed newer content. */
function runFeedback(nodes: Array<HTMLElement | null>, duration: number, paint: (progress: number) => void, complete?: () => void) {
  const clock = { progress: 0 };
  let active = true;
  let animation: ReturnType<typeof animate> | undefined;
  const settle = (notify: boolean) => {
    if (!active) return;
    active = false;
    clearTimeout(timeout);
    animation?.cancel();
    nodes.forEach(clearMotion);
    if (notify) complete?.();
  };
  const timeout = setTimeout(() => settle(true), DEADLINE);
  nodes.forEach(node => { if (node) node.dataset.feedbackRunning = 'true'; });
  paint(0);
  try {
    animation = animate(clock, {
      progress: 1, duration, ease: 'out(3)',
      onUpdate() { if (active) paint(Math.min(1, Math.max(0, clock.progress))); },
      onComplete() { settle(true); },
    });
    if (!active) animation.cancel();
  } catch { settle(true); }
  return () => settle(false);
}

/** Only the latest text is accessible; the single old line is a visual exit. */
export function UploadCopy({ text, className = '' }: { text: string; className?: string }) {
  const paused = useFeedbackPaused();
  const [frame, setFrame] = useState({ text, previous: null as string | null, revision: 0 });
  const currentRef = useRef<HTMLSpanElement>(null);
  const previousRef = useRef<HTMLSpanElement>(null);
  const seenRevision = useRef(0);
  if (frame.text !== text) {
    setFrame({ text, previous: paused ? null : frame.text, revision: frame.revision + 1 });
  } else if (paused && frame.previous !== null) {
    setFrame({ ...frame, previous: null });
  }

  useLayoutEffect(() => {
    const current = currentRef.current;
    const previous = previousRef.current;
    const revision = frame.revision;
    const changed = seenRevision.current !== revision;
    seenRevision.current = revision;
    clearMotion(current);
    if (!current || paused || !changed) return;
    return runFeedback([current, previous], 220, progress => {
      current.style.opacity = String(0.62 + 0.38 * progress);
      current.style.transform = `translateY(${4 * (1 - progress)}px)`;
      if (previous) {
        const exit = Math.min(1, progress * 1.2);
        previous.style.opacity = String(0.42 * (1 - exit));
        previous.style.transform = `translateY(${-5 * exit}px)`;
      }
    }, () => {
      setFrame(latest => latest.revision === revision && latest.previous !== null ? { ...latest, previous: null } : latest);
    });
  }, [frame.revision, paused]);

  return <span className={`qi-upload-copy ${className}`} data-copy-revision={frame.revision}>
    <span ref={currentRef} className="qi-copy-current">{text}</span>
    {!paused && frame.previous !== null && <span ref={previousRef} className="qi-copy-previous" aria-hidden="true">{frame.previous}</span>}
  </span>;
}

/** Retains its DOM and children so focus and native media controls stay intact. */
export function UploadPulse({ revision, children, className = '', variant = 'folder', appear = false, as = 'span' }: {
  revision: string; children: ReactNode; className?: string; variant?: 'folder' | 'preview'; appear?: boolean; as?: 'span' | 'div';
}) {
  const paused = useFeedbackPaused();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(appear ? null : revision);
  useLayoutEffect(() => {
    const node = ref.current;
    const changed = seen.current !== revision;
    seen.current = revision;
    clearMotion(node);
    if (!node || paused || !changed) return;
    return runFeedback([node], variant === 'folder' ? 240 : 220, progress => {
      if (variant === 'folder') {
        const pulse = Math.sin(progress * Math.PI);
        node.style.transform = `translateY(${-3 * pulse}px) scale(${1 - 0.015 * pulse})`;
      } else {
        node.style.opacity = String(0.68 + 0.32 * progress);
        node.style.transform = `translateY(${5 * (1 - progress)}px)`;
      }
    });
  }, [revision, paused, variant]);
  return React.createElement(as, { ref, className: `qi-upload-pulse ${className}`, 'data-feedback-variant': variant }, children);
}
