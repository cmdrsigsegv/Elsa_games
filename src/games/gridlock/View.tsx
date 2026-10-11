// Gridlock's screen: the car park, the slide count, and Undo. There is no
// hint: working it out is the whole game. A car
// is dragged along its own length and settles on the nearest cell.

import { useRef, useState } from 'preact/hooks';
import { Board, type Theme } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { t } from '../../shell/strings';
import { EXIT_ROW, N, cover, reach, type GridlockMove, type GridlockPuzzle, type GridlockState } from './rules';

type Props = ViewProps<GridlockPuzzle, GridlockState, GridlockMove>;

const RED = '#d2504f';
/** The other vehicles' colours; chosen to read on both the light and the dark background. */
const COLOURS = ['#4f8fdb', '#55ad66', '#cfa62f', '#9a6fd8', '#e0823d', '#3fa7a3', '#8a8f98', '#c56aa8'];

/** A car being dragged: where it is, in cells and fractions of one, and how far it may go. */
interface Drag {
  car: number;
  /** Where on the car the finger took hold, in cells from its first cell. */
  grip: number;
  lo: number;
  hi: number;
  pos: number;
}

function draw(ctx: CanvasRenderingContext2D, size: number, theme: Theme, p: GridlockPuzzle, at: number[], lit: number | null) {
  // A margin on the right leaves room for the exit.
  const cell = size / (N + 0.5);
  const pad = cell * 0.07;
  ctx.fillStyle = theme.surface;
  ctx.beginPath();
  ctx.roundRect(0, 0, cell * N, cell * N, cell * 0.14);
  ctx.fill();
  // The exit: a gap in the wall beside the red car's row.
  ctx.fillRect(cell * N - 1, EXIT_ROW * cell + pad, cell * 0.5, cell - 2 * pad);
  ctx.fillStyle = theme.tintPeer;
  for (let i = 0; i < N * N; i++) {
    ctx.beginPath();
    ctx.roundRect((i % N) * cell + pad, Math.floor(i / N) * cell + pad, cell - 2 * pad, cell - 2 * pad, cell * 0.1);
    ctx.fill();
  }
  ctx.fillStyle = theme.inkQuiet;
  ctx.font = `600 ${cell * 0.3}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('›', cell * (N + 0.25), (EXIT_ROW + 0.5) * cell);

  p.cars.forEach((car, i) => {
    const x = (car.horizontal ? at[i] : car.line) * cell;
    const y = (car.horizontal ? car.line : at[i]) * cell;
    const w = (car.horizontal ? car.len : 1) * cell;
    const h = (car.horizontal ? 1 : car.len) * cell;
    ctx.fillStyle = i === 0 ? RED : COLOURS[(i - 1) % COLOURS.length];
    ctx.beginPath();
    ctx.roundRect(x + pad * 1.6, y + pad * 1.6, w - pad * 3.2, h - pad * 3.2, cell * 0.2);
    ctx.fill();
    if (i === lit) {
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = Math.max(3, cell * 0.07);
      ctx.stroke();
    }
  });
}

export function View({ puzzle, state, ended, play, undo, canUndo }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const live = useRef<Drag | null>(null);
  const set = (next: Drag | null) => {
    live.current = next;
    setDrag(next);
  };

  // What is on screen: the saved position, with the car in hand wherever the finger has it.
  const at = drag ? state.at.map((pos, i) => (i === drag.car ? drag.pos : pos)) : state.at;

  return (
    <div class="gridlock">
      <p class="scoreline">
        <strong>{t.gridlock.moves(state.moves)}</strong>
        <span>{t.gridlock.par(puzzle.par)}</span>
      </p>
      <Board
        label={t.games.gridlock}
        onStroke={(phase, x, y, w) => {
          if (ended) return;
          const cell = w / (N + 0.5);
          if (phase === 'start') {
            const col = Math.floor(x / cell);
            const row = Math.floor(y / cell);
            if (col < 0 || row < 0 || col >= N || row >= N) return;
            const car = cover(puzzle.cars, state.at)[row * N + col];
            if (car < 0) return;
            const along = (puzzle.cars[car].horizontal ? x : y) / cell;
            const [lo, hi] = reach(puzzle.cars, state.at, car);
            set({ car, grip: along - state.at[car], lo, hi, pos: state.at[car] });
          } else if (!live.current) {
            return;
          } else if (phase === 'move') {
            const d = live.current;
            const along = (puzzle.cars[d.car].horizontal ? x : y) / cell;
            set({ ...d, pos: Math.min(d.hi, Math.max(d.lo, along - d.grip)) });
          } else {
            const d = live.current;
            set(null);
            if (phase === 'end') play({ car: d.car, to: Math.round(d.pos) });
          }
        }}
        draw={(ctx, size, _height, theme) => draw(ctx, size, theme, puzzle, at, drag?.car ?? null)}
      />

      <div class="tools one spaced">
        <button type="button" disabled={!canUndo || ended} onClick={undo}>
          {t.gridlock.undo}
        </button>
      </div>
    </div>
  );
}
