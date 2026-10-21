import {
  applyMove,
  canAutoComplete,
  isWon,
  newGame,
  nextAutoCompleteMove,
  pushHistory,
  undo,
  undoAll,
  type GameState,
  type History,
  type Move,
} from '../engine';

export type Phase = 'playing' | 'autocompleting' | 'won';

export interface AppState {
  readonly game: GameState;
  readonly history: History;
  readonly phase: Phase;
  /** Increments whenever a brand-new position is dealt or loaded (used to skip animations). */
  readonly dealId: number;
}

export type Action =
  | { type: 'NEW_GAME'; seed: number }
  | { type: 'LOAD_STATE'; game: GameState }
  | { type: 'MOVE'; move: Move }
  | { type: 'DRAW' }
  | { type: 'UNDO' }
  | { type: 'UNDO_ALL' }
  | { type: 'AUTO_STEP' };

export function phaseFor(game: GameState): Phase {
  if (isWon(game)) return 'won';
  if (canAutoComplete(game)) return 'autocompleting';
  return 'playing';
}

export function fromGame(game: GameState, dealId = 0): AppState {
  return { game, history: [], phase: phaseFor(game), dealId };
}

export function initialState(seed: number): AppState {
  return fromGame(newGame(seed));
}

function applyPlayerMove(state: AppState, move: Move): AppState {
  if (state.phase !== 'playing') return state;
  const result = applyMove(state.game, move);
  if (!result.ok) return state;
  return {
    ...state,
    game: result.state,
    history: pushHistory(state.history, state.game),
    phase: phaseFor(result.state),
  };
}

export function gameReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NEW_GAME':
      return fromGame(newGame(action.seed), state.dealId + 1);
    case 'LOAD_STATE':
      return fromGame(action.game, state.dealId + 1);
    case 'MOVE':
      return applyPlayerMove(state, action.move);
    case 'DRAW': {
      const { stock, waste } = state.game;
      if (stock.length > 0) return applyPlayerMove(state, { type: 'draw' });
      if (waste.length > 0) return applyPlayerMove(state, { type: 'recycle' });
      return state;
    }
    case 'UNDO': {
      if (state.phase !== 'playing' || state.history.length === 0) return state;
      const { state: game, history } = undo(state.history, state.game);
      return { ...state, game, history };
    }
    case 'UNDO_ALL': {
      if (state.phase !== 'playing' || state.history.length === 0) return state;
      const { state: game, history } = undoAll(state.history, state.game);
      return { ...state, game, history };
    }
    case 'AUTO_STEP': {
      if (state.phase !== 'autocompleting') return state;
      const move = nextAutoCompleteMove(state.game);
      const result = move ? applyMove(state.game, move) : null;
      if (!result?.ok) return { ...state, phase: phaseFor(state.game) };
      return {
        ...state,
        game: result.state,
        phase: isWon(result.state) ? 'won' : 'autocompleting',
      };
    }
  }
}

export function canUndoNow(state: AppState): boolean {
  return state.phase === 'playing' && state.history.length > 0;
}
