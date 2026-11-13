import type { animate } from 'animejs';
import type { IslandAdapters, MaterialKind } from './rare-islands';
export function guideMarkup(): string;
export interface UsageGuide {
  refreshIslands(): void;
  setPaused(value: boolean): void;
  destroy(): void;
}
export function mountUsageGuide(host: HTMLElement, options?: {
  islands?: IslandAdapters; animate?: typeof animate; motionEnabled?: () => boolean;
  onStart?: (kind: MaterialKind) => void; onClose?: () => void;
}): UsageGuide;
