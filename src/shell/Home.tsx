import { games } from '../games';
import { t } from './strings';

export function Home() {
  return (
    <main class="home">
      <h1>{t.appName}</h1>
      {games.length === 0 ? (
        <p class="empty">{t.noGamesYet}</p>
      ) : (
        <ul class="game-list">
          {games.map((g) => (
            <li key={g.id}>
              <button type="button">{g.name}</button>
            </li>
          ))}
        </ul>
      )}
      <footer class="version">{t.version(__APP_VERSION__)}</footer>
    </main>
  );
}
