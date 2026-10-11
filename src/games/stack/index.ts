import type { Game } from '../../kit/game';
import { t } from '../../shell/strings';
import { apply, start, status, type StackMove, type StackPuzzle, type StackState } from './rules';
import { tuning } from './tuning';
import { View } from './View';

export const stack: Game<StackPuzzle, StackState, StackMove> = {
  id: 'stack',
  adaptive: tuning.adaptive,
  options: [],
  start,
  apply,
  status,
  isMistake: () => false,
  endSummary: (_p, s) => t.blocks.score(s.points),
  // A higher score means the game went better, so it counts as less effort.
  effort: (_p, s) => 1e7 / (s.points + 100),
  View,
};
