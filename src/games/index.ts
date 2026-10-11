// The list of games the shell offers. Adding a game is one import and one
// entry here, plus its generator in generators.ts and its name in strings.ts.

import type { Game } from '../kit/game';
import { gridlock } from './gridlock';
import { nonogram } from './nonogram';
import { pour } from './pour';
import { stack } from './stack';
import { bridges } from './bridges';
import { tents } from './tents';
import { binairo } from './binairo';
import { killer } from './killer';
import { kakuro } from './kakuro';
import { sudoku } from './sudoku';

// The screw game (./screws) is built and tested but benched: it is left off this list on purpose.
export const games: Game[] = [sudoku, nonogram, gridlock, pour, stack, bridges, tents, binairo, killer, kakuro];
