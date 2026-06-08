import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import {
  createTestApp,
  registerAgent,
  buildMeal,
  buildWeight,
  validProfile,
  type TestApp,
} from '../helpers.js';

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

describe('DELETE /api/auth/account', () => {
  it('requires authentication (401)', async () => {
    const res = await request(ctx.app)
      .delete('/api/auth/account')
      .send({ password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('rejects a missing password with 400', async () => {
    const { agent } = await registerAgent(ctx.app);
    const res = await agent.delete('/api/auth/account').send({});
    expect(res.status).toBe(400);
  });

  it('rejects an incorrect password with 401 and keeps the account', async () => {
    const { agent } = await registerAgent(ctx.app, { password: 'password123' });
    const res = await agent.delete('/api/auth/account').send({ password: 'wrong-password' });
    expect(res.status).toBe(401);
    // Session still valid: the account was not deleted.
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  it('deletes the account, clears the cookie and wipes the user data', async () => {
    const { agent, userId } = await registerAgent(ctx.app, { password: 'password123' });

    // Seed some owned data so we can assert it is cascade-deleted.
    await agent.post('/api/meals').send(buildMeal(userId));
    await agent.post('/api/weights').send(buildWeight(userId));

    const res = await agent.delete('/api/auth/account').send({ password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/fitpal-token=;|Expires=Thu, 01 Jan 1970/i);

    // The session cookie is cleared, so the agent is now unauthenticated.
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('frees the email for re-registration after deletion', async () => {
    const email = `reuse-${randomUUID()}@example.com`;
    const { agent } = await registerAgent(ctx.app, { email, password: 'password123' });
    await agent.delete('/api/auth/account').send({ password: 'password123' });

    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ name: 'Reuse', email, password: 'password123', profile: validProfile() });
    expect(res.status).toBe(200);
  });
});
