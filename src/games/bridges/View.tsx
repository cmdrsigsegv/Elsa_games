// The Bridges screen: the islands, how many are still to do, and Undo. A tap
// on the water between two facing islands, or a drag from one island towards
// the other, changes their link: no bridge, one, two, and round again.

import { useRef, useState } from 'preact/hooks';
import { Board, type Theme } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { pick } from '../../kit/words';
import { across, blocked, counts, type BridgesMove, type BridgesPuzzle, type BridgesState } from './rules';
import { words } from './words';

type Props = ViewProps<BridgesPuzzle, BridgesState, BridgesMove>;

/** Sizes as a share of one grid cell. */
const ISLAND = 0.42;
/** How far from a link a tap still counts for it. Wide, because the largest grid has cells of about 33 px. */
const TAP_REACH = 0.6;
/** How far from an island's middle a drag may start and still be that island's. */
const GRAB_REACH = 0.75;
/** A touch that moves less than this is a tap, not a drag. */
const DRAG_START = 0.35;

/** Where the grid sits on the board: the size of a cell, and the top left corner. */
interface Layout {
  cell: number;
  left: number;
  top: number;
}

function layout(p: BridgesPuzzle, w: number, h: number): Layout {
  const cell = Math.min(w / p.cols, h / p.rows);
  return { cell, left: (w - cell * p.cols) / 2, top: (h - cell * p.rows) / 2 };
}

const middle = (g: Layout, at: { x: number; y: number }): [number, number] => [g.left + (at.x + 0.5) * g.cell, g.top + (at.y + 0.5) * g.cell];

/** The island nearest a point, if it is within `reach` cells of it. */
function islandNear(p: BridgesPuzzle, g: Layout, x: number, y: number, reach: number): number {
  let best = -1;
  let bestFar = reach * g.cell;
  p.islands.forEach((island, i) => {
    const [cx, cy] = middle(g, island);
    const far = Math.hypot(x - cx, y - cy);
    if (far < bestFar) {
      best = i;
      bestFar = far;
    }
  });
  return best;
}

/** The link a tap on the water means: the nearest one that can be changed. */
function linkNear(p: BridgesPuzzle, g: Layout, bridges: number[], x: number, y: number): number {
  let best = -1;
  let bestFar = TAP_REACH * g.cell;
  p.links.forEach((link, i) => {
    // Where two links cross and one is bridged, the tap can only mean that one.
    if (!bridges[i] && blocked(p, bridges, i)) return;
    const [ax, ay] = middle(g, p.islands[link.a]);
    const [bx, by] = middle(g, p.islands[link.b]);
    const far = Math.hypot(x - Math.min(bx, Math.max(ax, x)), y - Math.min(by, Math.max(ay, y)));
    if (far < bestFar) {
      best = i;
      bestFar = far;
    }
  });
  return best;
}

/** The link that leaves an island in the direction of a drag. */
function linkToward(p: BridgesPuzzle, island: number, dx: number, dy: number): number {
  const sideways = Math.abs(dx) > Math.abs(dy);
  const forward = (sideways ? dx : dy) > 0;
  // A link's `a` is its left or top island, so from `a` it runs right or down.
  return p.links.findIndex((link) => across(p.islands, link) === sideways && (forward ? link.a : link.b) === island);
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, theme: Theme, p: BridgesPuzzle, bridges: number[], held: number | null) {
  const g = layout(p, w, h);
  const have = counts(p, bridges);
  ctx.lineCap = 'round';

  // While an island is held, the ways out of it show faintly.
  if (held !== null) {
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = g.cell * 0.2;
    p.links.forEach((link, i) => {
      if ((link.a !== held && link.b !== held) || (!bridges[i] && blocked(p, bridges, i))) return;
      ctx.beginPath();
      ctx.moveTo(...middle(g, p.islands[link.a]));
      ctx.lineTo(...middle(g, p.islands[link.b]));
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = Math.max(2, g.cell * 0.07);
  p.links.forEach((link, i) => {
    if (!bridges[i]) return;
    const [ax, ay] = middle(g, p.islands[link.a]);
    const [bx, by] = middle(g, p.islands[link.b]);
    // A double bridge is two lines side by side.
    const gap = bridges[i] === 2 ? g.cell * 0.1 : 0;
    const [ox, oy] = across(p.islands, link) ? [0, gap] : [gap, 0];
    for (const side of bridges[i] === 2 ? [-1, 1] : [0]) {
      ctx.beginPath();
      ctx.moveTo(ax + ox * side, ay + oy * side);
      ctx.lineTo(bx + ox * side, by + oy * side);
      ctx.stroke();
    }
  });

  ctx.font = `600 ${g.cell * 0.46}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  p.islands.forEach((island, i) => {
    const [cx, cy] = middle(g, island);
    const done = have[i] === island.need;
    const over = have[i] > island.need;
    ctx.beginPath();
    ctx.arc(cx, cy, g.cell * ISLAND, 0, Math.PI * 2);
    ctx.fillStyle = done ? theme.tintPeer : theme.surface;
    ctx.fill();
    ctx.strokeStyle = i === held ? theme.accent : over ? theme.wrong : done ? theme.line : theme.lineStrong;
    ctx.lineWidth = i === held || over ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = over ? theme.wrong : done ? theme.inkQuiet : theme.ink;
    ctx.fillText(String(island.need), cx, cy + g.cell * 0.03);
  });
}

export function View({ puzzle, state, ended, play, undo, canUndo }: Props) {
  const w = pick(words);
  const [held, setHeld] = useState<number | null>(null);
  /** Where the finger went down, and on which island, if any. */
  const touch = useRef<{ x: number; y: number; island: number } | null>(null);

  const have = counts(puzzle, state.bridges);
  const left = have.filter((n, i) => n !== puzzle.islands[i].need).length;

  const stroke = (phase: 'start' | 'move' | 'end' | 'cancel', x: number, y: number, width: number, height: number) => {
    if (ended) return;
    const g = layout(puzzle, width, height);
    if (phase === 'start') {
      const island = islandNear(puzzle, g, x, y, GRAB_REACH);
      touch.current = { x, y, island };
      setHeld(island < 0 ? null : island);
      return;
    }
    const from = touch.current;
    if (phase === 'move' || !from) return;
    touch.current = null;
    setHeld(null);
    if (phase === 'cancel') return;
    const dx = x - from.x;
    const dy = y - from.y;
    let link = -1;
    if (from.island >= 0 && Math.hypot(dx, dy) >= DRAG_START * g.cell) {
      link = linkToward(puzzle, from.island, dx, dy);
    } else if (islandNear(puzzle, g, from.x, from.y, ISLAND) < 0) {
      // A tap right on an island says nothing about which way; one on the water does.
      link = linkNear(puzzle, g, state.bridges, from.x, from.y);
    }
    if (link >= 0) play({ link });
  };

  return (
    <div class="bridges">
      <div class="board-area">
        <Board
          tall
          label={w.name}
          onStroke={stroke}
          draw={(ctx, width, height, theme) => draw(ctx, width, height, theme, puzzle, state.bridges, ended ? null : held)}
        />
      </div>

      <p class="message" aria-live="polite">
        {ended ? '' : left === 0 ? w.apart : w.left(left)}
      </p>

      <div class="tools one">
        <button type="button" disabled={!canUndo || ended} onClick={undo}>
          {w.undo}
        </button>
      </div>
    </div>
  );
}
