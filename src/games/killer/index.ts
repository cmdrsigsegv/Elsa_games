import type { Game } from '../../kit/game';
import { apply, isMistake, start, status, type KillerMove, type KillerPuzzle, type KillerState } from './rules';
import { tuning } from './tuning';
import { View } from './View';

export const killer: Game<KillerPuzzle, KillerState, KillerMove> = {
  id: 'killer',
  options: [{ key: 'mistakes', choices: ['obvious', 'always'], initial: tuning.mistakes }],
  start,
  apply,
  status,
  isMistake,
  View,
};
