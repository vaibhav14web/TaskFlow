import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/auth';
import { Role } from '@prisma/client';
import fs from 'fs';
import path from 'path';

describe('Task Management & Assignment API', () => {
  let userOwner: any;
  let userMember: any;
  let tokenOwner = '';
  let tokenMember = '';
  let workspaceId = '';
  let projectId = '';
  let columnToDoId = '';
  let taskId = '';
  let checklistItemId = '';
  let notificationId = '';

  beforeAll(async () => {
    // Clear DB tables in dependency order
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
        name: 'Task Management Workspace',
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

    // Create project (seeds board & default columns)
    const projectRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Task Management Project' });

    projectId = projectRes.body.data.id;
    columnToDoId = projectRes.body.data.board.columns.find((c: any) => c.name === 'To Do').id;

    // Create a base task
    const taskRes = await request(app)
      .post(`/api/v1/columns/${columnToDoId}/tasks`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ title: 'Task Alpha', description: 'Task for assignment testing' });

    taskId = taskRes.body.data.id;
  });

  afterAll(async () => {
    // Clear and disconnect
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

    // Clean up local uploaded test files if any exist
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

  // 1. Task Assignment & Notifications
  it('should allow Member to assign another user, logging activity and creating notification', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/assignees`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ userId: userMember.id });

    expect(res.status).toBe(200);

    // Verify task assignee in DB
    const taskWithAssignees = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignees: true }
    });
    expect(taskWithAssignees?.assignees.length).toBe(1);
    expect(taskWithAssignees?.assignees[0].id).toBe(userMember.id);

    // Verify activity log in DB
    const log = await prisma.activityLog.findFirst({
      where: { taskId, action: { contains: 'assigned Member' } }
    });
    expect(log).toBeDefined();

    // Verify assignment notification in DB
    const notification = await prisma.notification.findFirst({
      where: { userId: userMember.id, type: 'ASSIGNMENT' }
    });
    expect(notification).toBeDefined();
    notificationId = notification?.id || '';
  });

  it('should allow Member to unassign user, logging activity', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}/assignees/${userMember.id}`)
      .set('Authorization', `Bearer ${tokenOwner}`);

    expect(res.status).toBe(200);

    // Verify unassigned in DB
    const taskWithAssignees = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignees: true }
    });
    expect(taskWithAssignees?.assignees.length).toBe(0);

    // Verify activity log in DB
    const log = await prisma.activityLog.findFirst({
      where: { taskId, action: { contains: 'unassigned Member' } }
    });
    expect(log).toBeDefined();
  });

  // 2. Checklist Items CRUD
  it('should allow Member to add a checklist item and log activity', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/checklist`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ label: 'Setup express router' });

    expect(res.status).toBe(201);
    expect(res.body.data.label).toBe('Setup express router');
    expect(res.body.data.isDone).toBe(false);
    checklistItemId = res.body.data.id;

    // Verify activity log in DB
    const log = await prisma.activityLog.findFirst({
      where: { taskId, action: { contains: "added checklist item 'Setup express router'" } }
    });
    expect(log).toBeDefined();
  });

  it('should allow Member to toggle checklist item state and log activity', async () => {
    const res = await request(app)
      .patch(`/api/v1/checklist/${checklistItemId}`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ isDone: true });

    expect(res.status).toBe(200);
    expect(res.body.data.isDone).toBe(true);

    // Verify activity log in DB
    const log = await prisma.activityLog.findFirst({
      where: { taskId, action: { contains: "completed checklist item 'Setup express router'" } }
    });
    expect(log).toBeDefined();
  });

  // 3. File Attachments Upload
  it('should allow Member to upload attachment file and log activity', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .attach('file', Buffer.from('%PDF-1.4 test doc content'), 'specs.pdf');

    expect(res.status).toBe(201);
    expect(res.body.data.fileName).toBe('specs.pdf');
    expect(res.body.data.fileUrl).toContain('/uploads/');

    // Verify activity log in DB
    const log = await prisma.activityLog.findFirst({
      where: { taskId, action: { contains: "uploaded attachment 'specs.pdf'" } }
    });
    expect(log).toBeDefined();
  });

  it('should block uploading file with an invalid extension', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .attach('file', Buffer.from('binary data'), 'malicious.exe');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Invalid file type');
  });

  // 4. Task Update Activity Logging
  it('should log activity on task fields modification', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({
        title: 'Task Alpha Updated',
        priority: 'HIGH'
      });

    expect(res.status).toBe(200);

    // Verify multiple activity logs created for the updates
    const titleLog = await prisma.activityLog.findFirst({
      where: { taskId, action: "changed title to 'Task Alpha Updated'" }
    });
    const priorityLog = await prisma.activityLog.findFirst({
      where: { taskId, action: "changed priority to 'HIGH'" }
    });

    expect(titleLog).toBeDefined();
    expect(priorityLog).toBeDefined();
  });

  it('should retrieve task activity logs list', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/activity`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(3);
    expect(res.body.data[0].action).toBeDefined();
  });

  // 5. Notifications List & Read Actions
  it('should list notifications for current user', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].type).toBe('ASSIGNMENT');
  });

  it('should mark notification as read', async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(res.status).toBe(200);
    expect(res.body.data.readAt).not.toBeNull();
  });

  // 6. Due Date Reminders
  it('should check due dates and create notifications for assignees within 24 hours', async () => {
    // 6a. Create task due in 23 hours, assigned to userMember
    const upcomingTask = await prisma.task.create({
      data: {
        columnId: columnToDoId,
        title: 'Due Date Approaching Task',
        dueDate: new Date(Date.now() + 23 * 60 * 60 * 1000), // 23 hours from now
        order: 9,
        assignees: {
          connect: { id: userMember.id }
        }
      }
    });

    // 6b. Trigger checker job
    const res = await request(app)
      .post('/api/v1/notifications/check-due-dates')
      .set('Authorization', `Bearer ${tokenOwner}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('notifications');

    // 6c. Verify notification created in DB
    const warning = await prisma.notification.findFirst({
      where: {
        userId: userMember.id,
        type: 'DUE_DATE'
      }
    });
    expect(warning).toBeDefined();
    const payload = warning?.payload as any;
    expect(payload.taskId).toBe(upcomingTask.id);
  });
});
