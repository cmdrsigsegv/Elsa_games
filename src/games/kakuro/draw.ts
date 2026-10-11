// Draws the kakuro grid. Nothing here decides anything; it only paints the
// puzzle, the state, and what the screen wants highlighted.

import type { Theme } from '../../kit/Board';
import type { KakuroPuzzle } from './generate';
import { bit } from './layout';
import { isWhite, runMates, type Breaks, type KakuroState } from './rules';

export interface Look {
  selected: number | null;
  /** What to paint as breaking the rules. */
  breaks: Breaks;
}

const FONT = "system-ui, 'Segoe UI', Roboto, sans-serif";

export function draw(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: Theme,
  p: KakuroPuzzle,
  s: KakuroState,
  look: Look,
) {
  const n = p.size;
  const cell = size / n;
  const x = (i: number) => (i % n) * cell;
  const y = (i: number) => ((i / n) | 0) * cell;

  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, size, size);

  // Highlights: the two runs through the selected cell, then the cell itself.
  const sel = look.selected;
  if (sel !== null) {
    for (const i of runMates(p, sel)) {
      ctx.fillStyle = i === sel ? theme.tintSelected : theme.tintPeer;
      ctx.fillRect(x(i), y(i), cell, cell);
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const repeated = new Set(look.breaks.repeats);
  const badAcross = new Set(look.breaks.across);
  const badDown = new Set(look.breaks.down);

  for (let i = 0; i < n * n; i++) {
    const left = x(i);
    const top = y(i);
    if (isWhite(p, i)) {
      const d = s.values[i];
      if (d) {
        ctx.font = `500 ${cell * 0.62}px ${FONT}`;
        ctx.fillStyle = repeated.has(i) ? theme.wrong : theme.accent;
        ctx.fillText(String(d), left + cell / 2, top + cell * 0.54);
      } else if (s.notes[i]) {
        ctx.font = `500 ${cell * 0.27}px ${FONT}`;
        ctx.fillStyle = theme.inkQuiet;
        for (let k = 1; k <= 9; k++) {
          if (!(s.notes[i] & bit(k))) continue;
          const nx = left + cell * (0.2 + 0.3 * ((k - 1) % 3));
          const ny = top + cell * (0.21 + 0.3 * (((k - 1) / 3) | 0));
          ctx.fillText(String(k), nx, ny);
        }
      }
      continue;
    }

    // A black cell: the clue for the run below it sits bottom left, the clue
    // for the run to its right top right, with a diagonal between them.
    ctx.fillStyle = theme.lineStrong;
    ctx.fillRect(left, top, cell, cell);
    const across = p.across[i];
    const down = p.down[i];
    if (!across && !down) continue;
    // A clue whose run cannot come out right has its half of the cell painted red.
    ctx.fillStyle = theme.wrong;
    if (across && badAcross.has(i)) triangle(ctx, left, top, left + cell, top, left + cell, top + cell);
    if (down && badDown.has(i)) triangle(ctx, left, top, left, top + cell, left + cell, top + cell);
    ctx.strokeStyle = theme.surface;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left + cell, top + cell);
    ctx.stroke();
    ctx.font = `600 ${cell * 0.36}px ${FONT}`;
    ctx.fillStyle = theme.surface;
    if (across) ctx.fillText(String(across), left + cell * 0.69, top + cell * 0.31);
    if (down) ctx.fillText(String(down), left + cell * 0.31, top + cell * 0.73);
  }

  // Grid lines, over the black cells too: they keep neighbouring clues apart.
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= n; k++) {
    const at = Math.min(size - 0.5, Math.max(0.5, k * cell));
    ctx.moveTo(at, 0);
    ctx.lineTo(at, size);
    ctx.moveTo(0, at);
    ctx.lineTo(size, at);
  }
  ctx.stroke();

  if (sel !== null) {
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x(sel) + 1.5, y(sel) + 1.5, cell - 3, cell - 3);
  }
}

function triangle(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();
}
