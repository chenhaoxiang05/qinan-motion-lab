import type { animate, createLayout } from 'animejs';
export interface WorkspaceTransitions {
  readonly state: 'closed' | 'opening' | 'open' | 'closing';
  navigate(request: { key: string; portal?: HTMLElement | null; render?: () => unknown }): void;
  complete(): void;
  destroy(): void;
}
export function createWorkspaceTransitions(options: {
  dialog: HTMLDialogElement; surface: HTMLElement; backdrop: HTMLElement; portals: HTMLElement[];
  animate: typeof animate; createLayout?: typeof createLayout; motionEnabled: () => boolean;
  onBusy?: () => void; onHome?: () => void; onClosed?: () => void; onOpened?: () => void;
}): WorkspaceTransitions;
