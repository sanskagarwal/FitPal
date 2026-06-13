import { describe, it, expect } from 'vitest';
import {
  clampNumber,
  compressImage,
  describeChatError,
  formatUnit,
  toHHmm,
  sumNutrients,
  MAX_IMAGE_FILE_BYTES,
  MAX_QUANTITY,
} from '../../src/components/foodLogger/foodLoggerUtils';
import type { NutrientInfo } from '../../src/types';

describe('clampNumber', () => {
  it('falls back when the value is not finite', () => {
    expect(clampNumber(NaN, 0, 10, 1)).toBe(1);
    expect(clampNumber(Infinity, 0, 10, 2)).toBe(2);
    expect(clampNumber(-Infinity, 0, 10, 3)).toBe(3);
  });

  it('clamps into the [min, max] range', () => {
    expect(clampNumber(-5, 0, 10, 1)).toBe(0);
    expect(clampNumber(50, 0, 10, 1)).toBe(10);
    expect(clampNumber(5, 0, 10, 1)).toBe(5);
    expect(clampNumber(99999, 1, MAX_QUANTITY, 1)).toBe(MAX_QUANTITY);
  });
});

describe('describeChatError', () => {
  it('maps rate-limit errors', () => {
    expect(describeChatError(new Error('Too many AI requests'))).toMatch(/too many/i);
    expect(describeChatError(new Error('429 rate limit'))).toMatch(/rate limit|429/i);
  });

  it('maps server/model outage errors', () => {
    expect(describeChatError(new Error('AI request failed'))).toMatch(/temporarily unavailable/i);
    expect(describeChatError(new Error('request timed out'))).toMatch(/temporarily unavailable/i);
    expect(describeChatError(new Error('502 Bad Gateway'))).toMatch(/temporarily unavailable/i);
  });

  it('maps network failures (TypeError)', () => {
    expect(describeChatError(new TypeError('Failed to fetch'))).toMatch(/reach the server/i);
  });

  it('falls back to a rephrase prompt for unknown errors', () => {
    expect(describeChatError(new Error('something weird'))).toMatch(/rephrase/i);
    expect(describeChatError('not even an error')).toMatch(/rephrase/i);
  });
});

describe('formatUnit', () => {
  it('returns the singular unit for quantity 1', () => {
    expect(formatUnit('katori', 1)).toBe('katori');
    expect(formatUnit('piece', 1)).toBe('piece');
  });

  it('pluralizes count nouns but not measurement units', () => {
    expect(formatUnit('katori', 2)).toBe('katoris');
    expect(formatUnit('piece', 3)).toBe('pieces');
    expect(formatUnit('gram', 5)).toBe('gram');
    expect(formatUnit('ml', 5)).toBe('ml');
    expect(formatUnit('serving', 2)).toBe('serving');
  });
});

describe('toHHmm', () => {
  it('formats hours and minutes zero-padded', () => {
    expect(toHHmm(new Date('2026-06-05T09:05:00'))).toBe('09:05');
    expect(toHHmm(new Date('2026-06-05T23:59:00'))).toBe('23:59');
  });
});

describe('sumNutrients', () => {
  const base: NutrientInfo = {
    calories: 100,
    protein: 10,
    carbs: 20,
    fats: 5,
    fiber: 2,
    sugar: 1,
    sodium: 50,
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    calcium: 0,
    iron: 0,
    magnesium: 0,
    potassium: 0,
  };

  it('returns an empty bag for no items', () => {
    expect(sumNutrients([])).toMatchObject({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  });

  it('scales each item by its quantity and sums', () => {
    const total = sumNutrients([
      { nutrients: base, quantity: 2 },
      { nutrients: base, quantity: 1 },
    ]);
    expect(total.calories).toBe(300);
    expect(total.protein).toBe(30);
    expect(total.carbs).toBe(60);
    expect(total.fats).toBe(15);
    expect(total.fiber).toBe(6);
  });
});

describe('compressImage', () => {
  // jsdom has no real canvas/createImageBitmap, so these cover the guard and
  // error paths that run before any pixel work; the happy path is exercised
  // end-to-end in the browser/e2e.
  it('rejects a file over the size cap before decoding', async () => {
    const huge = new File([new Uint8Array(MAX_IMAGE_FILE_BYTES + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });
    await expect(compressImage(huge)).rejects.toThrow(/too large/i);
  });

  it('surfaces a friendly error when the image cannot be decoded', async () => {
    const original = globalThis.createImageBitmap;
    // jsdom does not implement createImageBitmap; force the decode to fail.
    globalThis.createImageBitmap = (() =>
      Promise.reject(new Error('decode failed'))) as typeof createImageBitmap;
    try {
      const file = new File([new Uint8Array([1, 2, 3])], 'photo.heic', { type: 'image/heic' });
      await expect(compressImage(file)).rejects.toThrow(/couldn't read that image/i);
    } finally {
      globalThis.createImageBitmap = original;
    }
  });
});
