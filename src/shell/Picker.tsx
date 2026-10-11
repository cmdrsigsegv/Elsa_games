// A game's front page: the difficulty she is on, with buttons to step it up
// or down, and the set of puzzles at that difficulty to pick from.

import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../kit/game';
import {
  DIFFICULTIES,
  SET_SIZE,
  loadProgress,
  placeKey,
  saveProgress,
  setAt,
  setDone,
  withDifficulty,
  withNextSet,
  type Place,
  type Progress,
} from '../kit/progress';
import { loadSession } from '../kit/session';
import { t } from './strings';

interface Props {
  game: Game;
  onOpen(place: Place): void;
  onExit(): void;
}

export function Picker({ game, onOpen, onExit }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  // Which puzzles of the set on show have a game in progress.
  const [begun, setBegun] = useState<boolean[]>([]);

  useEffect(() => {
    void loadProgress(game.id).then(setProgress);
  }, [game]);

  const difficulty = progress?.difficulty ?? 0;
  const here = progress ? setAt(progress, difficulty) : null;

  useEffect(() => {
    if (!here || game.endless) return;
    let alive = true;
    void Promise.all(
      here.solved.map((_, index) => loadSession(placeKey(game.id, { difficulty, set: here.set, index }))),
    ).then((sessions) => alive && setBegun(sessions.map((s) => !!s && !s.ended)));
    return () => {
      alive = false;
    };
  }, [difficulty, here?.set]);

  if (!progress || !here) return <div class="page" />;

  const change = (next: Progress) => {
    setBegun([]);
    setProgress(next);
    void saveProgress(game.id, next);
  };
  // The first unsolved puzzle is the one to play next.
  const upNext = here.solved.indexOf(false);

  return (
    <main class="page">
      <header class="bar">
        <button type="button" class="ghost back" aria-label={t.play.back} onClick={onExit}>
          ‹
        </button>
        <h1>{t.games[game.id]}</h1>
      </header>

      <div class="difficulty">
        <button type="button" disabled={difficulty <= 1} onClick={() => change(withDifficulty(progress, difficulty - 1))}>
          − {t.picker.easier}
        </button>
        <strong>{t.picker.of(difficulty, DIFFICULTIES)}</strong>
        <button type="button" disabled={difficulty >= DIFFICULTIES} onClick={() => change(withDifficulty(progress, difficulty + 1))}>
          {t.picker.harder} +
        </button>
      </div>

      {game.endless ? (
        <button type="button" class="update" onClick={() => onOpen({ difficulty, set: 0, index: 0 })}>
          {t.picker.play}
        </button>
      ) : (
        <>
          <ol class="tiles">
            {here.solved.map((done, index) => (
              <li key={index}>
                <button
                  type="button"
                  class={done ? 'done' : index === upNext ? 'next' : begun[index] ? 'begun' : ''}
                  onClick={() => onOpen({ difficulty, set: here.set, index })}
                >
                  {done ? '✓' : index + 1}
                </button>
              </li>
            ))}
          </ol>
          <p class="tally">{t.home.solvedOf(here.solved.filter(Boolean).length, SET_SIZE)}</p>
          {setDone(progress, difficulty) && (
            <button type="button" class="update" onClick={() => change(withNextSet(progress, difficulty))}>
              {t.picker.setDone}
            </button>
          )}
        </>
      )}
    </main>
  );
}
