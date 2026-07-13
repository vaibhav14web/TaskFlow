import 'dotenv/config';
import http from 'http';
import request from 'supertest';
import { io as clientIo } from 'socket.io-client';
import { AddressInfo } from 'net';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken } from '../src/utils/auth';
import { initSocket } from '../src/utils/socket';
import { Role } from '@prisma/client';

describe('Real-Time Updates (Socket.IO) API', () => {
  let server: http.Server;
  let port: number;
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

  beforeAll((done) => {
    // Start HTTP server on dynamic port
    server = http.createServer(app);
    initSocket(server);
    server.listen(0, async () => {
      const address = server.address() as AddressInfo;
      port = address.port;

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
        data: { name: 'Socket Owner', email: 'owner@example.com', passwordHash: 'hash', emailVerified: true }
      });
      userMember = await prisma.user.create({
        data: { name: 'Socket Member', email: 'member@example.com', passwordHash: 'hash', emailVerified: true }
      });
      userStranger = await prisma.user.create({
        data: { name: 'Socket Stranger', email: 'stranger@example.com', passwordHash: 'hash', emailVerified: true }
      });

      tokenOwner = generateAccessToken(userOwner.id);
      tokenMember = generateAccessToken(userMember.id);
      tokenStranger = generateAccessToken(userStranger.id);

      // Create workspace
      const workspace = await prisma.workspace.create({
        data: {
          name: 'Socket Workspace',
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
        .send({ name: 'Socket Project' });

      projectId = projectRes.body.data.id;
      columnId = projectRes.body.data.board.columns[0].id;

      done();
    });
  });

  afterAll((done) => {
    server.close(async () => {
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
      done();
    });
  });

  const connectSocket = (token: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const socket = clientIo(`http://localhost:${port}`, {
        path: '/ws',
        query: { token },
        transports: ['websocket'],
        forceNew: true
      });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => reject(err));
    });
  };

  // 1. Connection & Authentication
  it('should connect successfully with a valid token', async () => {
    const socket = await connectSocket(tokenOwner);
    expect(socket.connected).toBe(true);
    socket.close();
  });

  it('should reject connection with an invalid token', async () => {
    await expect(connectSocket('invalid_token')).rejects.toThrow();
  });

  // 2. Project subscriptions
  it('should allow workspace members to join project room', (done) => {
    connectSocket(tokenOwner).then((socket) => {
      socket.emit('join_project', projectId);
      socket.on('joined_project', (joinedId: string) => {
        expect(joinedId).toBe(projectId);
        socket.close();
        done();
      });
    });
  });

  it('should block non-members from joining project room', (done) => {
    connectSocket(tokenStranger).then((socket) => {
      socket.emit('join_project', projectId);
      socket.on('error_msg', (msg: string) => {
        expect(msg).toBe('Forbidden');
        socket.close();
        done();
      });
    });
  });

  // 3. User Presence updates
  it('should sync user presence focus/blur in real-time between clients', (done) => {
    connectSocket(tokenOwner).then((socketOwner) => {
      socketOwner.emit('join_project', projectId);

      socketOwner.on('joined_project', () => {
        connectSocket(tokenMember).then((socketMember) => {
          socketMember.emit('join_project', projectId);

          socketMember.on('joined_project', () => {
            // Member listens to presence changes
            socketMember.on('presence.updated', (data: any) => {
              expect(data.userId).toBe(userOwner.id);
              expect(data.taskId).toBe('task_123');
              expect(data.status).toBe('focus');

              socketOwner.close();
              socketMember.close();
              done();
            });

            // Owner emits presence
            socketOwner.emit('presence.updated', { projectId, taskId: 'task_123', status: 'focus' });
          });
        });
      });
    });
  });

  // 4. HTTP triggers broadcasting socket events
  it('should broadcast task.created and comment.created to project room', (done) => {
    connectSocket(tokenOwner).then((socketOwner) => {
      socketOwner.emit('join_project', projectId);

      socketOwner.on('joined_project', () => {
        let taskCreated = false;
        let commentCreated = false;

        socketOwner.on('task.created', (data: any) => {
          expect(data.task.title).toBe('Realtime Task');
          taskId = data.task.id;
          taskCreated = true;

          // Trigger comment creation
          request(app)
            .post(`/api/v1/tasks/${taskId}/comments`)
            .set('Authorization', `Bearer ${tokenMember}`)
            .send({ body: 'Nice task!' })
            .end(() => {});
        });

        socketOwner.on('comment.created', (data: any) => {
          expect(data.comment.body).toBe('Nice task!');
          commentCreated = true;

          if (taskCreated && commentCreated) {
            socketOwner.close();
            done();
          }
        });

        // Trigger task creation via HTTP POST
        request(app)
          .post(`/api/v1/columns/${columnId}/tasks`)
          .set('Authorization', `Bearer ${tokenMember}`)
          .send({ title: 'Realtime Task' })
          .end(() => {});
      });
    });
  });

  it('should broadcast task.moved and task.deleted to project room', (done) => {
    connectSocket(tokenOwner).then((socketOwner) => {
      socketOwner.emit('join_project', projectId);

      socketOwner.on('joined_project', () => {
        let taskMoved = false;

        socketOwner.on('task.moved', (data: any) => {
          expect(data.taskId).toBe(taskId);
          expect(data.order).toBe(9);
          taskMoved = true;

          // Trigger task delete
          request(app)
            .delete(`/api/v1/tasks/${taskId}`)
            .set('Authorization', `Bearer ${tokenMember}`)
            .end(() => {});
        });

        socketOwner.on('task.deleted', (data: any) => {
          expect(data.taskId).toBe(taskId);
          expect(taskMoved).toBe(true);

          socketOwner.close();
          done();
        });

        // Trigger task update (move/order change)
        request(app)
          .patch(`/api/v1/tasks/${taskId}`)
          .set('Authorization', `Bearer ${tokenMember}`)
          .send({ order: 9 })
          .end(() => {});
      });
    });
  });
});
