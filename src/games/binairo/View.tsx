// The Binairo screen: the grid, a line saying what is wrong or how much is
// left, and Undo. Tap a cell to change it: empty, filled, hollow, empty.

import { Board } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { pick } from '../../kit/words';
import { draw } from './draw';
import { breaks, emptyCells, type BinairoMove, type BinairoPuzzle, type BinairoState } from './rules';
import { words } from './words';

type Props = ViewProps<BinairoPuzzle, BinairoState, BinairoMove>;

export function View({ puzzle, state, ended, play, undo, canUndo }: Props) {
  const w = pick(words);
  const n = puzzle.size;
  // Only what anyone can see on the board is marked: a circle that is merely
  // not the answer stays as it is.
  const broken = breaks(n, state.cells);

  const tap = (x: number, y: number, size: number) => {
    if (ended) return;
    const col = Math.min(n - 1, Math.max(0, ((x / size) * n) | 0));
    const row = Math.min(n - 1, Math.max(0, ((y / size) * n) | 0));
    play({ cell: row * n + col });
  };

  let message = ' ';
  if (broken.kinds.length) message = w.broken[broken.kinds[0]];
  else if (!ended) message = w.left(emptyCells(state.cells));

  return (
    <div class="binairo">
      <Board
        label={w.title}
        draw={(ctx, size, _height, theme) => draw(ctx, size, theme, puzzle, state, broken.cells)}
        onTap={tap}
      />

      <p class="message" aria-live="polite">
        {message}
      </p>

      <div class="tools one">
        <button type="button" disabled={!canUndo || ended} onClick={undo}>
          {w.undo}
        </button>
      </div>
    </div>
  );
}
