export const AUTO_FULLSCREEN_AFTER_MS = 60_000;

export interface IdleState {
  readonly isPlaying: boolean;
  readonly isFullscreen: boolean;
  readonly lastInteractionMs: number;
  readonly nowMs: number;
}

export function shouldAutoFullscreen(state: IdleState): boolean {
  return state.isPlaying && !state.isFullscreen && state.nowMs - state.lastInteractionMs >= AUTO_FULLSCREEN_AFTER_MS;
}
