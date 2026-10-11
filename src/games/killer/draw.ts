// Draws the killer sudoku grid. Nothing here decides anything; it only paints
// the puzzle, the state, and what the screen wants highlighted. Each cage is
// filled with its own colour, which reads far more easily on a phone than
// dashed outlines do.

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

/**
 * Cage colours. Each is laid thinly over the board's own background, so the
 * same six work in light and dark mode.
 */
const CAGE_TINTS = ['#e9a23b', '#4f9bd9', '#6fba5f', '#d96a8c', '#9a7bd6', '#3fb5ad'];
const TINT_STRENGTH = 0.27;

/**
 * Gives every cage a colour different from every cage it touches, so where
 * one cage ends and the next begins is plain without any outline.
 */
export function cageColours(p: KillerPuzzle): number[] {
  const cageOf = cageMap(p);
  const colours: number[] = [];
  p.cages.forEach((cage, c) => {
    const taken = new Set<number>();
    for (const i of cage.cells) {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const r = rowOf(i) + dr;
        const col = colOf(i) + dc;
        if (r < 0 || r > 8 || col < 0 || col > 8) continue;
        const other = cageOf[r * 9 + col];
        if (other < c) taken.add(colours[other]);
      }
    }
    // The least-used free colour, so the six are spread evenly over the board.
    const free = CAGE_TINTS.map((_, k) => k).filter((k) => !taken.has(k));
    const used = (k: number) => colours.filter((x) => x === k).length;
    colours.push(free.length ? free.sort((x, y) => used(x) - used(y))[0] : c % CAGE_TINTS.length);
  });
  return colours;
}

// The four sides of a cell, as the way out through each: [rows, columns].
const SIDES = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
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

  // Every cage in its colour.
  const cageOf = cageMap(p);
  const colours = cageColours(p);
  ctx.globalAlpha = TINT_STRENGTH;
  for (let i = 0; i < CELLS; i++) {
    ctx.fillStyle = CAGE_TINTS[colours[cageOf[i]]];
    ctx.fillRect(x(i), y(i), cell, cell);
  }
  ctx.globalAlpha = 1;

  // Highlights sit lightly on top of the colours: the selected cell's row,
  // column and box are shaded a little, and matching numbers a little more.
  const sel = look.selected;
  const selDigit = sel !== null ? s.values[sel] : 0;
  for (let i = 0; i < CELLS; i++) {
    let shade = 0;
    if (sel !== null && SEES[sel * CELLS + i]) shade = 0.07;
    if (look.highlightSame && selDigit && s.values[i] === selDigit) shade = 0.2;
    if (i === sel) shade = 0.16;
    if (!shade) continue;
    ctx.globalAlpha = shade;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(x(i), y(i), cell, cell);
  }
  ctx.globalAlpha = 1;

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

  // The cage the selected cell is in gets a firm outline, so its shape and its total are easy to pick out.
  if (sel !== null) {
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const i of p.cages[cageOf[sel]].cells) {
      for (const [dr, dc] of SIDES) {
        const r = rowOf(i) + dr;
        const c = colOf(i) + dc;
        if (r >= 0 && r < 9 && c >= 0 && c < 9 && cageOf[r * 9 + c] === cageOf[sel]) continue;
        // The side of the cell that faces out of the cage.
        const x0 = x(i) + (dc === 1 ? cell : 0);
        const y0 = y(i) + (dr === 1 ? cell : 0);
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + (dr !== 0 ? cell : 0), y0 + (dc !== 0 ? cell : 0));
      }
    }
    ctx.stroke();
  }

  // Each cage's total, in the corner of its first cell. The notes below keep
  // clear of that corner in every cell, so they line up from cell to cell.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `700 ${cell * 0.29}px ${FONT}`;
  ctx.fillStyle = theme.ink;
  for (const cage of p.cages) {
    const first = cage.cells[0];
    ctx.fillText(String(cage.sum), x(first) + cell * 0.07, y(first) + cell * 0.07);
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
        const ny = y(i) + cell * (0.47 + 0.19 * (((n - 1) / 3) | 0));
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

  if (look.hinted !== null) {
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(x(look.hinted) + 2, y(look.hinted) + 2, cell - 4, cell - 4);
  }
}
