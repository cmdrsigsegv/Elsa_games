import type { Game } from '../../kit/game';
import { t } from '../../shell/strings';
import { apply, start, status, type StackMove, type StackPuzzle, type StackState } from './rules';
import { View } from './View';

export const stack: Game<StackPuzzle, StackState, StackMove> = {
  id: 'stack',
  endless: true,
  options: [],
  start,
  apply,
  status,
  isMistake: () => false,
  endSummary: (_p, s) => t.blocks.score(s.points),
  View,
};
