// Draws the arrow puzzle, and owns its geometry so drawing and touch agree.

import type { Theme } from '../../kit/Board';
import { DX, DY, head, ray, type Arrow, type ArrowsPuzzle } from './rules';

export interface Layout {
  cell: number;
  x0: number;
  y0: number;
}

export function layout(p: ArrowsPuzzle, w: number, h: number): Layout {
  const cell = Math.min(w / p.w, h / p.h);
  return { cell, x0: (w - p.w * cell) / 2, y0: (h - p.h * cell) / 2 };
}

export function cellAt(p: ArrowsPuzzle, l: Layout, x: number, y: number): number | null {
  const c = Math.floor((x - l.x0) / l.cell);
  const r = Math.floor((y - l.y0) / l.cell);
  return c < 0 || r < 0 || c >= p.w || r >= p.h ? null : r * p.w + c;
}

export interface Look {
  /** Arrows still on the board. */
  present: boolean[];
  /** Arrows sliding off: how far each has gone, in cells. */
  leaving: Map<number, number>;
  /** Arrows to paint in the accent colour (a hint) or red (a bump). */
  lit: Set<number>;
  red: Set<number>;
}

type Point = [number, number];

/** The stretch of a path between two positions along it, counted in points; ends are interpolated. */
function slice(path: Point[], from: number, to: number): Point[] {
  const at = (t: number): Point => {
    const i = Math.min(path.length - 2, Math.max(0, Math.floor(t)));
    const f = t - i;
    return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
  };
  const out: Point[] = [at(from)];
  for (let i = Math.floor(from) + 1; i < to; i++) out.push(path[i]);
  out.push(at(to));
  return out;
}

export function draw(ctx: CanvasRenderingContext2D, w: number, h: number, theme: Theme, p: ArrowsPuzzle, look: Look) {
  const l = layout(p, w, h);
  const { cell, x0, y0 } = l;
  const centre = (c: number): Point => [x0 + ((c % p.w) + 0.5) * cell, y0 + (Math.floor(c / p.w) + 0.5) * cell];

  // A dot on every cell, so the board keeps its shape as it empties.
  ctx.fillStyle = theme.line;
  for (let c = 0; c < p.w * p.h; c++) {
    const [x, y] = centre(c);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, cell * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }

  const paint = (a: Arrow, colour: string, moved: number) => {
    // The arrow's own cells, then the line ahead of it and on past the edge.
    const path = a.cells.map(centre);
    const [hx, hy] = centre(head(a));
    const reach = ray(p.w, p.h, head(a), a.dir).length + a.cells.length + 2;
    for (let k = 1; k <= reach; k++) path.push([hx + DX[a.dir] * k * cell, hy + DY[a.dir] * k * cell]);
    const body = a.cells.length === 1 && moved === 0 ? [path[0], path[0]] : slice(path, moved, moved + a.cells.length - 1);
    const tip = body[body.length - 1];
    // Which way the head points now: along the last stretch it has travelled.
    const before = body.length > 1 ? body[body.length - 2] : tip;
    let ux = tip[0] - before[0];
    let uy = tip[1] - before[1];
    const len = Math.hypot(ux, uy);
    if (len < 0.01) [ux, uy] = [DX[a.dir], DY[a.dir]];
    else [ux, uy] = [ux / len, uy / len];

    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineWidth = cell * 0.24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // A one-cell arrow gets a short stub of a tail.
    if (a.cells.length === 1 && moved === 0) ctx.moveTo(tip[0] - ux * cell * 0.3, tip[1] - uy * cell * 0.3);
    else ctx.moveTo(body[0][0], body[0][1]);
    for (const [x, y] of body.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();

    const a0 = cell * 0.4;
    const half = cell * 0.3;
    ctx.beginPath();
    ctx.moveTo(tip[0] + ux * a0, tip[1] + uy * a0);
    ctx.lineTo(tip[0] - ux * cell * 0.08 - uy * half, tip[1] - uy * cell * 0.08 + ux * half);
    ctx.lineTo(tip[0] - ux * cell * 0.08 + uy * half, tip[1] - uy * cell * 0.08 - ux * half);
    ctx.closePath();
    ctx.fill();
  };

  p.arrows.forEach((a, i) => {
    const moved = look.leaving.get(i);
    if (!look.present[i] && moved === undefined) return;
    paint(a, look.red.has(i) ? theme.wrong : look.lit.has(i) ? theme.accent : theme.ink, moved ?? 0);
  });
}
