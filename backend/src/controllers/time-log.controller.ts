import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';

// 1. Log Time (Member+)
// POST /tasks/:id/time-logs
export const createTimeLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const { durationSeconds, description } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (durationSeconds === undefined || typeof durationSeconds !== 'number' || durationSeconds <= 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid durationSeconds is required.' } });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return;
    }

    const workspaceId = (task as any).column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const timeLog = await prisma.timeLog.create({
      data: {
        taskId,
        userId,
        durationSeconds,
        description: description || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    res.status(201).json({ data: timeLog });
  } catch (error) {
    next(error);
  }
};

// 2. List Time Logs for Task (Viewer+)
// GET /tasks/:id/time-logs
export const listTimeLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return;
    }

    const workspaceId = (task as any).column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const timeLogs = await prisma.timeLog.findMany({
      where: { taskId },
      orderBy: { loggedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    res.status(200).json({ data: timeLogs });
  } catch (error) {
    next(error);
  }
};

// 3. Delete Time Log (Creator OR Admin+)
// DELETE /tasks/:taskId/time-logs/:logId
export const deleteTimeLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.taskId as string;
    const logId = req.params.logId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const timeLog = await prisma.timeLog.findFirst({
      where: { id: logId, taskId }
    });

    if (!timeLog) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Time log not found.' } });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: {
            board: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    if (!task) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return;
    }

    const workspaceId = (task as any).column.board.project.workspaceId;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    });

    if (!membership) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient workspace permissions.' } });
      return;
    }

    const isCreator = timeLog.userId === userId;
    const isAdminOrOwner = membership.role === Role.OWNER || membership.role === Role.ADMIN;

    if (!isCreator && !isAdminOrOwner) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this time log.' } });
      return;
    }

    await prisma.timeLog.delete({
      where: { id: logId }
    });

    res.status(200).json({ data: { message: 'Time log deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};

// 4. Get Project Billing Info (Member+)
// GET /projects/:projectId/billing
export const getProjectBilling = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      return;
    }

    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    // Fetch all logs under tasks in this project
    const logs = await prisma.timeLog.findMany({
      where: {
        task: {
          column: {
            board: {
              projectId
            }
          }
        }
      },
      include: {
        task: {
          select: {
            id: true,
            title: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { loggedAt: 'desc' }
    });

    // Aggregate by Task
    const taskBreakdownMap: Record<string, { taskId: string; taskTitle: string; totalSeconds: number }> = {};
    // Aggregate by User
    const userBreakdownMap: Record<string, { userId: string; userName: string; userEmail: string; userAvatarUrl?: string | null; totalSeconds: number }> = {};

    let totalSeconds = 0;

    for (const log of logs as any[]) {
      totalSeconds += log.durationSeconds;

      // Task grouping
      if (!taskBreakdownMap[log.taskId]) {
        taskBreakdownMap[log.taskId] = {
          taskId: log.taskId,
          taskTitle: log.task.title,
          totalSeconds: 0
        };
      }
      taskBreakdownMap[log.taskId].totalSeconds += log.durationSeconds;

      // User grouping
      if (!userBreakdownMap[log.userId]) {
        userBreakdownMap[log.userId] = {
          userId: log.userId,
          userName: log.user.name,
          userEmail: log.user.email,
          userAvatarUrl: log.user.avatarUrl,
          totalSeconds: 0
        };
      }
      userBreakdownMap[log.userId].totalSeconds += log.durationSeconds;
    }

    res.status(200).json({
      data: {
        projectName: project.name,
        totalSeconds,
        logs,
        taskBreakdown: Object.values(taskBreakdownMap),
        userBreakdown: Object.values(userBreakdownMap)
      }
    });
  } catch (error) {
    next(error);
  }
};
