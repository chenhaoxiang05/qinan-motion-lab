/**
 * Rare UI — Copyright (c) 2026 Swami Malode.
 * Source: https://github.com/swamimalode07/rare-ui/blob/21554cba3ac751c1f9c06869eadb9d44a0af7225/components/ui/matrix-orb.tsx
 * MIT + Commons Clause + Attribution; see third-party/rare-ui/LICENSE.
 * Adapted for QINAN: decorative portal field, restrained square grid,
 * persistent motion phase, explicit pause lifecycle and mobile rendering budget.
 */
import React, { useEffect, useRef, useState } from 'react';
import { cn } from './utils';
import { useMotionPaused } from './motion-settings';

export type MatrixOrbPortal = 'check' | 'contacts' | 'practice' | 'history';
export type MatrixOrbProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  activePortal: MatrixOrbPortal | null;
  size?: number;
};

type FieldState = MatrixOrbPortal | 'idle';
type Weights = Record<FieldState, number>;
const STATES: FieldState[] = ['idle', 'check', 'contacts', 'practice', 'history'];
const TAU = Math.PI * 2;
const COLOR = '#c2ff00';
const MOBILE_QUERY = '(max-width: 640px), (pointer: coarse)';
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// The selected portal steers a luminous focus through the same underlying field.
const ORBITS: Record<MatrixOrbPortal, {
  phase: number; speed: number; x: number; y: number; sweep: number;
}> = {
  check: { phase: 0.2, speed: 0.48, x: -0.5, y: -0.5, sweep: 0 },
  contacts: { phase: 1.8, speed: -0.42, x: 0.5, y: -0.5, sweep: Math.PI / 2 },
  practice: { phase: 3.4, speed: 0.6, x: -0.5, y: 0.5, sweep: Math.PI / 4 },
  history: { phase: 5, speed: -0.35, x: 0.5, y: 0.5, sweep: -Math.PI / 4 },
};

function intensityOf(state: FieldState, nx: number, ny: number, t: number) {
  const d = Math.hypot(nx, ny);
  if (state === 'idle') {
    const breath = 0.5 + 0.5 * Math.sin(t * 0.52 - d * 1.8);
    return 0.17 + breath * 0.19;
  }
  const orbit = ORBITS[state];
  const phase = t * orbit.speed + orbit.phase;
  const dx = nx - (orbit.x * 0.65 + Math.cos(phase) * 0.38);
  const dy = ny - (orbit.y * 0.65 + Math.sin(phase) * 0.38);
  const heat = Math.exp(-(dx * dx + dy * dy) / 0.16);
  const focus = Math.exp(-((nx - orbit.x) ** 2 + (ny - orbit.y) ** 2) / 0.32);
  const sweepAxis = nx * Math.cos(orbit.sweep) + ny * Math.sin(orbit.sweep);
  const sweep = Math.pow(0.5 + 0.5 * Math.sin(sweepAxis * 3 - t * 1.15 + orbit.phase), 6);
  return Math.min(1, 0.17 + heat * 0.48 + focus * 0.25 + sweep * 0.18);
}

function initialWeights(state: FieldState): Weights {
  return { idle: 0, check: 0, contacts: 0, practice: 0, history: 0, [state]: 1 };
}

// Older embedded browsers expose addListener rather than addEventListener.
function observeMedia(query: MediaQueryList | null, listener: () => void) {
  if (!query) return () => {};
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }
  query.addListener?.(listener);
  return () => query.removeListener?.(listener);
}

export default function MatrixOrb({
  activePortal,
  size = 190,
  className,
  style,
  ...props
}: MatrixOrbProps) {
  const paused = useMotionPaused();
  const safeSize = Number.isFinite(size) && size > 0 ? size : 190;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<FieldState>(activePortal ?? 'idle');
  const pausedRef = useRef(paused);
  const clockRef = useRef(0);
  const weightsRef = useRef<Weights>(initialWeights(activePortal ?? 'idle'));
  const lifecycleRef = useRef<(() => void) | null>(null);
  const [renderer, setRenderer] = useState<'canvas' | 'css'>('css');

  useEffect(() => {
    stateRef.current = activePortal ?? 'idle';
  }, [activePortal]);

  useEffect(() => {
    pausedRef.current = paused;
    lifecycleRef.current?.();
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = canvas?.getContext('2d') ?? null; } catch { /* CSS field remains visible. */ }
    if (!canvas || !ctx) {
      setRenderer('css');
      return;
    }
    const context = ctx;
    const mobileMedia = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null;
    const motionMedia = typeof window.matchMedia === 'function' ? window.matchMedia(MOTION_QUERY) : null;
    let mobile = mobileMedia?.matches ?? window.innerWidth <= 640;
    let dpr = 1;
    let frameId: number | null = null;
    let lastFrame = 0;
    let disposed = false;

    const isPaused = () => pausedRef.current || document.hidden || !!motionMedia?.matches;
    const draw = () => {
      const grid = mobile ? 9 : 13;
      const half = (grid - 1) / 2;
      const spacing = (safeSize * 0.8) / (grid - 1);
      const center = safeSize / 2;
      context.clearRect(0, 0, safeSize, safeSize);
      context.fillStyle = COLOR;
      for (let iy = 0; iy < grid; iy++) {
        for (let ix = 0; ix < grid; ix++) {
          const nx = (ix - half) / half;
          const ny = (iy - half) / half;
          let intensity = 0;
          for (const state of STATES) {
            if (weightsRef.current[state] < 0.001) continue;
            intensity += weightsRef.current[state] * intensityOf(state, nx, ny, clockRef.current);
          }
          // Keep the corners and the gutters: this is a field, rather than a large orb.
          const edge = 1 - 0.2 * Math.pow(Math.max(Math.abs(nx), Math.abs(ny)), 4);
          const radius = Math.max(0.55 / dpr, spacing * (0.067 + intensity * 0.155));
          context.globalAlpha = Math.min(0.88, (0.2 + intensity * 0.82) * edge);
          context.beginPath();
          context.arc(center + (ix - half) * spacing, center + (iy - half) * spacing, radius, 0, TAU);
          context.fill();
        }
      }
      context.globalAlpha = 1;
    };

    const resize = () => {
      mobile = mobileMedia?.matches ?? window.innerWidth <= 640;
      dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const buffer = Math.max(1, Math.round(safeSize * dpr));
      if (canvas.width !== buffer || canvas.height !== buffer) {
        canvas.width = canvas.height = buffer;
        context.setTransform(buffer / safeSize, 0, 0, buffer / safeSize, 0, 0);
      }
      // Resizing re-renders the retained phase; it never advances a paused field.
      draw();
    };

    const stop = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = null;
    };
    const frame = (now: number) => {
      frameId = null;
      if (disposed || isPaused()) return;
      const elapsed = now - lastFrame;
      if (elapsed >= (mobile ? 1000 / 30 : 1000 / 60)) {
        const dt = Math.min(elapsed / 1000, 0.08);
        lastFrame = now;
        clockRef.current += dt;
        const step = 1 - Math.exp(-dt * 5.5);
        for (const state of STATES) {
          weightsRef.current[state] += ((state === stateRef.current ? 1 : 0) - weightsRef.current[state]) * step;
        }
        draw();
      }
      frameId = window.requestAnimationFrame(frame);
    };
    const syncLifecycle = () => {
      if (disposed || isPaused()) {
        stop();
        return;
      }
      if (frameId === null) {
        // Time spent paused is deliberately excluded from the animation clock.
        lastFrame = performance.now();
        frameId = window.requestAnimationFrame(frame);
      }
    };

    lifecycleRef.current = syncLifecycle;
    resize();
    setRenderer('canvas');
    syncLifecycle();
    const removeMobile = observeMedia(mobileMedia, resize);
    const removeMotion = observeMedia(motionMedia, syncLifecycle);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', syncLifecycle);
    return () => {
      disposed = true;
      stop();
      removeMobile();
      removeMotion();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', syncLifecycle);
      lifecycleRef.current = null;
    };
  }, [safeSize]);

  return (
    <div
      {...props}
      aria-hidden="true"
      data-slot="matrix-orb"
      data-active-portal={activePortal ?? 'idle'}
      data-renderer={renderer}
      className={cn('qinan-matrix-field', className)}
      style={{ position: 'relative', width: safeSize, height: safeSize, pointerEvents: 'none', ...style }}
    >
      <canvas ref={canvasRef} aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }} />
      {renderer === 'css' && (
        <span
          data-slot="matrix-orb-fallback"
          style={{
            position: 'absolute', inset: '8%', opacity: 0.4,
            backgroundImage: 'radial-gradient(circle, #c2ff00 1.2px, transparent 1.6px)',
            backgroundSize: '8.333% 8.333%',
            maskImage: 'linear-gradient(135deg, transparent, #000 30%, #000 70%, transparent)',
          }}
        />
      )}
    </div>
  );
}
