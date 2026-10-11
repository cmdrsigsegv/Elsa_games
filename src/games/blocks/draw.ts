// Draws the block game: the board above, the three dealt pieces below, and
// the piece being dragged. Also owns the geometry, so drawing and touch agree.

import type { Theme } from '../../kit/Board';
import { PIECES, SIZE, fits, fullLines, placed, type BlocksState, type Piece } from './rules';

/** Piece colours; chosen to read on both the light and the dark background. */
const COLOURS = ['#4f8fdb', '#e0823d', '#55ad66', '#d65a6f', '#9a6fd8', '#cfa62f'];

export interface Layout {
  /** The board: its top-left corner and the size of one cell. */
  x0: number;
  y0: number;
  cell: number;
  /** The tray: where it starts, how wide each of its three slots is, and its smaller cell size. */
  trayY: number;
  slotW: number;
  trayCell: number;
}

export function layout(w: number, h: number): Layout {
  const board = Math.min(w, h * 0.7);
  const cell = board / SIZE;
  const trayY = board + cell * 0.4;
  const slotW = w / 3;
  const trayCell = Math.max(4, Math.min(cell * 0.6, (slotW - 12) / 5, (h - trayY - 8) / 5));
  return { x0: (w - board) / 2, y0: 0, cell, trayY, slotW, trayCell };
}

/** Which tray slot a point is in, or null if it is on the board. */
export function slotAt(l: Layout, x: number, y: number): number | null {
  return y < l.trayY - l.cell * 0.2 ? null : Math.min(2, Math.max(0, Math.floor(x / l.slotW)));
}

/**
 * Where a dragged piece sits: it floats above the finger so the finger does
 * not hide it. Returns its top-left corner in pixels and the board cell that
 * corner is nearest.
 */
export function dragged(l: Layout, piece: Piece, fx: number, fy: number) {
  const px = fx - (piece.w * l.cell) / 2;
  const py = fy - l.cell * 1.3 - piece.h * l.cell;
  return { px, py, x: Math.round((px - l.x0) / l.cell), y: Math.round((py - l.y0) / l.cell) };
}

export interface Look {
  /** The piece being dragged: its tray slot and where the finger is. */
  drag: { slot: number; x: number; y: number } | null;
}

export function draw(ctx: CanvasRenderingContext2D, w: number, h: number, theme: Theme, s: BlocksState, look: Look) {
  const l = layout(w, h);
  const { x0, y0, cell } = l;

  const block = (x: number, y: number, size: number, colour: string, alpha = 1) => {
    const gap = Math.max(1, size * 0.06);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(x + gap, y + gap, size - 2 * gap, size - 2 * gap, size * 0.16);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // Where the dragged piece would land, and the lines that would clear.
  const piece = look.drag && s.tray[look.drag.slot] !== null ? PIECES[s.tray[look.drag.slot]!] : null;
  const at = piece && look.drag ? dragged(l, piece, look.drag.x, look.drag.y) : null;
  const lands = piece && at && fits(s.board, piece, at.x, at.y);
  const clearing = lands ? fullLines(placed(s.board, piece!, at!.x, at!.y)) : { rows: [], cols: [] };

  ctx.fillStyle = theme.surface;
  ctx.beginPath();
  ctx.roundRect(x0, y0, cell * SIZE, cell * SIZE, cell * 0.2);
  ctx.fill();
  for (let i = 0; i < SIZE * SIZE; i++) {
    const c = i % SIZE;
    const r = Math.floor(i / SIZE);
    const goes = clearing.rows.includes(r) || clearing.cols.includes(c);
    if (s.board[i]) block(x0 + c * cell, y0 + r * cell, cell, COLOURS[s.board[i] - 1], goes ? 0.45 : 1);
    else block(x0 + c * cell, y0 + r * cell, cell, goes ? theme.tintSelected : theme.tintPeer);
  }
  if (lands) for (const [cx, cy] of piece!.cells) block(x0 + (at!.x + cx) * cell, y0 + (at!.y + cy) * cell, cell, COLOURS[piece!.colour], 0.45);

  // The tray: each piece small and centred in its slot.
  s.tray.forEach((index, slot) => {
    if (index === null || look.drag?.slot === slot) return;
    const p = PIECES[index];
    const tx = slot * l.slotW + (l.slotW - p.w * l.trayCell) / 2;
    const ty = l.trayY + (h - l.trayY - p.h * l.trayCell) / 2;
    for (const [cx, cy] of p.cells) block(tx + cx * l.trayCell, ty + cy * l.trayCell, l.trayCell, COLOURS[p.colour], s.over ? 0.4 : 1);
  });

  if (piece && at) for (const [cx, cy] of piece.cells) block(at.px + cx * cell, at.py + cy * cell, cell, COLOURS[piece.colour], 0.92);
}
