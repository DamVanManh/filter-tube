export interface IdleState {
  readonly isPlaying: boolean;
  readonly isFullscreen: boolean;
  readonly lastInteractionMs: number;
  readonly nowMs: number;
  readonly afterSeconds: number;
}

export function shouldAutoFullscreen(state: IdleState): boolean {
  if (state.afterSeconds <= 0) return false;
  return state.isPlaying && !state.isFullscreen && state.nowMs - state.lastInteractionMs >= state.afterSeconds * 1000;
}
