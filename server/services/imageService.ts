import sharp from 'sharp';
import { ValidationError } from '../errors.js';

// ---------------------------------------------------------------------------
// Server-side image normalization for photo-based meal logging.
//
// The client only does a light pre-shrink for upload bandwidth; this module is
// the authoritative step. Every uploaded image is decoded and re-encoded to a
// fixed spec (longest side <= MAX_DIMENSION, JPEG, metadata stripped) so the
// stored/analyzed size is consistent regardless of device and the client cannot
// bypass it.
//
// Security: never trust the client-supplied MIME or extension. We allow only a
// raster allowlist (reject SVG, which can carry scripts), bound the decoded byte
// size before handing bytes to sharp, cap input pixels to defuse decompression
// bombs, and drop all metadata (EXIF/GPS) on output.
// ---------------------------------------------------------------------------

// Raster formats we accept on input. SVG is intentionally excluded.
const ALLOWED_INPUT_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// The same allowlist as sharp reports it via metadata().format (the actual,
// decoded format - not the client-claimed MIME).
const ALLOWED_INPUT_FORMATS = new Set(['jpeg', 'png', 'webp']);

// Output spec: every stored/analyzed image is a JPEG at this longest edge.
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 70;
export const OUTPUT_MIME = 'image/jpeg';

// Reject anything whose decoded payload exceeds this before we even decode it.
// Bound by the 5 MB express.json body limit: the image rides in the request
// body as a base64 data URL (~4/3 the decoded size) alongside the other fields,
// so the decoded image must stay comfortably under 5 MB. The client compresses
// far below this; it is only a safety cap.
const MAX_INPUT_BYTES = 3 * 1024 * 1024; // 3 MB (~4 MB as base64, fits the 5 MB body)
// Cap input pixels so a tiny file cannot expand into huge memory (bomb guard).
const MAX_INPUT_PIXELS = 40_000_000; // 40 MP

export interface NormalizedImage {
  buffer: Buffer;
  mime: string;
  dataUrl: string;
}

// Parse and validate a `data:` URL into its MIME and raw bytes. Throws a
// ValidationError (400 at the boundary) on any malformed or disallowed input.
export function parseImageDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  if (typeof dataUrl !== 'string') throw new ValidationError('image - must be a data URL');
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl.trim());
  if (!match) throw new ValidationError('image - must be a base64 data URL');

  const mime = match[1].toLowerCase();
  if (!ALLOWED_INPUT_MIMES.has(mime)) {
    throw new ValidationError('image - unsupported type (allowed: jpeg, png, webp)');
  }

  // Bound the decoded size before allocating the buffer.
  const approxBytes = Math.floor((match[2].length * 3) / 4);
  if (approxBytes > MAX_INPUT_BYTES) throw new ValidationError('image - too large');

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw new ValidationError('image - empty');
  if (buffer.length > MAX_INPUT_BYTES) throw new ValidationError('image - too large');

  return { mime, buffer };
}

// Re-encode raw image bytes to the fixed output spec. Auto-orients from EXIF,
// strips all metadata, and downscales the longest side to MAX_DIMENSION. The
// real, decoded format (not the client-claimed MIME) is checked against the
// raster allowlist here, so a file lying about its type is rejected by content.
export async function normalizeImage(input: Buffer): Promise<{ buffer: Buffer; mime: string }> {
  try {
    const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });

    const { format } = await pipeline.metadata();
    if (!format || !ALLOWED_INPUT_FORMATS.has(format)) {
      throw new ValidationError('image - unsupported type (allowed: jpeg, png, webp)');
    }

    const buffer = await pipeline
      .rotate() // apply EXIF orientation before stripping metadata
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return { buffer, mime: OUTPUT_MIME };
  } catch (error) {
    // Preserve an explicit unsupported-type rejection; otherwise treat decode/
    // format failures (corrupt, polyglot, or bomb-limited) as bad user input.
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('image - could not be processed');
  }
}

// Convenience: validate + decode a data URL, then normalize it. Returns the
// normalized buffer, its MIME, and a fresh data URL for the client to persist.
export async function normalizeImageDataUrl(dataUrl: string): Promise<NormalizedImage> {
  const { buffer: raw } = parseImageDataUrl(dataUrl);
  const { buffer, mime } = await normalizeImage(raw);
  return { buffer, mime, dataUrl: bufferToDataUrl(buffer, mime) };
}

export function bufferToDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}
