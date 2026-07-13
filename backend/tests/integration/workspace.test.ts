import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/utils/prisma';

// ─── Helpers ───────────────────────────────────────────────────────────────
const unique = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

let accessToken: string;
let workspaceId: string;
let projectId: string;
let columnId: string;
let taskId: string;

// ─── Setup: create and login a verified user ────────────────────────────────
beforeAll(async () => {
  const email = `ws_test_${unique()}@example.com`;
  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'WS Tester', email, password: 'StrongPass123!' });

  // Bypass email verification for testing
  await prisma.user.update({ where: { email }, data: { emailVerified: true } });

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'StrongPass123!' });

  accessToken = loginRes.body.data.access_token;
});

// ─── Cleanup ────────────────────────────────────────────────────────────────
afterAll(async () => {
  if (workspaceId) {
    await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════
describe('Workspace → Project → Board → Task (full flow)', () => {

  // ── Workspaces ─────────────────────────────────────────────────────────
  it('POST /workspaces — creates a workspace', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Test WS ${unique()}` });

    expect(res.status).toBe(201);
    // createWorkspace returns workspace fields directly in data (no .workspace wrapper)
    expect(res.body.data).toHaveProperty('id');
    workspaceId = res.body.data.id;
  });

  it('GET /workspaces — lists workspaces including the new one', async () => {
    const res = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    // listWorkspaces returns data as array directly
    const list = Array.isArray(res.body.data) ? res.body.data : (res.body.data?.workspaces || []);
    const ids = list.map((w: any) => w.id);
    expect(ids).toContain(workspaceId);
  });

  it('GET /workspaces/:id — returns workspace detail', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    // getWorkspaceDetails may return data.workspace or data directly
    const ws = res.body.data?.workspace || res.body.data;
    expect(ws.id).toBe(workspaceId);
  });

  // ── Projects ───────────────────────────────────────────────────────────
  it('POST /workspaces/:id/projects — creates a project', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Project', description: 'Integration test project' });

    expect(res.status).toBe(201);
    const project = res.body.data?.project || res.body.data;
    expect(project).toHaveProperty('id');
    projectId = project.id;
  });

  // ── Board ──────────────────────────────────────────────────────────────
  it('GET /projects/:id/board — board is auto-created with project', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/board`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('columns');
  });

  it('POST /projects/:id/columns — creates a column on the board', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/columns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'To Do', order: 0 });

    expect(res.status).toBe(201);
    const column = res.body.data?.column || res.body.data;
    expect(column).toHaveProperty('id');
    columnId = column.id;
  });

  // ── Tasks ──────────────────────────────────────────────────────────────
  it('POST /columns/:id/tasks — creates a task with HIGH priority', async () => {
    const res = await request(app)
      .post(`/api/v1/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Test Task', priority: 'HIGH', description: 'A test task' });

    expect(res.status).toBe(201);
    // createTask returns task directly in data
    const task = res.body.data?.task || res.body.data;
    expect(task).toMatchObject({ title: 'Test Task', priority: 'HIGH' });
    taskId = task.id;
  });

  it('GET /tasks/:id — fetches the task', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const task = res.body.data?.task || res.body.data;
    expect(task.id).toBe(taskId);
  });

  it('PATCH /tasks/:id — updates title and priority', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Task', priority: 'URGENT' });

    expect(res.status).toBe(200);
    const task = res.body.data?.task || res.body.data;
    expect(task).toMatchObject({ title: 'Updated Task', priority: 'URGENT' });
  });

  it('POST /tasks/:id/comments — adds a comment', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ body: 'This is a test comment' });

    expect(res.status).toBe(201);
    const comment = res.body.data?.comment || res.body.data;
    expect(comment.body).toBe('This is a test comment');
  });

  it('POST /tasks/:id/checklist — adds a checklist item', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/checklist`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ label: 'Review code' });

    expect(res.status).toBe(201);
    const item = res.body.data?.item || res.body.data;
    expect(item.label).toBe('Review code');
  });

  it('DELETE /tasks/:id — deletes the task', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('Auth Guard', () => {
  it('GET /workspaces — returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/workspaces');
    expect(res.status).toBe(401);
  });

  it('GET /workspaces — returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});
