// Every word shown on screen lives here, once per language. A new language is
// one more object with the same keys, plus its entry in `languages`.

import type { HintWhy } from '../games/sudoku/rules';

type Unit = 'row' | 'column' | 'box';
type OptionWords = Record<string, Record<string, { label: string; choices: Record<string, string> }>>;

const enUnit: Record<Unit, string> = { row: 'row', column: 'column', box: 'box' };

const en = {
  appName: "Elsa's Games",
  version: (v: string) => `Version ${v}`,

  games: { sudoku: 'Sudoku', nonogram: 'Nonogram', arrows: 'Arrows', stack: 'Blocks', gridlock: 'Gridlock' } as Record<string, string>,

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
  } as OptionWords,

  home: {
    continue: 'Continue',
    newPuzzle: 'New puzzle',
    level: (n: number) => `Level ${n}`,
    statistics: 'Statistics',
    settings: 'Settings',
    updateReady: 'A new version is ready. Tap to update.',
    checkUpdate: 'Check for an update',
    checking: 'Checking…',
    upToDate: 'Up to date',
  },

  play: {
    back: 'Back',
    newPuzzle: 'New',
    options: 'Options',
    done: 'Done',
    preparing: 'Making a puzzle…',
    solved: 'Solved!',
    gameOver: 'Game over',
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

  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Colours',
    themes: { system: 'Same as phone', light: 'Light', dark: 'Dark' },
    textSize: 'Text size',
    textSizes: { normal: 'Normal', large: 'Large', larger: 'Larger' },
    timer: 'Show the clock while playing',
    yes: 'Yes',
    no: 'No',
    backup: 'Backup',
    backupBody: 'Save every game, level and setting to a file, or bring them back from one.',
    save: 'Save a backup',
    restore: 'Restore from a backup',
    restoreSure: 'Restoring replaces everything on this phone with what is in the file.',
    restoreYes: 'Restore',
    cancel: 'Cancel',
    badFile: 'That file is not a backup from this app.',
  },

  stats: {
    title: 'Statistics',
    none: 'Nothing played yet.',
    solved: 'Solved',
    noHints: 'Without a hint',
    averageTime: 'Usual time',
    level: 'Level now',
    levelOverTime: 'Level, puzzle by puzzle',
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
          return `This is the last empty cell in its ${enUnit[why.unit]}.`;
        case 'onlyPlace':
          return `One number in this ${enUnit[why.unit]} can only go here.`;
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
      `Something can be worked out in this ${enUnit[line]}. Tap Hint again to mark it.`,
    somethingWrong: 'Some squares are wrong.',
    showMe: 'Show me',
    slips: (n: number) =>
      n === 1 ? 'The square in red is wrong.' : `The ${n} squares in red are wrong. It started at number 1.`,
  },

  arrows: {
    undo: 'Undo',
    hint: 'Hint',
    left: (n: number) => (n === 1 ? '1 arrow left' : `${n} arrows left`),
    blocked: 'Another arrow is in the way.',
    hinted: 'This arrow can go.',
    lives: (n: number) => (n === 1 ? '1 life left' : `${n} lives left`),
  },

  gridlock: {
    undo: 'Undo',
    hint: 'Hint',
    moves: (n: number) => (n === 1 ? '1 slide' : `${n} slides`),
    par: (n: number) => `Can be done in ${n}`,
    hinted: 'Slide this one. Tap Hint again to see where.',
  },

  blocks: {
    score: (n: number) => `Score ${n}`,
    best: (n: number) => `Best ${n}`,
    newBest: 'New best!',
    pass: 'Leave it and drop',
  },
};

export type Strings = typeof en;

const afUnit: Record<Unit, string> = { row: 'ry', column: 'kolom', box: 'blok' };

const af: Strings = {
  appName: 'Elsa se Speletjies',
  version: (v) => `Weergawe ${v}`,

  games: { sudoku: 'Sudoku', nonogram: 'Nonogram', arrows: 'Pyle', stack: 'Blokke', gridlock: 'Verkeersknoop' },

  options: {
    sudoku: {
      mistakes: {
        label: 'Merk ’n verkeerde nommer rooi',
        choices: { obvious: 'Net as dit bots', always: 'Dadelik' },
      },
    },
    nonogram: {
      mistakes: {
        label: 'Merk ’n verkeerde blokkie rooi',
        choices: { never: 'Net as ek vra', always: 'Dadelik' },
      },
    },
  },

  home: {
    continue: 'Gaan voort',
    newPuzzle: 'Nuwe raaisel',
    level: (n) => `Vlak ${n}`,
    statistics: 'Statistiek',
    settings: 'Instellings',
    updateReady: '’n Nuwe weergawe is gereed. Tik om op te dateer.',
    checkUpdate: 'Soek ’n opdatering',
    checking: 'Soek…',
    upToDate: 'Op datum',
  },

  play: {
    back: 'Terug',
    newPuzzle: 'Nuwe',
    options: 'Opsies',
    done: 'Klaar',
    preparing: 'Maak ’n raaisel…',
    solved: 'Opgelos!',
    gameOver: 'Spel verby',
    howWasIt: 'Hoe was daardie een?',
    tooEasy: 'Te maklik',
    justRight: 'Net reg',
    tooHard: 'Te moeilik',
    skip: 'Volgende raaisel',
    home: 'Tuis',
    hints: (n) => (n === 1 ? '1 wenk' : `${n} wenke`),
    abandonTitle: 'Begin ’n nuwe raaisel?',
    abandonBody: 'Hierdie een sal nie gestoor word nie.',
    abandonYes: 'Nuwe raaisel',
    abandonNo: 'Speel verder',
  },

  settings: {
    title: 'Instellings',
    language: 'Taal',
    theme: 'Kleure',
    themes: { system: 'Soos die foon', light: 'Lig', dark: 'Donker' },
    textSize: 'Teksgrootte',
    textSizes: { normal: 'Normaal', large: 'Groot', larger: 'Groter' },
    timer: 'Wys die horlosie terwyl jy speel',
    yes: 'Ja',
    no: 'Nee',
    backup: 'Rugsteun',
    backupBody: 'Stoor elke speletjie, vlak en instelling in ’n lêer, of bring dit terug uit een.',
    save: 'Stoor ’n rugsteun',
    restore: 'Herstel uit ’n rugsteun',
    restoreSure: 'Herstel vervang alles op hierdie foon met wat in die lêer is.',
    restoreYes: 'Herstel',
    cancel: 'Kanselleer',
    badFile: 'Daardie lêer is nie ’n rugsteun van hierdie app nie.',
  },

  stats: {
    title: 'Statistiek',
    none: 'Nog niks gespeel nie.',
    solved: 'Opgelos',
    noHints: 'Sonder ’n wenk',
    averageTime: 'Gewone tyd',
    level: 'Vlak nou',
    levelOverTime: 'Vlak, raaisel vir raaisel',
  },

  sudoku: {
    undo: 'Ontdoen',
    erase: 'Vee uit',
    notes: 'Notas',
    on: 'aan',
    off: 'af',
    hint: 'Wenk',
    hintAgain: 'Tik weer op Wenk om dit in te vul.',
    hintFix: 'Tik weer op Wenk om dit reg te maak.',
    somethingWrong: 'Party nommers is verkeerd.',
    showMe: 'Wys my',
    slips: (n) =>
      n === 1 ? 'Die nommer in rooi is verkeerd.' : `Die ${n} nommers in rooi is verkeerd. Dit het by nommer 1 begin.`,
    why: (why) => {
      switch (why.kind) {
        case 'wrong':
          return 'Hierdie nommer is verkeerd.';
        case 'lastInUnit':
          return `Dit is die laaste oop blokkie in sy ${afUnit[why.unit]}.`;
        case 'onlyPlace':
          return `Een nommer in hierdie ${afUnit[why.unit]} kan net hier pas.`;
        case 'onlyNumber':
          return 'Net een nommer pas in hierdie blokkie.';
        case 'advanced':
          return 'Hierdie een vra ’n moeiliker tegniek.';
      }
    },
  },

  nonogram: {
    fill: 'Vul',
    cross: 'Kruis',
    undo: 'Ontdoen',
    hint: 'Wenk',
    hintWrong: 'Hierdie blokkie is verkeerd. Tik weer op Wenk om dit reg te maak.',
    hintLine: (line) => `Iets kan in hierdie ${afUnit[line]} uitgewerk word. Tik weer op Wenk om dit te merk.`,
    somethingWrong: 'Party blokkies is verkeerd.',
    showMe: 'Wys my',
    slips: (n) =>
      n === 1 ? 'Die blokkie in rooi is verkeerd.' : `Die ${n} blokkies in rooi is verkeerd. Dit het by nommer 1 begin.`,
  },

  arrows: {
    undo: 'Ontdoen',
    hint: 'Wenk',
    left: (n) => (n === 1 ? '1 pyl oor' : `${n} pyle oor`),
    blocked: '’n Ander pyl is in die pad.',
    hinted: 'Hierdie pyl kan gaan.',
    lives: (n) => (n === 1 ? '1 lewe oor' : `${n} lewens oor`),
  },

  gridlock: {
    undo: 'Ontdoen',
    hint: 'Wenk',
    moves: (n) => (n === 1 ? '1 skuif' : `${n} skuiwe`),
    par: (n) => `Kan in ${n} gedoen word`,
    hinted: 'Skuif hierdie een. Tik weer op Wenk om te sien waarheen.',
  },

  blocks: {
    score: (n) => `Telling ${n}`,
    best: (n) => `Beste ${n}`,
    newBest: 'Nuwe beste!',
    pass: 'Los dit en laat val',
  },
};

/** The languages on offer, each under its own name for itself. */
export const languages = {
  en: { name: 'English', strings: en },
  af: { name: 'Afrikaans', strings: af },
};
export type Language = keyof typeof languages;

/** The words of the language in use. Reassigned by setLanguage; screens redraw afterwards. */
export let t: Strings = en;

export function setLanguage(language: Language) {
  t = languages[language].strings;
}
