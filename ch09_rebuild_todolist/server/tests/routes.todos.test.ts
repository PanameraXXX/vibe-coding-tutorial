import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestDb } from './setup';
import { createApp } from '../src/app';

describe('todos routes', () => {
  it('GET /api/todos 默认空数组', async () => {
    const app = createApp(createTestDb());
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/todos 创建并返回', async () => {
    const app = createApp(createTestDb());
    const res = await request(app)
      .post('/api/todos')
      .send({ title: '看书' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('看书');
    expect(res.body.done).toBe(false);
  });

  it('POST /api/todos 缺 title 返回 400', async () => {
    const app = createApp(createTestDb());
    const res = await request(app).post('/api/todos').send({});
    expect(res.status).toBe(400);
  });

  it('PATCH /api/todos/:id 修改 done', async () => {
    const app = createApp(createTestDb());
    const created = await request(app).post('/api/todos').send({ title: 'x' });
    const id = created.body.id;
    const res = await request(app).patch(`/api/todos/${id}`).send({ done: true });
    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);
  });

  it('PATCH /api/todos/:id 不存在返回 404', async () => {
    const app = createApp(createTestDb());
    const res = await request(app).patch('/api/todos/999').send({ done: true });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/todos/:id 删除成功 204', async () => {
    const app = createApp(createTestDb());
    const created = await request(app).post('/api/todos').send({ title: 'x' });
    const id = created.body.id;
    const res = await request(app).delete(`/api/todos/${id}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/todos/:id 不存在返回 404', async () => {
    const app = createApp(createTestDb());
    const res = await request(app).delete('/api/todos/999');
    expect(res.status).toBe(404);
  });
});
