import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import {
  parseImageDataUrl,
  normalizeImage,
  normalizeImageDataUrl,
  OUTPUT_MIME,
} from '../../server/services/imageService.js';
import { ValidationError } from '../../server/errors.js';

// sharp lives in server/node_modules (not the repo root), so resolve it relative
// to the server package - the same place imageService loads it from.
const serverRequire = createRequire(new URL('../../server/package.json', import.meta.url));
const sharp = serverRequire('sharp') as typeof import('sharp');

// Build a real raster image as a base64 data URL for the tests.
async function makeDataUrl(
  format: 'jpeg' | 'png' | 'webp',
  width = 1200,
  height = 900
): Promise<string> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 30, b: 30 } },
  })[format]().toBuffer();
  const mime = `image/${format}`;
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

describe('parseImageDataUrl', () => {
  it('parses a valid jpeg data URL', async () => {
    const dataUrl = await makeDataUrl('jpeg');
    const { mime, buffer } = parseImageDataUrl(dataUrl);
    expect(mime).toBe('image/jpeg');
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('rejects a non data URL', () => {
    expect(() => parseImageDataUrl('not-a-data-url')).toThrow(ValidationError);
  });

  it('rejects a disallowed mime (svg) by its claimed type', () => {
    const svg = `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`;
    expect(() => parseImageDataUrl(svg)).toThrow(/unsupported type/i);
  });

  it('rejects an empty payload', () => {
    expect(() => parseImageDataUrl('data:image/jpeg;base64,')).toThrow(ValidationError);
  });
});

describe('normalizeImage', () => {
  it('re-encodes to a downscaled JPEG within the max dimension', async () => {
    const { buffer: input } = parseImageDataUrl(await makeDataUrl('png', 2000, 1500));
    const { buffer, mime } = await normalizeImage(input);
    expect(mime).toBe(OUTPUT_MIME);
    const meta = await sharp(buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1024);
  });

  it('does not enlarge an image smaller than the max dimension', async () => {
    const { buffer: input } = parseImageDataUrl(await makeDataUrl('jpeg', 400, 300));
    const { buffer } = await normalizeImage(input);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it('strips metadata (no EXIF) on output', async () => {
    const withExif = await sharp({
      create: { width: 500, height: 500, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const { buffer } = await normalizeImage(withExif);
    const meta = await sharp(buffer).metadata();
    // Orientation is applied then dropped; no EXIF block remains.
    expect(meta.exif).toBeUndefined();
  });

  it('rejects bytes that are not a decodable image', async () => {
    await expect(normalizeImage(Buffer.from('this is not an image'))).rejects.toThrow(
      ValidationError
    );
  });

  it('rejects an SVG by its real decoded format', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(normalizeImage(svg)).rejects.toThrow(/unsupported type|could not be processed/i);
  });
});

describe('normalizeImageDataUrl', () => {
  it('returns a normalized buffer, mime and fresh data URL', async () => {
    const result = await normalizeImageDataUrl(await makeDataUrl('webp', 1600, 1200));
    expect(result.mime).toBe(OUTPUT_MIME);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
    // The returned data URL decodes back to the same bytes.
    const reparsed = parseImageDataUrl(result.dataUrl);
    expect(reparsed.buffer.length).toBe(result.buffer.length);
  });
});
