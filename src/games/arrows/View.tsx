// The arrow puzzle's screen: the knot, and Undo and Hint. Tapping an arrow
// sends it forward until something stops it, or off the board.

import { useEffect, useRef, useState } from 'preact/hooks';
import { Board } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { t } from '../../shell/strings';
import { cellAt, draw, layout } from './draw';
import { movable, owners, slide, solve, track, type ArrowsMove, type ArrowsPuzzle, type ArrowsState } from './rules';

type Props = ViewProps<ArrowsPuzzle, ArrowsState, ArrowsMove>;

/** How fast an arrow slides, in cells a second, and how long a bump stays red. */
const SPEED = 30;
const BUMP_MS = 450;

/** An arrow on the move: from where to where along its road, and when it set off. */
interface Motion {
  from: number;
  to: number;
  began: number;
}

export function View({ puzzle, state, ended, play, undo, canUndo, countHint }: Props) {
  const moving = useRef(new Map<number, Motion>());
  const bump = useRef<{ arrow: number; into: number; at: number } | null>(null);
  const seen = useRef(state);
  const [, frame] = useState(0);
  // A hint is for one position: the arrow to tap, or null if the knot can no longer be undone.
  const [hinted, setHinted] = useState<{ arrow: number | null; at: ArrowsState } | null>(null);
  const down = useRef<number | null>(null);

  // Compare with the state last drawn to see what just moved.
  if (seen.current !== state) {
    const now = performance.now();
    puzzle.arrows.forEach((a, i) => {
      const was = seen.current.slid[i];
      // An arrow that leaves slides on past the end of its road; one that is undone snaps back.
      const to = state.gone[i] ? track(puzzle, a).length + 1 : state.slid[i];
      if (state.moves > seen.current.moves && (to !== was || state.gone[i] !== seen.current.gone[i])) {
        moving.current.set(i, { from: was, to, began: now });
      } else if (state.moves < seen.current.moves) {
        moving.current.delete(i);
      }
    });
    seen.current = state;
  }

  // Where each arrow is drawn: at rest, or part-way through its slide.
  const now = performance.now();
  const at = puzzle.arrows.map((_, i) => {
    const m = moving.current.get(i);
    if (m) {
      const pos = m.from + ((now - m.began) / 1000) * SPEED;
      if (pos < m.to) return pos;
      moving.current.delete(i);
    }
    return state.gone[i] ? null : state.slid[i];
  });
  if (bump.current && now - bump.current.at > BUMP_MS) bump.current = null;
  const busy = moving.current.size > 0 || bump.current !== null;

  useEffect(() => {
    if (!busy) return;
    const id = requestAnimationFrame(() => frame((n) => n + 1));
    return () => cancelAnimationFrame(id);
  });

  const hint = hinted && hinted.at === state ? hinted : null;
  const lit = new Set(hint && hint.arrow !== null ? [hint.arrow] : []);
  const red = new Set(bump.current ? [bump.current.arrow, bump.current.into] : []);
  const stuck = !ended && movable(puzzle, state).length === 0;

  const arrowAt = (x: number, y: number, w: number, h: number): number | null => {
    const cell = cellAt(puzzle, layout(puzzle, w, h), x, y);
    if (cell === null) return null;
    const owner = owners(puzzle, state)[cell];
    return owner >= 0 ? owner : null;
  };

  const tap = (arrow: number) => {
    const result = slide(puzzle, state, arrow);
    // An arrow with another right in front of it cannot move at all: show which.
    if (!result.leaves && result.by === 0) bump.current = { arrow, into: result.into, at: performance.now() };
    else play({ arrow });
    frame((n) => n + 1);
  };

  let message = t.arrows.left(state.gone.filter((g) => !g).length);
  if (bump.current) message = t.arrows.blocked;
  else if (hint) message = hint.arrow === null ? t.arrows.lost : t.arrows.hinted;
  else if (stuck) message = t.arrows.stuck;

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
              if (down.current !== null && arrowAt(x, y, w, h) === down.current) tap(down.current);
              down.current = null;
            } else if (phase === 'cancel') down.current = null;
          }}
          draw={(ctx, w, h, theme) => draw(ctx, w, h, theme, puzzle, { at, lit, red })}
        />
      </div>

      <p class="message" aria-live="polite">
        {message}
      </p>

      <div class="tools two">
        <button type="button" disabled={!canUndo || ended} onClick={undo}>
          {t.arrows.undo}
        </button>
        <button
          type="button"
          disabled={ended}
          onClick={() => {
            countHint();
            setHinted({ arrow: solve(puzzle, state).way?.[0] ?? null, at: state });
          }}
        >
          {t.arrows.hint}
        </button>
      </div>
    </div>
  );
}
