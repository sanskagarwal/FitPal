import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BackupPreview } from '../../src/types';

// Minimal manifest fixture used to build ZIP-like mock responses.
const buildManifest = (overrides: Record<string, unknown> = {}) => ({
  version: '1.0.0',
  exportedAt: '2026-01-15T10:00:00.000Z',
  meals: [{ id: 'm1' }, { id: 'm2' }],
  weightEntries: [{ id: 'w1' }],
  waterEntries: [{ id: 'wa1' }, { id: 'wa2' }],
  imageIndex: [{ mealId: 'm1', filename: 'meal-m1.jpg', mime: 'image/jpeg' }],
  ...overrides,
});

// JSZip mock: captures the buffer passed to loadAsync and returns a fake ZIP
// object whose .file() method returns an entry that serves the manifest text.
const mockLoadAsync = vi.fn();
vi.mock('jszip', () => ({
  default: {
    loadAsync: (...args: unknown[]) => mockLoadAsync(...args),
  },
}));

// Imported after the mock is in place.
const { readBackupPreview } = await import('../../src/utils/exportImport');

function makeZip(manifest: Record<string, unknown>) {
  return {
    file: (name: string) => {
      if (name !== 'backup.json') return null;
      return { async: () => Promise.resolve(JSON.stringify(manifest)) };
    },
  };
}

describe('readBackupPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct counts from a valid backup', async () => {
    mockLoadAsync.mockResolvedValue(makeZip(buildManifest()));

    const result: BackupPreview = await readBackupPreview(new File([], 'backup.zip'));

    expect(result).toEqual({
      version: '1.0.0',
      exportedAt: '2026-01-15T10:00:00.000Z',
      meals: 2,
      mealsWithPhotos: 1,
      weightEntries: 1,
      waterEntries: 2,
    });
  });

  it('returns zero counts when arrays are absent', async () => {
    mockLoadAsync.mockResolvedValue(
      makeZip(buildManifest({ meals: undefined, weightEntries: undefined, waterEntries: undefined, imageIndex: undefined }))
    );

    const result = await readBackupPreview(new File([], 'backup.zip'));
    expect(result.meals).toBe(0);
    expect(result.mealsWithPhotos).toBe(0);
    expect(result.weightEntries).toBe(0);
    expect(result.waterEntries).toBe(0);
  });

  it('throws when backup.json is missing from the ZIP', async () => {
    mockLoadAsync.mockResolvedValue({ file: () => null });

    await expect(readBackupPreview(new File([], 'backup.zip'))).rejects.toThrow(
      'Invalid backup: missing backup.json'
    );
  });

  it('throws when the manifest is missing version or exportedAt', async () => {
    mockLoadAsync.mockResolvedValue(makeZip({ exportedAt: '2026-01-15T10:00:00.000Z' }));

    await expect(readBackupPreview(new File([], 'backup.zip'))).rejects.toThrow(
      'Invalid backup format'
    );
  });

  it('throws when the file cannot be parsed as a ZIP', async () => {
    mockLoadAsync.mockRejectedValue(new Error('not a zip'));

    await expect(readBackupPreview(new File([], 'bad.zip'))).rejects.toThrow(
      'Could not read the file as a ZIP archive'
    );
  });
});
