import { useEffect, useState } from 'preact/hooks';
import { games } from '../games';
import type { Game } from '../kit/game';
import { loadSession, loadSkill } from '../kit/session';
import { t } from './strings';

interface Info {
  inProgress: boolean;
  level: number;
}

export function Home({ onOpen }: { onOpen(game: Game): void }) {
  const [info, setInfo] = useState<Record<string, Info>>({});

  useEffect(() => {
    void Promise.all(
      games.map(async (g) => {
        const [session, skill] = await Promise.all([loadSession(g.id), loadSkill(g.id, g.adaptive)]);
        return [g.id, { inProgress: !!session && !session.ended, level: Math.round(skill.level) }] as const;
      }),
    ).then((entries) => setInfo(Object.fromEntries(entries)));
  }, []);

  return (
    <main class="home">
      <h1>{t.appName}</h1>
      <ul class="game-list">
        {games.map((g) => (
          <li key={g.id}>
            <button type="button" onClick={() => onOpen(g)}>
              <span class="name">{t.games[g.id]}</span>
              {info[g.id] && (
                <span class="sub">
                  {info[g.id].inProgress ? t.home.continue : t.home.newPuzzle} · {t.home.level(info[g.id].level)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <footer class="version">{t.version(__APP_VERSION__)}</footer>
    </main>
  );
}
