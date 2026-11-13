import type { animate } from 'animejs';
import type { IslandAdapters } from './rare-islands';
export interface WorkspaceIntroOptions {
  host: HTMLElement;
  animate?: typeof animate;
  motionEnabled?: () => boolean;
  getIslands?: () => IslandAdapters;
  duration?: number;
  onReady?: () => void;
}
export interface WorkspaceIntro {
  prepare(request: { key: string; render: () => unknown }): void;
  start(): void; finish(): void; cancel(): void; revealContent(): void; refreshIslands(): void;
  readonly pending: boolean;
  setPaused(value: boolean): void;
  destroy(): void;
}
export function createWorkspaceIntro(options: WorkspaceIntroOptions): WorkspaceIntro;
