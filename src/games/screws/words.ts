export const words = {
  en: {
    name: 'Screws',
    undo: 'Undo',
    left: (n: number) => (n === 1 ? '1 screw left' : `${n} screws left`),
    covered: 'A plate is in the way of that screw.',
    noRoom: 'No box for that colour, and the spare holes are full.',
  },
  af: {
    name: 'Skroewe',
    undo: 'Ontdoen',
    left: (n: number) => (n === 1 ? '1 skroef oor' : `${n} skroewe oor`),
    covered: '’n Plaat is in die pad van daardie skroef.',
    noRoom: 'Geen boks vir daardie kleur nie, en die spaargate is vol.',
  },
};
