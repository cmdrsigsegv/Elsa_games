import type { Game } from '../../kit/game';
import type { NonogramPuzzle } from './generate';
import { apply, isMistake, start, status, type NonogramMove, type NonogramState } from './rules';
import { tuning } from './tuning';
import { View } from './View';

export const nonogram: Game<NonogramPuzzle, NonogramState, NonogramMove> = {
  id: 'nonogram',
  adaptive: tuning.adaptive,
  showTimer: tuning.showTimer,
  options: [{ key: 'mistakes', choices: ['never', 'always'], initial: tuning.mistakes }],
  start,
  apply,
  status,
  isMistake,
  View,
};
