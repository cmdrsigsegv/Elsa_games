// The nonogram screen: the grid with its clues, and a row of tools. A finger
// dragged across the grid marks a whole run of cells in one stroke.

import { useEffect, useRef, useState } from 'preact/hooks';
import { Board } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { t } from '../../shell/strings';
import { NO_ZOOM, cellAt, draw, layout, pinch } from './draw';
import type { NonogramPuzzle } from './generate';
import { EMPTY, FILLED, UNKNOWN } from './lines';
import {
  completeLines,
  hint,
  impossibleLines,
  wrongCells,
  type NonogramHint,
  type NonogramMove,
  type NonogramState,
} from './rules';
import { tuning } from './tuning';

type Props = ViewProps<NonogramPuzzle, NonogramState, NonogramMove>;

/** A drag in progress. */
interface Stroke {
  start: number;
  /** What the cells are being changed from and to. Only cells like the first one change. */
  from: number;
  to: number;
  /** A stroke locks to the row or column it first moves along. */
  axis: 'row' | 'column' | null;
  cells: number[];
}

export function View({ puzzle, state, ended, play, undo, canUndo, countHint, options }: Props) {
  const [crossing, setCrossing] = useState(false);
  const [stroke, setStroke] = useState<Stroke | null>(null);
  const [shown, setShown] = useState<{ hint: NonogramHint; at: number } | null>(null);
  // True after she asks to see her slips; lasts until they are all put right.
  const [revealed, setRevealed] = useState(false);
  const live = useRef<Stroke | null>(null);
  const [zoom, setZoom] = useState(NO_ZOOM);
  // The finished picture is shown whole.
  const view = ended ? NO_ZOOM : zoom;

  const wrong = wrongCells(puzzle, state);
  const always = options.mistakes === 'always';
  const showSlips = revealed && wrong.length > 0;
  const red = new Set(always || showSlips ? wrong : []);
  const impossible = impossibleLines(puzzle, state);

  useEffect(() => {
    if (revealed && wrong.length === 0) setRevealed(false);
  }, [revealed, wrong.length]);

  const offer = !ended && !always && !showSlips && wrong.length >= tuning.offerRevealAfter;

  // A hint stays on screen until the board changes.
  const hinting = shown && shown.at === state.moves ? shown.hint : null;

  const cellsOf = (s: Stroke, end: number): number[] => {
    const [r0, c0] = [Math.floor(s.start / puzzle.w), s.start % puzzle.w];
    const [r1, c1] = [Math.floor(end / puzzle.w), end % puzzle.w];
    const axis = s.axis ?? (Math.abs(c1 - c0) >= Math.abs(r1 - r0) ? 'row' : 'column');
    const out: number[] = [];
    if (axis === 'row') {
      for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) out.push(r0 * puzzle.w + c);
    } else {
      for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) out.push(r * puzzle.w + c0);
    }
    return out.filter((cell) => state.cells[cell] === s.from);
  };

  const onStroke = (phase: 'start' | 'move' | 'end' | 'cancel', x: number, y: number, w: number, h: number) => {
    if (ended) return;
    const l = layout(puzzle, w, h, view);
    if (phase === 'start') {
      const cell = cellAt(puzzle, l, x, y);
      if (cell === null) return;
      const from = state.cells[cell];
      const mark = crossing ? EMPTY : FILLED;
      live.current = { start: cell, from, to: from === mark ? UNKNOWN : mark, axis: null, cells: [cell] };
    } else if (!live.current) {
      return;
    } else if (phase === 'move') {
      const s = live.current;
      const end = cellAt(puzzle, l, x, y, true)!;
      if (s.axis === null && end !== s.start) {
        const across = Math.abs((end % puzzle.w) - (s.start % puzzle.w));
        const down = Math.abs(Math.floor(end / puzzle.w) - Math.floor(s.start / puzzle.w));
        s.axis = across >= down ? 'row' : 'column';
      }
      live.current = { ...s, cells: cellsOf(s, end) };
    } else {
      const s = live.current;
      live.current = null;
      setStroke(null);
      if (phase === 'end') play({ changes: s.cells.map((cell) => [cell, s.to]) });
      return;
    }
    setStroke(live.current);
  };

  const askHint = () => {
    if (ended) return;
    if (hinting) {
      // Second press: do it.
      play(hinting.move);
      setShown(null);
      return;
    }
    const h = hint(puzzle, state);
    if (!h) return;
    countHint();
    setShown({ hint: h, at: state.moves });
  };

  // What is on screen: the saved state, with the stroke in progress on top.
  const cells = stroke ? state.cells.map((v, i) => (stroke.cells.includes(i) ? stroke.to : v)) : state.cells;
  const lit = { rows: [] as number[], cols: [] as number[] };
  if (stroke) {
    lit.rows.push(Math.floor(stroke.start / puzzle.w));
    lit.cols.push(stroke.start % puzzle.w);
  } else if (hinting?.kind === 'line') {
    (hinting.line === 'row' ? lit.rows : lit.cols).push(hinting.index);
  } else if (hinting?.kind === 'wrong') {
    lit.rows.push(Math.floor(hinting.cell / puzzle.w));
    lit.cols.push(hinting.cell % puzzle.w);
  }

  let message = <>{' '}</>;
  if (hinting) {
    message = <>{hinting.kind === 'wrong' ? t.nonogram.hintWrong : t.nonogram.hintLine(hinting.line)}</>;
  } else if (showSlips) {
    message = <>{t.nonogram.slips(wrong.length)}</>;
  } else if (offer) {
    message = (
      <>
        {t.nonogram.somethingWrong}{' '}
        <button
          type="button"
          class="ghost"
          onClick={() => {
            countHint();
            setRevealed(true);
          }}
        >
          {t.nonogram.showMe}
        </button>
      </>
    );
  } else if (stroke && stroke.cells.length > 1) {
    // Counting cells while dragging saves counting them by eye.
    message = <>{stroke.cells.length}</>;
  }

  return (
    <div class="nonogram">
      <div class="board-area">
      <Board
        label={t.games.nonogram}
        tall
        onStroke={onStroke}
        onPinch={(cx, cy, factor, dx, dy, w, h) => setZoom((z) => pinch(puzzle, w, h, z, cx, cy, factor, dx, dy))}
        draw={(ctx, w, h, theme) =>
          draw(ctx, w, h, theme, puzzle, cells, {
            zoom: view,
            wrong: red,
            slips: showSlips ? wrong : [],
            done: completeLines(puzzle, state),
            impossible,
            lit,
            ended,
          })
        }
      />
      </div>

      <p class="message" aria-live="polite">
        {message}
      </p>

      <div class="tools">
        <button type="button" class={crossing ? '' : 'on'} aria-pressed={!crossing} onClick={() => setCrossing(false)}>
          <span class="swatch fill" />
          {t.nonogram.fill}
        </button>
        <button type="button" class={crossing ? 'on' : ''} aria-pressed={crossing} onClick={() => setCrossing(true)}>
          <span class="swatch cross">✕</span>
          {t.nonogram.cross}
        </button>
        <button type="button" disabled={!canUndo || ended} onClick={undo}>
          {t.nonogram.undo}
        </button>
        <button type="button" disabled={ended} onClick={askHint}>
          {t.nonogram.hint}
        </button>
      </div>
    </div>
  );
}
