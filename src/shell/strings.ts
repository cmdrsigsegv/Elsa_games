// Every word shown on screen lives here, so a second language is one more
// object with the same keys.

import type { HintWhy } from '../games/sudoku/rules';

const unit = { row: 'row', column: 'column', box: 'box' };

const en = {
  appName: "Elsa's Games",
  version: (v: string) => `Version ${v}`,

  games: { sudoku: 'Sudoku', nonogram: 'Nonogram' } as Record<string, string>,

  /** Words for each game's options: options.<game id>.<option key>. */
  options: {
    sudoku: {
      mistakes: {
        label: 'Mark a wrong number in red',
        choices: { obvious: 'Only when it clashes', always: 'Straight away' },
      },
    },
    nonogram: {
      mistakes: {
        label: 'Mark a wrong square in red',
        choices: { never: 'Only when I ask', always: 'Straight away' },
      },
    },
  } as Record<string, Record<string, { label: string; choices: Record<string, string> }>>,

  home: {
    continue: 'Continue',
    newPuzzle: 'New puzzle',
    level: (n: number) => `Level ${n}`,
  },

  play: {
    back: 'Back',
    newPuzzle: 'New',
    options: 'Options',
    done: 'Done',
    preparing: 'Making a puzzle…',
    solved: 'Solved!',
    howWasIt: 'How was that one?',
    tooEasy: 'Too easy',
    justRight: 'Just right',
    tooHard: 'Too hard',
    skip: 'Next puzzle',
    home: 'Home',
    hints: (n: number) => (n === 1 ? '1 hint' : `${n} hints`),
    abandonTitle: 'Start a new puzzle?',
    abandonBody: 'This one will not be saved.',
    abandonYes: 'New puzzle',
    abandonNo: 'Keep playing',
  },

  sudoku: {
    undo: 'Undo',
    erase: 'Erase',
    notes: 'Notes',
    on: 'on',
    off: 'off',
    hint: 'Hint',
    hintAgain: 'Tap Hint again to fill it in.',
    hintFix: 'Tap Hint again to fix it.',
    somethingWrong: 'Some numbers are wrong.',
    showMe: 'Show me',
    slips: (n: number) =>
      n === 1 ? 'The number in red is wrong.' : `The ${n} numbers in red are wrong. It started at number 1.`,
    why: (why: HintWhy): string => {
      switch (why.kind) {
        case 'wrong':
          return 'This number is wrong.';
        case 'lastInUnit':
          return `This is the last empty cell in its ${unit[why.unit]}.`;
        case 'onlyPlace':
          return `One number in this ${unit[why.unit]} can only go here.`;
        case 'onlyNumber':
          return 'Only one number fits in this cell.';
        case 'advanced':
          return 'This one takes a harder trick.';
      }
    },
  },

  nonogram: {
    fill: 'Fill',
    cross: 'Cross',
    undo: 'Undo',
    hint: 'Hint',
    hintWrong: 'This square is wrong. Tap Hint again to fix it.',
    hintLine: (line: 'row' | 'column') =>
      `Something can be worked out in this ${unit[line]}. Tap Hint again to mark it.`,
    somethingWrong: 'Some squares are wrong.',
    showMe: 'Show me',
    slips: (n: number) =>
      n === 1 ? 'The square in red is wrong.' : `The ${n} squares in red are wrong. It started at number 1.`,
  },
};

export type Strings = typeof en;

export const t: Strings = en;
