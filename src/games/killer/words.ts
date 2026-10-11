// The words that only killer sudoku needs, once per language. The buttons it
// shares with plain sudoku (Undo, Erase, Notes, Hint) use sudoku's words.

export const words = {
  en: {
    name: 'Killer Sudoku',
    cage: (total: number, cells: number, left: number, open: number) =>
      open === 0 ? `This cage: ${total} in ${cells} cells.` : `This cage: ${total} in ${cells} cells. Still to place: ${left} in ${open}.`,
    lastInCage: 'This is the last empty cell in its cage: what is left of the total goes here.',
    fortyFive: 'Every row, column and box adds up to 45. Add up the cages around this cell and its number is what is left.',
  },
  af: {
    name: 'Killer Sudoku',
    cage: (total: number, cells: number, left: number, open: number) =>
      open === 0 ? `Hierdie hok: ${total} in ${cells} blokkies.` : `Hierdie hok: ${total} in ${cells} blokkies. Nog te plaas: ${left} in ${open}.`,
    lastInCage: 'Dit is die laaste oop blokkie in sy hok: wat van die totaal oorbly, kom hier.',
    fortyFive: 'Elke ry, kolom en blok tel op tot 45. Tel die hokke rondom hierdie blokkie op, en sy nommer is wat oorbly.',
  },
};
