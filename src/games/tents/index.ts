import type { Game } from '../../kit/game';
import { apply, start, status, type TentsMove, type TentsPuzzle, type TentsState } from './rules';
import { View } from './View';

export const tents: Game<TentsPuzzle, TentsState, TentsMove> = {
  id: 'tents',
  options: [],
  start,
  apply,
  status,
  // A tent in the wrong place is not marked as such; only a broken rule shows, on the board.
  isMistake: () => false,
  View,
};
