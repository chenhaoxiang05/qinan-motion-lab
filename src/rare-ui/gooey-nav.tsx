/**
 * Rare UI — Copyright (c) 2026 Swami Malode.
 * Source: https://github.com/swamimalode07/rare-ui/blob/21554cba3ac751c1f9c06869eadb9d44a0af7225/components/ui/gooey-nav.tsx
 * MIT + Commons Clause + Attribution; see third-party/rare-ui/LICENSE.
 * Adapted for QINAN: controlled native material tabs, compact geometry and motion pause.
 */
import React, { useEffect, useId, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { cn } from './utils';
import { useMotionPaused } from './motion-settings';

// Retain the upstream separating tiles and curved neck. A shorter, critically
// damped response suits the compact material selector without moving its text.
const SPRING = { type: 'spring', stiffness: 360, damping: 34, mass: 0.7 } as const;
const NECK_BREAK = 0.22;
const NECK_H = 100;
const INACTIVE = '#1c241b';

type NavItem = { id: string; label: string; icon?: ReactNode };
export type GooeyNavProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  items: NavItem[];
  value: number;
  onChange?: (index: number) => void;
  disabled?: boolean;
  controls?: string;
  activeColor?: string;
  activeLabelColor?: string;
  separation?: number;
  radius?: number;
};

function neckPath(gap: number, span: number) {
  if (!Number.isFinite(gap) || !Number.isFinite(span) || gap <= 0 || span <= 0) return '';
  const waist = NECK_H * (1 - gap / (span * NECK_BREAK));
  if (waist <= 0) return '';
  const start = span - gap;
  const mid = start + gap / 2;
  return `M${start} 0 Q${mid} ${NECK_H - waist} ${span} 0 L${span} ${NECK_H} Q${mid} ${waist} ${start} ${NECK_H} Z`;
}

function Segment({ gap, span, hasSeam, leftFill, rightFill, reduced, radii, active, children }: {
  gap: number; span: number; hasSeam: boolean; leftFill: string; rightFill: string;
  reduced: boolean; radii: Record<string, number>; active: boolean; children: ReactNode;
}) {
  const marginLeft = useSpring(gap, SPRING);
  const gradientId = `gooey-neck-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    if (reduced) marginLeft.jump(gap);
    else marginLeft.set(gap);
    return () => { if (reduced) marginLeft.stop(); };
  }, [gap, marginLeft, reduced]);
  const d = useTransform(marginLeft, g => neckPath(g, span));
  return <motion.div role="presentation" data-slot="gooey-nav-segment" data-active={active}
    className="qi-material-segment" initial={false}
    style={{ marginLeft: reduced ? gap : marginLeft, backgroundColor: rightFill, ...(reduced ? radii : {}) }}
    animate={radii} transition={reduced ? { duration: 0 } : SPRING}>
    {hasSeam && <svg aria-hidden="true" width={span} viewBox={`0 0 ${span} ${NECK_H}`}
      preserveAspectRatio="none" className="qi-material-neck">
      <defs><linearGradient id={gradientId} x1="0" x2="1"><stop offset="0" stopColor={leftFill} /><stop offset="1" stopColor={rightFill} /></linearGradient></defs>
      <motion.path d={reduced ? neckPath(gap, span) : d} fill={`url(#${gradientId})`} />
    </svg>}
    {children}
  </motion.div>;
}

export function GooeyNav({ items, value, onChange, disabled = false, controls = 'uploadPanel',
  activeColor = '#c2ff00', activeLabelColor = '#152000', separation = 5, radius = 3, className, ...props }: GooeyNavProps) {
  const reduced = useMotionPaused();
  const active = Math.min(Math.max(0, value), Math.max(0, items.length - 1));
  const span = Math.max(0, separation);
  const corner = Math.max(0, radius);
  const open = (seam: number) => seam === 0 || seam === items.length || seam - 1 === active || seam === active;
  const fill = (i: number) => i === active ? activeColor : INACTIVE;
  const select = (index: number) => { if (!disabled && index !== active) onChange?.(index); };

  return <div {...props} role="tablist" aria-label="选择材料类型" aria-orientation="horizontal"
    data-slot="gooey-nav" data-paused={reduced || undefined} data-disabled={disabled || undefined}
    className={cn('qi-material-tabs', className)}>
    <span className="tab-marker" aria-hidden="true" />
    <div className="qi-material-rail" role="presentation">
      {items.map((item, i) => <Segment key={item.id} gap={i === 0 ? 0 : open(i) ? span : -1}
        span={span} hasSeam={i > 0} leftFill={fill(i - 1)} rightFill={fill(i)} reduced={reduced} active={i === active}
        radii={{ borderTopLeftRadius: open(i) ? corner : 0, borderBottomLeftRadius: open(i) ? corner : 0,
          borderTopRightRadius: open(i + 1) ? corner : 0, borderBottomRightRadius: open(i + 1) ? corner : 0 }}>
        <button type="button" role="tab" className="type-tab qi-material-tab" id={`type-${item.id}`} data-type={item.id}
          data-slot="gooey-nav-item" data-active={i === active} aria-selected={i === active}
          aria-controls={controls} tabIndex={i === active ? 0 : -1} disabled={disabled}
          style={{ '--qi-tab-ink': i === active ? activeLabelColor : '#aab5a6' } as CSSProperties}
          onClick={() => select(i)} onKeyDown={event => {
            if (disabled) return;
            let next: number;
            if (event.key === 'ArrowRight') next = (i + 1) % items.length;
            else if (event.key === 'ArrowLeft') next = (i + items.length - 1) % items.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = items.length - 1;
            else return;
            event.preventDefault();
            // Capture before the controlled callback commits the next value.
            const tabs = event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
            select(next);
            tabs?.[next]?.focus();
          }}>
          {item.icon}<span>{item.label}</span>
        </button>
      </Segment>)}
    </div>
  </div>;
}
