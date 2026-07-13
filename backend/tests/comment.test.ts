import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/auth';
import { Role } from '@prisma/client';

describe('Comments & Collaboration API', () => {
  let userOwner: any;
  let userMember: any;
  let userStranger: any;
  let tokenOwner = '';
  let tokenMember = '';
  let tokenStranger = '';
  let workspaceId = '';
  let projectId = '';
  let columnId = '';
  let taskId = '';
  let commentId = '';

  beforeAll(async () => {
    // Clean DB
    await prisma.notification.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});

    // Create users
    userOwner = await prisma.user.create({
      data: { name: 'Owner User', email: 'owner@example.com', passwordHash: 'hash', emailVerified: true }
    });
    userMember = await prisma.user.create({
      data: { name: 'Member User', email: 'member@example.com', passwordHash: 'hash', emailVerified: true }
    });
    userStranger = await prisma.user.create({
      data: { name: 'Stranger User', email: 'stranger@example.com', passwordHash: 'hash', emailVerified: true }
    });

    tokenOwner = generateAccessToken(userOwner.id);
    tokenMember = generateAccessToken(userMember.id);
    tokenStranger = generateAccessToken(userStranger.id);

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Collaboration Workspace',
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
      .send({ name: 'Collab Project' });

    projectId = projectRes.body.data.id;
    columnId = projectRes.body.data.board.columns[0].id;

    // Create task
    const taskRes = await request(app)
      .post(`/api/v1/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ title: 'Collab Task', description: 'Testing comments' });

    taskId = taskRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({});
    await prisma.comment.deleteMany({});
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

  // 1. Comment Creation and Listing
  it('should allow Member to comment on a task', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ body: 'Hello, this is my *first* markdown comment!' });

    expect(res.status).toBe(201);
    expect(res.body.data.body).toBe('Hello, this is my *first* markdown comment!');
    expect(res.body.data.userId).toBe(userMember.id);
    expect(res.body.data.user.name).toBe('Member User');
    commentId = res.body.data.id;
  });

  it('should list comments on a task in chronological order', async () => {
    // Add a second comment
    await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ body: 'Replying to your comment.' });

    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].id).toBe(commentId);
    expect(res.body.data[1].body).toBe('Replying to your comment.');
  });

  // 2. Editing Comments
  it('should allow commenter to edit their own comment', async () => {
    const res = await request(app)
      .patch(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ body: 'Edited first comment body.' });

    expect(res.status).toBe(200);
    expect(res.body.data.body).toBe('Edited first comment body.');

    const dbComment = await prisma.comment.findUnique({ where: { id: commentId } });
    expect(dbComment?.body).toBe('Edited first comment body.');
  });

  it('should block editing comments created by other users', async () => {
    const res = await request(app)
      .patch(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ body: 'Trying to hack edit.' });

    expect(res.status).toBe(403);
  });

  // 3. Deleting & Moderation
  it('should block non-moderators from deleting other users comments', async () => {
    // Find owner's comment id
    const comments = await prisma.comment.findMany({ where: { userId: userOwner.id } });
    const ownersCommentId = comments[0].id;

    const res = await request(app)
      .delete(`/api/v1/comments/${ownersCommentId}`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(res.status).toBe(403);
  });

  it('should allow Owner/Admin to delete any comment (moderation)', async () => {
    const res = await request(app)
      .delete(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${tokenOwner}`);

    expect(res.status).toBe(200);

    const deleted = await prisma.comment.findUnique({ where: { id: commentId } });
    expect(deleted).toBeNull();
  });

  // 4. @Mention Notifications
  it('should parse @mentions and notify mentioned users', async () => {
    // Mention Owner by Name
    const resName = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ body: 'Hey @Owner User please review this task.' });

    expect(resName.status).toBe(201);

    const notificationName = await prisma.notification.findFirst({
      where: { userId: userOwner.id, type: 'MENTION' }
    });
    expect(notificationName).toBeDefined();
    const payloadName = notificationName?.payload as any;
    expect(payloadName.commentId).toBe(resName.body.data.id);

    // Mention Owner by Email
    const resEmail = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ body: 'Check this out @owner@example.com!' });

    expect(resEmail.status).toBe(201);

    const notificationsCount = await prisma.notification.count({
      where: { userId: userOwner.id, type: 'MENTION' }
    });
    // Should have 2 mention notifications total
    expect(notificationsCount).toBe(2);
  });
});
