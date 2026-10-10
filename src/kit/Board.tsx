// A square canvas that a game draws its board on. It handles the fiddly
// parts: sharp drawing on high-density screens, resizing, colours that follow
// light and dark mode, and turning a touch into a position on the board.

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
  /** Draws the whole board into a `size` by `size` square. Called on every render. */
  draw(ctx: CanvasRenderingContext2D, size: number, theme: Theme): void;
  /** A touch at (x, y), each from 0 to `size`. */
  onTap?(x: number, y: number, size: number): void;
  /**
   * A finger put down, dragged, and lifted. 'cancel' means the phone took the
   * touch away (a call, a system gesture): drop the stroke.
   */
  onStroke?(phase: 'start' | 'move' | 'end' | 'cancel', x: number, y: number, size: number): void;
  label: string;
}

export function Board({ draw, onTap, onStroke, label }: Props) {
  const stroking = useRef<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);
  const [, repaint] = useState(0);

  useEffect(() => {
    const el = canvas.current!;
    const observer = new ResizeObserver(() => setSize(el.clientWidth));
    observer.observe(el);
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => repaint((n) => n + 1);
    scheme.addEventListener('change', onScheme);
    // Touches on the board are ours alone. Without this the browser also
    // reads a quick drag as a flick, and then swallows the next tap, wherever
    // it lands, as "stop the flick": a button pressed once did nothing.
    const own = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchstart', own, { passive: false });
    return () => {
      el.removeEventListener('touchstart', own);
      observer.disconnect();
      scheme.removeEventListener('change', onScheme);
    };
  }, []);

  useLayoutEffect(() => {
    const el = canvas.current!;
    if (!size) return;
    const dpr = window.devicePixelRatio || 1;
    const pixels = Math.round(size * dpr);
    if (el.width !== pixels) {
      el.width = pixels;
      el.height = pixels;
    }
    const ctx = el.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    draw(ctx, size, readTheme(el));
  });

  return (
    <canvas
      ref={canvas}
      class="board"
      role="img"
      aria-label={label}
      onPointerDown={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        onTap?.(e.clientX - box.left, e.clientY - box.top, box.width);
        if (!onStroke) return;
        // No setPointerCapture: a touch already stays with the element it began on.
        if (stroking.current !== null) onStroke('cancel', 0, 0, 0);
        stroking.current = e.pointerId;
        onStroke('start', e.clientX - box.left, e.clientY - box.top, box.width);
      }}
      onPointerMove={(e) => {
        if (stroking.current !== e.pointerId) return;
        const box = e.currentTarget.getBoundingClientRect();
        onStroke?.('move', e.clientX - box.left, e.clientY - box.top, box.width);
      }}
      onPointerUp={(e) => {
        if (stroking.current !== e.pointerId) return;
        stroking.current = null;
        const box = e.currentTarget.getBoundingClientRect();
        onStroke?.('end', e.clientX - box.left, e.clientY - box.top, box.width);
      }}
      onPointerLeave={(e) => {
        // A mouse that wanders off the board ends its stroke at the edge.
        if (stroking.current !== e.pointerId) return;
        stroking.current = null;
        const box = e.currentTarget.getBoundingClientRect();
        onStroke?.('end', e.clientX - box.left, e.clientY - box.top, box.width);
      }}
      onPointerCancel={(e) => {
        if (stroking.current !== e.pointerId) return;
        stroking.current = null;
        onStroke?.('cancel', 0, 0, 0);
      }}
    />
  );
}
