import { useEffect, useState } from 'preact/hooks';
import type { Game } from '../kit/game';
import { placeKey, type Place } from '../kit/progress';
import { onSettingsChange } from '../kit/settings';
import { Home } from './Home';
import { Picker } from './Picker';
import { Play } from './Play';
import { Settings } from './Settings';
import { Stats } from './Stats';

type Screen =
  | { at: 'home' }
  | { at: 'picker'; game: Game }
  | { at: 'play'; game: Game; place: Place }
  | { at: 'stats' }
  | { at: 'settings' };

export function App() {
  // The screens she has come through; the last is on show. The phone's back
  // button steps back through them instead of closing the app.
  const [trail, setTrail] = useState<Screen[]>([{ at: 'home' }]);
  const [, redraw] = useState(0);

  useEffect(() => {
    const onBack = () => setTrail((now) => (now.length > 1 ? now.slice(0, -1) : now));
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
    setTrail((now) => [...now, to]);
  };
  /** Swaps the screen on show for another, without lengthening the way back. */
  const swap = (to: Screen) => setTrail((now) => [...now.slice(0, -1), to]);
  const back = () => history.back();

  const screen = trail[trail.length - 1];
  switch (screen.at) {
    case 'picker':
      return <Picker game={screen.game} onOpen={(place) => go({ at: 'play', game: screen.game, place })} onExit={back} />;
    case 'play':
      return (
        <Play
          key={placeKey(screen.game.id, screen.place)}
          game={screen.game}
          place={screen.place}
          onOpen={(place) => swap({ at: 'play', game: screen.game, place })}
          onExit={back}
        />
      );
    case 'stats':
      return <Stats onExit={back} />;
    case 'settings':
      return <Settings onExit={back} />;
    default:
      return <Home onOpen={(game) => go({ at: 'picker', game })} onStats={() => go({ at: 'stats' })} onSettings={() => go({ at: 'settings' })} />;
  }
}
