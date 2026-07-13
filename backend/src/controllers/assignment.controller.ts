import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';

// 1. Assign User to Task (Member+)
export const assignUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const { userId: targetUserId } = req.body;
    const requesterId = req.userId;

    if (!requesterId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (!targetUserId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Target userId is required.' } });
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
        },
        assignees: true
      }
    });

    if (!task) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return;
    }

    const workspaceId = task.column.board.project.workspaceId;

    // Verify requester has Member+ role
    await verifyWorkspaceRole(requesterId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    // Verify target user is a member of this workspace
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      include: { user: true }
    });

    if (!targetMembership) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Target user is not a member of this workspace.' } });
      return;
    }

    // Verify target user is not already assigned
    const isAlreadyAssigned = task.assignees.some(u => u.id === targetUserId);
    if (isAlreadyAssigned) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'User is already assigned to this task.' } });
      return;
    }

    // Connect target user to task assignees
    await prisma.task.update({
      where: { id: taskId },
      data: {
        assignees: {
          connect: { id: targetUserId }
        }
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        taskId,
        userId: requesterId,
        action: `assigned ${targetMembership.user.name}`
      }
    });

    // Create in-app assignment notification
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'ASSIGNMENT',
        payload: {
          taskId,
          taskTitle: task.title,
          assignedById: requesterId
        }
      }
    });

    res.status(200).json({ data: { message: 'User assigned successfully.' } });
  } catch (error) {
    next(error);
  }
};

// 2. Unassign User from Task (Member+)
export const unassignUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const requesterId = req.userId;

    if (!requesterId) {
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
        },
        assignees: true
      }
    });

    if (!task) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return;
    }

    const workspaceId = task.column.board.project.workspaceId;

    // Verify requester has Member+ role
    await verifyWorkspaceRole(requesterId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    // Verify target user is currently assigned
    const isAssigned = task.assignees.some(u => u.id === targetUserId);
    if (!isAssigned) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'User is not assigned to this task.' } });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    // Disconnect target user from task assignees
    await prisma.task.update({
      where: { id: taskId },
      data: {
        assignees: {
          disconnect: { id: targetUserId }
        }
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        taskId,
        userId: requesterId,
        action: `unassigned ${targetUser?.name || targetUserId}`
      }
    });

    res.status(200).json({ data: { message: 'User unassigned successfully.' } });
  } catch (error) {
    next(error);
  }
};

// 3. Get Task Assignees (Viewer+)
// GET /tasks/:id/assignees
export const getTaskAssignees = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
        },
        assignees: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    if (!task) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return;
    }

    const workspaceId = task.column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    res.status(200).json({ data: task.assignees });
  } catch (error) {
    next(error);
  }
};

