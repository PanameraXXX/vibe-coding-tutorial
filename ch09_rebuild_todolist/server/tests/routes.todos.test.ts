import { describe, it, expect } from 'vitest';
import request, { type SuperAgentTest } from 'supertest';
import { createTestDb } from './setup';
import { createApp } from '../src/app';

async function loginAs(agent: SuperAgentTest, username: string) {
  await agent
    .post('/api/auth/register')
    .send({ username, password: 'pw' });
}

function newApp() {
  return createApp(createTestDb());
}

describe('todos routes', () => {
  it('未登录 GET /api/todos 返回 401', async () => {
    const res = await request(newApp()).get('/api/todos');
    expect(res.status).toBe(401);
  });

  it('GET /api/todos 默认空数组', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/todos 创建并返回', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.post('/api/todos').send({ title: '看书' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('看书');
    expect(res.body.done).toBe(false);
  });

  it('POST /api/todos 缺 title 返回 400', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.post('/api/todos').send({});
    expect(res.status).toBe(400);
  });

  it('PATCH /api/todos/:id 修改 done', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const created = await agent.post('/api/todos').send({ title: 'x' });
    const id = created.body.id;
    const res = await agent.patch(`/api/todos/${id}`).send({ done: true });
    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);
  });

  it('PATCH /api/todos/:id 不存在返回 404', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.patch('/api/todos/999').send({ done: true });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/todos/:id 删除成功 204', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const created = await agent.post('/api/todos').send({ title: 'x' });
    const id = created.body.id;
    const res = await agent.delete(`/api/todos/${id}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/todos/:id 不存在返回 404', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.delete('/api/todos/999');
    expect(res.status).toBe(404);
  });

  it('用户 A 改用户 B 的 todo 返回 404（视为不存在）', async () => {
    const app = newApp();
    const aliceAgent = request.agent(app);
    const bobAgent = request.agent(app);
    await loginAs(aliceAgent, 'alice');
    await loginAs(bobAgent, 'bob');

    const created = await aliceAgent.post('/api/todos').send({ title: '私人' });
    const aliceTodoId = created.body.id;

    const patchRes = await bobAgent
      .patch(`/api/todos/${aliceTodoId}`)
      .send({ done: true });
    expect(patchRes.status).toBe(404);

    const deleteRes = await bobAgent.delete(`/api/todos/${aliceTodoId}`);
    expect(deleteRes.status).toBe(404);

    // alice 列表里它仍然在，且 done = false
    const aliceList = await aliceAgent.get('/api/todos');
    expect(aliceList.body).toHaveLength(1);
    expect(aliceList.body[0].done).toBe(false);
  });

  it('POST /api/todos 含新字段 → 201', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent.post('/api/todos').send({
      title: '写课件',
      category: '工作',
      priority: 3,
      dueDate: '2026-06-20',
    });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('工作');
    expect(res.body.priority).toBe(3);
    expect(res.body.dueDate).toBe('2026-06-20');
  });

  it('POST /api/todos priority 非 1/2/3 → 400', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent
      .post('/api/todos')
      .send({ title: 'x', priority: 5 });
    expect(res.status).toBe(400);
  });

  it('POST /api/todos dueDate 非 ISO → 400', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const res = await agent
      .post('/api/todos')
      .send({ title: 'x', dueDate: '2026/06/20' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/todos/:id 用 null 清空字段', async () => {
    const agent = request.agent(newApp());
    await loginAs(agent, 'alice');
    const created = await agent.post('/api/todos').send({
      title: 'x',
      category: '工作',
      priority: 3,
      dueDate: '2026-06-20',
    });
    const id = created.body.id;
    const res = await agent
      .patch(`/api/todos/${id}`)
      .send({ category: null, priority: null, dueDate: null });
    expect(res.status).toBe(200);
    expect(res.body.category).toBeNull();
    expect(res.body.priority).toBeNull();
    expect(res.body.dueDate).toBeNull();
  });
});
