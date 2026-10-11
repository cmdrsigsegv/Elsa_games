// The kakuro screen: the grid, a row of tools, and the number pad.

import { useState } from 'preact/hooks';
import { Board } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { pick } from '../../kit/words';
import { t } from '../../shell/strings';
import { draw } from './draw';
import type { KakuroPuzzle } from './generate';
import { breaks, isWhite, layoutFor, type KakuroMove, type KakuroState } from './rules';
import { words } from './words';

type Props = ViewProps<KakuroPuzzle, KakuroState, KakuroMove>;

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function View({ puzzle, state, ended, play, undo, canUndo }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const w = pick(words);

  // Only what can be seen to break the rules is marked; a number that is
  // merely not the answer is left for her to find.
  const broken = breaks(puzzle, state);

  const press = (digit: number) => {
    if (selected === null || ended) return;
    play({ type: notesMode ? 'note' : 'set', cell: selected, digit });
  };

  // The line under the board: what is wrong if anything is, otherwise the
  // two clues of the selected cell, which are small on a big grid.
  let message = ' ';
  if (ended) {
    // Nothing to say: the kit's own sheet takes over.
  } else if (broken.repeats.length) {
    message = w.repeated;
  } else if (broken.across.length || broken.down.length) {
    message = w.badSum;
  } else if (selected !== null) {
    const layout = layoutFor(puzzle);
    const across = layout.runs[layout.acrossOf[selected]];
    const down = layout.runs[layout.downOf[selected]];
    message = w.clues(puzzle.across[across.clueAt], across.cells.length, puzzle.down[down.clueAt], down.cells.length);
  }

  return (
    <div class="sudoku">
      <Board
        label={w.name}
        draw={(ctx, size, _height, theme) =>
          draw(ctx, size, theme, puzzle, state, { selected: ended ? null : selected, breaks: broken })
        }
        onTap={(x, y, size) => {
          const n = puzzle.size;
          const cell = Math.min(n - 1, ((y / size) * n) | 0) * n + Math.min(n - 1, ((x / size) * n) | 0);
          // A tap on a black cell leaves the selection where it was.
          if (isWhite(puzzle, cell)) setSelected(cell);
        }}
      />

      <p class="message" aria-live="polite">
        {message}
      </p>

      {/* Three tools, where the shared layout expects four. */}
      <div class="tools" style="grid-template-columns: repeat(3, 1fr)">
        <button type="button" disabled={!canUndo || ended} onClick={undo}>
          {t.sudoku.undo}
        </button>
        <button
          type="button"
          disabled={selected === null || ended}
          onClick={() => selected !== null && play({ type: 'erase', cell: selected })}
        >
          {t.sudoku.erase}
        </button>
        <button type="button" class={notesMode ? 'on' : ''} aria-pressed={notesMode} onClick={() => setNotesMode(!notesMode)}>
          {t.sudoku.notes}
          <small>{notesMode ? t.sudoku.on : t.sudoku.off}</small>
        </button>
      </div>

      <div class={`pad ${notesMode ? 'notes' : ''}`}>
        {DIGITS.map((d) => (
          <button type="button" key={d} disabled={ended} onClick={() => press(d)}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
