import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative, so the build works under any GitHub Pages repository name.
  base: './',
  define: {
    // Shown at the foot of the home screen, to confirm which build a phone has.
    __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  plugins: [
    preact(),
    VitePWA({
      // A new version downloads in the background and takes over on the next
      // launch, never in the middle of a puzzle.
      registerType: 'prompt',
      // Our own small worker (src/sw.ts) rather than a generated one: the
      // generator breaks on a project path with an apostrophe in it.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // The glob below already picks up everything in public/.
      includeAssets: [],
      includeManifestIcons: false,
      manifest: {
        name: "Elsa's Games",
        short_name: 'Games',
        description: 'Puzzle games, tuned for one player.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f3ec',
        theme_color: '#f6f3ec',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
