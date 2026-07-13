import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/auth';
import { Role } from '@prisma/client';

describe('Workspace Management API', () => {
  let userA: any;
  let userB: any;
  let tokenA = '';
  let tokenB = '';
  let workspaceId = '';
  let inviteToken = '';

  beforeAll(async () => {
    // Clean database tables in dependency order
    await prisma.workspaceInvite.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});

    // Create 2 test users directly in DB
    userA = await prisma.user.create({
      data: {
        name: 'User A',
        email: 'usera@example.com',
        passwordHash: 'dummy_hash',
        emailVerified: true
      }
    });

    userB = await prisma.user.create({
      data: {
        name: 'User B',
        email: 'userb@example.com',
        passwordHash: 'dummy_hash',
        emailVerified: true
      }
    });

    // Generate JWT access tokens
    tokenA = generateAccessToken(userA.id);
    tokenB = generateAccessToken(userB.id);
  });

  afterAll(async () => {
    // Clean up and disconnect
    await prisma.workspaceInvite.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  // 1. Create Workspace
  it('should allow authenticated user to create a workspace', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'User A Workspace' });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('User A Workspace');
    expect(res.body.data.ownerId).toBe(userA.id);

    workspaceId = res.body.data.id;

    // Verify creator is Owner in members table
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: userA.id }
      }
    });
    expect(membership).toBeDefined();
    expect(membership?.role).toBe(Role.OWNER);
  });

  it('should fail workspace creation if name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 2. List Workspaces
  it('should list workspaces current user belongs to', async () => {
    // User A should have 1 workspace
    const resA = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data.length).toBe(1);
    expect(resA.body.data[0].id).toBe(workspaceId);

    // User B should have 0 workspaces
    const resB = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data.length).toBe(0);
  });

  // 3. Get Workspace Details
  it('should allow workspace member to view details', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(workspaceId);
    expect(res.body.data.members.length).toBe(1);
    expect(res.body.data.members[0].user.email).toBe(userA.email);
  });

  it('should reject non-member from viewing details', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 4. Rename Workspace
  it('should allow Owner/Admin to rename workspace', async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Renamed Workspace' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed Workspace');
  });

  it('should reject rename from non-member', async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hack Workspace' });

    expect(res.status).toBe(403);
  });

  // 5. Create Invite
  it('should allow Owner/Admin to create invite', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invites`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        email: userB.email,
        role: 'MEMBER'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.email).toBe(userB.email);
    expect(res.body.data.role).toBe('MEMBER');

    inviteToken = res.body.data.token;
  });

  // 6. Join Workspace
  it('should allow invited user to join workspace', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces/join')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ token: inviteToken });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('Successfully joined');

    // Verify membership in DB
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: userB.id }
      }
    });
    expect(membership).toBeDefined();
    expect(membership?.role).toBe(Role.MEMBER);
  });

  it('should reject joining with duplicate membership', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces/join')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ token: inviteToken }); // token was deleted on use since it was specific email invite

    expect(res.status).toBe(404); // invite token not found since it was deleted
  });

  // 7. Update Member Role
  it('should allow Owner to update member role', async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/members/${userB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('should reject demoting the workspace owner', async () => {
    // User B (ADMIN) tries to demote User A (Owner)
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/members/${userA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ role: 'VIEWER' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('owner');
  });

  // 8. Remove Member
  it('should allow Owner/Admin to remove member', async () => {
    const res = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}/members/${userB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('removed successfully');

    // Verify User B is no longer in DB members list
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: userB.id }
      }
    });
    expect(membership).toBeNull();
  });

  // 8b. Workspace Customization Settings
  it('should allow Admin/Owner to update workspace description and allowed domains', async () => {
    const res = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        description: 'This is a test workspace description.',
        allowedDomains: 'example.com, test.org'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('This is a test workspace description.');
    expect(res.body.data.allowedDomains).toBe('example.com, test.org');

    // Verify in DB
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    expect(ws?.description).toBe('This is a test workspace description.');
    expect(ws?.allowedDomains).toBe('example.com, test.org');
  });

  // 8c. Pending Workspace Invites Management
  it('should list pending invites and allow revoking an invite', async () => {
    // 1. Create an invite
    const inviteRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invites`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: 'invitee@example.com', role: 'MEMBER' });

    expect(inviteRes.status).toBe(201);
    const inviteId = inviteRes.body.data.id;

    // 2. List pending invites
    const listRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/invites`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    const foundInvite = listRes.body.data.find((i: any) => i.id === inviteId);
    expect(foundInvite).toBeDefined();
    expect(foundInvite.email).toBe('invitee@example.com');
    expect(foundInvite.invitedBy.email).toBe(userA.email);

    // 3. Revoke (delete) the invite
    const revokeRes = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}/invites/${inviteId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data.message).toContain('revoked successfully');

    // 4. Verify no longer exists in DB
    const inviteInDb = await prisma.workspaceInvite.findUnique({ where: { id: inviteId } });
    expect(inviteInDb).toBeNull();
  });

  // 9. Delete Workspace
  it('should allow Owner to delete workspace', async () => {
    const res = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('deleted successfully');

    // Verify deletion
    const wsInDb = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });
    expect(wsInDb).toBeNull();
  });
});
