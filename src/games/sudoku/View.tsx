// The sudoku screen: the grid, a row of tools, and the number pad.

import { useState } from 'preact/hooks';
import { Board } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { t } from '../../shell/strings';
import { draw } from './draw';
import type { SudokuPuzzle } from './generate';
import { hint, wrongCells, type SudokuHint, type SudokuMove, type SudokuState } from './rules';
import { tuning } from './tuning';

type Props = ViewProps<SudokuPuzzle, SudokuState, SudokuMove>;

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function View({ puzzle, state, ended, play, undo, canUndo, countHint }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [shown, setShown] = useState<SudokuHint | null>(null);

  const wrong = new Set(tuning.showMistakes ? wrongCells(puzzle, state) : []);
  // A hint stays on screen until its cell is filled in correctly.
  const hinting = shown && state.values[shown.cell] !== shown.digit ? shown : null;

  const select = (cell: number) => {
    setSelected(cell);
    if (hinting && cell !== hinting.cell) setShown(null);
  };

  const press = (digit: number) => {
    if (selected === null || ended) return;
    play({ type: notesMode ? 'note' : 'set', cell: selected, digit });
  };

  const askHint = () => {
    if (ended) return;
    if (hinting && selected === hinting.cell) {
      // Second press: fill it in (over a wrong number, if that was the hint).
      play({ type: 'set', cell: hinting.cell, digit: hinting.digit });
      setShown(null);
      return;
    }
    const h = hint(puzzle, state);
    if (!h) return;
    countHint();
    setSelected(h.cell);
    setShown(h);
  };

  const left = (digit: number) => 9 - state.values.filter((d) => d === digit).length;

  return (
    <div class="sudoku">
      <Board
        label={t.games.sudoku}
        draw={(ctx, size, theme) =>
          draw(ctx, size, theme, puzzle, state, {
            selected: ended ? null : selected,
            hinted: hinting?.cell ?? null,
            wrong,
            highlightSame: tuning.highlightSameNumber,
          })
        }
        onTap={(x, y, size) => select(Math.min(8, ((y / size) * 9) | 0) * 9 + Math.min(8, ((x / size) * 9) | 0))}
      />

      <p class="message" aria-live="polite">
        {hinting ? `${t.sudoku.why(hinting.why)} ${hinting.why.kind === 'wrong' ? t.sudoku.hintFix : t.sudoku.hintAgain}` : ' '}
      </p>

      <div class="tools">
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
        <button type="button" disabled={ended} onClick={askHint}>
          {t.sudoku.hint}
        </button>
      </div>

      <div class={`pad ${notesMode ? 'notes' : ''}`}>
        {DIGITS.map((d) => (
          <button type="button" key={d} disabled={ended || (!notesMode && left(d) <= 0)} onClick={() => press(d)}>
            {d}
            <small>{Math.max(0, left(d))}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
