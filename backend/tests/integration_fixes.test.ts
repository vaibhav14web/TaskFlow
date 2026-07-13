import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/auth';
import { Role } from '@prisma/client';
import fs from 'fs';
import path from 'path';

describe('Integration Fixes API Tests', () => {
  let userOwner: any;
  let userMember: any;
  let tokenOwner = '';
  let tokenMember = '';
  let workspaceId = '';
  let projectId = '';
  let columnToDoId = '';
  let taskId = '';
  let checklistItemId = '';
  let attachmentId = '';

  beforeAll(async () => {
    // Clear DB
    await prisma.notification.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.checklistItem.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test users
    userOwner = await prisma.user.create({
      data: { name: 'Owner', email: 'owner@example.com', passwordHash: 'hash', emailVerified: true }
    });
    userMember = await prisma.user.create({
      data: { name: 'Member', email: 'member@example.com', passwordHash: 'hash', emailVerified: true }
    });

    tokenOwner = generateAccessToken(userOwner.id);
    tokenMember = generateAccessToken(userMember.id);

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Workspace',
        ownerId: userOwner.id,
        members: {
          createMany: {
            data: [
              { userId: userOwner.id, role: Role.OWNER },
              { userId: userMember.id, role: Role.MEMBER }
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
      .send({ name: 'Project' });

    projectId = projectRes.body.data.id;
    columnToDoId = projectRes.body.data.board.columns[0].id;

    // Create task
    const taskRes = await request(app)
      .post(`/api/v1/columns/${columnToDoId}/tasks`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ title: 'Task Alpha', description: 'Testing integration fixes' });

    taskId = taskRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.checklistItem.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});

    // Clean up uploads
    try {
      const uploadDir = path.join(__dirname, '../uploads');
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
          if (file.startsWith('file-')) {
            fs.unlinkSync(path.join(uploadDir, file));
          }
        }
      }
    } catch (e) {}

    await prisma.$disconnect();
  });

  // 1. Checklist GET tests
  it('should list checklist items for a task', async () => {
    // Add item
    const postRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/checklist`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ label: 'Item 1' });

    checklistItemId = postRes.body.data.id;

    const getRes = await request(app)
      .get(`/api/v1/tasks/${taskId}/checklist`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBe(1);
    expect(getRes.body.data[0].label).toBe('Item 1');
  });

  it('should delete a checklist item', async () => {
    const deleteRes = await request(app)
      .delete(`/api/v1/checklist/${checklistItemId}`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(deleteRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/v1/tasks/${taskId}/checklist`)
      .set('Authorization', `Bearer ${tokenMember}`);
    expect(getRes.body.data.length).toBe(0);
  });

  // 2. Attachments GET & DELETE tests
  it('should upload, list, and delete task attachments', async () => {
    // 2a. Upload
    const postRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .attach('file', Buffer.from('my integration test attachment'), 'test-doc.txt');

    expect(postRes.status).toBe(201);
    attachmentId = postRes.body.data.id;

    // 2b. List
    const getRes = await request(app)
      .get(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBe(1);
    expect(getRes.body.data[0].fileName).toBe('test-doc.txt');

    // 2c. Delete
    const deleteRes = await request(app)
      .delete(`/api/v1/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(deleteRes.status).toBe(200);

    // Verify deletion
    const getRes2 = await request(app)
      .get(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${tokenMember}`);
    expect(getRes2.body.data.length).toBe(0);
  });

  // 3. Task Assignees GET tests
  it('should list task assignees', async () => {
    // 3a. Assign user
    const postRes = await request(app)
      .post(`/api/v1/tasks/${taskId}/assignees`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ userId: userMember.id });

    expect(postRes.status).toBe(200);

    // 3b. List assignees
    const getRes = await request(app)
      .get(`/api/v1/tasks/${taskId}/assignees`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBe(1);
    expect(getRes.body.data[0].id).toBe(userMember.id);
  });
});
