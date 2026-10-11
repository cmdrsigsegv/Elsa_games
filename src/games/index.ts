// The list of games the shell offers. Adding a game is one import and one
// entry here, plus its generator in generators.ts and its name in strings.ts.

import type { Game } from '../kit/game';
import { gridlock } from './gridlock';
import { nonogram } from './nonogram';
import { pour } from './pour';
import { stack } from './stack';
import { sudoku } from './sudoku';

export const games: Game[] = [sudoku, nonogram, gridlock, pour, stack];
