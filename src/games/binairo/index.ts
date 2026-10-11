import type { Game } from '../../kit/game';
import { apply, start, status, type BinairoMove, type BinairoPuzzle, type BinairoState } from './rules';
import { View } from './View';

export const binairo: Game<BinairoPuzzle, BinairoState, BinairoMove> = {
  id: 'binairo',
  options: [],
  start,
  apply,
  status,
  // A tap is never wrong in itself: what breaks a rule is shown on the board, and can be tapped away.
  isMistake: () => false,
  View,
};
