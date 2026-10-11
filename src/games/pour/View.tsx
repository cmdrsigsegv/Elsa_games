// The liquid-sorting game's screen: the vials, and Undo. Tap a vial to pick
// it up, then tap the vial to pour into.

import { useState } from 'preact/hooks';
import { Board, type Theme } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { t } from '../../shell/strings';
import { CAPACITY, canPour, usefulMoves, type PourMove, type PourPuzzle, type PourState } from './rules';

type Props = ViewProps<PourPuzzle, PourState, PourMove>;

/** Liquid colours, far enough apart to tell at a glance on both backgrounds. */
const COLOURS = [
  '#e04f4f', '#3f7fe0', '#4caf50', '#f0b429', '#9c5fd6', '#f07c2e',
  '#2bb5b5', '#e86aa6', '#8d6e4c', '#7f8c99', '#a8d04a', '#34558b',
];

interface Layout {
  /** How many vials in each row, and each vial's box: left, top, width, height. */
  boxes: [number, number, number, number][];
}

function layout(count: number, w: number, h: number): Layout {
  // One row while they fit comfortably, else two.
  const rows = count > 7 ? 2 : 1;
  const perRow = Math.ceil(count / rows);
  const slot = Math.min(w / perRow, 86);
  const vw = slot * 0.62;
  const vh = Math.min(vw * 3.4, (h / rows) * 0.72);
  const boxes: [number, number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const inRow = row === rows - 1 ? count - perRow * (rows - 1) : perRow;
    const x0 = (w - inRow * slot) / 2;
    const rowH = h / rows;
    boxes.push([x0 + (i % perRow) * slot + (slot - vw) / 2, row * rowH + (rowH - vh) / 2 + vh * 0.08, vw, vh]);
  }
  return { boxes };
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, theme: Theme, vials: number[][], picked: number | null) {
  const { boxes } = layout(vials.length, w, h);
  vials.forEach((vial, i) => {
    const [x, y0, vw, vh] = boxes[i];
    // A picked-up vial is lifted.
    const y = i === picked ? y0 - vh * 0.12 : y0;
    const layer = vh / (CAPACITY + 0.35);
    const round = vw * 0.42;
    // The glass, open at the top and round at the bottom; the liquid is clipped to it.
    const glass = () => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + vh - round);
      ctx.quadraticCurveTo(x, y + vh, x + vw / 2, y + vh);
      ctx.quadraticCurveTo(x + vw, y + vh, x + vw, y + vh - round);
      ctx.lineTo(x + vw, y);
    };
    ctx.save();
    glass();
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = theme.surface;
    ctx.fillRect(x, y, vw, vh);
    vial.forEach((colour, k) => {
      ctx.fillStyle = COLOURS[(colour - 1) % COLOURS.length];
      ctx.fillRect(x, y + vh - (k + 1) * layer, vw, layer + 0.5);
    });
    ctx.restore();
    glass();
    ctx.strokeStyle = i === picked ? theme.accent : theme.lineStrong;
    ctx.lineWidth = i === picked ? 3 : 2;
    ctx.stroke();
  });
}

export function View({ state, ended, play, undo, canUndo }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const stuck = !ended && usefulMoves(state.vials).length === 0;

  const tap = (x: number, y: number, w: number, h: number) => {
    if (ended) return;
    const { boxes } = layout(state.vials.length, w, h);
    // The whole column around a vial counts, so a near miss still lands.
    const i = boxes.findIndex(([bx, by, bw, bh]) => x >= bx - bw * 0.3 && x <= bx + bw * 1.3 && y >= by - bh * 0.25 && y <= by + bh * 1.1);
    if (i < 0 || i === picked) return setPicked(null);
    if (picked !== null && canPour(state.vials, picked, i)) {
      play({ from: picked, to: i });
      return setPicked(null);
    }
    setPicked(state.vials[i].length ? i : null);
  };

  return (
    <div class="pour">
      <div class="board-area">
        <Board
          tall
          label={t.games.pour}
          onStroke={(phase, x, y, w, h) => phase === 'start' && tap(x, y, w, h)}
          draw={(ctx, w, h, theme) => draw(ctx, w, h, theme, state.vials, ended ? null : picked)}
        />
      </div>

      <p class="message" aria-live="polite">
        {stuck ? t.pour.stuck : t.pour.moves(state.moves)}
      </p>

      <div class="tools one">
        <button
          type="button"
          disabled={!canUndo || ended}
          onClick={() => {
            setPicked(null);
            undo();
          }}
        >
          {t.pour.undo}
        </button>
      </div>
    </div>
  );
}
