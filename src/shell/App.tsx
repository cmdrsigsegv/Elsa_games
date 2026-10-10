import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../kit/game';
import { Home } from './Home';
import { Play } from './Play';

export function App() {
  const [playing, setPlaying] = useState<Game | null>(null);

  // Opening a game adds a history entry, so the phone's back button returns
  // to the home screen instead of closing the app.
  useEffect(() => {
    const onBack = () => setPlaying(null);
    addEventListener('popstate', onBack);
    return () => removeEventListener('popstate', onBack);
  }, []);

  const open = (game: Game) => {
    history.pushState({ game: game.id }, '');
    setPlaying(game);
  };

  return playing ? <Play game={playing} onExit={() => history.back()} /> : <Home onOpen={open} />;
}
