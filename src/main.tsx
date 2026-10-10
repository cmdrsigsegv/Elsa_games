import { render } from 'preact';
import { Home } from './shell/Home';
import './shell/app.css';

render(<Home />, document.getElementById('app')!);
