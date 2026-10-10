import { render } from 'preact';
import { App } from './shell/App';
import { loadSettings } from './kit/settings';
import { keepStorage } from './storage/kv';
import './shell/app.css';

keepStorage();
// Settings first, so the first thing drawn is already in her language and colours.
void loadSettings().then(() => render(<App />, document.getElementById('app')!));
