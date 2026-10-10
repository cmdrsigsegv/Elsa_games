// Draws the sudoku grid. Nothing here decides anything; it only paints the
// puzzle, the state, and what the screen wants highlighted.

import type { Theme } from '../../kit/Board';
import type { SudokuPuzzle } from './generate';
import { CELLS, SEES, bit, colOf, rowOf } from './grid';
import type { SudokuState } from './rules';

export interface Look {
  selected: number | null;
  /** The cell a hint is pointing at. */
  hinted: number | null;
  /** Cells to paint as mistakes. */
  wrong: Set<number>;
  highlightSame: boolean;
}

const FONT = "system-ui, 'Segoe UI', Roboto, sans-serif";

export function draw(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: Theme,
  p: SudokuPuzzle,
  s: SudokuState,
  look: Look,
) {
  const cell = size / 9;
  const x = (i: number) => colOf(i) * cell;
  const y = (i: number) => rowOf(i) * cell;

  ctx.fillStyle = theme.surface;
  ctx.fillRect(0, 0, size, size);

  // Highlights: the selected cell's row, column and box, then matching numbers.
  const sel = look.selected;
  const selDigit = sel !== null ? s.values[sel] : 0;
  for (let i = 0; i < CELLS; i++) {
    let tint: string | null = null;
    if (sel !== null && SEES[sel * CELLS + i]) tint = theme.tintPeer;
    if (look.highlightSame && selDigit && s.values[i] === selDigit) tint = theme.tintSame;
    if (i === sel) tint = theme.tintSelected;
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(x(i), y(i), cell, cell);
    }
  }

  // Numbers and notes.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < CELLS; i++) {
    const d = s.values[i];
    if (d) {
      const given = p.givens[i] !== 0;
      ctx.font = `${given ? 600 : 500} ${cell * 0.6}px ${FONT}`;
      ctx.fillStyle = given ? theme.ink : look.wrong.has(i) ? theme.wrong : theme.accent;
      ctx.fillText(String(d), x(i) + cell / 2, y(i) + cell * 0.54);
    } else if (s.notes[i]) {
      ctx.font = `500 ${cell * 0.25}px ${FONT}`;
      for (let n = 1; n <= 9; n++) {
        if (!(s.notes[i] & bit(n))) continue;
        const strong = look.highlightSame && n === selDigit;
        ctx.fillStyle = strong ? theme.accent : theme.inkQuiet;
        const nx = x(i) + cell * (0.2 + 0.3 * ((n - 1) % 3));
        const ny = y(i) + cell * (0.21 + 0.3 * (((n - 1) / 3) | 0));
        ctx.fillText(String(n), nx, ny);
      }
    }
  }

  // Grid lines: thin between cells, strong between boxes and round the edge.
  for (let k = 0; k <= 9; k++) {
    const strong = k % 3 === 0;
    ctx.strokeStyle = strong ? theme.lineStrong : theme.line;
    ctx.lineWidth = strong ? 2 : 1;
    const at = Math.min(size - 1, Math.max(1, k * cell));
    ctx.beginPath();
    ctx.moveTo(at, 0);
    ctx.lineTo(at, size);
    ctx.moveTo(0, at);
    ctx.lineTo(size, at);
    ctx.stroke();
  }

  for (const [i, colour] of [
    [sel, theme.accent],
    [look.hinted, theme.accent],
  ] as const) {
    if (i === null) continue;
    ctx.strokeStyle = colour;
    ctx.lineWidth = i === look.hinted ? 4 : 2.5;
    ctx.strokeRect(x(i) + 1.5, y(i) + 1.5, cell - 3, cell - 3);
  }
}
