// Every word shown on screen lives here, once per language. A new language is
// one more object with the same keys, plus its entry in `languages`.

import type { HintWhy } from '../games/sudoku/rules';

type Unit = 'row' | 'column' | 'box';
type OptionWords = Record<string, Record<string, { label: string; choices: Record<string, string> }>>;

const enUnit: Record<Unit, string> = { row: 'row', column: 'column', box: 'box' };

const en = {
  appName: "Elsa's Games",
  version: (v: string) => `Version ${v}`,

  games: { kakuro: 'Kakuro', killer: 'Killer Sudoku', binairo: 'Binairo', tents: 'Tents and Trees', bridges: 'Bridges', screws: 'Screws', sudoku: 'Sudoku', nonogram: 'Nonogram', stack: 'Blocks', gridlock: 'Gridlock', pour: 'Liquids' } as Record<string, string>,

  /** Words for each game's options: options.<game id>.<option key>. */
  options: {
    killer: {
      mistakes: {
        label: 'Mark a wrong number in red',
        choices: { obvious: 'Only when it clashes', always: 'Straight away' },
      },
    },
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
    difficulty: (n: number) => `Difficulty ${n}`,
    solvedOf: (n: number, of: number) => `${n} of ${of} solved`,
    statistics: 'Statistics',
    settings: 'Settings',
    updateReady: 'A new version is ready. Tap to update.',
    checkUpdate: 'Check for an update',
    checking: 'Checking…',
    upToDate: 'Up to date',
  },

  play: {
    back: 'Back',
    restart: 'Restart',
    rules: 'How to play',
    goal: 'The goal',
    theRules: 'The rules',
    onScreen: 'On the screen',
    gotIt: 'Got it',
    puzzle: (n: number) => `Puzzle ${n}`,
    options: 'Options',
    done: 'Done',
    preparing: 'Making a puzzle…',
    solved: 'Solved!',
    gameOver: 'Game over',
    next: 'Next puzzle',
    nextSet: 'Set finished! On to the next',
    allPuzzles: 'All puzzles',
    again: 'Play again',
    hints: (n: number) => (n === 1 ? '1 hint' : `${n} hints`),
    restartTitle: 'Start this one again?',
    restartYes: 'Restart',
    restartNo: 'Keep playing',
  },

  picker: {
    of: (n: number, of: number) => `Difficulty ${n} of ${of}`,
    easier: 'Easier',
    harder: 'Harder',
    play: 'Play',
    setDone: 'Set finished. Next set',
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
    difficulty: 'Difficulty now',
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

  gridlock: {
    undo: 'Undo',
    moves: (n: number) => (n === 1 ? '1 slide' : `${n} slides`),
    par: (n: number) => `Can be done in ${n}`,
  },

  pour: {
    undo: 'Undo',
    moves: (n: number) => (n === 1 ? '1 pour' : `${n} pours`),
    stuck: 'No pour left that helps. Undo, or restart.',
  },

  blocks: {
    score: (n: number) => `Score ${n}`,
    best: (n: number) => `Best ${n}`,
    newBest: 'New best!',
    pass: 'Leave it and drop',
    chain: (n: number) => `Chain ×${n}`,
  },
};

export type Strings = typeof en;

const afUnit: Record<Unit, string> = { row: 'ry', column: 'kolom', box: 'blok' };

const af: Strings = {
  appName: 'Elsa se Speletjies',
  version: (v) => `Weergawe ${v}`,

  games: { kakuro: 'Kakuro', killer: 'Killer Sudoku', binairo: 'Binairo', tents: 'Tente en Bome', bridges: 'Brûe', screws: 'Skroewe', sudoku: 'Sudoku', nonogram: 'Nonogram', stack: 'Blokke', gridlock: 'Verkeersknoop', pour: 'Vloeistowwe' },

  options: {
    killer: {
      mistakes: {
        label: 'Merk ’n verkeerde nommer rooi',
        choices: { obvious: 'Net as dit bots', always: 'Dadelik' },
      },
    },
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
    difficulty: (n) => `Moeilikheid ${n}`,
    solvedOf: (n, of) => `${n} van ${of} opgelos`,
    statistics: 'Statistiek',
    settings: 'Instellings',
    updateReady: '’n Nuwe weergawe is gereed. Tik om op te dateer.',
    checkUpdate: 'Soek ’n opdatering',
    checking: 'Soek…',
    upToDate: 'Op datum',
  },

  play: {
    back: 'Terug',
    restart: 'Begin oor',
    rules: 'Hoe om te speel',
    goal: 'Die doel',
    theRules: 'Die reëls',
    onScreen: 'Op die skerm',
    gotIt: 'Reg so',
    puzzle: (n) => `Raaisel ${n}`,
    options: 'Opsies',
    done: 'Klaar',
    preparing: 'Maak ’n raaisel…',
    solved: 'Opgelos!',
    gameOver: 'Spel verby',
    next: 'Volgende raaisel',
    nextSet: 'Stel klaar! Aan na die volgende',
    allPuzzles: 'Alle raaisels',
    again: 'Speel weer',
    hints: (n) => (n === 1 ? '1 wenk' : `${n} wenke`),
    restartTitle: 'Begin hierdie een oor?',
    restartYes: 'Begin oor',
    restartNo: 'Speel verder',
  },

  picker: {
    of: (n, of) => `Moeilikheid ${n} van ${of}`,
    easier: 'Makliker',
    harder: 'Moeiliker',
    play: 'Speel',
    setDone: 'Stel klaar. Volgende stel',
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
    difficulty: 'Moeilikheid nou',
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

  gridlock: {
    undo: 'Ontdoen',
    moves: (n) => (n === 1 ? '1 skuif' : `${n} skuiwe`),
    par: (n) => `Kan in ${n} gedoen word`,
  },

  pour: {
    undo: 'Ontdoen',
    moves: (n) => (n === 1 ? '1 keer gegooi' : `${n} keer gegooi`),
    stuck: 'Niks meer om te gooi wat help nie. Ontdoen, of begin oor.',
  },

  blocks: {
    score: (n) => `Telling ${n}`,
    best: (n) => `Beste ${n}`,
    newBest: 'Nuwe beste!',
    pass: 'Los dit en laat val',
    chain: (n) => `Ketting ×${n}`,
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
