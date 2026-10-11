// Draws the Binairo grid. Nothing here decides anything; it only paints the
// puzzle, the state, and the cells the screen wants marked.

import type { Theme } from '../../kit/Board';
import { DARK, type BinairoPuzzle, type BinairoState } from './rules';

export function draw(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: Theme,
  p: BinairoPuzzle,
  s: BinairoState,
  /** Cells that are part of a visible rule break. */
  marked: Set<number>,
) {
  const n = p.size;
  const cell = size / n;

  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < n * n; i++) {
    const x = (i % n) * cell;
    const y = ((i / n) | 0) * cell;
    const given = p.givens[i] !== 0;

    // A given cell is shaded, so it reads as part of the board and not hers to change.
    if (given) {
      ctx.fillStyle = theme.tintPeer;
      ctx.fillRect(x, y, cell, cell);
    }
    if (marked.has(i)) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = theme.wrong;
      ctx.fillRect(x, y, cell, cell);
      ctx.globalAlpha = 1;
    }

    const v = s.cells[i];
    if (!v) continue;
    // Filled against hollow tells the two kinds apart in light and dark mode
    // alike. Her own circles take the accent colour, the givens the ink.
    const colour = given ? theme.ink : theme.accent;
    const ring = cell * 0.09;
    ctx.beginPath();
    ctx.arc(x + cell / 2, y + cell / 2, cell * 0.32 - (v === DARK ? 0 : ring / 2), 0, Math.PI * 2);
    if (v === DARK) {
      ctx.fillStyle = colour;
      ctx.fill();
    } else {
      ctx.fillStyle = theme.surface;
      ctx.fill();
      ctx.strokeStyle = colour;
      ctx.lineWidth = ring;
      ctx.stroke();
    }
  }

  // Grid lines: thin between cells, strong round the edge.
  for (let k = 0; k <= n; k++) {
    const edge = k === 0 || k === n;
    ctx.strokeStyle = edge ? theme.lineStrong : theme.line;
    ctx.lineWidth = edge ? 2 : 1;
    const at = Math.min(size - 1, Math.max(1, k * cell));
    ctx.beginPath();
    ctx.moveTo(at, 0);
    ctx.lineTo(at, size);
    ctx.moveTo(0, at);
    ctx.lineTo(size, at);
    ctx.stroke();
  }
}
