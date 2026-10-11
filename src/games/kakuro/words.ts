// Kakuro's own words, once per language. The buttons it shares with sudoku
// (Undo, Erase, Notes) take theirs from the shared strings file.

export const words = {
  en: {
    name: 'Kakuro',
    /** The two clues of the selected cell, spelled out: on a big grid the numbers in the black cells are small. */
    clues: (across: number, acrossCells: number, down: number, downCells: number) =>
      `Across: ${across} in ${acrossCells} cells. Down: ${down} in ${downCells} cells.`,
    repeated: 'A number is repeated in a run.',
    badSum: 'A run does not add up to its clue.',
  },
  af: {
    name: 'Kakuro',
    clues: (across: number, acrossCells: number, down: number, downCells: number) =>
      `Dwars: ${across} in ${acrossCells} blokkies. Af: ${down} in ${downCells} blokkies.`,
    repeated: '’n Nommer kom twee keer in dieselfde reeks voor.',
    badSum: '’n Reeks tel nie op tot sy leidraad nie.',
  },
};
