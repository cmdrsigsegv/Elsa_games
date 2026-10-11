// The killer sudoku screen: the grid with its cages, a row of tools, and the
// number pad. It is the sudoku screen with a different board.

import { useEffect, useState } from 'preact/hooks';
import { Board } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { pick } from '../../kit/words';
import { t } from '../../shell/strings';
import { draw } from './draw';
import {
  clashingCells,
  hint,
  wrongCells,
  type HintWhy,
  type KillerHint,
  type KillerMove,
  type KillerPuzzle,
  type KillerState,
} from './rules';
import { tuning } from './tuning';
import { words } from './words';

type Props = ViewProps<KillerPuzzle, KillerState, KillerMove>;

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The reasons sudoku shares are said in sudoku's words; the ones about cages in ours. */
function reason(why: HintWhy): string {
  if (why.kind === 'lastInCage' || why.kind === 'fortyFive') return pick(words)[why.kind];
  return t.sudoku.why(why);
}

export function View({ puzzle, state, ended, play, undo, canUndo, countHint, options }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [shown, setShown] = useState<KillerHint | null>(null);
  // True after she asks to see her slips; lasts until they are all put right.
  const [revealed, setRevealed] = useState(false);

  // Which numbers are red. A clash is visible on the board, so it is always
  // marked; a number that is merely wrong is marked only if she chose
  // "straight away", or has asked to see her slips.
  const wrong = wrongCells(puzzle, state);
  const clashing = clashingCells(puzzle, state);
  const always = options.mistakes === 'always';
  const showSlips = revealed && wrong.length > 0;
  const red = new Set(always || showSlips ? [...wrong, ...clashing] : clashing);

  useEffect(() => {
    if (revealed && wrong.length === 0) setRevealed(false);
  }, [revealed, wrong.length]);

  // Offer to show the slips once several sit unnoticed, or the grid is full
  // and still not right.
  const unnoticed = wrong.filter((cell) => !red.has(cell)).length;
  const full = state.values.every((d) => d !== 0);
  const offer = !ended && unnoticed > 0 && (unnoticed >= tuning.offerRevealAfter || full);

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

  let message = <>{' '}</>;
  if (hinting) {
    message = <>{`${reason(hinting.why)} ${hinting.why.kind === 'wrong' ? t.sudoku.hintFix : t.sudoku.hintAgain}`}</>;
  } else if (showSlips) {
    message = <>{t.sudoku.slips(wrong.length)}</>;
  } else if (offer) {
    message = (
      <>
        {t.sudoku.somethingWrong}{' '}
        <button
          type="button"
          class="ghost"
          onClick={() => {
            countHint();
            setRevealed(true);
            setSelected(wrong[0]);
          }}
        >
          {t.sudoku.showMe}
        </button>
      </>
    );
  }

  return (
    // The class is sudoku's on purpose: the two screens share one layout.
    <div class="sudoku">
      <Board
        label={pick(words).name}
        draw={(ctx, size, _height, theme) =>
          draw(ctx, size, theme, puzzle, state, {
            selected: ended ? null : selected,
            hinted: hinting?.cell ?? null,
            wrong: red,
            slips: showSlips ? wrong : [],
            highlightSame: tuning.highlightSameNumber,
          })
        }
        onTap={(x, y, size) => select(Math.min(8, ((y / size) * 9) | 0) * 9 + Math.min(8, ((x / size) * 9) | 0))}
      />

      <p class="message" aria-live="polite">
        {message}
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
