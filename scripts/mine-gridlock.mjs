// Searches for very hard Gridlock car parks and writes them to
// src/games/gridlock/hard.ts. Hard ones are far too rare to find on a phone
// while she waits, so they are found here, once, and shipped with the app.
//
//   node scripts/mine-gridlock.mjs [minutes] [fewest slides to keep]
//
// The rules below repeat src/games/gridlock/rules.ts in plain JavaScript; the
// app's tests check every mined car park against the real rules.

import { writeFileSync } from 'node:fs';

const N = 6;
const EXIT_ROW = 2;
const minutes = Number(process.argv[2] ?? 5);
const keepFrom = Number(process.argv[3] ?? 28);
const MOST_POSITIONS = 80_000;

function cover(cars, at, skip = -1) {
  const grid = new Int8Array(N * N).fill(-1);
  cars.forEach((car, i) => {
    if (i === skip) return;
    for (let k = 0; k < car.len; k++) grid[car.horizontal ? car.line * N + at[i] + k : (at[i] + k) * N + car.line] = i;
  });
  return grid;
}

function neighbours(cars, at) {
  const out = [];
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const grid = cover(cars, at, i);
    const cell = (pos) => (car.horizontal ? car.line * N + pos : pos * N + car.line);
    for (let to = at[i] - 1; to >= 0 && grid[cell(to)] < 0; to--) out.push([i, to]);
    for (let to = at[i] + 1; to + car.len <= N && grid[cell(to + car.len - 1)] < 0; to++) out.push([i, to]);
  }
  return out;
}

const solved = (cars, at) => at[0] === N - cars[0].len;

function park() {
  const cars = [{ len: 2, horizontal: true, line: EXIT_ROW }];
  const at = [Math.floor(Math.random() * 3)];
  const wanted = 10 + Math.floor(Math.random() * 5);
  for (let tries = 0; tries < 300 && cars.length <= wanted; tries++) {
    const car = { len: Math.random() < 0.3 ? 3 : 2, horizontal: Math.random() < 0.5, line: Math.floor(Math.random() * N) };
    if (car.horizontal && car.line === EXIT_ROW) continue;
    const pos = Math.floor(Math.random() * (N - car.len + 1));
    const grid = cover(cars, at);
    let clash = false;
    for (let k = 0; k < car.len; k++) if (grid[car.horizontal ? car.line * N + pos + k : (pos + k) * N + car.line] >= 0) clash = true;
    if (clash) continue;
    cars.push(car);
    at.push(pos);
  }
  return { cars, at };
}

/** The position in this car park furthest from any solved one, and how far. */
function hardest(cars, from) {
  const index = new Map([[from.join(), 0]]);
  const all = [from];
  const links = [];
  for (let i = 0; i < all.length; i++) {
    const here = [];
    for (const [car, to] of neighbours(cars, all[i])) {
      const next = all[i].slice();
      next[car] = to;
      const key = next.join();
      let j = index.get(key);
      if (j === undefined) {
        j = all.length;
        if (j >= MOST_POSITIONS) return null;
        index.set(key, j);
        all.push(next);
      }
      here.push(j);
    }
    links.push(here);
  }
  const slides = new Int32Array(all.length).fill(-1);
  let frontier = [];
  all.forEach((at, i) => {
    if (solved(cars, at)) {
      slides[i] = 0;
      frontier.push(i);
    }
  });
  if (!frontier.length) return null;
  let last = frontier[0];
  let d = 0;
  while (frontier.length) {
    last = frontier[0];
    const next = [];
    for (const i of frontier) for (const j of links[i]) if (slides[j] < 0) (slides[j] = d + 1), next.push(j);
    frontier = next;
    d++;
  }
  return { at: all[last], par: slides[last] };
}

/** A car park with one car swapped for a new one somewhere else, or one car added or taken away. */
function changed({ cars, at }) {
  const nextCars = cars.slice();
  const nextAt = at.slice();
  const roll = Math.random();
  if (nextCars.length > 8 && roll < 0.75) {
    const out = 1 + Math.floor(Math.random() * (nextCars.length - 1));
    nextCars.splice(out, 1);
    nextAt.splice(out, 1);
  }
  if (roll > 0.15) {
    for (let tries = 0; tries < 60; tries++) {
      const car = { len: Math.random() < 0.3 ? 3 : 2, horizontal: Math.random() < 0.5, line: Math.floor(Math.random() * N) };
      if (car.horizontal && car.line === EXIT_ROW) continue;
      const pos = Math.floor(Math.random() * (N - car.len + 1));
      const grid = cover(nextCars, nextAt);
      let clash = false;
      for (let k = 0; k < car.len; k++) if (grid[car.horizontal ? car.line * N + pos + k : (pos + k) * N + car.line] >= 0) clash = true;
      if (clash) continue;
      nextCars.push(car);
      nextAt.push(pos);
      break;
    }
  }
  return { cars: nextCars, at: nextAt };
}

// Random car parks are almost never hard. So keep a small pool of the hardest
// found so far, and mostly make new ones by changing one car in one of those.
const found = new Map();
const pool = [];
const until = Date.now() + minutes * 60_000;
let tried = 0;
while (Date.now() < until) {
  tried++;
  const parent = pool.length && Math.random() < 0.9 ? pool[Math.floor(Math.random() * pool.length)] : null;
  const { cars, at } = parent ? changed(parent) : park();
  const best = hardest(cars, at);
  if (!best) continue;
  if (pool.length < 40 || best.par > pool[0].par) {
    pool.push({ cars, at: best.at, par: best.par });
    pool.sort((x, y) => x.par - y.par);
    if (pool.length > 40) pool.shift();
  }
  if (best.par < keepFrom) continue;
  const key = cars.map((c) => `${c.len}${c.horizontal ? 'h' : 'v'}${c.line}`).join() + '|' + best.at.join();
  if (!found.has(key)) {
    found.set(key, { cars, start: best.at, par: best.par });
    if (found.size % 50 === 0) console.log(`${found.size} found after ${tried} car parks`);
  }
}

const list = [...found.values()].sort((a, b) => a.par - b.par);
const lines = list.map(
  (p) => `  { par: ${p.par}, cars: '${p.cars.map((c) => `${c.len}${c.horizontal ? 'h' : 'v'}${c.line}`).join(' ')}', start: [${p.start.join(', ')}] },`,
);
writeFileSync(
  'src/games/gridlock/hard.ts',
  `// Very hard car parks, found by scripts/mine-gridlock.mjs and sorted by the
// fewest slides that solve them. Do not edit by hand: run the script again.
// Each car is written as its length, h or v for which way it lies, and the
// row (h) or column (v) it lies in; the first is the red car.

export const HARD: { par: number; cars: string; start: number[] }[] = [
${lines.join('\n')}
];
`,
);
console.log(`Wrote ${list.length} car parks needing ${list[0]?.par ?? '-'} to ${list.at(-1)?.par ?? '-'} slides, from ${tried} tried.`);
