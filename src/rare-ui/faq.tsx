/**
 * Rare UI — Copyright (c) 2026 Swami Malode.
 * Source: https://github.com/swamimalode07/rare-ui/tree/21554cba3ac751c1f9c06869eadb9d44a0af7225
 * MIT + Commons Clause + Attribution; see third-party/rare-ui/LICENSE.
 * Adapted for QINAN: motion preferences and scoped utilities.
 */
import React, { Fragment, useId, useState } from "react";
import type {
  ComponentProps,
  CSSProperties,
  KeyboardEvent,
  ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  type Transition,
} from "motion/react";
import { cn } from "./utils";
import { useMotionPaused } from "./motion-settings";

const SEND: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.28 };
const SHIFT: Transition = { type: "spring", visualDuration: 0.4, bounce: 0.1 };
const LEAVE: Transition = { duration: 0.16, ease: [0.4, 0, 1, 1] };
const INSTANT: Transition = { duration: 0 };

const QUESTION = '[data-slot="faq-question"]';
const KEY_STEPS: Record<string, (index: number, last: number) => number> = {
  ArrowDown: (index) => index + 1,
  ArrowUp: (index) => index - 1,
  Home: () => 0,
  End: (_, last) => last,
};

export type FaqItem = {
  id: string;
  question: string;
  answer: ReactNode;
};

function RareMark() {
  return (
    <svg viewBox="0 0 263 252" fill="currentColor" className="rare:size-5">
      <path d="M155.726 142.646C146.149 139.871 142.461 128.258 148.681 120.466L187.804 71.4521C197.894 58.8118 216.188 56.4448 229.162 66.1009L255.614 85.7874C261.744 90.3494 264.325 98.2844 262.053 105.58L251.408 139.759C246.55 155.357 230.105 164.2 214.415 159.653L155.726 142.646Z" />
      <path d="M143.404 115.886C137.806 124.137 125.622 124.056 120.132 115.732L85.6075 63.3779C76.7038 49.876 80.1057 31.7465 93.2985 22.3909L120.196 3.31712C126.428 -1.1029 134.773 -1.10601 141.009 3.30938L170.226 23.9958C183.559 33.4357 186.888 51.808 177.715 65.3256L143.404 115.886Z" />
      <path d="M115.051 118.12C121.167 125.995 117.326 137.557 107.713 140.206L47.2524 156.862C31.6599 161.158 15.4689 152.32 10.648 136.882L0.819439 105.408C-1.45817 98.1138 1.11742 90.1769 7.2438 85.6103L35.9463 64.2156C49.0442 54.4526 67.546 56.964 77.5674 69.8653L115.051 118.12Z" />
      <path d="M109.654 146.532C119.096 143.328 128.766 150.741 128.123 160.691L124.084 223.274C123.043 239.413 109.394 251.822 93.2286 251.327L60.2704 250.318C52.6329 250.085 45.9754 245.054 43.6643 237.771L32.8367 203.649C27.8957 188.078 36.3217 171.416 51.7915 166.166L109.654 146.532Z" />
      <path d="M133.079 159.806C132.95 149.836 142.988 142.93 152.253 146.616L210.525 169.796C225.553 175.774 233.137 192.589 227.67 207.811L216.526 238.844C213.944 246.035 207.102 250.813 199.461 250.76L163.663 250.513C147.327 250.401 134.085 237.238 133.872 220.903L133.079 159.806Z" />
    </svg>
  );
}

type BubbleProps = {
  item: FaqItem;
  ids: { question: string; answer: string };
  open: boolean;
  openId: string | null;
  reduced: boolean;
};

function Question({
  item,
  ids,
  open,
  openId,
  reduced,
  onToggle,
}: BubbleProps & { onToggle: () => void }) {
  return (
    <motion.button
      id={ids.question}
      type="button"
      data-slot="faq-question"
      aria-expanded={open}
      aria-controls={open ? ids.answer : undefined}
      onClick={onToggle}
      // every bubble re-measures when any answer opens, so the ones below slide
      layout={reduced ? false : "position"}
      layoutDependency={openId}
      transition={reduced ? INSTANT : SHIFT}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      className={cn(
        "rare:max-w-[85%] rare:cursor-pointer rare:self-start rare:rounded-[18px] rare:rounded-bl-[6px] rare:px-4 rare:py-2.5 rare:text-left rare:text-[15px] rare:leading-[1.4] rare:tracking-[-0.01em] rare:text-black rare:transition-colors rare:duration-200 rare:focus-visible:outline-none rare:focus-visible:ring-2 rare:focus-visible:ring-[#868593]/50 rare:dark:text-white",
        open
          ? "rare:bg-white rare:shadow-[0_1px_2px_rgba(0,0,0,0.06)] rare:dark:bg-[#333333] rare:dark:shadow-none"
          : "rare:bg-[#F4F4F9] rare:dark:bg-[#262626]",
      )}
    >
      {item.question}
    </motion.button>
  );
}

function Answer({
  item,
  ids,
  open,
  openId,
  reduced,
  avatar,
}: BubbleProps & { avatar: ReactNode }) {
  const content = <>
    <div
      id={ids.answer}
      role="region"
      aria-labelledby={ids.question}
      className="rare:max-w-[85%] rare:rounded-[18px] rare:rounded-br-[6px] rare:bg-[var(--faq-accent)] rare:px-4 rare:py-2.5 rare:text-[15px] rare:leading-[1.45] rare:tracking-[-0.01em] rare:text-white"
    >
      {item.answer}
    </div>
    {avatar != null && (
      <span
        aria-hidden
        className="rare:flex rare:size-8 rare:shrink-0 rare:items-center rare:justify-center rare:overflow-hidden rare:rounded-full rare:bg-white/60 rare:text-[var(--faq-accent)] rare:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.15)] rare:backdrop-blur-2xl rare:backdrop-saturate-150 rare:dark:bg-white/[0.07] rare:dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] rare:[&>img]:size-full rare:[&>img]:object-cover"
      >
        {avatar}
      </span>
    )}
  </>;

  // Replacing an in-flight motion wrapper also clears stale opacity immediately
  // when the user pauses. The semantic answer content is unchanged.
  if (reduced) {
    return open ? <div data-slot="faq-answer" className="rare:flex rare:items-end rare:justify-end rare:gap-2">{content}</div> : null;
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {open && (
        <motion.div
          key="answer"
          data-slot="faq-answer"
          layout={reduced ? false : "position"}
          layoutDependency={openId}
          initial={reduced ? false : { opacity: 0, scale: 0.6, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: reduced ? 1 : 0,
            scale: reduced ? 1 : 0.9,
            transition: reduced ? INSTANT : LEAVE,
          }}
          transition={reduced ? INSTANT : SEND}
          style={{ originX: 1, originY: 1 }}
          className="rare:flex rare:items-end rare:justify-end rare:gap-2"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type FaqProps = Omit<ComponentProps<"div">, "defaultValue"> & {
  items: FaqItem[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  accent?: string;
  avatar?: ReactNode;
};

export function Faq({
  items,
  value,
  defaultValue = null,
  onValueChange,
  accent = "#FC4C01",
  avatar = <RareMark />,
  className,
  style,
  ...props
}: FaqProps) {
  const reduced = useMotionPaused();
  const uid = useId();
  const [own, setOwn] = useState(defaultValue);
  const openId = value === undefined ? own : value;

  const toggle = (id: string) => {
    const next = openId === id ? null : id;
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEPS[event.key];
    const target = event.target as HTMLElement;
    if (!step || !target.matches(QUESTION)) return;

    const questions = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(QUESTION),
    ];
    const next = step(questions.indexOf(target), questions.length - 1);
    event.preventDefault();
    questions[(next + questions.length) % questions.length]?.focus();
  };

  return (
    <div
      data-slot="faq"
      onKeyDown={onKeyDown}
      style={{ "--faq-accent": accent, ...style } as CSSProperties}
      className={cn("rare:relative rare:flex rare:w-full rare:max-w-xl rare:flex-col rare:gap-3", className)}
      {...props}
    >
      {items.map((item) => {
        const bubble = {
          item,
          ids: {
            question: `${uid}-${item.id}-question`,
            answer: `${uid}-${item.id}-answer`,
          },
          open: openId === item.id,
          openId,
          reduced,
        };

        return (
          <Fragment key={item.id}>
            <Question {...bubble} onToggle={() => toggle(item.id)} />
            <Answer {...bubble} avatar={avatar} />
          </Fragment>
        );
      })}
    </div>
  );
}

export default Faq;
