import type { animate } from 'animejs';
export type FeedbackKind = 'change' | 'success' | 'error' | 'press';
export interface InteractionFeedback {
  cue(node: HTMLElement | null | undefined, options?: { kind?: FeedbackKind }): void;
  settle(scope?: HTMLElement | null): void;
  setPaused(value: boolean): void;
  destroy(): void;
}
export function createInteractionFeedback(options?: {
  root?: Document | HTMLElement; animate?: typeof animate; motionEnabled?: () => boolean;
}): InteractionFeedback;
