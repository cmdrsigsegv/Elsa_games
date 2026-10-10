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
  label: string;
}

export function Board({ draw, onTap, label }: Props) {
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
    return () => {
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
      }}
    />
  );
}
