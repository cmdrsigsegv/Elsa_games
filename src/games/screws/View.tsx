// The screw game's screen: the open boxes and spare holes along the top, and
// the stack of plates below. Tap a screw to take it out.
//
// A plate left on one screw swings down and settles, like a pendulum losing
// its swing; a plate with none drops off the bottom.

import { useEffect, useRef, useState } from 'preact/hooks';
import { Board, type Theme } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { pick } from '../../kit/words';
import {
  BOARD_H,
  BOARD_W,
  BOX_SIZE,
  OPEN_BOXES,
  covered,
  holding,
  lie,
  takeable,
  turned,
  type Point,
  type ScrewsMove,
  type ScrewsPuzzle,
  type ScrewsState,
} from './rules';
import { words } from './words';

type Props = ViewProps<ScrewsPuzzle, ScrewsState, ScrewsMove>;

/** Screw colours, far enough apart to tell at a glance. */
const COLOURS = ['#e04f4f', '#3f7fe0', '#4caf50', '#f0b429', '#9c5fd6', '#f07c2e', '#2bb5b5', '#e86aa6', '#7f8c99'];
/** Plate tints: see-through, so the screws underneath can be made out. */
const TINTS = ['#c9a27a', '#a9b8c6', '#b9c3a0', '#d2b6c4', '#c4bca8'];
const PLATE_ALPHA = 0.8;
/** How big a screw is drawn, and how near a tap must land, in board units. */
const SCREW_R = 3.4;
const TAP_R = 6;
/** How long a swing takes to die down and a fall takes to clear the board, in seconds. */
const SWING_S = 1.8;
const FALL_S = 0.7;
/** The strip above the board for boxes and spare holes, as a share of the canvas height. */
const TOP = 0.2;

/** A plate in motion: swinging round a screw to a new angle, or falling away. */
type Motion = { kind: 'swing'; pivot: Point; from: number; to: number; began: number } | { kind: 'fall'; pivot: Point | null; from: number; began: number };

function layout(w: number, h: number) {
  const top = h * TOP;
  const scale = Math.min(w / BOARD_W, (h - top) / BOARD_H);
  return { top, scale, x0: (w - BOARD_W * scale) / 2, y0: top + (h - top - BOARD_H * scale) / 2 };
}

function screw(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.stroke();
  // The slot in its head.
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.5);
  ctx.lineTo(x + r * 0.5, y + r * 0.5);
  ctx.moveTo(x + r * 0.5, y - r * 0.5);
  ctx.lineTo(x - r * 0.5, y + r * 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function View({ puzzle, state, ended, play, undo, canUndo }: Props) {
  const w = pick(words);
  const motions = useRef(new Map<number, Motion>());
  const seen = useRef(state);
  const [, frame] = useState(0);
  const [note, setNote] = useState<{ text: string; at: ScrewsState } | null>(null);

  // Compare with the state last drawn: a plate that has just lost a screw starts to swing or fall.
  if (seen.current !== state) {
    const now = performance.now();
    puzzle.plates.forEach((_, plate) => {
      const was = lie(puzzle, seen.current.out, plate);
      const is = lie(puzzle, state.out, plate);
      if (state.moves < seen.current.moves) motions.current.delete(plate); // an undo puts it straight back
      else if (was && !is) motions.current.set(plate, { kind: 'fall', pivot: was.pivot, from: was.angle, began: now });
      else if (was && is && is.pivot && was.angle !== is.angle) motions.current.set(plate, { kind: 'swing', pivot: is.pivot, from: was.angle, to: is.angle, began: now });
    });
    seen.current = state;
  }

  const now = performance.now();
  for (const [plate, m] of motions.current) {
    if ((now - m.began) / 1000 > (m.kind === 'swing' ? SWING_S : FALL_S)) motions.current.delete(plate);
  }
  const busy = motions.current.size > 0;
  useEffect(() => {
    if (!busy) return;
    const id = requestAnimationFrame(() => frame((n) => n + 1));
    return () => cancelAnimationFrame(id);
  });

  const draw = (ctx: CanvasRenderingContext2D, cw: number, ch: number, theme: Theme) => {
    const l = layout(cw, ch);
    const X = (x: number) => l.x0 + x * l.scale;
    const Y = (y: number) => l.y0 + y * l.scale;

    // The open boxes, the boxes to come, and the spare holes.
    const hole = Math.min(l.top * 0.17, cw / 24);
    const boxW = hole * 2.6 * BOX_SIZE + hole;
    const row1 = l.top * 0.3;
    // The boxes sit a little left of centre, leaving the right edge for the queue.
    const mid = cw / 2 - hole * 1.2;
    for (let b = 0; b < OPEN_BOXES; b++) {
      const box = state.open[b];
      const bx = mid + (b - OPEN_BOXES / 2) * (boxW + hole) + hole / 2;
      ctx.fillStyle = box ? COLOURS[box.colour] : theme.tintPeer;
      ctx.globalAlpha = box ? 0.28 : 1;
      ctx.beginPath();
      ctx.roundRect(bx, row1 - hole * 1.5, boxW, hole * 3, hole * 0.6);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (!box) continue;
      ctx.strokeStyle = COLOURS[box.colour];
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let k = 0; k < BOX_SIZE; k++) {
        const hx = bx + hole * 1.8 + k * hole * 2.6;
        if (k < box.filled) screw(ctx, hx, row1, hole, COLOURS[box.colour]);
        else {
          ctx.fillStyle = theme.surface;
          ctx.beginPath();
          ctx.arc(hx, row1, hole * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // The next few boxes, small, to the right.
    puzzle.boxes.slice(state.opened, state.opened + 3).forEach((colour, k) => {
      ctx.fillStyle = COLOURS[colour];
      ctx.globalAlpha = 0.9 - k * 0.25;
      ctx.beginPath();
      ctx.roundRect(cw - hole * 1.8, row1 - hole * 1.5 + k * hole * 1.1, hole * 1.5, hole * 0.8, hole * 0.2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    const row2 = l.top * 0.74;
    for (let k = 0; k < puzzle.holes; k++) {
      const hx = cw / 2 + (k - (puzzle.holes - 1) / 2) * hole * 2.6;
      ctx.fillStyle = theme.tintPeer;
      ctx.beginPath();
      ctx.arc(hx, row2, hole * 0.95, 0, Math.PI * 2);
      ctx.fill();
      if (k < state.spare.length) screw(ctx, hx, row2, hole * 0.85, COLOURS[state.spare[k]]);
    }

    // The board, then each plate from the bottom of the stack up, with its screws on it.
    ctx.fillStyle = theme.surface;
    ctx.beginPath();
    ctx.roundRect(X(0), Y(0), BOARD_W * l.scale, BOARD_H * l.scale, 10);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, l.top, cw, ch - l.top);
    ctx.clip();
    puzzle.plates.forEach((plate, i) => {
      const rest = lie(puzzle, state.out, i);
      const m = motions.current.get(i);
      let outline: Point[] | null = rest ? rest.outline : null;
      let drop = 0;
      if (m) {
        const t = (now - m.began) / 1000;
        if (m.kind === 'swing') {
          // Swings past where it will hang, and back, less each time.
          const angle = m.to + (m.from - m.to) * Math.exp(-2.6 * t) * Math.cos(7 * t);
          outline = turned(plate.outline, m.pivot, angle);
        } else {
          outline = m.pivot ? turned(plate.outline, m.pivot, m.from + t * 1.5) : plate.outline;
          drop = 260 * t * t;
        }
      }
      if (!outline) return;
      ctx.beginPath();
      outline.forEach(([x, y], k) => (k ? ctx.lineTo(X(x), Y(y + drop)) : ctx.moveTo(X(x), Y(y + drop))));
      ctx.closePath();
      ctx.globalAlpha = PLATE_ALPHA;
      ctx.fillStyle = TINTS[plate.tint % TINTS.length];
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.lineStrong;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
      for (const s of holding(puzzle, state.out, i)) {
        const [x, y] = puzzle.screws[s].at;
        screw(ctx, X(x), Y(y), SCREW_R * l.scale, COLOURS[puzzle.screws[s].colour]);
      }
    });
    ctx.restore();
  };

  const tap = (x: number, y: number, cw: number, ch: number) => {
    if (ended) return;
    const l = layout(cw, ch);
    const bx = (x - l.x0) / l.scale;
    const by = (y - l.y0) / l.scale;
    // The nearest screw to the tap, preferring one that is not under a plate.
    let best = -1;
    let bestD = TAP_R;
    puzzle.screws.forEach((s, i) => {
      if (state.out[i]) return;
      const d = Math.hypot(s.at[0] - bx, s.at[1] - by) + (covered(puzzle, state.out, i) ? TAP_R * 0.5 : 0);
      if (d < bestD) [best, bestD] = [i, d];
    });
    if (best < 0) return;
    if (takeable(puzzle, state, best)) {
      setNote(null);
      play({ screw: best });
    } else {
      setNote({ text: covered(puzzle, state.out, best) ? w.covered : w.noRoom, at: state });
    }
  };

  return (
    <div class="screws">
      <div class="board-area">
        <Board tall label={w.name} onStroke={(phase, x, y, cw, ch) => phase === 'start' && tap(x, y, cw, ch)} draw={draw} />
      </div>

      <p class="message" aria-live="polite">
        {note && note.at === state ? note.text : w.left(state.out.filter((gone) => !gone).length)}
      </p>

      <div class="tools one">
        <button type="button" disabled={!canUndo || ended} onClick={undo}>
          {w.undo}
        </button>
      </div>
    </div>
  );
}
