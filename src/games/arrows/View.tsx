// The arrow puzzle's screen: the board, and Undo and Hint. Tapping an arrow
// sends it on its way.

import { useEffect, useRef, useState } from 'preact/hooks';
import { Board } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { t } from '../../shell/strings';
import { cellAt, draw, layout } from './draw';
import { head, hint, owners, ray, type ArrowsMove, type ArrowsPuzzle, type ArrowsState } from './rules';

type Props = ViewProps<ArrowsPuzzle, ArrowsState, ArrowsMove>;

/** How fast an arrow slides off, in cells a second, and how long a bump stays red. */
const SPEED = 38;
const BUMP_MS = 450;

export function View({ puzzle, state, ended, play, undo, canUndo, countHint }: Props) {
  // Arrows on their way out (when each set off) and the last bump (when it happened).
  const leaving = useRef(new Map<number, number>());
  const bump = useRef<{ arrow: number; into: number; at: number } | null>(null);
  const seen = useRef(state);
  const [, frame] = useState(0);
  const [hinted, setHinted] = useState<number | null>(null);
  const down = useRef<number | null>(null);

  // Compare with the state last drawn to see what just happened.
  if (seen.current !== state) {
    const now = performance.now();
    state.gone.forEach((gone, i) => {
      if (gone && !seen.current.gone[i]) leaving.current.set(i, now);
      if (!gone) leaving.current.delete(i); // an undo brings it straight back
    });
    if (state.bumps > seen.current.bumps && state.lastBump) bump.current = { ...state.lastBump, at: now };
    seen.current = state;
  }

  // How far each leaving arrow has slid; ones that are clear of the board are dropped.
  const now = performance.now();
  const moved = new Map<number, number>();
  for (const [i, since] of leaving.current) {
    const a = puzzle.arrows[i];
    const cells = ((now - since) / 1000) * SPEED;
    if (cells > ray(puzzle.w, puzzle.h, head(a), a.dir).length + a.cells.length + 1) leaving.current.delete(i);
    else moved.set(i, cells);
  }
  if (bump.current && now - bump.current.at > BUMP_MS) bump.current = null;
  const moving = moved.size > 0 || bump.current !== null;

  useEffect(() => {
    if (!moving) return;
    const id = requestAnimationFrame(() => frame((n) => n + 1));
    return () => cancelAnimationFrame(id);
  });

  const lit = new Set(hinted !== null && !state.gone[hinted] ? [hinted] : []);
  const red = new Set(bump.current ? [bump.current.arrow, bump.current.into] : []);

  const arrowAt = (x: number, y: number, w: number, h: number): number | null => {
    const cell = cellAt(puzzle, layout(puzzle, w, h), x, y);
    if (cell === null) return null;
    const owner = owners(puzzle, state.gone)[cell];
    return owner >= 0 ? owner : null;
  };

  return (
    <div class="arrows">
      <div class="board-area">
        <Board
          tall
          label={t.games.arrows}
          // An arrow goes when the finger lifts on the arrow it came down on.
          onStroke={(phase, x, y, w, h) => {
            if (ended) return;
            if (phase === 'start') down.current = arrowAt(x, y, w, h);
            else if (phase === 'end') {
              if (down.current !== null && arrowAt(x, y, w, h) === down.current) {
                setHinted(null);
                play({ arrow: down.current });
              }
              down.current = null;
            } else if (phase === 'cancel') down.current = null;
          }}
          draw={(ctx, w, h, theme) => draw(ctx, w, h, theme, puzzle, { present: state.gone.map((g) => !g), leaving: moved, lit, red })}
        />
      </div>

      <p class="message" aria-live="polite">
        {bump.current ? t.arrows.blocked : hinted !== null && !state.gone[hinted] ? t.arrows.hinted : t.arrows.left(state.gone.filter((g) => !g).length)}
      </p>

      <div class="tools two">
        <button type="button" disabled={!canUndo || ended} onClick={undo}>
          {t.arrows.undo}
        </button>
        <button
          type="button"
          disabled={ended}
          onClick={() => {
            const h = hint(puzzle, state);
            if (!h) return;
            countHint();
            setHinted(h.arrow);
          }}
        >
          {t.arrows.hint}
        </button>
      </div>
    </div>
  );
}
