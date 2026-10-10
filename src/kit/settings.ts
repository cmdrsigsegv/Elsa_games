// Her app-wide choices: language, colours, text size, the clock. Loaded once
// at start, applied to the page, and saved whenever one changes.

import { setLanguage, type Language } from '../shell/strings';
import { load, save } from '../storage/kv';

export interface Settings {
  language: Language;
  theme: 'system' | 'light' | 'dark';
  textSize: 'normal' | 'large' | 'larger';
  showTimer: boolean;
}

const initial: Settings = { language: 'en', theme: 'system', textSize: 'normal', showTimer: false };

let current: Settings = initial;
const listeners = new Set<() => void>();

export const settings = (): Settings => current;

/** Puts the settings into effect: the page's language, colours and text size. */
function apply() {
  setLanguage(current.language);
  const root = document.documentElement;
  root.lang = current.language;
  root.dataset.theme = current.theme;
  root.dataset.text = current.textSize;
  for (const listener of listeners) listener();
}

export async function loadSettings(): Promise<void> {
  current = { ...initial, ...(await load<Partial<Settings>>('settings')) };
  apply();
}

export function changeSettings(change: Partial<Settings>) {
  current = { ...current, ...change };
  void save('settings', current);
  apply();
}

/** Calls `listener` after every change. Returns a function that stops it. */
export function onSettingsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
