// Draws the campsite: the clues along the top and left, and the grid. Also
// owns the geometry, so that drawing and touch agree on where each cell is.

import type { Theme } from '../../kit/Board';
import { GRASS, TENT, type ClueLook, type TentsPuzzle } from './rules';

export interface Layout {
  cell: number;
  /** Top-left corner of the grid; the clues sit above and to the left of it. */
  gx: number;
  gy: number;
}

/** How much room the clues take beside the grid, in cells. */
const CLUES = 0.85;
/** Small grids stop growing here, so the cells do not turn into paving slabs. */
const BIGGEST_CELL = 56;
const BIGGEST_CLUE = 22;

/** The few colours that are the same in light and dark: a tree is green and a tent is canvas. */
const LEAVES = '#3f9b4b';
const TRUNK = '#8d6e4c';
const CANVAS = '#f0a030';
const DOOR = '#8a5310';
const LAWN = '#4caf50';

export function layout(p: TentsPuzzle, w: number, h: number): Layout {
  const cell = Math.min(w / (p.w + CLUES), h / (p.h + CLUES), BIGGEST_CELL);
  return {
    cell,
    gx: (w - (p.w + CLUES) * cell) / 2 + CLUES * cell,
    gy: (h - (p.h + CLUES) * cell) / 2 + CLUES * cell,
  };
}

/** The cell under a point, or null if the point is outside the grid. Points past the edge snap to it when `clamp` is set. */
export function cellAt(p: TentsPuzzle, l: Layout, x: number, y: number, clamp = false): number | null {
  let c = Math.floor((x - l.gx) / l.cell);
  let r = Math.floor((y - l.gy) / l.cell);
  if (clamp) {
    c = Math.min(p.w - 1, Math.max(0, c));
    r = Math.min(p.h - 1, Math.max(0, r));
  }
  if (c < 0 || r < 0 || c >= p.w || r >= p.h) return null;
  return r * p.w + c;
}

export interface Look {
  /** Tents that visibly break a rule. */
  broken: Set<number>;
  clues: { rows: ClueLook[]; cols: ClueLook[] };
}

const FONT = "system-ui, 'Segoe UI', Roboto, sans-serif";

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number) {
  ctx.fillStyle = TRUNK;
  ctx.fillRect(x + cell * 0.43, y + cell * 0.55, cell * 0.14, cell * 0.33);
  ctx.fillStyle = LEAVES;
  ctx.beginPath();
  ctx.arc(x + cell * 0.5, y + cell * 0.4, cell * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function tent(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, fill: string) {
  const triangle = (top: number, half: number) => {
    ctx.beginPath();
    ctx.moveTo(x + cell * 0.5, y + cell * top);
    ctx.lineTo(x + cell * (0.5 - half), y + cell * 0.82);
    ctx.lineTo(x + cell * (0.5 + half), y + cell * 0.82);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = fill;
  triangle(0.18, 0.36);
  ctx.fillStyle = DOOR;
  triangle(0.5, 0.11);
}

export function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: Theme,
  p: TentsPuzzle,
  cells: number[],
  look: Look,
) {
  const { cell, gx, gy } = layout(p, w, h);
  const gw = p.w * cell;
  const gh = p.h * cell;

  ctx.fillStyle = theme.surface;
  ctx.fillRect(gx, gy, gw, gh);

  for (let i = 0; i < cells.length; i++) {
    const x = gx + (i % p.w) * cell;
    const y = gy + Math.floor(i / p.w) * cell;
    if (p.trees[i]) {
      tree(ctx, x, y, cell);
    } else if (cells[i] === TENT) {
      const bad = look.broken.has(i);
      if (bad) {
        // The whole cell is tinted too: on a small grid a red tent alone is easy to miss.
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = theme.wrong;
        ctx.fillRect(x, y, cell, cell);
        ctx.globalAlpha = 1;
      }
      tent(ctx, x, y, cell, bad ? theme.wrong : CANVAS);
    } else if (cells[i] === GRASS) {
      // A wash of green, and a dot for those who cannot tell the wash from the bare cell.
      ctx.fillStyle = LAWN;
      ctx.globalAlpha = 0.2;
      ctx.fillRect(x, y, cell, cell);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, Math.max(1.5, cell * 0.07), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Grid lines: thin between cells, strong round the edge.
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < p.w; c++) {
    ctx.moveTo(gx + c * cell, gy);
    ctx.lineTo(gx + c * cell, gy + gh);
  }
  for (let r = 1; r < p.h; r++) {
    ctx.moveTo(gx, gy + r * cell);
    ctx.lineTo(gx + gw, gy + r * cell);
  }
  ctx.stroke();
  ctx.strokeStyle = theme.lineStrong;
  ctx.lineWidth = 1.75;
  ctx.strokeRect(gx + 1, gy + 1, gw - 2, gh - 2);

  // Clues: dimmed once the line has its tents, red when it cannot come right.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = Math.min(cell * 0.6, BIGGEST_CLUE);
  const clue = (n: number, state: ClueLook, x: number, y: number) => {
    ctx.font = `${state === 'wrong' ? 700 : 600} ${size}px ${FONT}`;
    ctx.globalAlpha = state === 'done' ? 0.4 : 1;
    ctx.fillStyle = state === 'wrong' ? theme.wrong : state === 'done' ? theme.inkQuiet : theme.ink;
    ctx.fillText(String(n), x, y);
  };
  p.rows.forEach((n, r) => clue(n, look.clues.rows[r], gx - cell * CLUES * 0.5, gy + (r + 0.54) * cell));
  p.cols.forEach((n, c) => clue(n, look.clues.cols[c], gx + (c + 0.5) * cell, gy - cell * CLUES * 0.46));
  ctx.globalAlpha = 1;
}
