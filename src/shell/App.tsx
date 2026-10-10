import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../kit/game';
import { onSettingsChange } from '../kit/settings';
import { Home } from './Home';
import { Play } from './Play';
import { Settings } from './Settings';
import { Stats } from './Stats';

type Screen = { at: 'home' } | { at: 'play'; game: Game } | { at: 'stats' } | { at: 'settings' };

export function App() {
  const [screen, setScreen] = useState<Screen>({ at: 'home' });
  const [, redraw] = useState(0);

  // Leaving the home screen adds a history entry, so the phone's back button
  // returns to it instead of closing the app.
  useEffect(() => {
    const onBack = () => setScreen({ at: 'home' });
    addEventListener('popstate', onBack);
    // A change of language or colours shows at once.
    const stop = onSettingsChange(() => redraw((n) => n + 1));
    return () => {
      removeEventListener('popstate', onBack);
      stop();
    };
  }, []);

  const go = (to: Screen) => {
    history.pushState({ at: to.at }, '');
    setScreen(to);
  };
  const back = () => history.back();

  switch (screen.at) {
    case 'play':
      return <Play game={screen.game} onExit={back} />;
    case 'stats':
      return <Stats onExit={back} />;
    case 'settings':
      return <Settings onExit={back} />;
    default:
      return <Home onOpen={(game) => go({ at: 'play', game })} onStats={() => go({ at: 'stats' })} onSettings={() => go({ at: 'settings' })} />;
  }
}
