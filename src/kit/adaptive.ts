// Adaptive difficulty, shared by every game. Each game keeps one Skill for
// the player; it moves after every puzzle and decides how hard the next is.
//
// Her own rating (too easy / just right / too hard) counts in full. Without a
// rating, the level still drifts a little on what happened: hints, mistakes,
// giving up, and how long it took against her usual time.
//
// The level moves like a staircase: big steps while it keeps going the same
// way, smaller ones each time it turns round, so it closes in on her range.

import type { Random } from './random';

export interface AdaptiveTuning {
  startLevel: number;
  floor: number;
  ceiling: number;
  startStep: number;
  minStep: number;
  silentWeight: number;
  breatherPercent: number;
  stretchPercent: number;
  breatherBy: number;
  stretchBy: number;
}

export interface Skill {
  level: number;
  step: number;
  /** Which way the level last moved: -1 down, 1 up, 0 not yet. */
  heading: -1 | 0 | 1;
  /** Her usual time for a puzzle near her level, once known. */
  usualMs: number | null;
  played: number;
}

export type Rating = 'easy' | 'right' | 'hard';

export interface Result {
  /** The difficulty of the puzzle that was played. */
  score: number;
  rating: Rating | null;
  timeMs: number;
  hints: number;
  mistakes: number;
  /** True when she left the puzzle unfinished for a new one. */
  abandoned: boolean;
}

/** How close a puzzle must be to her level for its time to mean anything. */
const NEAR = 10;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function initialSkill(t: AdaptiveTuning): Skill {
  return { level: t.startLevel, step: t.startStep, heading: 0, usualMs: null, played: 0 };
}

/** Between -1 (far too hard) and 1 (far too easy). */
function signal(skill: Skill, r: Result, t: AdaptiveTuning): number {
  if (r.rating === 'right') return 0;
  if (r.rating === 'easy') return r.score < skill.level - 5 ? 0.5 : 1; // a breather was meant to be easy
  if (r.rating === 'hard') return r.score > skill.level + 5 ? -0.5 : -1; // a stretch was meant to be hard

  let s = 0;
  if (r.abandoned) {
    s = -0.6;
  } else {
    s -= Math.min(0.9, r.hints * 0.3);
    if (r.mistakes >= 3) s -= 0.3;
    const near = Math.abs(r.score - skill.level) <= NEAR;
    if (near && skill.usualMs) {
      const pace = r.timeMs / skill.usualMs;
      if (pace < 0.7) s += 0.5;
      else if (pace > 1.6) s -= 0.4;
    } else if (r.hints === 0 && r.mistakes === 0) {
      s += 0.2;
    }
  }
  return clamp(s, -1, 1) * t.silentWeight;
}

export function update(skill: Skill, r: Result, t: AdaptiveTuning): Skill {
  const s = signal(skill, r, t);
  const turn: -1 | 0 | 1 = s > 0.05 ? 1 : s < -0.05 ? -1 : 0;

  let step = skill.step;
  if (r.rating === 'right') step *= 0.8; // she is where she wants to be: settle
  else if (turn !== 0 && skill.heading !== 0) step *= turn === skill.heading ? 1.15 : 0.6;
  step = clamp(step, t.minStep, t.startStep);

  let usualMs = skill.usualMs;
  if (!r.abandoned && Math.abs(r.score - skill.level) <= NEAR) {
    usualMs = usualMs === null ? r.timeMs : usualMs * 0.7 + r.timeMs * 0.3;
  }

  return {
    level: clamp(skill.level + skill.step * s, t.floor, t.ceiling),
    step,
    heading: turn !== 0 ? turn : skill.heading,
    usualMs,
    played: skill.played + 1,
  };
}

/** The difficulty to aim the next puzzle at: mostly her level, sometimes off it. */
export function nextTarget(skill: Skill, rng: Random, t: AdaptiveTuning): number {
  const roll = rng.int(100);
  let target = skill.level + rng.int(5) - 2;
  if (roll < t.breatherPercent) target = skill.level - t.breatherBy;
  else if (roll < t.breatherPercent + t.stretchPercent) target = skill.level + t.stretchBy;
  return clamp(target, t.floor, t.ceiling);
}
