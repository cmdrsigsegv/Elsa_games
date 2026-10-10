// Every word shown on screen lives here, so a second language is one more
// object with the same keys.
const en = {
  appName: "Elsa's Games",
  noGamesYet: 'The first game is on its way.',
  version: (v: string) => `Version ${v}`,
};

export type Strings = typeof en;

export const t: Strings = en;
