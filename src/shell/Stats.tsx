// What she has played, per game, and how her level has moved.

import { useEffect, useState } from 'preact/hooks';
import { games } from '../games';
import { loadSkill } from '../kit/session';
import { loadPlayed, summarise, type Summary } from '../kit/stats';
import { clockText } from './Play';
import { t } from './strings';

interface GameStats extends Summary {
  id: string;
  level: number;
}

/** Her level after each puzzle, as a line: flat means the difficulty has settled. */
function LevelLine({ levels }: { levels: number[] }) {
  if (levels.length < 2) return null;
  const w = 300;
  const h = 64;
  const points = levels.map((level, i) => `${(i / (levels.length - 1)) * w},${h - 4 - (level / 100) * (h - 8)}`).join(' ');
  return (
    <figure class="level-line">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={t.stats.levelOverTime}>
        <polyline points={points} fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke" />
      </svg>
      <figcaption>{t.stats.levelOverTime}</figcaption>
    </figure>
  );
}

export function Stats({ onExit }: { onExit(): void }) {
  const [stats, setStats] = useState<GameStats[] | null>(null);

  useEffect(() => {
    void Promise.all(
      games.map(async (g) => {
        const [played, skill] = await Promise.all([loadPlayed(g.id), loadSkill(g.id, g.adaptive)]);
        return { id: g.id, level: Math.round(skill.level), ...summarise(played) };
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
          {s.levels.length === 0 ? (
            <p>{t.stats.none}</p>
          ) : (
            <>
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
                  <dt>{t.stats.level}</dt>
                  <dd>{s.level}</dd>
                </div>
              </dl>
              <LevelLine levels={s.levels} />
            </>
          )}
        </section>
      ))}
    </main>
  );
}
