import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyAuthToken,
} from '../../server/auth.js';

describe('password hashing', () => {
  it('produces a bcrypt hash that verifies the original password', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toBe('correct horse battery');
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });

  it('rejects non-bcrypt hashes without throwing', async () => {
    expect(await verifyPassword('anything', '')).toBe(false);
    expect(await verifyPassword('anything', 'plaintext')).toBe(false);
  });
});

describe('JWT tokens', () => {
  it('round-trips the user id', () => {
    const token = signToken('user-123');
    expect(verifyAuthToken(token)).toBe('user-123');
  });

  it('rejects a tampered token', () => {
    const token = signToken('user-123');
    const tampered = `${token}tamper`;
    expect(verifyAuthToken(tampered)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const foreign = jwt.sign({ sub: 'user-123' }, 'a-totally-different-secret-key');
    expect(verifyAuthToken(foreign)).toBeNull();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ sub: 'user-123' }, process.env.JWT_SECRET as string, {
      expiresIn: -10,
    });
    expect(verifyAuthToken(expired)).toBeNull();
  });

  it('returns null when the payload has no subject', () => {
    const noSub = jwt.sign({ foo: 'bar' }, process.env.JWT_SECRET as string);
    expect(verifyAuthToken(noSub)).toBeNull();
  });
});

