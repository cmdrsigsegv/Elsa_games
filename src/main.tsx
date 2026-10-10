import { render } from 'preact';
import { App } from './shell/App';
import { keepStorage } from './storage/kv';
import './shell/app.css';

keepStorage();
render(<App />, document.getElementById('app')!);
