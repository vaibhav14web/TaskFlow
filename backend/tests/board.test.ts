import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/auth';
import { Role, ProjectStatus, TaskPriority } from '@prisma/client';

describe('Kanban Board API', () => {
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
  let boardId = '';
  let columnToDoId = '';
  let columnInProgressId = '';
  let taskId1 = '';
  let taskId2 = '';

  beforeAll(async () => {
    // Clear DB tables in dependency order
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
    userViewer = await prisma.user.create({
      data: { name: 'Viewer', email: 'viewer@example.com', passwordHash: 'hash', emailVerified: true }
    });
    userStranger = await prisma.user.create({
      data: { name: 'Stranger', email: 'stranger@example.com', passwordHash: 'hash', emailVerified: true }
    });

    // Generate tokens
    tokenOwner = generateAccessToken(userOwner.id);
    tokenMember = generateAccessToken(userMember.id);
    tokenViewer = generateAccessToken(userViewer.id);
    tokenStranger = generateAccessToken(userStranger.id);

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Kanban Workspace',
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
  });

  afterAll(async () => {
    // Clear and disconnect
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

  // 1. Verify Project Creation Seeds Board and Columns
  it('should create a project and seed a board with 4 default columns', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${tokenOwner}`)
      .send({ name: 'Web Client Development', description: 'Development of TaskFlow v1' });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.board).toBeDefined();
    expect(res.body.data.board.columns.length).toBe(4);

    projectId = res.body.data.id;
    boardId = res.body.data.board.id;

    // Verify correct default columns ordering
    const columns = res.body.data.board.columns;
    columns.sort((a: any, b: any) => a.order - b.order);

    expect(columns[0].name).toBe('To Do');
    expect(columns[0].order).toBe(0);
    expect(columns[1].name).toBe('In Progress');
    expect(columns[1].order).toBe(1);
    expect(columns[2].name).toBe('In Review');
    expect(columns[2].order).toBe(2);
    expect(columns[3].name).toBe('Done');
    expect(columns[3].order).toBe(3);

    columnToDoId = columns[0].id;
    columnInProgressId = columns[1].id;
  });

  // 2. Fetch Board (Viewer+)
  it('should allow Owner, Member, and Viewer to view the board', async () => {
    const resOwner = await request(app)
      .get(`/api/v1/projects/${projectId}/board`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(resOwner.status).toBe(200);
    expect(resOwner.body.data.columns.length).toBe(4);

    const resViewer = await request(app)
      .get(`/api/v1/projects/${projectId}/board`)
      .set('Authorization', `Bearer ${tokenViewer}`);
    expect(resViewer.status).toBe(200);
  });

  it('should reject board retrieval for non-workspace members', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/board`)
      .set('Authorization', `Bearer ${tokenStranger}`);
    expect(res.status).toBe(403);
  });

  // 3. Column Creation (Member+)
  it('should allow Member to create a new column', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/columns`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ name: 'Icebox' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Icebox');
    expect(res.body.data.order).toBe(4); // default columns are 0,1,2,3
  });

  it('should reject column creation from a Viewer', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/columns`)
      .set('Authorization', `Bearer ${tokenViewer}`)
      .send({ name: 'Viewer Column' });
    expect(res.status).toBe(403);
  });

  // 4. Column Rename & Reorder (Member+)
  it('should allow Member to rename and reorder columns', async () => {
    // 4a. Find column "Icebox"
    const boardRes = await request(app)
      .get(`/api/v1/projects/${projectId}/board`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    const iceboxCol = boardRes.body.data.columns.find((c: any) => c.name === 'Icebox');
    expect(iceboxCol).toBeDefined();

    // 4b. Update name and order
    const updateRes = await request(app)
      .patch(`/api/v1/columns/${iceboxCol.id}`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ name: 'Backlog', order: 0 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('Backlog');
    expect(updateRes.body.data.order).toBe(0);
  });

  // 5. Column Deletion (Admin+)
  it('should reject column deletion from a Member', async () => {
    // Find Backlog column
    const boardRes = await request(app)
      .get(`/api/v1/projects/${projectId}/board`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    const backlogCol = boardRes.body.data.columns.find((c: any) => c.name === 'Backlog');

    const res = await request(app)
      .delete(`/api/v1/columns/${backlogCol.id}`)
      .set('Authorization', `Bearer ${tokenMember}`);
    expect(res.status).toBe(403);
  });

  it('should allow Owner/Admin to delete a column', async () => {
    const boardRes = await request(app)
      .get(`/api/v1/projects/${projectId}/board`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    const backlogCol = boardRes.body.data.columns.find((c: any) => c.name === 'Backlog');

    const res = await request(app)
      .delete(`/api/v1/columns/${backlogCol.id}`)
      .set('Authorization', `Bearer ${tokenOwner}`);
    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('deleted successfully');
  });

  // 6. Task Creation (Member+)
  it('should allow Member to create tasks in a column', async () => {
    const res1 = await request(app)
      .post(`/api/v1/columns/${columnToDoId}/tasks`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ title: 'Task Alpha', description: 'Important API specs task', priority: 'HIGH' });

    expect(res1.status).toBe(201);
    expect(res1.body.data.title).toBe('Task Alpha');
    expect(res1.body.data.order).toBe(0); // first task in column
    expect(res1.body.data.priority).toBe(TaskPriority.HIGH);
    taskId1 = res1.body.data.id;

    const res2 = await request(app)
      .post(`/api/v1/columns/${columnToDoId}/tasks`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ title: 'Task Beta', description: 'Verification logic', priority: 'LOW' });

    expect(res2.status).toBe(201);
    expect(res2.body.data.order).toBe(1); // second task in column
    taskId2 = res2.body.data.id;
  });

  // 7. Get Task Details (Viewer+)
  it('should allow workspace members to view task details', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId1}`)
      .set('Authorization', `Bearer ${tokenViewer}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Task Alpha');
  });

  it('should block non-members from viewing task details', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId1}`)
      .set('Authorization', `Bearer ${tokenStranger}`);
    expect(res.status).toBe(403);
  });

  // 8. Update Task & Move Columns (Member+)
  it('should allow Member to move task to another column and change fields', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId1}`)
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({
        title: 'Task Alpha Renovated',
        priority: 'URGENT',
        columnId: columnInProgressId
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Task Alpha Renovated');
    expect(res.body.data.priority).toBe(TaskPriority.URGENT);
    expect(res.body.data.columnId).toBe(columnInProgressId);
  });

  // 9. Board Search & Filtering
  it('should filter board by priority', async () => {
    // We have Task Alpha (URGENT, In Progress) and Task Beta (LOW, To Do)
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/board?priority=URGENT`)
      .set('Authorization', `Bearer ${tokenOwner}`);

    expect(res.status).toBe(200);
    
    // Find task in column In Progress
    const inProgCol = res.body.data.columns.find((c: any) => c.id === columnInProgressId);
    expect(inProgCol.tasks.length).toBe(1);
    expect(inProgCol.tasks[0].id).toBe(taskId1);

    // To Do should be empty since Task Beta is LOW
    const toDoCol = res.body.data.columns.find((c: any) => c.id === columnToDoId);
    expect(toDoCol.tasks.length).toBe(0);
  });

  it('should filter board by search keyword', async () => {
    // Task Alpha contains "specs", Task Beta contains "Verification"
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/board?search=Verification`)
      .set('Authorization', `Bearer ${tokenOwner}`);

    expect(res.status).toBe(200);
    
    const toDoCol = res.body.data.columns.find((c: any) => c.id === columnToDoId);
    expect(toDoCol.tasks.length).toBe(1);
    expect(toDoCol.tasks[0].id).toBe(taskId2);

    const inProgCol = res.body.data.columns.find((c: any) => c.id === columnInProgressId);
    expect(inProgCol.tasks.length).toBe(0);
  });

  // 10. Task Deletion (Member+)
  it('should allow Member to delete task', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId1}`)
      .set('Authorization', `Bearer ${tokenMember}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('deleted successfully');

    // Verify task is gone
    const taskInDb = await prisma.task.findUnique({
      where: { id: taskId1 }
    });
    expect(taskInDb).toBeNull();
  });
});
