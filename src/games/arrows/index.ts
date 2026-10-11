import type { Game } from '../../kit/game';
import { apply, start, status, type ArrowsMove, type ArrowsPuzzle, type ArrowsState } from './rules';
import { View } from './View';

export const arrows: Game<ArrowsPuzzle, ArrowsState, ArrowsMove> = {
  id: 'arrows',
  options: [],
  start,
  apply,
  status,
  // No tap is wrong in itself; a bad one shows up later, as a knot that will not come undone.
  isMistake: () => false,
  View,
};
