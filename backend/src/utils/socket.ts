import { Server } from 'socket.io';
import http from 'http';
import { prisma } from './prisma';
import { verifyAccessToken } from './auth';
import logger from './logger';

let io: Server | null = null;

export const initSocket = (server: http.Server): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/ws'
  });

  io.use((socket, next) => {
    const token = (socket.handshake.query.token as string) || (socket.handshake.auth.token as string);
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = verifyAccessToken(token);
      socket.data = { userId: decoded.userId };
      next();
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });

  const isValidId = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64;

  io.on('connection', (socket) => {
    socket.on('join_project', async (projectId: unknown) => {
      const userId = socket.data.userId;
      if (!isValidId(projectId)) {
        socket.emit('error_msg', 'Invalid project ID');
        return;
      }

      try {
        const project = await prisma.project.findUnique({
          where: { id: projectId }
        });
        if (!project) {
          socket.emit('error_msg', 'Project not found');
          return;
        }

        const membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: project.workspaceId,
              userId
            }
          }
        });

        if (!membership) {
          socket.emit('error_msg', 'Forbidden');
          return;
        }

        socket.join(`project:${projectId}`);
        socket.emit('joined_project', projectId);
      } catch (err) {
        logger.error({ err, userId, projectId }, 'Socket join_project error');
        socket.emit('error_msg', 'Internal socket error');
      }
    });

    socket.on('leave_project', (projectId: unknown) => {
      if (!isValidId(projectId)) return;
      socket.leave(`project:${projectId}`);
      socket.emit('left_project', projectId);
    });

    socket.on('presence.updated', (payload: unknown) => {
      const userId = socket.data.userId;
      const data = payload as Record<string, unknown> | null;
      if (!data || !isValidId(data.projectId) || !isValidId(data.taskId) || typeof data.status !== 'string' || data.status.length > 50) return;
      io?.to(`project:${data.projectId}`).emit('presence.updated', { userId, taskId: data.taskId, status: data.status });
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io server not initialized');
  }
  return io;
};

export const emitToProject = (projectId: string, event: string, payload: any) => {
  if (io && projectId) {
    io.to(`project:${projectId}`).emit(event, payload);
  }
};
