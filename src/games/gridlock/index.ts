import type { Game } from '../../kit/game';
import { apply, start, status, type GridlockMove, type GridlockPuzzle, type GridlockState } from './rules';
import { View } from './View';

export const gridlock: Game<GridlockPuzzle, GridlockState, GridlockMove> = {
  id: 'gridlock',
  options: [],
  start,
  apply,
  status,
  // No slide is wrong in itself; a roundabout solution shows in the slide count.
  isMistake: () => false,
  View,
};
