// A puzzle in progress: everything needed to put the game back exactly as it
// was. Saved after every move; one per game.

import { initialSkill, type AdaptiveTuning, type Skill } from './adaptive';
import type { Game, PuzzleBase } from './game';
import { load, remove, save } from '../storage/kv';

export interface Session<P extends PuzzleBase = PuzzleBase, S = unknown> {
  version: 1;
  puzzle: P;
  /** Every state so far, oldest first; the last is the current one. Undo drops the last. */
  history: S[];
  elapsedMs: number;
  hints: number;
  mistakes: number;
  ended: boolean;
  /** True when it ended in defeat rather than a solution. */
  lost?: boolean;
}

/** Undo goes back this far at most. */
const HISTORY_LIMIT = 400;

export function newSession<P extends PuzzleBase, S>(game: Game<P, S>, puzzle: P): Session<P, S> {
  return { version: 1, puzzle, history: [game.start(puzzle)], elapsedMs: 0, hints: 0, mistakes: 0, ended: false };
}

export const current = <S>(session: Session<PuzzleBase, S>): S => session.history[session.history.length - 1];

/** Returns the same session when the move changes nothing. */
export function play<P extends PuzzleBase, S, M>(game: Game<P, S, M>, session: Session<P, S>, move: M): Session<P, S> {
  if (session.ended) return session;
  const before = current(session);
  const after = game.apply(session.puzzle, before, move);
  if (after === before) return session;
  return {
    ...session,
    history: [...session.history, after].slice(-HISTORY_LIMIT),
    mistakes: session.mistakes + (game.isMistake(session.puzzle, before, move) ? 1 : 0),
    ended: game.status(session.puzzle, after).ended,
    lost: game.status(session.puzzle, after).lost ?? false,
  };
}

export function undo<P extends PuzzleBase, S>(session: Session<P, S>): Session<P, S> {
  if (session.ended || session.history.length < 2) return session;
  return { ...session, history: session.history.slice(0, -1) };
}

/** Whether she has done anything in this puzzle yet. */
export const started = (session: Session) => session.history.length > 1;

const sessionKey = (gameId: string) => `session:${gameId}`;
const skillKey = (gameId: string) => `skill:${gameId}`;

export async function loadSession<P extends PuzzleBase, S>(gameId: string): Promise<Session<P, S> | undefined> {
  const session = await load<Session<P, S>>(sessionKey(gameId));
  return session?.version === 1 ? session : undefined;
}
export const saveSession = (gameId: string, session: Session) => save(sessionKey(gameId), session);
export const clearSession = (gameId: string) => remove(sessionKey(gameId));

export async function loadSkill(gameId: string, tuning: AdaptiveTuning): Promise<Skill> {
  return (await load<Skill>(skillKey(gameId))) ?? initialSkill(tuning);
}
export const saveSkill = (gameId: string, skill: Skill) => save(skillKey(gameId), skill);

const optionsKey = (gameId: string) => `options:${gameId}`;

/** Her saved choices, with the game's initial value for anything unset or no longer offered. */
export async function loadOptions(game: Game): Promise<Record<string, string>> {
  const saved = (await load<Record<string, string>>(optionsKey(game.id))) ?? {};
  return Object.fromEntries(
    game.options.map((o) => [o.key, o.choices.includes(saved[o.key]) ? saved[o.key] : o.initial]),
  );
}
export const saveOptions = (gameId: string, options: Record<string, string>) => save(optionsKey(gameId), options);
