// The screen around a game in progress. It is the same for every game: it
// loads and saves the session, keeps the clock, asks how the puzzle was, moves
// the difficulty level, and lines up the next puzzle.

import { useEffect, useRef, useState } from 'preact/hooks';
import { nextTarget, update, type Rating, type Skill } from '../kit/adaptive';
import type { Game, PuzzleBase } from '../kit/game';
import { random } from '../kit/random';
import {
  clearSession,
  current,
  loadSession,
  loadSkill,
  newSession,
  play,
  saveSession,
  saveSkill,
  started,
  undo,
  type Session,
} from '../kit/session';
import { makePuzzle, newSeed } from '../kit/supply';
import { t } from './strings';

const RATINGS: Rating[] = ['easy', 'right', 'hard'];

function clockText(ms: number): string {
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

export function Play({ game, onExit }: { game: Game; onExit(): void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [asking, setAsking] = useState(false);

  // Time played so far: `base`, plus the stretch since `since` while running.
  const clock = useRef<{ seed: number | null; base: number; since: number | null }>({ seed: null, base: 0, since: null });
  const elapsed = () => clock.current.base + (clock.current.since === null ? 0 : performance.now() - clock.current.since);

  // While she plays, the next puzzle is made in the background for each way
  // she might rate this one, so "next" is instant whatever she answers.
  const prepared = useRef<{ seed: number; puzzles: Record<Rating, Promise<PuzzleBase>> } | null>(null);

  const seed = session?.puzzle.seed;
  const ended = session?.ended ?? false;

  useEffect(() => {
    let alive = true;
    void (async () => {
      const sk = await loadSkill(game.id, game.adaptive);
      const saved = await loadSession(game.id);
      const se = saved ?? newSession(game, await makePuzzle(game.id, nextTarget(sk, random(newSeed()), game.adaptive)));
      if (!alive) return;
      setSkill(sk);
      setSession(se);
    })();
    return () => {
      alive = false;
    };
  }, [game]);

  // The clock runs while an unfinished puzzle is on screen.
  useEffect(() => {
    if (!session) return;
    // A new puzzle starts from its saved time; finishing one only stops the clock.
    if (clock.current.seed !== session.puzzle.seed) {
      clock.current = { seed: session.puzzle.seed, base: session.elapsedMs, since: null };
    }
    const sync = () => {
      const c = clock.current;
      const run = !ended && document.visibilityState === 'visible';
      if (run && c.since === null) c.since = performance.now();
      if (!run && c.since !== null) clock.current = { ...c, base: elapsed(), since: null };
      if (!run) void saveSession(game.id, { ...session, elapsedMs: elapsed() });
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      clock.current = { ...clock.current, base: elapsed(), since: null };
    };
    // Restarted per puzzle, not per move: `session` is only read for saving.
  }, [seed, ended]);

  useEffect(() => {
    if (session) void saveSession(game.id, { ...session, elapsedMs: elapsed() });
  }, [session]);

  useEffect(() => {
    if (!session || !skill || prepared.current?.seed === session.puzzle.seed) return;
    const rng = random(newSeed());
    const puzzleFor = (rating: Rating) => {
      const guess = update(
        skill,
        { score: session.puzzle.score, rating, timeMs: 0, hints: 0, mistakes: 0, abandoned: false },
        game.adaptive,
      );
      return makePuzzle(game.id, nextTarget(guess, rng, game.adaptive));
    };
    // "Just right" first: it is also what an unrated puzzle uses.
    const right = puzzleFor('right');
    prepared.current = { seed: session.puzzle.seed, puzzles: { right, easy: puzzleFor('easy'), hard: puzzleFor('hard') } };
  }, [session, skill]);

  const next = async (rating: Rating | null, abandoned: boolean) => {
    if (!session || !skill) return;
    let after = skill;
    if (!abandoned || started(session)) {
      after = update(
        skill,
        {
          score: session.puzzle.score,
          rating,
          timeMs: elapsed(),
          hints: session.hints,
          mistakes: session.mistakes,
          abandoned,
        },
        game.adaptive,
      );
      setSkill(after);
      void saveSkill(game.id, after);
    }
    const ready =
      prepared.current?.seed === session.puzzle.seed
        ? prepared.current.puzzles[rating ?? 'right']
        : makePuzzle(game.id, nextTarget(after, random(newSeed()), game.adaptive));
    setAsking(false);
    setSession(null);
    await clearSession(game.id);
    setSession(newSession(game, await ready));
  };

  const askNew = () => {
    if (!session) return;
    if (session.ended || !started(session)) void next(null, !session.ended);
    else setAsking(true);
  };

  return (
    <div class="play">
      <header class="bar">
        <button type="button" class="ghost back" aria-label={t.play.back} onClick={onExit}>
          ‹
        </button>
        <h1>{t.games[game.id]}</h1>
        {session && <span class="level">{t.home.level(Math.round(session.puzzle.score))}</span>}
        {session && game.showTimer && <Clock read={elapsed} />}
        <button type="button" class="ghost" disabled={!session} onClick={askNew}>
          {t.play.newPuzzle}
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
        />
      ) : (
        <p class="preparing">{t.play.preparing}</p>
      )}

      {session?.ended && (
        <div class="sheet" role="dialog" aria-label={t.play.solved}>
          <h2>{t.play.solved}</h2>
          <p class="summary">
            {clockText(elapsed())}
            {session.hints > 0 && ` · ${t.play.hints(session.hints)}`}
          </p>
          <p>{t.play.howWasIt}</p>
          <div class="ratings">
            {RATINGS.map((r) => (
              <button type="button" key={r} onClick={() => void next(r, false)}>
                {r === 'easy' ? t.play.tooEasy : r === 'right' ? t.play.justRight : t.play.tooHard}
              </button>
            ))}
          </div>
          <div class="sheet-foot">
            <button type="button" class="ghost" onClick={onExit}>
              {t.play.home}
            </button>
            <button type="button" class="ghost" onClick={() => void next(null, false)}>
              {t.play.skip}
            </button>
          </div>
        </div>
      )}

      {asking && session && !session.ended && (
        <div class="sheet" role="dialog" aria-label={t.play.abandonTitle}>
          <h2>{t.play.abandonTitle}</h2>
          <p>{t.play.abandonBody}</p>
          <div class="ratings">
            <button type="button" onClick={() => setAsking(false)}>
              {t.play.abandonNo}
            </button>
            <button type="button" onClick={() => void next(null, true)}>
              {t.play.abandonYes}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
