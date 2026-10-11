// The screen around a game in progress. It is the same for every game: it
// makes or reloads the puzzle for a place, saves after every move, keeps the
// clock, and records the result when the puzzle ends.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { Game } from '../kit/game';
import { levelFor, loadProgress, nextUnsolved, placeKey, saveProgress, seedFor, setDone, withSolved, type Place } from '../kit/progress';
import {
  clearSession,
  current,
  loadOptions,
  loadSession,
  newSession,
  play,
  saveOptions,
  saveSession,
  started,
  undo,
  type Session,
} from '../kit/session';
import { settings } from '../kit/settings';
import { load, save } from '../storage/kv';
import { rules } from './rules';
import { recordPlayed } from '../kit/stats';
import { makePuzzle } from '../kit/supply';
import { t } from './strings';

export function clockText(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Clock({ read }: { read(): number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span class="clock">{clockText(read())}</span>;
}

interface Props {
  game: Game;
  place: Place;
  /** Go to another puzzle of the set. */
  onOpen(place: Place): void;
  /** Back to the picker. */
  onExit(): void;
}

export function Play({ game, place, onOpen, onExit }: Props) {
  const key = placeKey(game.id, place);
  const [session, setSession] = useState<Session | null>(null);
  const [asking, setAsking] = useState(false);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [choosing, setChoosing] = useState(false);
  const [reading, setReading] = useState(false);
  const how = rules[game.id]?.[settings().language];
  // Once the puzzle has ended: where to go next (null when the set is finished).
  const [after, setAfter] = useState<{ next: Place | null } | null>(null);

  // Time played so far: `base`, plus the stretch since `since` while running.
  const clock = useRef<{ base: number; since: number | null }>({ base: 0, since: null });
  const elapsed = () => clock.current.base + (clock.current.since === null ? 0 : performance.now() - clock.current.since);

  const ended = session?.ended ?? false;

  const fresh = async () => newSession(game, await makePuzzle(game.id, seedFor(game.id, place), levelFor(place)));

  useEffect(() => {
    let alive = true;
    void (async () => {
      const op = await loadOptions(game);
      // The first time a game is opened, its rules come up by themselves.
      const seen = await load<boolean>(`rules-seen:${game.id}`);
      if (!seen && alive) {
        setReading(true);
        void save(`rules-seen:${game.id}`, true);
      }
      // A puzzle left finished is started afresh when it is opened again.
      const saved = await loadSession(key);
      const se = saved && !saved.ended ? saved : await fresh();
      if (!alive) return;
      clock.current = { base: se.elapsedMs, since: null };
      setOptions(op);
      setSession(se);
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  // The clock runs while an unfinished puzzle is on screen.
  useEffect(() => {
    if (!session) return;
    const sync = () => {
      const c = clock.current;
      const run = !ended && document.visibilityState === 'visible';
      if (run && c.since === null) c.since = performance.now();
      if (!run && c.since !== null) clock.current = { base: elapsed(), since: null };
      if (!run && !ended) void saveSession(key, { ...session, elapsedMs: elapsed() });
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      clock.current = { base: elapsed(), since: null };
    };
  }, [session === null, ended]);

  useEffect(() => {
    if (session && !session.ended) void saveSession(key, { ...session, elapsedMs: elapsed() });
  }, [session]);

  // When it ends: record it, mark it solved, forget the saved game, and work out what comes next.
  useEffect(() => {
    if (!session?.ended || after) return;
    void (async () => {
      await clearSession(key);
      await recordPlayed(game.id, {
        at: Date.now(),
        difficulty: place.difficulty,
        timeMs: elapsed(),
        hints: session.hints,
        mistakes: session.mistakes,
        lost: session.lost === true,
      });
      let progress = await loadProgress(game.id);
      if (!session.lost && !game.endless) {
        progress = withSolved(progress, place);
        await saveProgress(game.id, progress);
      }
      setAfter({ next: game.endless || setDone(progress, place.difficulty) ? null : nextUnsolved(progress, place) });
    })();
  }, [session?.ended]);

  const restart = async () => {
    setAsking(false);
    setAfter(null);
    setSession(null);
    await clearSession(key);
    clock.current = { base: 0, since: null };
    setSession(await fresh());
  };

  return (
    <div class="play">
      <header class="bar">
        <button type="button" class="ghost back" aria-label={t.play.back} onClick={onExit}>
          ‹
        </button>
        <div class="titles">
          <h1>{t.games[game.id]}</h1>
          <span class="level">
            {t.home.difficulty(place.difficulty)}
            {!game.endless && ` · ${t.play.puzzle(place.index + 1)}`}
          </span>
        </div>
        {session && !session.ended && settings().showTimer && <Clock read={elapsed} />}
        {how && (
          <button type="button" class="ghost help" aria-label={t.play.rules} onClick={() => setReading(true)}>
            ?
          </button>
        )}
        {game.options.length > 0 && (
          <button type="button" class="ghost" onClick={() => setChoosing(true)}>
            {t.play.options}
          </button>
        )}
        <button
          type="button"
          class="ghost"
          disabled={!session}
          onClick={() => (session && started(session) && !session.ended ? setAsking(true) : void restart())}
        >
          {t.play.restart}
        </button>
      </header>

      {session ? (
        <game.View
          key={session.puzzle.seed}
          puzzle={session.puzzle}
          state={current(session)}
          ended={session.ended}
          play={(move: unknown) => setSession((s) => s && play(game, s, move))}
          undo={() => setSession((s) => s && undo(s))}
          canUndo={session.history.length > 1}
          countHint={() => setSession((s) => s && { ...s, hints: s.hints + 1 })}
          options={options}
        />
      ) : (
        <p class="preparing">{t.play.preparing}</p>
      )}

      {session?.ended && after && (
        <div class="sheet" role="dialog" aria-label={session.lost ? t.play.gameOver : t.play.solved}>
          <h2>{session.lost ? t.play.gameOver : t.play.solved}</h2>
          <p class="summary">
            {game.endSummary?.(session.puzzle, current(session)) ?? clockText(elapsed())}
            {session.hints > 0 && ` · ${t.play.hints(session.hints)}`}
          </p>
          <div class="ratings stacked">
            {session.lost || game.endless ? (
              <button type="button" onClick={() => void restart()}>
                {t.play.again}
              </button>
            ) : after.next ? (
              <button type="button" onClick={() => onOpen(after.next!)}>
                {t.play.next}
              </button>
            ) : (
              <button type="button" onClick={onExit}>
                {t.play.nextSet}
              </button>
            )}
          </div>
          <div class="sheet-foot">
            <span />
            <button type="button" class="ghost" onClick={onExit}>
              {game.endless ? t.play.back : t.play.allPuzzles}
            </button>
          </div>
        </div>
      )}

      {reading && how && (
        <div class="sheet rules" role="dialog" aria-label={t.play.rules}>
          <h2>{t.games[game.id]}</h2>
          <h3>{t.play.goal}</h3>
          <p>{how.goal}</p>
          <h3>{t.play.theRules}</h3>
          <ul>
            {how.rules.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3>{t.play.onScreen}</h3>
          <ul>
            {how.how.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div class="ratings stacked">
            <button type="button" onClick={() => setReading(false)}>
              {t.play.gotIt}
            </button>
          </div>
        </div>
      )}

      {choosing && (
        <div class="sheet" role="dialog" aria-label={t.play.options}>
          <h2>{t.play.options}</h2>
          {game.options.map((o) => (
            <div class="option" key={o.key}>
              <p>{t.options[game.id][o.key].label}</p>
              <div class="ratings">
                {o.choices.map((choice) => (
                  <button
                    type="button"
                    key={choice}
                    class={options[o.key] === choice ? 'on' : ''}
                    aria-pressed={options[o.key] === choice}
                    onClick={() => {
                      const changed = { ...options, [o.key]: choice };
                      setOptions(changed);
                      void saveOptions(game.id, changed);
                    }}
                  >
                    {t.options[game.id][o.key].choices[choice]}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div class="sheet-foot">
            <span />
            <button type="button" class="ghost" onClick={() => setChoosing(false)}>
              {t.play.done}
            </button>
          </div>
        </div>
      )}

      {asking && session && !session.ended && (
        <div class="sheet" role="dialog" aria-label={t.play.restartTitle}>
          <h2>{t.play.restartTitle}</h2>
          <div class="ratings">
            <button type="button" onClick={() => setAsking(false)}>
              {t.play.restartNo}
            </button>
            <button type="button" onClick={() => void restart()}>
              {t.play.restartYes}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
