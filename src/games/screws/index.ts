import type { Game } from '../../kit/game';
import { apply, start, status, type ScrewsMove, type ScrewsPuzzle, type ScrewsState } from './rules';
import { View } from './View';

export const screws: Game<ScrewsPuzzle, ScrewsState, ScrewsMove> = {
  id: 'screws',
  options: [],
  start,
  apply,
  status,
  // No screw is wrong in itself; a bad order shows up later, as full spare holes.
  isMistake: () => false,
  View,
};
