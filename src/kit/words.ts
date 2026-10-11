// A game can keep its own words beside its code, once per language, instead
// of in the shared strings file: `pick` returns the set for the language in use.

import { settings } from './settings';
import type { Language } from '../shell/strings';

export const pick = <T>(words: Record<Language, T>): T => words[settings().language];
