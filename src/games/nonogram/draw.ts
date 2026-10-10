// Draws a nonogram: the clues along the top and left, and the grid. Also
// owns the geometry, so that drawing and touch agree on where each cell is.
//
// Big grids are zoomed and moved about. The clues stay pinned to the top and
// left edges while the grid slides underneath them, so the clues for the
// cells on screen are always in view.

import type { Theme } from '../../kit/Board';
import type { NonogramPuzzle } from './generate';
import { EMPTY, FILLED } from './lines';

/** How far in she has zoomed, and how far the grid has slid (never positive). */
export interface Zoom {
  scale: number;
  tx: number;
  ty: number;
}

export const NO_ZOOM: Zoom = { scale: 1, tx: 0, ty: 0 };

export interface Layout {
  cell: number;
  /** Top-left corner of the grid's window: the clues sit above and to the left of it. */
  wx: number;
  wy: number;
  /** Top-left corner of the grid itself, which may be off-screen when zoomed in. */
  gx: number;
  gy: number;
  /** The slide limits for this zoom: tx may run from minTx to 0. */
  minTx: number;
  minTy: number;
  maxScale: number;
  /** Clue numbers: their size, and how far apart they sit across (row clues) and down (column clues). */
  font: number;
  stepX: number;
  stepY: number;
}

/** How much room one clue number takes, in cells: across for row clues, down for column clues. */
const CLUE_ACROSS = 0.66;
const CLUE_DOWN = 0.74;
/** Zooming in stops when cells reach this size; plenty for a fingertip. */
const BIGGEST_CELL = 34;
/** Clue numbers stop growing at this size; smaller when clues are long, so they leave room for the grid. */
const BIGGEST_CLUE = 22;
const BIGGEST_LONG_CLUE = 15;

export function layout(p: NonogramPuzzle, w: number, h: number, zoom: Zoom): Layout {
  const longestRow = Math.max(1, ...p.rows.map((clue) => clue.length));
  const longestCol = Math.max(1, ...p.cols.map((clue) => clue.length));
  // Zoomed right out, everything is in proportion to the cells.
  const fit = Math.min(w / (p.w + longestRow * CLUE_ACROSS + 0.2), h / (p.h + longestCol * CLUE_DOWN + 0.2));
  const maxScale = Math.max(1, BIGGEST_CELL / fit);
  const scale = Math.min(maxScale, Math.max(1, zoom.scale));
  const cell = fit * scale;

  // Zooming in grows the cells; the clue numbers stop growing once readable.
  const font = Math.min(cell * 0.62, Math.max(longestRow, longestCol) > 4 ? BIGGEST_LONG_CLUE : BIGGEST_CLUE);
  const stepX = Math.min(cell * CLUE_ACROSS, font * 1.05);
  const stepY = Math.min(cell * CLUE_DOWN, font * 1.2);
  const cluesW = longestRow * stepX + 0.2 * cell;
  const cluesH = longestCol * stepY + 0.2 * cell;

  // Centred while it all fits; pinned to the top-left once it does not.
  const fullW = cluesW + p.w * cell;
  const fullH = cluesH + p.h * cell;
  const wx = Math.max(0, (w - fullW) / 2) + cluesW;
  const wy = Math.max(0, (h - fullH) / 2) + cluesH;
  const minTx = Math.min(0, w - fullW);
  const minTy = Math.min(0, h - fullH);
  const tx = Math.min(0, Math.max(minTx, zoom.tx));
  const ty = Math.min(0, Math.max(minTy, zoom.ty));
  return { cell, wx, wy, gx: wx + tx, gy: wy + ty, minTx, minTy, maxScale, font, stepX, stepY };
}

/**
 * The zoom after spreading two fingers by `factor` around (cx, cy) and moving
 * them by (dx, dy): the cell under the fingers stays under them.
 */
export function pinch(p: NonogramPuzzle, w: number, h: number, zoom: Zoom, cx: number, cy: number, factor: number, dx: number, dy: number): Zoom {
  const before = layout(p, w, h, zoom);
  const scale = Math.min(before.maxScale, Math.max(1, zoom.scale * factor));
  const u = (cx - before.gx) / before.cell;
  const v = (cy - before.gy) / before.cell;
  const after = layout(p, w, h, { scale, tx: 0, ty: 0 });
  const tx = cx + dx - u * after.cell - after.wx;
  const ty = cy + dy - v * after.cell - after.wy;
  return { scale, tx: Math.min(0, Math.max(after.minTx, tx)), ty: Math.min(0, Math.max(after.minTy, ty)) };
}

/** The cell under a point, or null if the point is in the clues. Points past the edge snap to it when `clamp` is set. */
export function cellAt(p: NonogramPuzzle, l: Layout, x: number, y: number, clamp = false): number | null {
  if (!clamp && (x < l.wx || y < l.wy)) return null;
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
  zoom: Zoom;
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
  w: number,
  h: number,
  theme: Theme,
  p: NonogramPuzzle,
  cells: number[],
  look: Look,
) {
  const l = layout(p, w, h, look.zoom);
  const { cell, wx, wy, gx, gy } = l;
  const gw = p.w * cell;
  const gh = p.h * cell;
  // The part of the board the grid shows through.
  const right = Math.min(w, gx + gw);
  const bottom = Math.min(h, gy + gh);

  const clipped = (x: number, y: number, cw: number, ch: number, paint: () => void) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cw, ch);
    ctx.clip();
    paint();
    ctx.restore();
  };

  // Lit lines run through the clues as well, so the eye can follow them.
  const lightUp = () => {
    ctx.fillStyle = theme.tintSame;
    for (const r of look.lit.rows) ctx.fillRect(0, gy + r * cell, w, cell);
    for (const c of look.lit.cols) ctx.fillRect(gx + c * cell, 0, cell, h);
  };
  clipped(0, wy, wx, bottom - wy, lightUp);
  clipped(wx, 0, right - wx, wy, lightUp);

  clipped(wx, wy, right - wx, bottom - wy, () => {
    ctx.fillStyle = theme.surface;
    ctx.fillRect(wx, wy, right - wx, bottom - wy);
    lightUp();

    const inset = Math.max(1, cell * 0.07);
    for (let i = 0; i < cells.length; i++) {
      const x = gx + (i % p.w) * cell;
      const y = gy + Math.floor(i / p.w) * cell;
      if (x + cell < wx || y + cell < wy || x > w || y > h) continue;
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
        ctx.fillText(String(n + 1), gx + ((i % p.w) + 0.5) * cell, gy + (Math.floor(i / p.w) + 0.54) * cell);
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
          const x = gx + k * cell + (k === 0 ? 1 : k === p.w ? -1 : 0);
          ctx.moveTo(x, gy);
          ctx.lineTo(x, gy + gh);
        }
        if (k <= p.h) {
          const y = gy + k * cell + (k === 0 ? 1 : k === p.h ? -1 : 0);
          ctx.moveTo(gx, y);
          ctx.lineTo(gx + gw, y);
        }
        ctx.stroke();
      }
    }
  });

  // Clues: row clues right-aligned against the grid, column clues stacked
  // down to it. Each set slides one way only, with its rows or columns.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = l.font;
  const clueColour = (done: boolean, impossible: boolean) => {
    ctx.globalAlpha = done && !impossible ? 0.4 : 1;
    return impossible ? theme.wrong : done ? theme.inkQuiet : theme.ink;
  };
  clipped(0, wy, wx, h - wy, () => {
    p.rows.forEach((clue, r) => {
      const y = gy + (r + 0.54) * cell;
      if (y < wy - cell || y > h + cell) return;
      ctx.font = `${look.impossible.rows.has(r) ? 700 : 600} ${fontSize}px ${FONT}`;
      ctx.fillStyle = clueColour(look.done.rows.has(r), look.impossible.rows.has(r));
      clue.forEach((n, k) => {
        const fromRight = clue.length - 1 - k;
        ctx.fillText(String(n), wx - (fromRight + 0.5) * l.stepX - cell * 0.1, y);
      });
    });
  });
  clipped(wx, 0, w - wx, wy, () => {
    p.cols.forEach((clue, c) => {
      const x = gx + (c + 0.5) * cell;
      if (x < wx - cell || x > w + cell) return;
      ctx.font = `${look.impossible.cols.has(c) ? 700 : 600} ${fontSize}px ${FONT}`;
      ctx.fillStyle = clueColour(look.done.cols.has(c), look.impossible.cols.has(c));
      clue.forEach((n, k) => {
        const fromBottom = clue.length - 1 - k;
        ctx.fillText(String(n), x, wy - (fromBottom + 0.5) * l.stepY - cell * 0.08);
      });
    });
  });
  ctx.globalAlpha = 1;
}
