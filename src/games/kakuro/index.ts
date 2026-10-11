import type { Game } from '../../kit/game';
import type { KakuroPuzzle } from './generate';
import { apply, start, status, type KakuroMove, type KakuroState } from './rules';
import { View } from './View';

export const kakuro: Game<KakuroPuzzle, KakuroState, KakuroMove> = {
  id: 'kakuro',
  options: [],
  start,
  apply,
  status,
  // Only what visibly breaks the rules is marked, and that is not counted against her.
  isMistake: () => false,
  View,
};
