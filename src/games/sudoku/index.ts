import type { Game } from '../../kit/game';
import type { SudokuPuzzle } from './generate';
import { apply, isMistake, start, status, type SudokuMove, type SudokuState } from './rules';
import { tuning } from './tuning';
import { View } from './View';

export const sudoku: Game<SudokuPuzzle, SudokuState, SudokuMove> = {
  id: 'sudoku',
  adaptive: tuning.adaptive,
  showTimer: tuning.showTimer,
  start,
  apply,
  status,
  isMistake,
  View,
};
