import { describe, expect, it } from 'vitest';
import { countSolutions } from './count';
import { bandFor, generate } from './generate';
import { DARK, EMPTY, LIGHT, apply, breaks, emptyCells, start, status, type BinairoPuzzle } from './rules';
import { fullLines, solve } from './solve';
import { words } from './words';

/** A grid from rows of text: X dark, O light, a dot for empty. */
const grid = (...rows: string[]): number[] => [...rows.join('')].map((ch) => (ch === 'X' ? DARK : ch === 'O' ? LIGHT : EMPTY));
const puzzle = (...rows: string[]): BinairoPuzzle => ({ seed: 0, score: 0, size: rows.length, givens: grid(...rows) });

const SOLVED = ['XXOO', 'OOXX', 'XOXO', 'OXOX'];

describe('rules', () => {
  it('cycles a cell through dark, light and empty, and leaves the old state alone', () => {
    const p = puzzle('X...', '....', '....', '....');
    const s0 = start(p);
    const s1 = apply(p, s0, { cell: 5 });
    const s2 = apply(p, s1, { cell: 5 });
    const s3 = apply(p, s2, { cell: 5 });
    expect([s1.cells[5], s2.cells[5], s3.cells[5]]).toEqual([DARK, LIGHT, EMPTY]);
    expect(s0.cells[5]).toBe(EMPTY);
    expect(s3.cells).toEqual(s0.cells);
  });

  it('never changes a given, and ignores a tap off the grid', () => {
    const p = puzzle('X...', '....', '....', '...O');
    const s = start(p);
    expect(apply(p, s, { cell: 0 })).toBe(s);
    expect(apply(p, s, { cell: 15 })).toBe(s);
    expect(apply(p, s, { cell: 16 })).toBe(s);
    expect(apply(p, s, { cell: -1 })).toBe(s);
  });

  it('marks three alike in a line, across and down', () => {
    const across = breaks(6, grid('.OOO..', '......', '......', '......', '......', '......'));
    expect(across.kinds).toEqual(['three']);
    expect([...across.cells].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    const down = breaks(6, grid('......', '....X.', '....X.', '....X.', '......', '......'));
    expect(down.kinds).toEqual(['three']);
    expect([...down.cells].sort((a, b) => a - b)).toEqual([10, 16, 22]);
  });

  it('marks a row or column with more than half of one kind', () => {
    const across = breaks(6, grid('XX.X.X', '......', '......', '......', '......', '......'));
    expect(across.kinds).toEqual(['tooMany']);
    expect([...across.cells].sort((a, b) => a - b)).toEqual([0, 1, 3, 5]);
    const down = breaks(6, grid('O.....', 'O.....', '......', 'O.....', '......', 'O.....'));
    expect(down.kinds).toEqual(['tooMany']);
    expect(down.cells.size).toBe(4);
    // Exactly half is fine.
    expect(breaks(6, grid('XX.X..', '......', '......', '......', '......', '......')).cells.size).toBe(0);
  });

  it('marks two finished rows, or two finished columns, that are the same', () => {
    const rows = breaks(4, grid('XOXO', '....', 'XOXO', '....'));
    expect(rows.kinds).toEqual(['sameRows']);
    expect([...rows.cells].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 8, 9, 10, 11]);
    const cols = breaks(4, grid('X..X', 'O..O', 'O..O', 'X..X'));
    expect(cols.kinds).toEqual(['sameColumns']);
    expect(cols.cells.size).toBe(8);
    // An unfinished row is not yet a copy of anything.
    expect(breaks(4, grid('XOXO', '....', 'XOX.', '....')).cells.size).toBe(0);
  });

  it('does not mark a circle that breaks no rule, even where the answer differs', () => {
    const p = generate(1, 40);
    const answer = solve(p.size, p.givens).cells;
    // Put the wrong circle in each empty cell in turn: most break nothing that can be seen.
    let unseen = 0;
    p.givens.forEach((given, cell) => {
      if (given) return;
      const wrong = start(p);
      wrong.cells[cell] = answer[cell] === DARK ? LIGHT : DARK;
      if (breaks(p.size, wrong.cells).cells.size === 0) unseen++;
      expect(status(p, wrong).ended).toBe(false);
    });
    expect(unseen).toBeGreaterThan(10);
  });

  it('ends when the grid is full and keeps every rule, and not before', () => {
    const p = puzzle('.XOO', 'OOXX', 'XOXO', 'OXOX');
    const s0 = start(p);
    expect(status(p, s0).ended).toBe(false);
    const dark = apply(p, s0, { cell: 0 });
    expect(dark.cells).toEqual(grid(...SOLVED));
    expect(status(p, dark).ended).toBe(true);
    // Full, but with the wrong circle: the row has too many light ones.
    const light = apply(p, dark, { cell: 0 });
    expect(emptyCells(light.cells)).toBe(0);
    expect(status(p, light).ended).toBe(false);
    expect(breaks(4, light.cells).kinds).toContain('tooMany');
  });
});

describe('solver', () => {
  const blank = '......';

  it('puts the other kind beside a pair and in a gap', () => {
    const pair = solve(6, grid('.XX...', blank, blank, blank, blank, blank), 1);
    expect([pair.cells[0], pair.cells[3]]).toEqual([LIGHT, LIGHT]);
    expect(pair.uses.pair).toBe(2);
    const gap = solve(6, grid('.O.O..', blank, blank, blank, blank, blank), 1);
    expect(gap.cells[2]).toBe(DARK);
    expect(gap.uses.gap).toBe(1);
  });

  it('finishes a line that has its half of one kind', () => {
    const givens = grid('X.X..X', blank, blank, blank, blank, blank);
    expect(solve(6, givens, 1).cells.slice(0, 6)).toEqual(grid('XOX..X'));
    const s = solve(6, givens, 2);
    expect(s.cells.slice(0, 6)).toEqual(grid('XOXOOX'));
    expect(s.uses.count).toBe(2);
  });

  it('looks ahead: a circle that would force three alike elsewhere in the line is ruled out', () => {
    // One light left to place. At the end it would leave three dark together.
    const givens = grid('OOX...', blank, blank, blank, blank, blank);
    expect(solve(6, givens, 2).cells[5]).toBe(EMPTY);
    const s = solve(6, givens, 3);
    expect(s.cells[5]).toBe(DARK);
    expect(s.uses.lookahead).toBe(1);
    expect(s.hardest).toBe(3);
  });

  it('keeps a line from copying a finished one', () => {
    const givens = grid('XOXOXO', 'XOXO..', blank, blank, blank, blank);
    expect(solve(6, givens, 3).cells.slice(10, 12)).toEqual([EMPTY, EMPTY]);
    const s = solve(6, givens, 4);
    expect(s.cells.slice(10, 12)).toEqual([LIGHT, DARK]);
    expect(s.uses.duplicate).toBe(2);
  });

  it('tries every way to finish a line with few cells left, and keeps what they agree on', () => {
    const rest = new Array<string>(9).fill('..........');
    const givens = grid('XXO..XO...', ...rest);
    expect(solve(10, givens, 4).cells[9]).toBe(EMPTY);
    const s = solve(10, givens, 5);
    expect(s.cells[9]).toBe(LIGHT);
    expect(s.uses.smallLine).toBe(1);
    expect(s.hardest).toBe(5);
    // What it filled in holds in every legal line that fits the givens.
    const fits = [...fullLines(10)].filter((way) => (way & 0b100011) === 0b100011 && !(way & 0b1000100));
    expect(fits.length).toBeGreaterThan(1);
    expect(fits.every((way) => !(way & (1 << 9)))).toBe(true);
  });

  it('does not call an unfinished or impossible grid solved', () => {
    expect(solve(4, grid('....', '....', '....', '....')).solved).toBe(false);
    expect(solve(4, grid('XXX.', '....', '....', '....')).solved).toBe(false);
    expect(solve(4, grid('XOXO', 'OXOX', 'XOXO', 'OXOX')).solved).toBe(false); // rows repeat
    expect(solve(4, grid(...SOLVED)).solved).toBe(true);
  });
});

describe('brute-force counter', () => {
  it('counts every legal grid', () => {
    // Known totals for 4x4 and 6x6 grids.
    expect(countSolutions(4, new Array<number>(16).fill(0), 1000)).toBe(72);
    expect(countSolutions(6, new Array<number>(36).fill(0), 10000)).toBe(4140);
  });

  it('stops at the limit, and finds none where the givens break a rule', () => {
    expect(countSolutions(4, new Array<number>(16).fill(0))).toBe(2);
    expect(countSolutions(4, grid('XXX.', '....', '....', '....'))).toBe(0);
    expect(countSolutions(4, grid(...SOLVED))).toBe(1);
  });
});

describe('generator', () => {
  it('gives the same puzzle for the same seed', () => {
    expect(generate(8, 70)).toEqual(generate(8, 70));
    expect(generate(8, 70).givens).not.toEqual(generate(9, 70).givens);
  });

  it.each([40, 60, 80, 100])(
    'makes a puzzle with one solution, found without guessing, at level %i',
    (target) => {
      const band = bandFor(target);
      for (let seed = 1; seed <= 3; seed++) {
        const p = generate(seed * 31 + target, target);
        expect(p.size).toBe(band.size);
        expect(p.size % 2).toBe(0);
        expect(p.givens.length).toBe(p.size * p.size);
        expect(p.score).toBeGreaterThanOrEqual(0);
        expect(p.score).toBeLessThanOrEqual(100);
        expect(emptyCells(p.givens)).toBeGreaterThan(p.givens.length / 2);

        // The solver finishes it with no more than the level allows...
        const s = solve(p.size, p.givens, band.tier);
        expect(s.solved).toBe(true);
        expect(s.hardest).toBeLessThanOrEqual(band.tier);
        expect(breaks(p.size, s.cells).cells.size).toBe(0);
        p.givens.forEach((v, i) => v && expect(s.cells[i]).toBe(v));
        // ...and the game agrees that what it found is the end.
        expect(status(p, { cells: s.cells }).ended).toBe(true);
        // Trying everything finds that same solution and no other.
        expect(countSolutions(p.size, p.givens)).toBe(1);
        expect(countSolutions(p.size, s.cells)).toBe(1);
      }
    },
    60_000,
  );

  it('agrees with brute force across many small puzzles', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const p = generate(seed, 20 + (seed % 5) * 10);
      expect(solve(p.size, p.givens).solved).toBe(true);
      expect(countSolutions(p.size, p.givens)).toBe(1);
    }
  });

  it('leaves no given that could be taken away at its level', () => {
    const p = generate(5, 60);
    const band = bandFor(60);
    p.givens.forEach((v, i) => {
      if (!v) return;
      const fewer = [...p.givens];
      fewer[i] = EMPTY;
      expect(solve(p.size, fewer, band.tier).solved).toBe(false);
    });
  });

  it('makes bigger grids needing harder reasoning at higher levels', () => {
    let size = 0;
    let tier = 0;
    for (let level = 0; level <= 100; level++) {
      const band = bandFor(level);
      expect(band.size).toBeGreaterThanOrEqual(size);
      if (band.size === size) expect(band.tier).toBeGreaterThanOrEqual(tier);
      ({ size, tier } = band);
    }
    expect(bandFor(40).size).toBe(8);
    expect(bandFor(100).size).toBe(14);
    expect(bandFor(100).tier).toBe(6);

    const easy = generate(3, 40);
    const hard = generate(3, 100);
    expect(hard.size).toBeGreaterThan(easy.size);
    expect(hard.score).toBeGreaterThan(easy.score);
    expect(emptyCells(hard.givens)).toBeGreaterThan(emptyCells(easy.givens));
    // The easy one falls to pairs, gaps and counting; the hard one needs every
    // way of finishing a nearly empty line to be weighed.
    expect(solve(easy.size, easy.givens).hardest).toBeLessThanOrEqual(2);
    expect(solve(hard.size, hard.givens, 5).solved).toBe(false);
    expect(solve(hard.size, hard.givens, 6).solved).toBe(true);
  });

  it('scores within the band it was asked for when the puzzle needs that reasoning', () => {
    for (const target of [40, 64, 82, 97]) {
      const p = generate(target, target);
      const band = bandFor(target);
      if (solve(p.size, p.givens).hardest === band.tier) expect(bandFor(p.score)).toBe(band);
    }
  });
});

describe('words', () => {
  it('has every string in both languages', () => {
    expect(Object.keys(words.af)).toEqual(Object.keys(words.en));
    expect(Object.keys(words.af.broken)).toEqual(Object.keys(words.en.broken));
    expect(words.af.left(3)).not.toBe(words.en.left(3));
  });
});
