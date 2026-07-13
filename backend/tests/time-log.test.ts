import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/auth';
import { Role } from '@prisma/client';

describe('Time Tracking API', () => {
  let userA: any;
  let userB: any;
  let userC: any;
  let tokenA = '';
  let tokenB = '';
  let tokenC = '';
  let workspaceId = '';
  let projectId = '';
  let boardId = '';
  let columnId = '';
  let taskId = '';
  let logId = '';

  beforeAll(async () => {
    // Teardown db
    await prisma.timeLog.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.checklistItem.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});

    // Create 3 users
    userA = await prisma.user.create({
      data: { name: 'User A Owner', email: 'owner@example.com', passwordHash: 'dummy', emailVerified: true }
    });
    userB = await prisma.user.create({
      data: { name: 'User B Member', email: 'member@example.com', passwordHash: 'dummy', emailVerified: true }
    });
    userC = await prisma.user.create({
      data: { name: 'User C NonMember', email: 'non@example.com', passwordHash: 'dummy', emailVerified: true }
    });

    tokenA = generateAccessToken(userA.id);
    tokenB = generateAccessToken(userB.id);
    tokenC = generateAccessToken(userC.id);

    // Workspace & Project
    const ws = await prisma.workspace.create({
      data: { name: 'Billing WS', ownerId: userA.id }
    });
    workspaceId = ws.id;

    await prisma.workspaceMember.createMany({
      data: [
        { workspaceId, userId: userA.id, role: Role.OWNER },
        { workspaceId, userId: userB.id, role: Role.MEMBER }
      ]
    });

    const project = await prisma.project.create({
      data: { workspaceId, name: 'Billing Project', ownerId: userA.id }
    });
    projectId = project.id;

    const board = await prisma.board.create({
      data: { projectId }
    });
    boardId = board.id;

    const column = await prisma.column.create({
      data: { boardId, name: 'To Do', order: 0 }
    });
    columnId = column.id;

    const task = await prisma.task.create({
      data: { columnId, title: 'Implement Time Tracking', order: 0 }
    });
    taskId = task.id;
  });

  afterAll(async () => {
    await prisma.timeLog.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.checklistItem.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  // 1. Create Time Log
  it('should allow workspace member to log time on a task', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/time-logs`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ durationSeconds: 3600, description: 'Worked on board extensions' });

    expect(res.status).toBe(201);
    expect(res.body.data.durationSeconds).toBe(3600);
    expect(res.body.data.description).toBe('Worked on board extensions');
    expect(res.body.data.userId).toBe(userB.id);

    logId = res.body.data.id;
  });

  it('should reject logging time with invalid duration', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/time-logs`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ durationSeconds: -100, description: 'Negative log' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject logging time by non-member', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/time-logs`)
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ durationSeconds: 1800, description: 'Attempt to log' });

    expect(res.status).toBe(403);
  });

  // 2. List Time Logs
  it('should list time logs for a task to any workspace member', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/time-logs`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(logId);
    expect(res.body.data[0].user.name).toBe('User B Member');
  });

  // 3. Billing endpoint
  it('should retrieve aggregated billing calculations for a project', async () => {
    // Add another log by owner
    await prisma.timeLog.create({
      data: { taskId, userId: userA.id, durationSeconds: 7200, description: 'Code review and setup' }
    });

    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/billing`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalSeconds).toBe(10800); // 3600 + 7200
    expect(res.body.data.logs.length).toBe(2);
    expect(res.body.data.taskBreakdown.length).toBe(1);
    expect(res.body.data.userBreakdown.length).toBe(2);
  });

  // 4. Delete Time Log
  it('should reject deletion of time log by non-creator member', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}/time-logs/${logId}`)
      .set('Authorization', `Bearer ${tokenC}`); // Non-member

    expect(res.status).toBe(403);
  });

  it('should allow deletion of time log by its creator', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}/time-logs/${logId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Time log deleted successfully.');
  });
});
