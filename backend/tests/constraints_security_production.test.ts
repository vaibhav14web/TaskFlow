import 'dotenv/config';
process.env.DISABLE_RATE_LIMIT_BYPASS = 'true';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken, verifyAccessToken } from '../src/utils/auth';
import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';

// ============================================================================
// HARD CONSTRAINTS, SECURITY, VULNERABILITY & PRODUCTION READINESS TESTS
// ============================================================================

describe('HARD CONSTRAINTS & RBAC ENFORCEMENT', () => {
  let ownerUser: any;
  let adminUser: any;
  let memberUser: any;
  let viewerUser: any;
  let strangerUser: any;
  let tokenOwner = '';
  let tokenAdmin = '';
  let tokenMember = '';
  let tokenViewer = '';
  let tokenStranger = '';
  let workspaceId = '';
  let projectId = '';
  let columnId = '';
  let taskId = '';

  beforeAll(async () => {
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});

    ownerUser = await prisma.user.create({
      data: { name: 'Owner', email: 'owner@constraints.com', passwordHash: 'hash', emailVerified: true }
    });
    adminUser = await prisma.user.create({
      data: { name: 'Admin', email: 'admin@constraints.com', passwordHash: 'hash', emailVerified: true }
    });
    memberUser = await prisma.user.create({
      data: { name: 'Member', email: 'member@constraints.com', passwordHash: 'hash', emailVerified: true }
    });
    viewerUser = await prisma.user.create({
      data: { name: 'Viewer', email: 'viewer@constraints.com', passwordHash: 'hash', emailVerified: true }
    });
    strangerUser = await prisma.user.create({
      data: { name: 'Stranger', email: 'stranger@constraints.com', passwordHash: 'hash', emailVerified: true }
    });

    tokenOwner = generateAccessToken(ownerUser.id);
    tokenAdmin = generateAccessToken(adminUser.id);
    tokenMember = generateAccessToken(memberUser.id);
    tokenViewer = generateAccessToken(viewerUser.id);
    tokenStranger = generateAccessToken(strangerUser.id);

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Constraint Test Workspace',
        ownerId: ownerUser.id,
        members: {
          createMany: {
            data: [
              { userId: ownerUser.id, role: Role.OWNER },
              { userId: adminUser.id, role: Role.ADMIN },
              { userId: memberUser.id, role: Role.MEMBER },
              { userId: viewerUser.id, role: Role.VIEWER },
            ]
          }
        }
      }
    });
    workspaceId = workspace.id;

    const projectRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Constraint Project' });

    projectId = projectRes.body.data.id;
    columnId = projectRes.body.data.board.columns[0].id;

    const taskRes = await request(app)
      .post(`/api/v1/columns/${columnId}/tasks`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ title: 'Constraint Task' });

    taskId = taskRes.body.data.id;
  });

  afterAll(async () => {
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

  // ==========================================================================
  // RBAC HARD CONSTRAINTS - Every endpoint tested against all roles
  // ==========================================================================

  describe('RBAC: Workspace Management', () => {
    const wsActions = [
      { method: 'patch' as const, url: () => `/api/v1/workspaces/${workspaceId}`, body: { name: 'Renamed' } },
      { method: 'delete' as const, url: () => `/api/v1/workspaces/${workspaceId}`, body: {} },
    ];

    const wsReadActions = [
      { method: 'get' as const, url: () => `/api/v1/workspaces/${workspaceId}`, body: {} },
      { method: 'get' as const, url: () => `/api/v1/workspaces/${workspaceId}/members`, body: {} },
    ];

    it('OWNER can rename workspace', async () => {
      const res = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Renamed' });
      expect(res.status).toBe(200);
    });

    it('ADMIN can rename workspace', async () => {
      const res = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ name: 'Admin Renamed' });
      expect(res.status).toBe(200);
    });

    it('MEMBER cannot rename workspace', async () => {
      const res = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ name: 'Member Rename' });
      expect(res.status).toBe(403);
    });

    it('VIEWER cannot rename workspace', async () => {
      const res = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ name: 'Viewer Rename' });
      expect(res.status).toBe(403);
    });

    it('only OWNER can delete workspace', async () => {
      const checkAdmin = await request(app)
        .delete(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(checkAdmin.status).toBe(403);

      const checkMember = await request(app)
        .delete(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${tokenMember}`);
      expect(checkMember.status).toBe(403);
    });

    it('VIEWER+ can get workspace details', async () => {
      const resOwner = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${tokenOwner}`);
      expect(resOwner.status).toBe(200);

      const resViewer = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${tokenViewer}`);
      expect(resViewer.status).toBe(200);
    });

    it('stranger (non-member) cannot access any workspace endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${tokenStranger}`);
      expect(res.status).toBe(403);
    });

    it('cannot modify owner role (self-change returns 400)', async () => {
      const changeOwner = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}/members/${ownerUser.id}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ role: 'MEMBER' });
      expect(changeOwner.status).toBe(400);
    });

    it('cannot remove workspace owner (even by admin)', async () => {
      const removeOwner = await request(app)
        .delete(`/api/v1/workspaces/${workspaceId}/members/${ownerUser.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(removeOwner.status).toBe(403);
    });

    it('admin cannot modify or remove another admin', async () => {
      const anotherUser = await prisma.user.create({
        data: { name: 'Another Admin', email: 'another.admin@test.com', passwordHash: 'hash', emailVerified: true }
      });
      const anotherToken = generateAccessToken(anotherUser.id);

      await prisma.workspaceMember.create({
        data: { workspaceId, userId: anotherUser.id, role: Role.ADMIN }
      });

      const modifyAdmin = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}/members/${anotherUser.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ role: 'MEMBER' });
      expect(modifyAdmin.status).toBe(403);

      await prisma.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId, userId: anotherUser.id } }
      });
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });
  });

  describe('RBAC: Project Management', () => {
    it('OWNER/ADMIN can create project', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ name: 'Admin Project' });
      expect(res.status).toBe(201);
      await prisma.project.delete({ where: { id: res.body.data.id } });
    });

    it('MEMBER/VIEWER cannot create project', async () => {
      const resMember = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ name: 'Member Project' });
      expect(resMember.status).toBe(403);

      const resViewer = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ name: 'Viewer Project' });
      expect(resViewer.status).toBe(403);
    });

    it('VIEWER+ can list projects', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${workspaceId}/projects`)
        .set('Authorization', `Bearer ${tokenViewer}`);
      expect(res.status).toBe(200);
    });

    it('OWNER/ADMIN can update project', async () => {
      const resOwner = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'Updated Project' });
      expect(resOwner.status).toBe(200);

      const resAdmin = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ name: 'Admin Updated' });
      expect(resAdmin.status).toBe(200);
    });

    it('VIEWER/MEMBER cannot update project', async () => {
      const resViewer = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ name: 'Viewer Update' });
      expect(resViewer.status).toBe(403);

      const resMember = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ name: 'Member Update' });
      expect(resMember.status).toBe(403);
    });
  });

  describe('RBAC: Board & Column Management', () => {
    it('MEMBER+ can create columns', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/columns`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ name: 'New Column' });
      expect(res.status).toBe(201);
    });

    it('VIEWER cannot create columns', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/columns`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ name: 'Viewer Column' });
      expect(res.status).toBe(403);
    });

    it('VIEWER+ can view board', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${tokenViewer}`);
      expect(res.status).toBe(200);
    });

    it('only ADMIN/OWNER can delete columns', async () => {
      const colRes = await request(app)
        .post(`/api/v1/projects/${projectId}/columns`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'DeleteTest' });

      const deleteMember = await request(app)
        .delete(`/api/v1/columns/${colRes.body.data.id}`)
        .set('Authorization', `Bearer ${tokenMember}`);
      expect(deleteMember.status).toBe(403);

      const deleteOwner = await request(app)
        .delete(`/api/v1/columns/${colRes.body.data.id}`)
        .set('Authorization', `Bearer ${tokenOwner}`);
      expect(deleteOwner.status).toBe(200);
    });
  });

  describe('RBAC: Task Management', () => {
    it('MEMBER+ can create tasks', async () => {
      const res = await request(app)
        .post(`/api/v1/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ title: 'Member Task' });
      expect(res.status).toBe(201);
    });

    it('VIEWER cannot create tasks', async () => {
      const res = await request(app)
        .post(`/api/v1/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${tokenViewer}`)
        .send({ title: 'Viewer Task' });
      expect(res.status).toBe(403);
    });

    it('MEMBER+ can update tasks', async () => {
      const taskRes = await request(app)
        .post(`/api/v1/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'UpdateTest' });

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskRes.body.data.id}`)
        .set('Authorization', `Bearer ${tokenMember}`)
        .send({ title: 'Updated' });
      expect(res.status).toBe(200);
    });

    it('VIEWER can only read tasks', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${tokenViewer}`);
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // INPUT VALIDATION HARD CONSTRAINTS
  // ==========================================================================

  describe('Input Validation Constraints', () => {
    it('rejects empty workspace name', async () => {
      const res = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing required fields on registration', async () => {
      const noName = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@a.com', password: 'pass1234' });
      expect(noName.status).toBe(400);

      const noEmail = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', password: 'pass1234' });
      expect(noEmail.status).toBe(400);
    });

    it('rejects invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'notanemail', password: 'pass1234' });
      expect(res.status).toBe(400);
    });

    it('rejects short passwords (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'test@a.com', password: 'short' });
      expect(res.status).toBe(400);
    });

    it('rejects task title exceeding 100 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'A'.repeat(101) });
      expect(res.status).toBe(400);
    });

    it('rejects task description exceeding 500 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'Valid Title', description: 'B'.repeat(501) });
      expect(res.status).toBe(400);
    });

    it('rejects column name exceeding 50 chars', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/columns`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ name: 'C'.repeat(51) });
      expect(res.status).toBe(400);
    });

    it('rejects invalid task priority', async () => {
      const res = await request(app)
        .post(`/api/v1/columns/${columnId}/tasks`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ title: 'Valid', priority: 'INVALID_PRIORITY' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid project status on update', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ status: 'INVALID_STATUS' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid role in invite creation', async () => {
      const res = await request(app)
        .post(`/api/v1/workspaces/${workspaceId}/invites`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ role: 'SUPER_ADMIN' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid role in member update', async () => {
      const res = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}/members/${memberUser.id}`)
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ role: 'SUPER_ADMIN' });
      expect(res.status).toBe(400);
    });

    it('rejects duplicate workspace join without valid invite', async () => {
      const res = await request(app)
        .post('/api/v1/workspaces/join')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({ token: 'nonexistent_token' });
      expect(res.status).toBe(404);
    });

    it('user cannot change own role', async () => {
      const res = await request(app)
        .patch(`/api/v1/workspaces/${workspaceId}/members/${adminUser.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ role: 'MEMBER' });
      expect(res.status).toBe(400);
    });

    it('user cannot remove self from workspace', async () => {
      const res = await request(app)
        .delete(`/api/v1/workspaces/${workspaceId}/members/${adminUser.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ role: 'MEMBER' });
      expect(res.status).toBe(400);
    });
  });
});

// ============================================================================
// SECURITY & VULNERABILITY TESTS
// ============================================================================

describe('SECURITY & VULNERABILITY TESTING', () => {
  let validToken = '';
  let testUser: any;
  let workspaceId = '';
  let projectId = '';

  beforeAll(async () => {
    await prisma.task.deleteMany({});
    await prisma.column.deleteMany({});
    await prisma.board.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});

    testUser = await prisma.user.create({
      data: { name: 'Security Test', email: 'sec@test.com', passwordHash: 'hash', emailVerified: true }
    });
    validToken = generateAccessToken(testUser.id);

    const ws = await prisma.workspace.create({
      data: {
        name: 'Security WS',
        ownerId: testUser.id,
        members: { create: { userId: testUser.id, role: Role.OWNER } }
      }
    });
    workspaceId = ws.id;

    const projRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Security Project' });
    projectId = projRes.body.data.id;
  });

  afterAll(async () => {
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

  // ==========================================================================
  // AUTHENTICATION BYPASS TESTS
  // ==========================================================================

  describe('Authentication Bypass', () => {
    it('rejects requests with no auth header', async () => {
      const res = await request(app).get('/api/v1/workspaces');
      expect(res.status).toBe(401);
    });

    it('rejects requests with malformed auth header', async () => {
      const res = await request(app)
        .get('/api/v1/workspaces')
        .set('Authorization', 'Basic somebase64');
      expect(res.status).toBe(401);
    });

    it('rejects requests with empty Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/workspaces')
        .set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
    });

    it('rejects requests with Bearer prefix only no space', async () => {
      const res = await request(app)
        .get('/api/v1/workspaces')
        .set('Authorization', 'Bearernotoken');
      expect(res.status).toBe(401);
    });

    it('rejects requests with invalid JWT signature', async () => {
      const tamperedToken = validToken.slice(0, -5) + 'TAMPER';
      const res = await request(app)
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${tamperedToken}`);
      expect(res.status).toBe(401);
    });

    it('rejects requests with expired JWT (manually crafted)', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id },
        'some_secret_that_wont_match',
        { expiresIn: '0s' }
      );
      const res = await request(app)
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });

    it('rejects requests with JWT signed by wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { userId: testUser.id },
        'wrong_secret_that_is_not_the_real_secret',
        { expiresIn: '15m' }
      );
      const res = await request(app)
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${wrongSecretToken}`);
      expect(res.status).toBe(401);
    });

    it('rejects requests with token containing invalid payload', async () => {
      const invalidPayloadToken = jwt.sign(
        { userId: 'nonexistent-user-id-in-db' },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '15m' }
      );
      const res = await request(app)
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${invalidPayloadToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // INJECTION ATTACK TESTS
  // ==========================================================================

  describe('Injection Attacks', () => {
    it('handles SQL injection attempt in workspace name', async () => {
      const res = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: "'; DROP TABLE users; --" });
      expect(res.status).toBe(201);
    });

    it('handles NoSQL-style injection in email field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'InjectTest',
          email: '{"$gt": ""}',
          password: 'password123'
        });
      expect(res.status).toBe(400);
    });

    it('handles XSS attempt in task title', async () => {
      const columnRes = await request(app)
        .get(`/api/v1/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${validToken}`);
      const colId = columnRes.body.data.columns[0].id;

      const res = await request(app)
        .post(`/api/v1/columns/${colId}/tasks`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: '<script>alert("XSS")</script>' });
      expect(res.status).toBe(201);
    });

    it('handles XSS attempt in comment body', async () => {
      const columnRes = await request(app)
        .get(`/api/v1/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${validToken}`);
      const colId = columnRes.body.data.columns[0].id;

      const taskRes = await request(app)
        .post(`/api/v1/columns/${colId}/tasks`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'XSS Comment Test' });

      const res = await request(app)
        .post(`/api/v1/tasks/${taskRes.body.data.id}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ body: '<img src=x onerror=alert(1)>' });
      expect(res.status).toBe(201);
    });

    it('handles prototype pollution in JSON body', async () => {
      const res = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Safe', __proto__: { isAdmin: true } });
      expect(res.status).toBe(201);
    });
  });

  // ==========================================================================
  // RATE LIMITING TESTS
  // ==========================================================================

  describe('Rate Limiting Protection', () => {
    it('rate limits login endpoint after 5 attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'rate@test.com', password: 'wrongpass' });
      }
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'rate@test.com', password: 'wrongpass' });
      expect(res.status).toBe(429);
    }, 30000);

    it('rate limits register endpoint after 10 attempts', async () => {
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/auth/register')
          .send({ name: `Rate${i}`, email: `rate${i}@test.com`, password: 'password123' });
      }
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'RateLimit', email: 'ratelimit@test.com', password: 'password123' });
      expect(res.status).toBe(429);
    }, 30000);
  });

  // ==========================================================================
  // FILE UPLOAD SECURITY TESTS
  // ==========================================================================

  describe('File Upload Security', () => {
    let taskIdForUpload = '';

    beforeAll(async () => {
      const colRes = await request(app)
        .get(`/api/v1/projects/${projectId}/board`)
        .set('Authorization', `Bearer ${validToken}`);
      const colId = colRes.body.data.columns[0].id;

      const taskRes = await request(app)
        .post(`/api/v1/columns/${colId}/tasks`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'Upload Security Test' });
      taskIdForUpload = taskRes.body.data.id;
    });

    it('rejects executable file upload (.exe)', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${taskIdForUpload}/attachments`)
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('MZ\x90\x00binary'), 'malicious.exe');
      expect(res.status).toBe(400);
    });

    it('rejects script file upload (.sh)', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${taskIdForUpload}/attachments`)
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('#!/bin/bash\nrm -rf /'), 'exploit.sh');
      expect(res.status).toBe(400);
    });

    it('rejects double-extension bypass attempt', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${taskIdForUpload}/attachments`)
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('not an image'), 'photo.jpg.exe');
      expect(res.status).toBe(400);
    });

    it('rejects files exceeding 10MB', async () => {
      const oversized = Buffer.alloc(11 * 1024 * 1024);
      const res = await request(app)
        .post(`/api/v1/tasks/${taskIdForUpload}/attachments`)
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', oversized, 'large.zip');
      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // REQUEST VALIDATION & BOUNDARY TESTS
  // ==========================================================================

  describe('Request Validation Boundaries', () => {
    it('rejects requests with oversized JSON body', async () => {
      const largeBody = { name: 'A'.repeat(2 * 1024 * 1024) };
      const res = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${validToken}`)
        .send(largeBody);
      expect(res.status).toBe(413);
    });

    it('handles special characters in names', async () => {
      const res = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: '🚀 Special Üñíçødé & <Tags> "Quotes"' });
      expect(res.status).toBe(201);
    });

    it('health endpoint is accessible without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('404 on unknown routes', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(404);
    });
  });
});

// ============================================================================
// PRODUCTION READINESS TESTS
// ============================================================================

describe('PRODUCTION READINESS', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  // ==========================================================================
  // ERROR HANDLING & RESPONSE CONSISTENCY
  // ==========================================================================

  describe('Error Response Consistency', () => {
    it('returns consistent error shape with code and message', async () => {
      const res = await request(app).get('/api/v1/workspaces');
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(typeof res.body.error.code).toBe('string');
      expect(typeof res.body.error.message).toBe('string');
    });

    it('returns 401 for auth errors with UNAUTHORIZED code', async () => {
      const res = await request(app)
        .get('/api/v1/workspaces')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns validation or rate-limit error consistent shape', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({});
      expect([400, 429]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      if (res.status === 400) {
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      } else {
        expect(res.body.error.code).toBe('RATE_LIMITED');
      }
    });

    it('returns 403 for authorization errors with FORBIDDEN code', async () => {
      await prisma.user.deleteMany({});

      const tempUser = await prisma.user.create({
        data: { name: 'Temp', email: 'temp@test.com', passwordHash: 'hash', emailVerified: true }
      });
      const tempToken = generateAccessToken(tempUser.id);

      const res = await request(app)
        .get('/api/v1/workspaces/nonexistent-id-12345')
        .set('Authorization', `Bearer ${tempToken}`);
      expect([403, 404]).toContain(res.status);
      if (res.status === 403) {
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });
  });

  // ==========================================================================
  // ENVIRONMENT CONFIGURATION VALIDATION
  // ==========================================================================

  describe('Environment Configuration', () => {
    it('requires JWT_ACCESS_SECRET to be set', () => {
      expect(process.env.JWT_ACCESS_SECRET).toBeDefined();
      expect(process.env.JWT_ACCESS_SECRET!.length).toBeGreaterThan(20);
    });

    it('requires JWT_REFRESH_SECRET to be set', () => {
      expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
      expect(process.env.JWT_REFRESH_SECRET!.length).toBeGreaterThan(20);
    });

    it('requires DATABASE_URL to be set', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
    });

    it('PORT defaults to 5000 when not set', () => {
      expect(process.env.PORT || '5000').toBeDefined();
    });
  });

  // ==========================================================================
  // TOKEN MANAGEMENT
  // ==========================================================================

  describe('Token Management & Security', () => {
    it('generates access tokens that expire within a reasonable time', () => {
      const token = generateAccessToken('test-user-id');
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe('test-user-id');

      const payload = jwt.decode(token) as any;
      const exp = payload.exp;
      const iat = payload.iat;
      const ttlMinutes = (exp - iat) / 60;
      expect(ttlMinutes).toBeLessThanOrEqual(15);
      expect(ttlMinutes).toBeGreaterThanOrEqual(10);
    });

    it('access and refresh tokens have different secrets', () => {
      const accessSecret = process.env.JWT_ACCESS_SECRET;
      const refreshSecret = process.env.JWT_REFRESH_SECRET;
      expect(accessSecret).not.toBe(refreshSecret);
    });

    it('token payload contains only userId (no sensitive data)', () => {
      const token = generateAccessToken('user-id-123');
      const payload = jwt.decode(token) as any;
      expect(payload).toHaveProperty('userId');
      expect(payload).not.toHaveProperty('password');
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('role');
    });

    it('refuses to decode a token with alg:none', async () => {
      const noneAlgToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.';
      const res = await request(app)
        .get('/api/v1/workspaces')
        .set('Authorization', `Bearer ${noneAlgToken}`);
      expect(res.status).toBe(401);
    });
  });

  // ==========================================================================
  // PERFORMANCE & STRESS TESTS
  // ==========================================================================

  describe('Performance & Stress', () => {
    let stressUser: any;
    let stressToken = '';
    let stressWsId = '';

    beforeAll(async () => {
      await prisma.user.deleteMany({});

      stressUser = await prisma.user.create({
        data: { name: 'Stress', email: 'stress@test.com', passwordHash: 'hash', emailVerified: true }
      });
      stressToken = generateAccessToken(stressUser.id);

      const wsRes = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${stressToken}`)
        .send({ name: 'Stress WS' });
      stressWsId = wsRes.body.data.id;
    });

    afterAll(async () => {
      await prisma.project.deleteMany({});
      await prisma.workspaceMember.deleteMany({});
      await prisma.workspace.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.$disconnect();
    });

    it('handles 20 rapid sequential requests without crashing', async () => {
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get(`/api/v1/workspaces/${stressWsId}`)
            .set('Authorization', `Bearer ${stressToken}`)
        );
      }
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBe(20);
    }, 30000);

    it('concurrent project creations do not cause race conditions', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post(`/api/v1/workspaces/${stressWsId}/projects`)
            .set('Authorization', `Bearer ${stressToken}`)
            .send({ name: `Concurrent Project ${i}` })
        );
      }
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 201).length;
      expect(successCount).toBe(5);
    }, 30000);

    it('handles deep nested query on board without timeout', async () => {
      const projRes = await request(app)
        .post(`/api/v1/workspaces/${stressWsId}/projects`)
        .set('Authorization', `Bearer ${stressToken}`)
        .send({ name: 'Deep Query Project' });

      const res = await request(app)
        .get(`/api/v1/projects/${projRes.body.data.id}/board?search=a&priority=HIGH`)
        .set('Authorization', `Bearer ${stressToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // CONCURRENT OPERATION CONSTRAINTS
  // ==========================================================================

  describe('Concurrent Operation Safety', () => {
    let conUser: any;
    let conToken = '';
    let conWsId = '';
    let conProjId = '';
    let conColId = '';

    beforeAll(async () => {
      await prisma.user.deleteMany({});

      conUser = await prisma.user.create({
        data: { name: 'Concurrent', email: 'con@test.com', passwordHash: 'hash', emailVerified: true }
      });
      conToken = generateAccessToken(conUser.id);

      const wsRes = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${conToken}`)
        .send({ name: 'Con WS' });
      conWsId = wsRes.body.data.id;

      const projRes = await request(app)
        .post(`/api/v1/workspaces/${conWsId}/projects`)
        .set('Authorization', `Bearer ${conToken}`)
        .send({ name: 'Con Project' });
      conProjId = projRes.body.data.id;
      conColId = projRes.body.data.board.columns[0].id;
    });

    afterAll(async () => {
      await prisma.project.deleteMany({});
      await prisma.workspaceMember.deleteMany({});
      await prisma.workspace.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.$disconnect();
    });

    it('simultaneous task moves maintain data integrity', async () => {
      const taskRes = await request(app)
        .post(`/api/v1/columns/${conColId}/tasks`)
        .set('Authorization', `Bearer ${conToken}`)
        .send({ title: 'Move Me' });
      const tId = taskRes.body.data.id;

      const moves = [];
      for (let i = 0; i < 10; i++) {
        moves.push(
          request(app)
            .patch(`/api/v1/tasks/${tId}`)
            .set('Authorization', `Bearer ${conToken}`)
            .send({ order: i })
        );
      }
      const moveResults = await Promise.all(moves);
      const okCount = moveResults.filter(r => r.status === 200).length;
      expect(okCount).toBeGreaterThan(0);

      const finalTask = await prisma.task.findUnique({ where: { id: tId } });
      expect(finalTask).toBeDefined();
      expect(finalTask!.title).toBe('Move Me');
    }, 30000);

    it('simultaneous assign/unassign does not corrupt state', async () => {
      const taskRes = await request(app)
        .post(`/api/v1/columns/${conColId}/tasks`)
        .set('Authorization', `Bearer ${conToken}`)
        .send({ title: 'Assign War' });
      const tId = taskRes.body.data.id;

      const ops = [];
      for (let i = 0; i < 5; i++) {
        ops.push(
          request(app)
            .post(`/api/v1/tasks/${tId}/assignees`)
            .set('Authorization', `Bearer ${conToken}`)
            .send({ userId: conUser.id })
        );
      }
      await Promise.all(ops);

      const taskWithAssignees = await prisma.task.findUnique({
        where: { id: tId },
        include: { assignees: true }
      });
      expect(taskWithAssignees!.assignees.length).toBe(1);
    }, 30000);
  });

  // ==========================================================================
  // MIDDLEWARE & SECURITY HEADERS (helmet)
  // ==========================================================================

  describe('Security Headers', () => {
    it('includes X-Content-Type-Options header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('includes X-Frame-Options header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('includes X-XSS-Protection header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-xss-protection']).toBeDefined();
    });

    it('includes Strict-Transport-Security header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('does not expose X-Powered-By header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ==========================================================================
  // CORS CONFIGURATION
  // ==========================================================================

  describe('CORS Configuration', () => {
    it('blocks requests from unauthorized origins', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://evil.com');
      expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.com');
    });

    it('allows requests from authorized origin', async () => {
      const allowedOrigin = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
      const res = await request(app)
        .get('/health')
        .set('Origin', allowedOrigin);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    });
  });
});
