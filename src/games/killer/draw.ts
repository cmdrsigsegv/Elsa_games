// Draws the killer sudoku grid. Nothing here decides anything; it only paints
// the puzzle, the state, and what the screen wants highlighted.

import type { Theme } from '../../kit/Board';
import { CELLS, SEES, bit, colOf, rowOf } from '../sudoku/grid';
import { cageMap, type KillerPuzzle, type KillerState } from './rules';

export interface Look {
  selected: number | null;
  /** The cell a hint is pointing at. */
  hinted: number | null;
  /** Cells to paint as mistakes. */
  wrong: Set<number>;
  /** When the slips are being shown: wrong cells in the order they were entered. */
  slips: number[];
  highlightSame: boolean;
}

const FONT = "system-ui, 'Segoe UI', Roboto, sans-serif";

/** How far inside its cells a cage's outline runs, as a share of a cell. */
const INSET = 0.075;

// The four sides of a cell: the way out through the side, and the way along
// it, each as [rows, columns].
const SIDES = [
  { out: [-1, 0], along: [0, 1] },
  { out: [1, 0], along: [0, 1] },
  { out: [0, -1], along: [1, 0] },
  { out: [0, 1], along: [1, 0] },
];

export function draw(
  ctx: CanvasRenderingContext2D,
  size: number,
  theme: Theme,
  p: KillerPuzzle,
  s: KillerState,
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

  // Cage outlines: a dashed line a little inside the cells, along every side
  // of a cell that has no cage-mate beyond it.
  const cageOf = cageMap(p);
  const mate = (i: number, dr: number, dc: number) => {
    const r = rowOf(i) + dr;
    const c = colOf(i) + dc;
    return r >= 0 && r < 9 && c >= 0 && c < 9 && cageOf[r * 9 + c] === cageOf[i];
  };
  const half = cell / 2;
  const inset = cell * INSET;
  ctx.strokeStyle = theme.inkQuiet;
  ctx.lineWidth = 1;
  ctx.setLineDash([cell * 0.07, cell * 0.05]);
  ctx.beginPath();
  for (let i = 0; i < CELLS; i++) {
    for (const { out, along } of SIDES) {
      if (mate(i, out[0], out[1])) continue;
      // The middle of this side's line.
      const mx = x(i) + half + out[1] * (half - inset);
      const my = y(i) + half + out[0] * (half - inset);
      // Where the line stops at each end: short of the cell's edge at an
      // outward corner of the cage, at the edge where the outline carries
      // straight on into the next cell, and past it at an inward corner, to
      // meet the line that turns there.
      const reach = (dir: number) => {
        if (!mate(i, dir * along[0], dir * along[1])) return dir * (half - inset);
        return dir * (mate(i, dir * along[0] + out[0], dir * along[1] + out[1]) ? half + inset : half);
      };
      const [from, to] = [reach(-1), reach(1)];
      ctx.moveTo(mx + from * along[1], my + from * along[0]);
      ctx.lineTo(mx + to * along[1], my + to * along[0]);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Each cage's total, in the corner of its first cell. The notes below keep
  // clear of that corner in every cell, so they line up from cell to cell.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `600 ${cell * 0.21}px ${FONT}`;
  ctx.fillStyle = theme.ink;
  for (const cage of p.cages) {
    const first = cage.cells[0];
    ctx.fillText(String(cage.sum), x(first) + cell * 0.11, y(first) + cell * 0.1);
  }

  // Numbers and notes.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < CELLS; i++) {
    const d = s.values[i];
    if (d) {
      ctx.font = `500 ${cell * 0.56}px ${FONT}`;
      ctx.fillStyle = look.wrong.has(i) ? theme.wrong : theme.accent;
      ctx.fillText(String(d), x(i) + cell / 2, y(i) + cell * 0.58);
    } else if (s.notes[i]) {
      ctx.font = `500 ${cell * 0.2}px ${FONT}`;
      for (let n = 1; n <= 9; n++) {
        if (!(s.notes[i] & bit(n))) continue;
        const strong = look.highlightSame && n === selDigit;
        ctx.fillStyle = strong ? theme.accent : theme.inkQuiet;
        const nx = x(i) + cell * (0.25 + 0.25 * ((n - 1) % 3));
        const ny = y(i) + cell * (0.43 + 0.2 * (((n - 1) / 3) | 0));
        ctx.fillText(String(n), nx, ny);
      }
    }
  }

  // The order the slips were made in, small in the corner the total does not
  // use: 1 is where it went wrong.
  if (look.slips.length > 1) {
    ctx.font = `700 ${cell * 0.22}px ${FONT}`;
    ctx.fillStyle = theme.wrong;
    look.slips.forEach((i, n) => ctx.fillText(String(n + 1), x(i) + cell * 0.8, y(i) + cell * 0.22));
  }

  for (const i of [sel, look.hinted]) {
    if (i === null) continue;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = i === look.hinted ? 4 : 2.5;
    ctx.strokeRect(x(i) + 1.5, y(i) + 1.5, cell - 3, cell - 3);
  }
}
