// Renders public/icon.svg to the PNG sizes the web app manifest needs.
// Run with `npm run icons` after changing the SVG; the PNGs are committed.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile('public/icon.svg');

await sharp(svg, { density: 300 }).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile('public/icon-512.png');

// Android crops maskable icons to a circle or squircle, so the artwork sits in
// the middle 80% on a full-bleed background.
const inner = await sharp(svg, { density: 300 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#2f6f6a' } })
  .composite([{ input: inner, gravity: 'centre' }])
  .png()
  .toFile('public/icon-maskable-512.png');

console.log('Wrote icon-192.png, icon-512.png, icon-maskable-512.png');
