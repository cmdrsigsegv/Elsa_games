// The block game's screen: the score and her best, the blocks about to drop,
// and the well. A block is dragged sideways and settles on the nearest column.

import { useEffect, useRef, useState } from 'preact/hooks';
import { Board, type Theme } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { t } from '../../shell/strings';
import { load, save } from '../../storage/kv';
import { H, W, cover, reach, type Block, type Coming, type StackMove, type StackPuzzle, type StackState } from './rules';

type Props = ViewProps<StackPuzzle, StackState, StackMove>;

const BEST = 'best:stack';
/** Block colours; chosen to read on both the light and the dark background. */
const COLOURS = ['#4f8fdb', '#e0823d', '#55ad66', '#d65a6f', '#9a6fd8', '#cfa62f'];
/** The blocks about to drop wait in a strip this many cells tall above the well. */
const STRIP = 1.3;

interface Drag {
  id: number;
  /** Where on the block the finger took hold, in cells from its left end. */
  grip: number;
  lo: number;
  hi: number;
  col: number;
}

function layout(w: number, h: number) {
  const cell = Math.min(w / W, h / (H + STRIP));
  return { cell, x0: (w - cell * W) / 2, y0: cell * STRIP };
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, theme: Theme, blocks: Block[], coming: Coming[], held: number | null, over: boolean) {
  const { cell, x0, y0 } = layout(w, h);
  const pad = Math.max(1, cell * 0.06);
  const bar = (col: number, y: number, len: number, colour: string, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(x0 + col * cell + pad, y + pad, len * cell - 2 * pad, cell - 2 * pad, cell * 0.22);
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
  if (!over) for (const c of coming) bar(c.col, 0, c.len, COLOURS[c.colour], 0.45);

  for (const b of blocks) {
    bar(b.col, y0 + b.row * cell, b.len, COLOURS[b.colour], 1);
    if (b.id === held) {
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.stroke();
    }
  }
}

export function View({ state, ended, play }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const live = useRef<Drag | null>(null);
  // Her best score before this game, and whether this game has passed it.
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    void load<number>(BEST).then((saved) => setBest(saved ?? 0));
  }, []);
  const beaten = best !== null && state.points > best;
  useEffect(() => {
    if (beaten) void save(BEST, state.points);
  }, [beaten, state.points]);

  const set = (next: Drag | null) => {
    live.current = next;
    setDrag(next);
  };

  // What is on screen: the saved blocks, with the one in hand wherever the finger has it.
  const blocks = drag ? state.blocks.map((b) => (b.id === drag.id ? { ...b, col: drag.col } : b)) : state.blocks;

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
            if (ended) return;
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
              if (phase === 'end') play({ block: d.id, to: Math.round(d.col) });
            }
          }}
          draw={(ctx, w, h, theme) => draw(ctx, w, h, theme, blocks, state.coming, drag?.id ?? null, state.over)}
        />
      </div>

      <div class="tools one">
        <button type="button" disabled={ended} onClick={() => play({ pass: true })}>
          {t.blocks.pass}
        </button>
      </div>
    </div>
  );
}
