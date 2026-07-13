import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/auth';
import { Role } from '@prisma/client';
import { cache } from '../src/utils/cache';

jest.mock('../src/utils/cache', () => {
  const store = new Map();
  return {
    cache: {
      get: jest.fn().mockImplementation(async (key) => {
        const val = store.get(key);
        return val ? JSON.parse(val) : null;
      }),
      set: jest.fn().mockImplementation(async (key, value) => {
        store.set(key, JSON.stringify(value));
      }),
      del: jest.fn().mockImplementation(async (key) => {
        store.delete(key);
      }),
      clear: jest.fn().mockImplementation(async () => {
        store.clear();
      })
    }
  };
});

describe('Analytics Dashboard API', () => {
  let userOwner: any;
  let userMember: any;
  let userViewer: any;
  let userStranger: any;
  let tokenOwner = '';
  let tokenMember = '';
  let tokenViewer = '';
  let tokenStranger = '';
  let workspaceId = '';
  let projectId = '';
  let columnToDoId = '';
  let columnInProgressId = '';
  let columnDoneId = '';
  let task1Id = '';
  let task2Id = '';
  let task3Id = '';

  beforeAll(async () => {
    // Clean DB
    await prisma.notification.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
    cache.clear();

    // Create users
    userOwner = await prisma.user.create({
      data: { name: 'Analytics Owner', email: 'owner@example.com', passwordHash: 'hash', emailVerified: true }
    });
    userMember = await prisma.user.create({
      data: { name: 'Analytics Member', email: 'member@example.com', passwordHash: 'hash', emailVerified: true }
    });
    userViewer = await prisma.user.create({
      data: { name: 'Analytics Viewer', email: 'viewer@example.com', passwordHash: 'hash', emailVerified: true }
    });
    userStranger = await prisma.user.create({
      data: { name: 'Analytics Stranger', email: 'stranger@example.com', passwordHash: 'hash', emailVerified: true }
    });

    tokenOwner = generateAccessToken(userOwner.id);
    tokenMember = generateAccessToken(userMember.id);
    tokenViewer = generateAccessToken(userViewer.id);
    tokenStranger = generateAccessToken(userStranger.id);

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Analytics Workspace',
        ownerId: userOwner.id,
        members: {
          createMany: {
            data: [
              { userId: userOwner.id, role: Role.OWNER },
              { userId: userMember.id, role: Role.MEMBER },
              { userId: userViewer.id, role: Role.VIEWER }
            ]
          }
        }
      }
    });
    workspaceId = workspace.id;

    // Create project
    const projectRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Analytics Project' });

    projectId = projectRes.body.data.id;

    const columns = projectRes.body.data.board.columns;
    columnToDoId = columns.find((c: any) => c.name === 'To Do').id;
    columnInProgressId = columns.find((c: any) => c.name === 'In Progress').id;
    columnDoneId = columns.find((c: any) => c.name === 'Done').id;

    // Create tasks
    // Task 1: in To Do, assigned to userMember
    const t1 = await prisma.task.create({
      data: {
        columnId: columnToDoId,
        title: 'Task One',
        order: 0,
        assignees: { connect: { id: userMember.id } }
      }
    });
    task1Id = t1.id;

    // Task 2: in In Progress
    const t2 = await prisma.task.create({
      data: {
        columnId: columnInProgressId,
        title: 'Task Two',
        order: 0
      }
    });
    task2Id = t2.id;

    // Task 3: in Done, assigned to userMember
    const t3 = await prisma.task.create({
      data: {
        columnId: columnDoneId,
        title: 'Task Three',
        order: 0,
        assignees: { connect: { id: userMember.id } }
      }
    });
    task3Id = t3.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
    cache.clear();
    await prisma.$disconnect();
  });

  // 1. Status Breakdown
  it('should allow Viewer to retrieve project column status breakdown', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/analytics/status-breakdown`)
      .set('Authorization', `Bearer ${tokenViewer}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.length).toBeGreaterThanOrEqual(4);

    const todoVal = data.find((c: any) => c.columnName === 'To Do');
    const doneVal = data.find((c: any) => c.columnName === 'Done');

    expect(todoVal.count).toBe(1);
    expect(doneVal.count).toBe(1);
  });

  // 2. Overdue Tasks
  it('should list active overdue tasks', async () => {
    // Create overdue task (due yesterday) in To Do
    const overdueTask = await prisma.task.create({
      data: {
        columnId: columnToDoId,
        title: 'Overdue Task',
        order: 1,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    });

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/analytics/overdue`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(overdueTask.id);

    // Clean up
    await prisma.task.delete({ where: { id: overdueTask.id } });
  });

  // 3. Completion Trend
  it('should retrieve task completion trends based on completion logs', async () => {
    // Mock a completion event in ActivityLog
    await prisma.activityLog.create({
      data: {
        taskId: task2Id,
        userId: userMember.id,
        action: "moved task to column 'Done'"
      }
    });

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/analytics/completion-trend?range=7d`)
      .set('Authorization', `Bearer ${tokenViewer}`);

    expect(res.status).toBe(200);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayVal = res.body.data.find((t: any) => t.date === todayStr);
    expect(todayVal.completedCount).toBe(1);
  });

  // 4. Bottleneck Columns
  it('should list bottleneck columns with average linger times', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/analytics/bottlenecks`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].averageLingerTimeMs).toBeDefined();
  });

  // 5. Workloads
  it('should fetch workloads of workspace members', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/analytics/workload`)
      .set('Authorization', `Bearer ${tokenViewer}`);

    expect(res.status).toBe(200);
    const workloads = res.body.data;
    expect(workloads.length).toBe(3);

    const memberW = workloads.find((w: any) => w.userId === userMember.id);
    // Task One is active (1), Task Three is completed (1)
    expect(memberW.activeTasksCount).toBe(1);
    expect(memberW.completedTasksCount).toBe(1);
  });

  // 6. Caching Verification
  it('should serve from cache on subsequent calls and bypass with refresh=true', async () => {
    const key = `project:${projectId}:analytics:status-breakdown`;
    
    // First call populates cache
    await request(app)
      .get(`/api/v1/projects/${projectId}/analytics/status-breakdown`)
      .set('Authorization', `Bearer ${tokenOwner}`);

    const cachedVal = await cache.get<any>(key);
    expect(cachedVal).toBeDefined();
    expect(cachedVal).not.toBeNull();

    // Modify a task directly in DB to bypass update triggers
    await prisma.task.create({
      data: { columnId: columnToDoId, title: 'Cached Task', order: 2 }
    });

    // Query again without refresh -> should return cached count (1, not 2)
    const cachedRes = await request(app)
      .get(`/api/v1/projects/${projectId}/analytics/status-breakdown`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    const todoValCached = cachedRes.body.data.find((c: any) => c.columnName === 'To Do');
    expect(todoValCached.count).toBe(1);

    // Query with refresh=true -> should bypass cache and return real count (2)
    const refreshedRes = await request(app)
      .get(`/api/v1/projects/${projectId}/analytics/status-breakdown?refresh=true`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    const todoValRefreshed = refreshedRes.body.data.find((c: any) => c.columnName === 'To Do');
    expect(todoValRefreshed.count).toBe(2);
  });

  // 7. Security Authorization check
  it('should block non-members from retrieving workspace workload metrics', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/analytics/workload`)
      .set('Authorization', `Bearer ${tokenStranger}`);

    expect(res.status).toBe(403);
  });
});
