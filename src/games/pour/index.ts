import type { Game } from '../../kit/game';
import { apply, start, status, type PourMove, type PourPuzzle, type PourState } from './rules';
import { View } from './View';

export const pour: Game<PourPuzzle, PourState, PourMove> = {
  id: 'pour',
  options: [],
  start,
  apply,
  status,
  // No pour is wrong in itself; a bad one shows up later, as a dead end.
  isMistake: () => false,
  View,
};
