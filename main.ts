// Lossless PNG re-compressor: reduces the colour type when the pixels allow it and
// chooses a filter per row, then deflates at level 9. Vendored png.mjs is the kit's
// decoder/chunk writer; everything else here is this entry's own work.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { decodePng, filterImage, ihdrOf, pngOf } from './vendor/png.mjs';

type Candidate = { colour: number; samples: Uint8Array; plte?: Uint8Array; trns?: Uint8Array };

function build(samples: Uint8Array, width: number, height: number, c: Candidate, strategy: number): Uint8Array {
  const bpp = c.colour === 3 ? 1 : c.colour === 0 ? 1 : c.colour === 4 ? 2 : c.colour === 2 ? 3 : 4;
  const raw = filterImage(c.samples, width, height, bpp, 'minsum');
  const idat = deflateSync(raw, { level: 9, strategy });
  const chunks: [string, Uint8Array][] = [
    ['IHDR', ihdrOf(width, height, c.colour)],
  ];
  if (c.plte) chunks.push(['PLTE', c.plte]);
  if (c.trns) chunks.push(['tRNS', c.trns]);
  chunks.push(['IDAT', new Uint8Array(idat)], ['IEND', new Uint8Array(0)]);
  return pngOf(chunks);
}

function candidates(rgba: Uint8Array): Candidate[] {
  const pixels = rgba.length / 4;
  let opaque = true;
  let grey = true;
  const palette = new Map<number, number>();
  const colors: number[] = [];
  for (let p = 0; p < pixels; p++) {
    const i = p * 4;
    const r = rgba[i]!, g = rgba[i + 1]!, b = rgba[i + 2]!, a = rgba[i + 3]!;
    if (a !== 255) opaque = false;
    if (r !== g || g !== b) grey = false;
    const key = (r << 24) | (g << 16) | (b << 8) | a;
    if (!palette.has(key)) {
      if (palette.size >= 256) { palette.clear(); break; }
      palette.set(key, palette.size);
      colors.push(r, g, b, a);
    }
  }
  const out: Candidate[] = [];
  if (palette.size > 0) {
    const indices = new Uint8Array(pixels);
    const alphas: number[] = [];
    for (let p = 0; p < pixels; p++) {
      const i = p * 4;
      const key = (rgba[i]! << 24) | (rgba[i + 1]! << 16) | (rgba[i + 2]! << 8) | rgba[i + 3]!;
      const idx = palette.get(key);
      if (idx === undefined) { indices.length = 0; break; }
      indices[p] = idx;
    }
    if (indices.length === pixels) {
      const plte = new Uint8Array(palette.size * 3);
      let varied = false;
      for (let k = 0; k < palette.size; k++) {
        plte[k * 3] = colors[k * 4]!;
        plte[k * 3 + 1] = colors[k * 4 + 1]!;
        plte[k * 3 + 2] = colors[k * 4 + 2]!;
        const a = colors[k * 4 + 3]!;
        alphas.push(a);
        if (a !== 255) varied = true;
      }
      out.push({ colour: 3, samples: indices, plte, trns: varied ? new Uint8Array(alphas) : undefined });
    }
  }
  if (grey && opaque) {
    const g = new Uint8Array(pixels);
    for (let p = 0; p < pixels; p++) g[p] = rgba[p * 4]!;
    out.push({ colour: 0, samples: g });
  }
  if (opaque) {
    const rgb = new Uint8Array(pixels * 3);
    for (let p = 0; p < pixels; p++) {
      rgb[p * 3] = rgba[p * 4]!;
      rgb[p * 3 + 1] = rgba[p * 4 + 1]!;
      rgb[p * 3 + 2] = rgba[p * 4 + 2]!;
    }
    out.push({ colour: 2, samples: rgb });
  }
  out.push({ colour: 6, samples: rgba });
  return out;
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

for (const id of readdirSync(I).sort()) {
  const decoded = decodePng(new Uint8Array(readFileSync(join(I, id, 'image.png'))), { width: 1280, height: 720 });
  if (!decoded.ok) throw new Error(`${id}: ${decoded.why}`);
  let best: Uint8Array | null = null;
  for (const c of candidates(decoded.rgba)) {
    for (const strategy of [0, 3]) {
      const png = build(decoded.rgba, decoded.width, decoded.height, c, strategy);
      if (best === null || png.length < best.length) best = png;
    }
  }
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'image.png'), best!);
}
