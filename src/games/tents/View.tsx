// The Tents and Trees screen: the grid with its clues, and Undo. A tap steps
// a cell from empty to tent to grass; a finger dragged across the grid marks
// everything it passes as grass in one stroke.

import { useRef, useState } from 'preact/hooks';
import { Board } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { pick } from '../../kit/words';
import { cellAt, draw, layout } from './draw';
import {
  apply,
  clueLooks,
  strandedTents,
  sweep,
  tap,
  tentsOf,
  touchingTents,
  unpaired,
  type TentsMove,
  type TentsPuzzle,
  type TentsState,
} from './rules';
import { words } from './words';

type Props = ViewProps<TentsPuzzle, TentsState, TentsMove>;

/** A finger on the board. */
interface Stroke {
  /** Where it came down. */
  x: number;
  y: number;
  /** False while it may still be a tap. */
  dragging: boolean;
  /** The cells it has passed over, the first being where it came down. */
  cells: number[];
}

/**
 * A finger never lifts from exactly where it landed. It has to travel this
 * far, in cells, before a tap turns into a drag; otherwise a tap near a
 * cell's edge would paint grass instead of pitching a tent.
 */
const DRAG_AFTER = 0.55;

/** The cells in a straight line from one cell to another, leaving out the first: a fast finger skips cells. */
function path(w: number, from: number, to: number): number[] {
  const [r0, c0] = [Math.floor(from / w), from % w];
  const [r1, c1] = [Math.floor(to / w), to % w];
  const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  const out: number[] = [];
  for (let k = 1; k <= steps; k++) {
    out.push(Math.round(r0 + ((r1 - r0) * k) / steps) * w + Math.round(c0 + ((c1 - c0) * k) / steps));
  }
  return out;
}

export function View({ puzzle, state, ended, play, undo, canUndo }: Props) {
  const t = pick(words);
  const [stroke, setStroke] = useState<Stroke | null>(null);
  const live = useRef<Stroke | null>(null);

  const onStroke = (phase: 'start' | 'move' | 'end' | 'cancel', x: number, y: number, w: number, h: number) => {
    if (ended) return;
    const l = layout(puzzle, w, h);
    if (phase === 'start') {
      const cell = cellAt(puzzle, l, x, y);
      if (cell === null) return;
      live.current = { x, y, dragging: false, cells: [cell] };
    } else if (!live.current) {
      return;
    } else if (phase === 'move') {
      const s = live.current;
      const end = cellAt(puzzle, l, x, y, true)!;
      const last = s.cells[s.cells.length - 1];
      if (end === last) return;
      if (!s.dragging && Math.hypot(x - s.x, y - s.y) < l.cell * DRAG_AFTER) return;
      const more = path(puzzle.w, last, end).filter((cell) => !s.cells.includes(cell));
      live.current = { ...s, dragging: true, cells: [...s.cells, ...more] };
    } else {
      const s = live.current;
      live.current = null;
      setStroke(null);
      if (phase === 'end') play(s.dragging ? sweep(puzzle, state, s.cells) : tap(puzzle, state, s.cells[0]));
      return;
    }
    setStroke(live.current);
  };

  // What is on screen: the saved state, with the drag in progress on top.
  const cells = stroke?.dragging ? apply(puzzle, state, sweep(puzzle, state, stroke.cells)).cells : state.cells;

  const touching = touchingTents(puzzle, state);
  const stranded = strandedTents(puzzle, state);
  const total = puzzle.rows.reduce((sum, n) => sum + n, 0);
  let message = t.count(tentsOf(state).length, total);
  if (ended) message = ' ';
  else if (touching.size) message = t.touching;
  else if (stranded.size) message = t.noTree;
  else if (unpaired(puzzle, state)) message = t.unpaired;

  return (
    // The `pour` class is borrowed for its layout: a column with the board taking the spare room.
    <div class="tents">
      <div class="board-area">
        <Board
          tall
          label={t.name}
          onStroke={onStroke}
          draw={(ctx, w, h, theme) =>
            draw(ctx, w, h, theme, puzzle, cells, {
              broken: new Set([...touching, ...stranded]),
              clues: clueLooks(puzzle, state),
            })
          }
        />
      </div>

      <p class="message" aria-live="polite">
        {message}
      </p>

      <div class="tools one">
        <button type="button" disabled={!canUndo || ended} onClick={undo}>
          {t.undo}
        </button>
      </div>
    </div>
  );
}
