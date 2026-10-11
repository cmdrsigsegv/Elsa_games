// The words of Tents and Trees, once per language.

export const words = {
  en: {
    name: 'Tents and Trees',
    undo: 'Undo',
    count: (placed: number, total: number) => `Tents: ${placed} of ${total}`,
    touching: 'Tents may not touch, not even at a corner.',
    noTree: 'A tent needs a tree beside it.',
    unpaired: 'Every tree needs a tent of its own.',
  },
  af: {
    name: 'Tente en Bome',
    undo: 'Ontdoen',
    count: (placed: number, total: number) => `Tente: ${placed} van ${total}`,
    touching: 'Tente mag nie aan mekaar raak nie, ook nie skuins nie.',
    noTree: "'n Tent moet langs 'n boom staan.",
    unpaired: 'Elke boom het sy eie tent nodig.',
  },
};
