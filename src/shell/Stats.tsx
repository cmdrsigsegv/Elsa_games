// What she has played, per game.

import { useEffect, useState } from 'preact/hooks';
import { games } from '../games';
import { loadProgress } from '../kit/progress';
import { loadPlayed, summarise, type Summary } from '../kit/stats';
import { clockText } from './Play';
import { t } from './strings';

interface GameStats extends Summary {
  id: string;
  difficulty: number;
}

export function Stats({ onExit }: { onExit(): void }) {
  const [stats, setStats] = useState<GameStats[] | null>(null);

  useEffect(() => {
    void Promise.all(
      games.map(async (g) => {
        const [played, progress] = await Promise.all([loadPlayed(g.id), loadProgress(g.id)]);
        return { id: g.id, difficulty: progress.difficulty, ...summarise(played) };
      }),
    ).then(setStats);
  }, []);

  return (
    <main class="page">
      <header class="bar">
        <button type="button" class="ghost back" aria-label={t.play.back} onClick={onExit}>
          ‹
        </button>
        <h1>{t.stats.title}</h1>
      </header>

      {stats?.map((s) => (
        <section class="setting" key={s.id}>
          <h2>{t.games[s.id]}</h2>
          {s.played === 0 ? (
            <p>{t.stats.none}</p>
          ) : (
            <dl class="figures">
                <div>
                  <dt>{t.stats.solved}</dt>
                  <dd>{s.solved}</dd>
                </div>
                <div>
                  <dt>{t.stats.noHints}</dt>
                  <dd>{s.noHints}</dd>
                </div>
                <div>
                  <dt>{t.stats.averageTime}</dt>
                  <dd>{s.usualMs === null ? '–' : clockText(s.usualMs)}</dd>
                </div>
                <div>
                  <dt>{t.stats.difficulty}</dt>
                  <dd>{s.difficulty}</dd>
                </div>
              </dl>
          )}
        </section>
      ))}
    </main>
  );
}
