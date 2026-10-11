// The block game's screen: the score and her best, then the board and the
// three pieces, which are dragged from the tray onto the board.

import { useEffect, useRef, useState } from 'preact/hooks';
import { Board } from '../../kit/Board';
import type { ViewProps } from '../../kit/game';
import { t } from '../../shell/strings';
import { load, save } from '../../storage/kv';
import { dragged, draw, layout, slotAt } from './draw';
import { PIECES, type BlocksMove, type BlocksPuzzle, type BlocksState } from './rules';

type Props = ViewProps<BlocksPuzzle, BlocksState, BlocksMove>;

const BEST = 'best:blocks';

export function View({ state, ended, play }: Props) {
  const [drag, setDrag] = useState<{ slot: number; x: number; y: number } | null>(null);
  const live = useRef(drag);
  // Her best score before this game, and whether this game has passed it.
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    void load<number>(BEST).then((saved) => setBest(saved ?? 0));
  }, []);
  const beaten = best !== null && state.points > best;
  useEffect(() => {
    if (beaten) void save(BEST, state.points);
  }, [beaten, state.points]);

  const set = (next: typeof drag) => {
    live.current = next;
    setDrag(next);
  };

  return (
    <div class="blocks">
      <p class="scoreline">
        <strong>{t.blocks.score(state.points)}</strong>
        <span>{best ? (beaten ? t.blocks.newBest : t.blocks.best(best)) : ''}</span>
      </p>
      <div class="board-area">
        <Board
          tall
          label={t.games.blocks}
          onStroke={(phase, x, y, w, h) => {
            if (ended) return;
            const l = layout(w, h);
            if (phase === 'start') {
              const slot = slotAt(l, x, y);
              if (slot !== null && state.tray[slot] !== null) set({ slot, x, y });
            } else if (!live.current) {
              return;
            } else if (phase === 'move') {
              set({ ...live.current, x, y });
            } else {
              const d = live.current;
              set(null);
              if (phase !== 'end') return;
              const at = dragged(l, PIECES[state.tray[d.slot]!], d.x, d.y);
              // A piece dropped where it does not fit simply goes back to the tray.
              play({ slot: d.slot, x: at.x, y: at.y });
            }
          }}
          draw={(ctx, w, h, theme) => draw(ctx, w, h, theme, state, { drag })}
        />
      </div>
    </div>
  );
}
