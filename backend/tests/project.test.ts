import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/auth';
import { Role, ProjectStatus } from '@prisma/client';

describe('Project Management API', () => {
  let userOwner: any;
  let userViewer: any;
  let userStranger: any;
  let tokenOwner = '';
  let tokenViewer = '';
  let tokenStranger = '';
  let workspaceId = '';
  let projectId = '';

  beforeAll(async () => {
    // Clean database tables in dependency order
    await prisma.workspaceInvite.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});

    // Create 3 test users directly in DB
    userOwner = await prisma.user.create({
      data: {
        name: 'User Owner',
        email: 'owner@example.com',
        passwordHash: 'dummy_hash',
        emailVerified: true
      }
    });

    userViewer = await prisma.user.create({
      data: {
        name: 'User Viewer',
        email: 'viewer@example.com',
        passwordHash: 'dummy_hash',
        emailVerified: true
      }
    });

    userStranger = await prisma.user.create({
      data: {
        name: 'User Stranger',
        email: 'stranger@example.com',
        passwordHash: 'dummy_hash',
        emailVerified: true
      }
    });

    // Generate JWT access tokens
    tokenOwner = generateAccessToken(userOwner.id);
    tokenViewer = generateAccessToken(userViewer.id);
    tokenStranger = generateAccessToken(userStranger.id);

    // Create workspace for testing projects
    const ws = await prisma.workspace.create({
      data: {
        name: 'Project Test Workspace',
        ownerId: userOwner.id,
        members: {
          createMany: {
            data: [
              { userId: userOwner.id, role: Role.OWNER },
              { userId: userViewer.id, role: Role.VIEWER }
            ]
          }
        }
      }
    });

    workspaceId = ws.id;
  });

  afterAll(async () => {
    // Clean up database and disconnect
    await prisma.workspaceInvite.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  // 1. Create Project
  it('should allow Owner/Admin of workspace to create a project', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Core Frontend v1',
        description: 'First version of the frontend client.'
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('Core Frontend v1');
    expect(res.body.data.workspaceId).toBe(workspaceId);
    expect(res.body.data.status).toBe(ProjectStatus.ACTIVE);

    projectId = res.body.data.id;
  });

  it('should reject project creation from a Viewer', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .send({ name: 'Viewer Attempt' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should reject project creation if name is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 2. List Projects
  it('should list projects for workspace members (Viewer+)', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${tokenViewer}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(projectId);
  });

  it('should reject project listing for non-workspace members', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${tokenStranger}`);

    expect(res.status).toBe(403);
  });

  // 3. Get Project Details
  it('should allow workspace member to retrieve project details', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenViewer}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(projectId);
    expect(res.body.data.name).toBe('Core Frontend v1');
  });

  it('should reject project details retrieval for non-member', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenStranger}`);

    expect(res.status).toBe(403);
  });

  // 4. Update Project
  it('should allow Owner/Admin to update project', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({
        name: 'Core Client v1.1',
        status: 'ARCHIVED'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Core Client v1.1');
    expect(res.body.data.status).toBe(ProjectStatus.ARCHIVED);
  });

  it('should reject project update from Viewer', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .send({ name: 'Viewer Modified Name' });

    expect(res.status).toBe(403);
  });

  // 5. Delete Project
  it('should reject project deletion from Viewer', async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenViewer}`);

    expect(res.status).toBe(403);
  });

  it('should allow Owner/Admin to delete project', async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenOwner}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('deleted successfully');

    // Verify deletion in DB
    const projInDb = await prisma.project.findUnique({
      where: { id: projectId }
    });
    expect(projInDb).toBeNull();
  });
});
