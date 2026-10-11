// Every word the Binairo screen shows, once per language.

import type { BreakKind } from './rules';

interface Words {
  title: string;
  undo: string;
  /** What is wrong, for each rule break that can be seen on the board. */
  broken: Record<BreakKind, string>;
  left(n: number): string;
}

export const words: { en: Words; af: Words } = {
  en: {
    title: 'Binairo',
    undo: 'Undo',
    broken: {
      three: 'Three alike in a line.',
      tooMany: 'Too many of one kind in a row or column.',
      sameRows: 'Two rows are the same.',
      sameColumns: 'Two columns are the same.',
    },
    left: (n) => (n === 1 ? '1 cell left' : `${n} cells left`),
  },
  af: {
    title: 'Binairo',
    undo: 'Ontdoen',
    broken: {
      three: 'Drie eenderse ná mekaar.',
      tooMany: 'Te veel van een soort in ’n ry of kolom.',
      sameRows: 'Twee rye is dieselfde.',
      sameColumns: 'Twee kolomme is dieselfde.',
    },
    left: (n) => (n === 1 ? '1 blokkie oor' : `${n} blokkies oor`),
  },
};
