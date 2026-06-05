import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createTestApp, validProfile, type TestApp } from '../helpers.js';

let ctx: TestApp;

beforeAll(() => {
  ctx = createTestApp();
});

afterAll(() => {
  ctx.cleanup();
});

function registerBody(email = `auth-${randomUUID()}@example.com`) {
  return { name: 'Auth User', email, password: 'password123', profile: validProfile() };
}

describe('POST /api/auth/register', () => {
  it('creates a user, sets an httpOnly cookie and returns the public user', async () => {
    const res = await request(ctx.app).post('/api/auth/register').send(registerBody());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.id).toBeTruthy();
    expect(res.body.user.password).toBeUndefined();
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/fitpal-token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('rejects a duplicate email with 409', async () => {
    const body = registerBody();
    await request(ctx.app).post('/api/auth/register').send(body);
    const res = await request(ctx.app).post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
  });

  it('rejects an invalid body with 400', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ email: 'bad', password: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('authenticates valid credentials', async () => {
    const body = registerBody();
    await request(ctx.app).post('/api/auth/register').send(body);
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: body.email, password: body.password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(body.email);
    expect(res.headers['set-cookie']?.[0] ?? '').toMatch(/fitpal-token=/);
  });

  it('rejects bad credentials with 401', async () => {
    const body = registerBody();
    await request(ctx.app).post('/api/auth/register').send(body);
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: body.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a session cookie', async () => {
    const res = await request(ctx.app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid session', async () => {
    const agent = request.agent(ctx.app);
    const body = registerBody();
    await agent.post('/api/auth/register').send(body);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(body.email);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the auth cookie', async () => {
    const res = await request(ctx.app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    // Cleared cookies are set with an expiry in the past / empty value.
    expect(cookie).toMatch(/fitpal-token=;|Expires=Thu, 01 Jan 1970/i);
  });
});
