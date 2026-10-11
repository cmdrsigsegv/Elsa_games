// Makes a screw puzzle from a seed, aimed at a difficulty level.
//
// Plates are laid at random, one on top of another, each with two to four
// screws. Then the generator plays the puzzle itself, taking screws out in
// some workable order and choosing each new box's colour as it goes. That
// gives a box queue the puzzle can certainly be won with. It plays many
// times and keeps the game in which the spare holes got closest to as full
// as the level asks for: the fuller, the less room she has for a wrong tap.

import { random, type Random } from '../../kit/random';
import {
  BOARD_H,
  BOARD_W,
  BOX_SIZE,
  OPEN_BOXES,
  covered,
  turned,
  type Plate,
  type Point,
  type Screw,
  type ScrewsPuzzle,
} from './rules';
import { at, tuning } from './tuning';

const far = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Plates and their screws, uncoloured: the number of screws is a multiple of three. */
function layout(rng: Random, level: number): { plates: Plate[]; screws: Omit<Screw, 'colour'>[] } | null {
  const wanted = Math.round(at(tuning.plates, level));
  const plates: Plate[] = [];
  const screws: Omit<Screw, 'colour'>[] = [];
  for (let tries = 0; tries < wanted * 12 && plates.length < wanted; tries++) {
    // A bar or a squarer slab, lying at one of a few angles.
    const long = 26 + rng.next() * 34;
    const wide = rng.next() < 0.3 ? long * (0.6 + rng.next() * 0.3) : 11 + rng.next() * 7;
    const angle = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI / 6, -Math.PI / 6][rng.int(6)];
    const cx = 14 + rng.next() * (BOARD_W - 28);
    const cy = 14 + rng.next() * (BOARD_H - 28);
    const flat: Point[] = [
      [cx - long / 2, cy - wide / 2],
      [cx + long / 2, cy - wide / 2],
      [cx + long / 2, cy + wide / 2],
      [cx - long / 2, cy + wide / 2],
    ];
    const outline = turned(flat, [cx, cy], angle);
    if (outline.some(([x, y]) => x < 2 || y < 2 || x > BOARD_W - 2 || y > BOARD_H - 2)) continue;

    // Screw holes along its length: both ends, and for long plates the middle or thirds.
    const inset = Math.min(wide, 12) / 2 + 1;
    const spots = long > 46 && rng.next() < 0.5 ? [0, 1 / 3, 2 / 3, 1] : long > 34 && rng.next() < 0.6 ? [0, 0.5, 1] : [0, 1];
    const holes = spots
      .map((f): Point => [cx - long / 2 + inset + f * (long - 2 * inset), cy])
      .map((hole) => turned([hole], [cx, cy], angle)[0])
      .filter((hole) => screws.every((s) => far(s.at, hole) >= tuning.screwGap));
    if (holes.length < 2) continue;
    const plate = plates.length;
    plates.push({ outline, tint: rng.int(5) });
    for (const hole of holes) screws.push({ at: hole, plate });
  }
  // Boxes take three: lift the odd screws out of plates that can spare one.
  for (let extra = screws.length % BOX_SIZE; extra > 0; extra--) {
    const spare = screws.findIndex((s) => screws.filter((o) => o.plate === s.plate).length > 2);
    if (spare < 0) return null;
    screws.splice(spare, 1);
  }
  return plates.length >= 3 && screws.length >= 9 ? { plates, screws } : null;
}

interface Played {
  way: number[];
  boxes: number[];
  colours: number[];
  /** The most screws that sat in the spare holes at once. */
  peak: number;
}

/**
 * Plays a layout through once, colouring the screws as it goes. A screw gets
 * its colour only when it is taken out: usually the colour of an open box,
 * sometimes not, which sends it to a spare hole to wait for its box.
 */
function playThrough(rng: Random, plates: Plate[], bare: Omit<Screw, 'colour'>[], colourCount: number, holes: number, stray: number): Played | null {
  const puzzle = { plates, screws: bare as Screw[] } as ScrewsPuzzle;
  const out = bare.map(() => false);
  const colours = bare.map(() => -1);
  const boxesLeft = bare.length / BOX_SIZE;
  const boxes: number[] = [];
  const open: { colour: number; filled: number }[] = [];
  // Screws in the spare holes, by colour: each colour there will need a box of its own.
  const waiting = new Map<number, number>();
  const way: number[] = [];
  let peak = 0;
  let lastColour = -1;

  const openBoxes = () => {
    for (;;) {
      const full = open.findIndex((b) => b.filled === BOX_SIZE);
      if (full >= 0) {
        open.splice(full, 1);
        continue;
      }
      if (open.length < OPEN_BOXES && boxes.length < boxesLeft) {
        // A colour that is waiting gets its box first; otherwise a fresh one.
        const due = [...waiting.keys()];
        let colour = due.length ? due[rng.int(due.length)] : rng.int(colourCount);
        if (!due.length && (colour === lastColour || open.some((b) => b.colour === colour))) colour = (colour + 1 + rng.int(colourCount - 1)) % colourCount;
        lastColour = colour;
        const taken = Math.min(BOX_SIZE, waiting.get(colour) ?? 0);
        if (taken) waiting.set(colour, waiting.get(colour)! - taken);
        if (waiting.get(colour) === 0) waiting.delete(colour);
        boxes.push(colour);
        open.push({ colour, filled: taken });
        continue;
      }
      return;
    }
  };
  const spareCount = () => [...waiting.values()].reduce((a, b) => a + b, 0);
  /** Boxes not yet opened that are not already promised to a waiting colour. */
  const unpromised = () => boxesLeft - boxes.length - waiting.size;

  openBoxes();
  for (let n = 0; n < bare.length; n++) {
    const free = bare.map((_, i) => i).filter((i) => !out[i] && !covered(puzzle, out, i));
    if (!free.length) return null;
    const screw = free[rng.int(free.length)];
    const room = open.filter((b) => b.filled < BOX_SIZE);
    // A stray colour needs a spare hole now and a box later; a waiting colour may collect up to three.
    const topUp = [...waiting.entries()].filter(([, count]) => count < BOX_SIZE).map(([colour]) => colour);
    const canStray = spareCount() < holes && (topUp.length > 0 || unpromised() > 0);
    let colour: number;
    if (canStray && (room.length === 0 || rng.next() < stray)) {
      if (topUp.length && (unpromised() <= 0 || rng.next() < 0.6)) colour = topUp[rng.int(topUp.length)];
      else {
        const fresh = Array.from({ length: colourCount }, (_, c) => c).filter((c) => !waiting.has(c) && !open.some((b) => b.colour === c));
        if (!fresh.length) {
          if (!room.length) return null;
          colour = room[rng.int(room.length)].colour;
        } else colour = fresh[rng.int(fresh.length)];
      }
    } else if (room.length) {
      colour = room[rng.int(room.length)].colour;
    } else {
      return null; // nowhere for this screw to go
    }

    colours[screw] = colour;
    out[screw] = true;
    way.push(screw);
    const box = open.find((b) => b.colour === colour && b.filled < BOX_SIZE);
    if (box) box.filled++;
    else waiting.set(colour, (waiting.get(colour) ?? 0) + 1);
    peak = Math.max(peak, spareCount());
    openBoxes();
  }
  // Every box must have come out full, with nothing left waiting.
  if (waiting.size || open.length || boxes.length !== boxesLeft) return null;
  return { way, boxes, colours, peak };
}

export function generate(seed: number, target: number): ScrewsPuzzle {
  const rng = random(seed);
  const holes = Math.round(at(tuning.holes, target));
  const colourCount = Math.round(at(tuning.colours, target));
  const wantPeak = Math.max(1, Math.round(at(tuning.squeeze, target) * holes));
  let best: ScrewsPuzzle | null = null;
  let bestPeak = -1;
  for (let l = 0; l < tuning.layouts; l++) {
    const laid = layout(rng, target);
    if (!laid) continue;
    for (let o = 0; o < tuning.orders; o++) {
      const played = playThrough(rng, laid.plates, laid.screws, colourCount, holes, 0.15 + 0.5 * rng.next());
      if (!played) continue;
      if (best && Math.abs(played.peak - wantPeak) >= Math.abs(bestPeak - wantPeak)) continue;
      bestPeak = played.peak;
      best = {
        seed,
        score: target,
        plates: laid.plates,
        screws: laid.screws.map((s, i) => ({ ...s, colour: played.colours[i] })),
        boxes: played.boxes,
        holes,
        way: played.way,
      };
    }
    if (best && bestPeak === wantPeak) break;
  }
  return best ?? generate(seed + 1, target);
}
