import type { Game } from '../../kit/game';
import { apply, start, status, type BridgesMove, type BridgesPuzzle, type BridgesState } from './rules';
import { View } from './View';

export const bridges: Game<BridgesPuzzle, BridgesState, BridgesMove> = {
  id: 'bridges',
  options: [],
  start,
  apply,
  status,
  // A bridge in the wrong place is not marked: finding it is part of the puzzle.
  isMistake: () => false,
  View,
};
