import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestDb } from './setup';
import { createApp } from '../src/app';

function newApp() {
  return createApp(createTestDb());
}

describe('auth routes', () => {
  it('POST /api/auth/register 成功 201 并写入 session', async () => {
    const agent = request.agent(newApp());
    const res = await agent
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'pw' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('alice');
    expect(res.body.id).toBeGreaterThan(0);

    // 注册后立即可用 session 调 /me
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.username).toBe('alice');
  });

  it('POST /api/auth/register 用户名重复 409', async () => {
    const app = newApp();
    await request(app).post('/api/auth/register').send({ username: 'a', password: 'p' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'a', password: 'p2' });
    expect(res.status).toBe(409);
  });

  it('POST /api/auth/register 缺字段 400', async () => {
    const res = await request(newApp())
      .post('/api/auth/register')
      .send({ username: 'a' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login 成功 200', async () => {
    const app = newApp();
    await request(app).post('/api/auth/register').send({ username: 'a', password: 'p' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'a', password: 'p' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('a');
  });

  it('POST /api/auth/login 密码错 401', async () => {
    const app = newApp();
    await request(app).post('/api/auth/register').send({ username: 'a', password: 'p' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'a', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login 账号不存在 401', async () => {
    const res = await request(newApp())
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'p' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout 返回 204 并清掉 session', async () => {
    const agent = request.agent(newApp());
    await agent.post('/api/auth/register').send({ username: 'a', password: 'p' });
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('GET /api/auth/me 未登录 401', async () => {
    const res = await request(newApp()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me 已登录 200', async () => {
    const agent = request.agent(newApp());
    await agent.post('/api/auth/register').send({ username: 'a', password: 'p' });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('a');
  });
});
