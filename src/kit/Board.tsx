// A canvas that a game draws its board on. It handles the fiddly parts: sharp
// drawing on high-density screens, resizing, colours that follow light and
// dark mode, and turning touches into taps, strokes and pinches.

import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

/** The app's colours, read from the CSS variables in app.css. */
export interface Theme {
  surface: string;
  ink: string;
  inkQuiet: string;
  line: string;
  lineStrong: string;
  accent: string;
  wrong: string;
  tintSelected: string;
  tintSame: string;
  tintPeer: string;
}

const VARS: Record<keyof Theme, string> = {
  surface: '--surface',
  ink: '--ink',
  inkQuiet: '--ink-quiet',
  line: '--line',
  lineStrong: '--line-strong',
  accent: '--accent',
  wrong: '--wrong',
  tintSelected: '--tint-selected',
  tintSame: '--tint-same',
  tintPeer: '--tint-peer',
};

function readTheme(el: Element): Theme {
  const css = getComputedStyle(el);
  const theme = {} as Theme;
  for (const key of Object.keys(VARS) as (keyof Theme)[]) theme[key] = css.getPropertyValue(VARS[key]).trim();
  return theme;
}

interface Props {
  /** Draws the whole board into a `width` by `height` area. Called on every render. */
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme): void;
  /** A touch at (x, y), with x from 0 to `width`. */
  onTap?(x: number, y: number, width: number): void;
  /**
   * One finger put down, dragged, and lifted. 'cancel' means the stroke must
   * be dropped, not finished: a second finger arrived, or the phone took the
   * touch away.
   */
  onStroke?(phase: 'start' | 'move' | 'end' | 'cancel', x: number, y: number, width: number, height: number): void;
  /**
   * Two fingers moving: `factor` is how much they spread (above 1) or closed
   * since the last call, (dx, dy) how far their midpoint (cx, cy) moved.
   * A mouse wheel arrives the same way.
   */
  onPinch?(cx: number, cy: number, factor: number, dx: number, dy: number, width: number, height: number): void;
  /** Fill the space the screen gives it instead of being a square. */
  tall?: boolean;
  label: string;
}

export function Board({ draw, onTap, onStroke, onPinch, tall, label }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, repaint] = useState(0);

  // Fingers on the board, and what they are doing. After a pinch, or with
  // three fingers down, the board ignores everything until all are lifted, so
  // a finger left behind never draws.
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  const doing = useRef<'nothing' | 'stroke' | 'pinch' | 'ignoring'>('nothing');
  const last = useRef({ cx: 0, cy: 0, spread: 1 });

  useEffect(() => {
    const el = canvas.current!;
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    observer.observe(el);
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => repaint((n) => n + 1);
    scheme.addEventListener('change', onScheme);
    // Touches on the board are ours alone. Without this the browser also
    // reads a quick drag as a flick, and then swallows the next tap, wherever
    // it lands, as "stop the flick": a button pressed once did nothing.
    const own = (e: Event) => e.preventDefault();
    el.addEventListener('touchstart', own, { passive: false });
    el.addEventListener('wheel', own, { passive: false });
    return () => {
      el.removeEventListener('touchstart', own);
      el.removeEventListener('wheel', own);
      observer.disconnect();
      scheme.removeEventListener('change', onScheme);
    };
  }, []);

  useLayoutEffect(() => {
    const el = canvas.current!;
    if (!size.w || !size.h) return;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(size.w * dpr);
    const ph = Math.round(size.h * dpr);
    if (el.width !== pw || el.height !== ph) {
      el.width = pw;
      el.height = ph;
    }
    const ctx = el.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    draw(ctx, size.w, size.h, readTheme(el));
  });

  const where = (e: PointerEvent | WheelEvent) => {
    const box = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top, w: box.width, h: box.height };
  };

  const midpoint = () => {
    const [a, b] = [...fingers.current.values()];
    return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, spread: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
  };

  const lift = (e: PointerEvent, finish: boolean) => {
    if (!fingers.current.delete(e.pointerId)) return;
    if (doing.current === 'stroke') {
      const at = where(e);
      onStroke?.(finish ? 'end' : 'cancel', at.x, at.y, at.w, at.h);
    }
    doing.current = fingers.current.size === 0 ? 'nothing' : 'ignoring';
  };

  return (
    <canvas
      ref={canvas}
      class={tall ? 'board tall' : 'board'}
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        const at = where(e);
        fingers.current.set(e.pointerId, at);
        if (fingers.current.size === 1 && doing.current === 'nothing') {
          onTap?.(at.x, at.y, at.w);
          if (onStroke) {
            doing.current = 'stroke';
            onStroke('start', at.x, at.y, at.w, at.h);
          }
        } else if (fingers.current.size === 2 && doing.current !== 'ignoring') {
          // A second finger: whatever the first had begun to draw is dropped.
          if (doing.current === 'stroke') onStroke?.('cancel', 0, 0, at.w, at.h);
          doing.current = onPinch ? 'pinch' : 'ignoring';
          last.current = midpoint();
        } else {
          if (doing.current === 'stroke') onStroke?.('cancel', 0, 0, at.w, at.h);
          doing.current = 'ignoring';
        }
      }}
      onPointerMove={(e) => {
        if (!fingers.current.has(e.pointerId)) return;
        const at = where(e);
        fingers.current.set(e.pointerId, at);
        if (doing.current === 'stroke') {
          onStroke?.('move', at.x, at.y, at.w, at.h);
        } else if (doing.current === 'pinch' && fingers.current.size === 2) {
          const now = midpoint();
          const was = last.current;
          onPinch?.(now.cx, now.cy, now.spread / was.spread, now.cx - was.cx, now.cy - was.cy, at.w, at.h);
          last.current = now;
        }
      }}
      onPointerUp={(e) => lift(e, true)}
      // A mouse that wanders off the board ends its stroke at the edge.
      onPointerLeave={(e) => lift(e, true)}
      onPointerCancel={(e) => lift(e, false)}
      onWheel={(e) => {
        const at = where(e);
        onPinch?.(at.x, at.y, e.deltaY < 0 ? 1.15 : 1 / 1.15, 0, 0, at.w, at.h);
      }}
    />
  );
}
