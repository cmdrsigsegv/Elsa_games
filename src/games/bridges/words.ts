// The words Bridges shows, in each language.

export const words = {
  en: {
    name: 'Bridges',
    undo: 'Undo',
    left: (n: number) => (n === 1 ? '1 island to go' : `${n} islands to go`),
    apart: 'Every island has its bridges, but they must all join into one group.',
  },
  af: {
    name: 'Brûe',
    undo: 'Ontdoen',
    left: (n: number) => (n === 1 ? '1 eiland oor' : `${n} eilande oor`),
    apart: 'Elke eiland het sy brûe, maar almal moet in een groep verbind wees.',
  },
};
