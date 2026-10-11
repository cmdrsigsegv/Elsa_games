// The screw game: plates stacked in layers, each held by coloured screws.
// A screw can be taken out only if no plate lies over it. A plate left
// hanging by one screw swings down to hang from it, which uncovers some
// screws and may cover others; a plate with no screws left falls away.
//
// Screws go into boxes: each box takes three of one colour, two boxes are
// open at a time, and a full box makes way for the next in the queue. A
// screw with no open box of its colour goes into a spare hole. When the
// spare holes are full and nothing free matches an open box, the game is
// lost. Every function here is pure.

export type Point = [number, number];

/** The board is this many units wide and tall; y grows downwards. */
export const BOARD_W = 100;
export const BOARD_H = 120;
/** How many screws fill a box, and how many boxes are open at once. */
export const BOX_SIZE = 3;
export const OPEN_BOXES = 2;

export interface Plate {
  /** Its outline, as it lies while two or more screws hold it. */
  outline: Point[];
  /** Which of the plate tints it is drawn in. */
  tint: number;
}

export interface Screw {
  at: Point;
  /** The plate it holds. Plates later in the list lie on top of earlier ones. */
  plate: number;
  colour: number;
}

export interface ScrewsPuzzle {
  seed: number;
  score: number;
  plates: Plate[];
  screws: Screw[];
  /** The colours of the boxes, in the order they open. */
  boxes: number[];
  /** How many spare holes there are. */
  holes: number;
  /** One order of taking the screws out that wins. */
  way: number[];
}

export interface ScrewsState {
  /** For each screw, whether it has been taken out. */
  out: boolean[];
  /** The boxes open now, and how many screws are in each. */
  open: { colour: number; filled: number }[];
  /** How many boxes of the queue have been opened so far. */
  opened: number;
  /** The colours of the screws in the spare holes. */
  spare: number[];
  moves: number;
}

export interface ScrewsMove {
  screw: number;
}

// --- Geometry

const centre = (outline: Point[]): Point => [
  outline.reduce((sum, p) => sum + p[0], 0) / outline.length,
  outline.reduce((sum, p) => sum + p[1], 0) / outline.length,
];

export function turned(outline: Point[], pivot: Point, angle: number): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return outline.map(([x, y]) => {
    const dx = x - pivot[0];
    const dy = y - pivot[1];
    return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos];
  });
}

/**
 * How far a plate turns when it is left hanging from one screw: until its
 * middle is straight below the screw. Between -pi and pi.
 */
export function hangAngle(outline: Point[], pivot: Point): number {
  const [cx, cy] = centre(outline);
  const dx = cx - pivot[0];
  const dy = cy - pivot[1];
  if (Math.hypot(dx, dy) < 0.5) return 0; // hung by its middle, it stays as it is
  let angle = Math.PI / 2 - Math.atan2(dy, dx);
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle <= -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export function inside(p: Point, outline: Point[]): boolean {
  let within = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, yi] = outline[i];
    const [xj, yj] = outline[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) within = !within;
  }
  return within;
}

/** The screws still in a plate. */
export function holding(p: ScrewsPuzzle, out: boolean[], plate: number): number[] {
  const list: number[] = [];
  p.screws.forEach((s, i) => {
    if (s.plate === plate && !out[i]) list.push(i);
  });
  return list;
}

/**
 * How a plate lies now: where it is and how far it has turned, or null if
 * it has fallen away.
 */
export function lie(p: ScrewsPuzzle, out: boolean[], plate: number): { outline: Point[]; pivot: Point | null; angle: number } | null {
  const held = holding(p, out, plate);
  if (held.length === 0) return null;
  const outline = p.plates[plate].outline;
  if (held.length > 1) return { outline, pivot: null, angle: 0 };
  const pivot = p.screws[held[0]].at;
  const angle = hangAngle(outline, pivot);
  return { outline: turned(outline, pivot, angle), pivot, angle };
}

/** Whether a plate above this screw's own plate lies over it. */
export function covered(p: ScrewsPuzzle, out: boolean[], screw: number): boolean {
  const s = p.screws[screw];
  for (let plate = s.plate + 1; plate < p.plates.length; plate++) {
    const now = lie(p, out, plate);
    if (now && inside(s.at, now.outline)) return true;
  }
  return false;
}

// --- Play

/** Opens boxes from the queue into empty places, and moves waiting screws of their colour out of the spare holes. */
function refill(p: ScrewsPuzzle, s: ScrewsState): ScrewsState {
  let { open, opened, spare } = s;
  for (;;) {
    const full = open.findIndex((b) => b.filled === BOX_SIZE);
    if (full >= 0) {
      open = open.filter((_, i) => i !== full);
      continue;
    }
    if (open.length < OPEN_BOXES && opened < p.boxes.length) {
      const box = { colour: p.boxes[opened++], filled: 0 };
      const kept: number[] = [];
      for (const colour of spare) {
        if (colour === box.colour && box.filled < BOX_SIZE) box.filled++;
        else kept.push(colour);
      }
      spare = kept;
      open = [...open, box];
      continue;
    }
    return { ...s, open, opened, spare };
  }
}

export function start(p: ScrewsPuzzle): ScrewsState {
  return refill(p, { out: p.screws.map(() => false), open: [], opened: 0, spare: [], moves: 0 });
}

/** Whether a screw can be taken out now: it is uncovered, and there is a box or a spare hole for it. */
export function takeable(p: ScrewsPuzzle, s: ScrewsState, screw: number): boolean {
  if (s.out[screw] || covered(p, s.out, screw)) return false;
  const colour = p.screws[screw].colour;
  return s.open.some((b) => b.colour === colour && b.filled < BOX_SIZE) || s.spare.length < p.holes;
}

/** Returns the same state object when the screw cannot be taken out. */
export function apply(p: ScrewsPuzzle, s: ScrewsState, m: ScrewsMove): ScrewsState {
  if (m.screw < 0 || m.screw >= p.screws.length || !takeable(p, s, m.screw)) return s;
  const colour = p.screws[m.screw].colour;
  const box = s.open.findIndex((b) => b.colour === colour && b.filled < BOX_SIZE);
  return refill(p, {
    ...s,
    out: s.out.map((gone, i) => gone || i === m.screw),
    open: s.open.map((b, i) => (i === box ? { ...b, filled: b.filled + 1 } : b)),
    spare: box >= 0 ? s.spare : [...s.spare, colour],
    moves: s.moves + 1,
  });
}

export function status(p: ScrewsPuzzle, s: ScrewsState): { ended: boolean; lost: boolean } {
  if (s.out.every(Boolean)) return { ended: true, lost: false };
  const stuck = !p.screws.some((_, i) => takeable(p, s, i));
  return { ended: stuck, lost: stuck };
}
