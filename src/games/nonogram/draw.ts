// Draws a nonogram: the clues along the top and left, and the grid. Also
// owns the geometry, so that drawing and touch agree on where each cell is.

import type { Theme } from '../../kit/Board';
import type { NonogramPuzzle } from './generate';
import { EMPTY, FILLED } from './lines';

export interface Layout {
  cell: number;
  /** Top-left corner of the grid; the clues sit above and to the left of it. */
  x0: number;
  y0: number;
}

/** How much room one clue number takes, in cells: across for row clues, down for column clues. */
const CLUE_ACROSS = 0.66;
const CLUE_DOWN = 0.74;

export function layout(p: NonogramPuzzle, size: number): Layout {
  const across = Math.max(1, ...p.rows.map((clue) => clue.length)) * CLUE_ACROSS + 0.2;
  const down = Math.max(1, ...p.cols.map((clue) => clue.length)) * CLUE_DOWN + 0.2;
  const cell = size / Math.max(p.w + across, p.h + down);
  return { cell, x0: size - p.w * cell, y0: size - p.h * cell };
}

/** The cell under a point, or null if the point is in the clues. Points past the edge snap to it when `clamp` is set. */
export function cellAt(p: NonogramPuzzle, l: Layout, x: number, y: number, clamp = false): number | null {
  let c = Math.floor((x - l.x0) / l.cell);
  let r = Math.floor((y - l.y0) / l.cell);
  if (clamp) {
    c = Math.min(p.w - 1, Math.max(0, c));
    r = Math.min(p.h - 1, Math.max(0, r));
  }
  if (c < 0 || r < 0 || c >= p.w || r >= p.h) return null;
  return r * p.w + c;
}

export interface Look {
  /** Cells to paint as mistakes. */
  wrong: Set<number>;
  /** When the slips are being shown: wrong cells in the order they were marked. */
  slips: number[];
  /** Lines whose clue is complete (dimmed) or cannot work as marked (red). */
  done: { rows: Set<number>; cols: Set<number> };
  impossible: { rows: Set<number>; cols: Set<number> };
  /** A line to light up: a hint, or the one under her finger. */
  lit: { rows: number[]; cols: number[] };
  /** The finished picture: no crosses, no grid. */
  ended: boolean;
}

const FONT = "system-ui, 'Segoe UI', Roboto, sans-serif";

export function draw(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: Theme,
  p: NonogramPuzzle,
  cells: number[],
  look: Look,
) {
  const l = layout(p, size);
  const { cell, x0, y0 } = l;
  const gw = p.w * cell;
  const gh = p.h * cell;

  ctx.fillStyle = theme.surface;
  ctx.fillRect(x0, y0, gw, gh);

  // Lit lines run through the clues as well, so the eye can follow them.
  ctx.fillStyle = theme.tintSame;
  for (const r of look.lit.rows) ctx.fillRect(0, y0 + r * cell, size, cell);
  for (const c of look.lit.cols) ctx.fillRect(x0 + c * cell, 0, cell, size);

  // Cells.
  const inset = Math.max(1, cell * 0.07);
  for (let i = 0; i < cells.length; i++) {
    const x = x0 + (i % p.w) * cell;
    const y = y0 + Math.floor(i / p.w) * cell;
    const bad = look.wrong.has(i);
    if (cells[i] === FILLED) {
      ctx.fillStyle = bad ? theme.wrong : look.ended ? theme.accent : theme.ink;
      const pad = look.ended ? 0 : inset;
      ctx.fillRect(x + pad, y + pad, cell - 2 * pad, cell - 2 * pad);
    } else if (cells[i] === EMPTY && !look.ended) {
      ctx.strokeStyle = bad ? theme.wrong : theme.inkQuiet;
      ctx.lineWidth = Math.max(1.25, cell * 0.07);
      const a = cell * 0.3;
      ctx.beginPath();
      ctx.moveTo(x + a, y + a);
      ctx.lineTo(x + cell - a, y + cell - a);
      ctx.moveTo(x + cell - a, y + a);
      ctx.lineTo(x + a, y + cell - a);
      ctx.stroke();
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // The order the slips were made in: 1 is where it went wrong.
  if (look.slips.length > 1) {
    ctx.font = `700 ${cell * 0.5}px ${FONT}`;
    look.slips.forEach((i, n) => {
      // White on a red square; red beside a red cross.
      ctx.fillStyle = cells[i] === FILLED ? theme.surface : theme.wrong;
      ctx.fillText(String(n + 1), x0 + ((i % p.w) + 0.5) * cell, y0 + (Math.floor(i / p.w) + 0.54) * cell);
    });
  }

  if (!look.ended) {
    // Grid lines: thin between cells, strong every five and round the edge.
    for (let k = 0; k <= Math.max(p.w, p.h); k++) {
      const strong = k % 5 === 0 || k === p.w || k === p.h;
      ctx.strokeStyle = strong ? theme.lineStrong : theme.line;
      ctx.lineWidth = strong ? 1.75 : 1;
      ctx.beginPath();
      if (k <= p.w) {
        const x = Math.min(size - 1, x0 + k * cell);
        ctx.moveTo(x, y0);
        ctx.lineTo(x, size);
      }
      if (k <= p.h) {
        const y = Math.min(size - 1, y0 + k * cell);
        ctx.moveTo(x0, y);
        ctx.lineTo(size, y);
      }
      ctx.stroke();
    }
  }

  // Clues: row clues right-aligned against the grid, column clues stacked down to it.
  const fontSize = Math.min(cell * 0.62, 22);
  const clueColour = (done: boolean, impossible: boolean) => {
    ctx.globalAlpha = done && !impossible ? 0.4 : 1;
    return impossible ? theme.wrong : done ? theme.inkQuiet : theme.ink;
  };
  p.rows.forEach((clue, r) => {
    ctx.font = `${look.impossible.rows.has(r) ? 700 : 600} ${fontSize}px ${FONT}`;
    ctx.fillStyle = clueColour(look.done.rows.has(r), look.impossible.rows.has(r));
    clue.forEach((n, k) => {
      const fromRight = clue.length - 1 - k;
      ctx.fillText(String(n), x0 - (fromRight + 0.5) * cell * CLUE_ACROSS - cell * 0.1, y0 + (r + 0.54) * cell);
    });
  });
  p.cols.forEach((clue, c) => {
    ctx.font = `${look.impossible.cols.has(c) ? 700 : 600} ${fontSize}px ${FONT}`;
    ctx.fillStyle = clueColour(look.done.cols.has(c), look.impossible.cols.has(c));
    clue.forEach((n, k) => {
      const fromBottom = clue.length - 1 - k;
      ctx.fillText(String(n), x0 + (c + 0.5) * cell, y0 - (fromBottom + 0.5) * cell * CLUE_DOWN - cell * 0.08);
    });
  });
  ctx.globalAlpha = 1;
}
