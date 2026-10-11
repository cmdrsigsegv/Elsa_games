import { useEffect, useState } from 'preact/hooks';
import { games } from '../games';
import type { Game } from '../kit/game';
import { SET_SIZE, loadProgress, setAt } from '../kit/progress';
import { applyUpdate, findUpdate } from '../kit/update';
import { t } from './strings';

interface Info {
  difficulty: number;
  solved: number;
}

export function Home({ onOpen, onStats, onSettings }: { onOpen(game: Game): void; onStats(): void; onSettings(): void }) {
  const [info, setInfo] = useState<Record<string, Info>>({});
  // Whether a newer version of the app has been found: looked for on arrival, and again on request.
  const [update, setUpdate] = useState<'unknown' | 'checking' | 'ready' | 'none'>('unknown');

  const check = (asked: boolean) => {
    if (asked) setUpdate('checking');
    void findUpdate().then((found) => setUpdate(found ? 'ready' : asked ? 'none' : 'unknown'));
  };
  useEffect(() => check(false), []);

  useEffect(() => {
    void Promise.all(
      games.map(async (g) => {
        const progress = await loadProgress(g.id);
        const solved = setAt(progress, progress.difficulty).solved.filter(Boolean).length;
        return [g.id, { difficulty: progress.difficulty, solved }] as const;
      }),
    ).then((entries) => setInfo(Object.fromEntries(entries)));
  }, []);

  return (
    <main class="home">
      <h1>{t.appName}</h1>
      {update === 'ready' && (
        <button type="button" class="update" onClick={() => void applyUpdate()}>
          {t.home.updateReady}
        </button>
      )}
      <ul class="game-list">
        {games.map((g) => (
          <li key={g.id}>
            <button type="button" onClick={() => onOpen(g)}>
              <span class="name">{t.games[g.id]}</span>
              {info[g.id] && (
                <span class="sub">
                  {t.home.difficulty(info[g.id].difficulty)}
                  {!g.endless && ` · ${t.home.solvedOf(info[g.id].solved, SET_SIZE)}`}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <nav class="home-links">
        <button type="button" class="ghost" onClick={onStats}>
          {t.home.statistics}
        </button>
        <button type="button" class="ghost" onClick={onSettings}>
          {t.home.settings}
        </button>
      </nav>
      <footer class="version">
        {t.version(__APP_VERSION__)}
        {update !== 'ready' && (
          <button type="button" class="ghost" disabled={update === 'checking'} onClick={() => check(true)}>
            {update === 'checking' ? t.home.checking : update === 'none' ? t.home.upToDate : t.home.checkUpdate}
          </button>
        )}
      </footer>
    </main>
  );
}
