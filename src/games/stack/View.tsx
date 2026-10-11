// The block game's screen: the score and her best, the blocks about to drop,
// and the well. A block is dragged sideways and settles on the nearest column.
//
// What follows a move is played back a step at a time: blocks fall, a full
// row flashes and bursts, and each further link in a chain is shown bigger
// than the last, with time to see it.

import { useEffect, useRef, useState } from 'preact/hooks';
import { Board, type Theme } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { t } from '../../shell/strings';
import { EASIEST_LEVEL } from '../../kit/progress';
import { load, save } from '../../storage/kv';
import { H, W, cover, play as playMove, reach, type Block, type Coming, type Frame, type StackMove, type StackPuzzle, type StackState } from './rules';

type Props = ViewProps<StackPuzzle, StackState, StackMove>;

/** Block colours; chosen to read on both the light and the dark background. */
const COLOURS = ['#4f8fdb', '#e0823d', '#55ad66', '#d65a6f', '#9a6fd8', '#cfa62f'];
/** The blocks about to drop wait in a strip this many cells tall above the well. */
const STRIP = 1.3;
/** How long each step of the playback lasts, in milliseconds. A clear lasts longer the further along its chain. */
const FALL_MS = 150;
const CLEAR_MS = 420;
const CLEAR_EXTRA_MS = 160;

interface Drag {
  id: number;
  /** Where on the block the finger took hold, in cells from its left end. */
  grip: number;
  lo: number;
  hi: number;
  col: number;
}

/** A playback in progress: the blocks before the move, the steps since, and when it began. */
interface Playback {
  from: Block[];
  frames: Frame[];
  began: number;
}

const lasts = (f: Frame) => (f.kind === 'move' ? FALL_MS : CLEAR_MS + CLEAR_EXTRA_MS * (f.chain - 1));

function layout(w: number, h: number) {
  const cell = Math.min(w / W, h / (H + STRIP));
  return { cell, x0: (w - cell * W) / 2, y0: cell * STRIP };
}

interface Scene {
  blocks: Block[];
  coming: Coming[];
  held: number | null;
  /** A clear being shown: its rows, its place in the chain, the points it earned, and how far through it is (0 to 1). */
  clear: { rows: number[]; chain: number; gained: number; t: number } | null;
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, theme: Theme, scene: Scene) {
  const { cell, x0, y0 } = layout(w, h);
  const pad = Math.max(1, cell * 0.06);
  const bar = (col: number, y: number, len: number, colour: string, alpha: number, grow = 0) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(x0 + col * cell + pad - grow, y + pad - grow, len * cell - 2 * pad + 2 * grow, cell - 2 * pad + 2 * grow, cell * 0.22);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // The well, with a faint mark in every cell.
  ctx.fillStyle = theme.surface;
  ctx.beginPath();
  ctx.roundRect(x0, y0, cell * W, cell * H, cell * 0.15);
  ctx.fill();
  for (let i = 0; i < W * H; i++) bar(i % W, y0 + Math.floor(i / W) * cell, 1, theme.tintPeer, 1);

  // What drops next, faint, above the columns it will fall down.
  for (const c of scene.coming) bar(c.col, 0, c.len, COLOURS[c.colour], 0.45);

  const clear = scene.clear;
  for (const b of scene.blocks) {
    const y = y0 + b.row * cell;
    if (clear && clear.rows.includes(Math.round(b.row))) {
      // A clearing block swells and turns white, then shrinks away.
      const swell = Math.sin(Math.min(1, clear.t * 2) * Math.PI) * cell * 0.12;
      const fade = clear.t < 0.5 ? 1 : 1 - (clear.t - 0.5) * 2;
      bar(b.col, y, b.len, COLOURS[b.colour], fade, swell);
      bar(b.col, y, b.len, '#ffffff', fade * Math.sin(Math.min(1, clear.t * 2.5) * Math.PI) * 0.85, swell);
      continue;
    }
    bar(b.col, y, b.len, COLOURS[b.colour], 1);
    if (b.id === scene.held) {
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.stroke();
    }
  }

  if (clear) {
    // Sparks fly from the cleared rows: more, and further, the longer the chain.
    const sparks = 10 + clear.chain * 8;
    for (const row of clear.rows) {
      for (let k = 0; k < sparks; k++) {
        // Scattered by a fixed pattern, so the burst is the same every frame.
        const a = k * 2.399 + row;
        const speed = (0.6 + ((k * 7) % 10) / 10) * (1 + clear.chain * 0.35);
        const x = x0 + ((k + 0.5) / sparks) * cell * W + Math.cos(a) * speed * cell * 1.6 * clear.t;
        const y = y0 + (row + 0.5) * cell + Math.sin(a) * speed * cell * 1.6 * clear.t + cell * 1.2 * clear.t * clear.t;
        ctx.globalAlpha = Math.max(0, 1 - clear.t);
        ctx.fillStyle = COLOURS[k % COLOURS.length];
        ctx.fillRect(x, y, cell * 0.14, cell * 0.14);
      }
    }
    // The points, and from the second link on, the chain itself, larger each time.
    const middle = y0 + (clear.rows.reduce((a, b) => a + b, 0) / clear.rows.length + 0.5) * cell;
    const pop = Math.min(1, clear.t * 4);
    ctx.globalAlpha = clear.t < 0.75 ? 1 : (1 - clear.t) * 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const words = clear.chain > 1 ? `${t.blocks.chain(clear.chain)}  +${clear.gained}` : `+${clear.gained}`;
    const size = cell * (0.7 + 0.22 * Math.min(clear.chain, 5)) * (0.6 + 0.4 * pop);
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    ctx.lineWidth = size * 0.18;
    ctx.strokeStyle = theme.surface;
    ctx.fillStyle = clear.chain > 1 ? COLOURS[(clear.chain + 2) % COLOURS.length] : theme.ink;
    const ty = middle - cell * 0.9 * clear.t;
    ctx.strokeText(words, x0 + (cell * W) / 2, ty);
    ctx.fillText(words, x0 + (cell * W) / 2, ty);
    ctx.globalAlpha = 1;
  }
}

/** What to draw at `elapsed` milliseconds into a playback, or null when it has finished. */
function sceneAt(pb: Playback, elapsed: number): Pick<Scene, 'blocks' | 'clear'> | null {
  let before = pb.from;
  for (const frame of pb.frames) {
    const time = lasts(frame);
    if (elapsed >= time) {
      elapsed -= time;
      before = frame.kind === 'clear' ? frame.blocks.filter((b) => !frame.rows.includes(b.row)) : frame.blocks;
      continue;
    }
    const f = elapsed / time;
    if (frame.kind === 'clear') return { blocks: frame.blocks, clear: { rows: frame.rows, chain: frame.chain, gained: frame.gained, t: f } };
    // Blocks ease into their new places; new ones drop in from above the well.
    const ease = 1 - (1 - f) * (1 - f);
    const was = new Map(before.map((b) => [b.id, b]));
    return {
      blocks: frame.blocks.map((b) => {
        const a = was.get(b.id) ?? { ...b, row: -STRIP };
        return { ...b, row: a.row + (b.row - a.row) * ease, col: a.col + (b.col - a.col) * ease };
      }),
      clear: null,
    };
  }
  return null;
}

export function View({ puzzle, state, ended, play }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const live = useRef<Drag | null>(null);
  const playback = useRef<Playback | null>(null);
  const [, frame] = useState(0);
  // Her best score at this difficulty before this game, and whether this game has passed it.
  const [best, setBest] = useState<number | null>(null);
  const bestKey = `best:stack:${Math.floor((puzzle.score - EASIEST_LEVEL) / 6) + 1}`;

  useEffect(() => {
    void load<number>(bestKey).then((saved) => setBest(saved ?? 0));
  }, []);
  const beaten = best !== null && state.points > best;
  useEffect(() => {
    if (beaten) void save(bestKey, state.points);
  }, [beaten, state.points]);

  const set = (next: Drag | null) => {
    live.current = next;
    setDrag(next);
  };

  /** Makes a move, and starts the playback of what it sets off. */
  const move = (m: StackMove) => {
    const result = playMove(puzzle, state, m);
    if (result.state === state) return;
    // The slide itself needs no playback: the block is already where she left it.
    const from = 'pass' in m ? state.blocks : state.blocks.map((b) => (b.id === m.block ? { ...b, col: m.to } : b));
    if (result.frames.length) playback.current = { from, frames: result.frames, began: performance.now() };
    play(m);
  };

  const playing = playback.current ? sceneAt(playback.current, performance.now() - playback.current.began) : null;
  if (!playing) playback.current = null;
  useEffect(() => {
    if (!playing) return;
    const id = requestAnimationFrame(() => frame((n) => n + 1));
    return () => cancelAnimationFrame(id);
  });

  // What is on screen: the playback if one is running; else the saved blocks, with the one in hand wherever the finger has it.
  const scene: Scene = playing
    ? { ...playing, coming: [], held: null }
    : {
        blocks: drag ? state.blocks.map((b) => (b.id === drag.id ? { ...b, col: drag.col } : b)) : state.blocks,
        coming: state.over ? [] : state.coming,
        held: drag?.id ?? null,
        clear: null,
      };

  return (
    <div class="stack">
      <p class="scoreline">
        <strong>{t.blocks.score(state.points)}</strong>
        <span>{best ? (beaten ? t.blocks.newBest : t.blocks.best(best)) : ''}</span>
      </p>
      <div class="board-area">
        <Board
          tall
          label={t.games.stack}
          onStroke={(phase, x, y, w, h) => {
            // Nothing can be moved while the last move is still playing out.
            if (ended || playback.current) return;
            const l = layout(w, h);
            const along = (x - l.x0) / l.cell;
            if (phase === 'start') {
              const col = Math.floor(along);
              const row = Math.floor((y - l.y0) / l.cell);
              if (col < 0 || row < 0 || col >= W || row >= H) return;
              const b = state.blocks[cover(state.blocks)[row * W + col]];
              if (!b) return;
              const [lo, hi] = reach(state.blocks, b.id);
              set({ id: b.id, grip: along - b.col, lo, hi, col: b.col });
            } else if (!live.current) {
              return;
            } else if (phase === 'move') {
              const d = live.current;
              set({ ...d, col: Math.min(d.hi, Math.max(d.lo, along - d.grip)) });
            } else {
              const d = live.current;
              set(null);
              if (phase === 'end') move({ block: d.id, to: Math.round(d.col) });
            }
          }}
          draw={(ctx, w, h, theme) => draw(ctx, w, h, theme, scene)}
        />
      </div>

      <div class="tools one">
        <button type="button" disabled={ended || !!playing} onClick={() => move({ pass: true })}>
          {t.blocks.pass}
        </button>
      </div>
    </div>
  );
}
