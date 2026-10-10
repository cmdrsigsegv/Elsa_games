import type { Game } from '../../kit/game';
import { apply, isMistake, start, status, type ArrowsMove, type ArrowsPuzzle, type ArrowsState } from './rules';
import { tuning } from './tuning';
import { View } from './View';

export const arrows: Game<ArrowsPuzzle, ArrowsState, ArrowsMove> = {
  id: 'arrows',
  adaptive: tuning.adaptive,
  options: [],
  start,
  apply,
  status,
  isMistake,
  View,
};
