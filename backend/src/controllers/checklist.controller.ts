import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';

// 1. Add Checklist Item (Member+)
// POST /tasks/:id/checklist
export const addChecklistItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const { label } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (!label) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Label is required.' } });
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

    // Verify Member+ permissions
    const workspaceId = task.column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    // Count existing checklist items to determine order
    const count = await prisma.checklistItem.count({
      where: { taskId }
    });

    const item = await prisma.checklistItem.create({
      data: {
        taskId,
        label,
        isDone: false,
        order: count
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        taskId,
        userId,
        action: `added checklist item '${label}'`
      }
    });

    res.status(201).json({ data: item });
  } catch (error) {
    next(error);
  }
};

// 2. Update Checklist Item (Member+)
// PATCH /checklist/:id
export const updateChecklistItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { label, isDone } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const item = await prisma.checklistItem.findUnique({
      where: { id },
      include: {
        task: {
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
        }
      }
    });

    if (!item) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Checklist item not found.' } });
      return;
    }

    // Verify Member+ permissions
    const workspaceId = item.task.column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    // Track activities
    const actions: string[] = [];
    if (label !== undefined && label !== item.label) {
      actions.push(`renamed checklist item to '${label}'`);
    }
    if (isDone !== undefined && isDone !== item.isDone) {
      actions.push(isDone ? `completed checklist item '${item.label}'` : `uncompleted checklist item '${item.label}'`);
    }

    const updated = await prisma.checklistItem.update({
      where: { id },
      data: {
        label: label !== undefined ? label : undefined,
        isDone: isDone !== undefined ? isDone : undefined
      }
    });

    if (actions.length > 0) {
      await prisma.activityLog.createMany({
        data: actions.map(action => ({
          taskId: item.taskId,
          userId,
          action
        }))
      });
    }

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
};

// 3. Get Checklist Items (Viewer+)
// GET /tasks/:id/checklist
export const getChecklist = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    const workspaceId = task.column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const checklist = await prisma.checklistItem.findMany({
      where: { taskId },
      orderBy: { order: 'asc' }
    });

    res.status(200).json({ data: checklist });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Checklist Item (Member+)
// DELETE /checklist/:id
export const deleteChecklistItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const item = await prisma.checklistItem.findUnique({
      where: { id },
      include: {
        task: {
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
        }
      }
    });

    if (!item) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Checklist item not found.' } });
      return;
    }

    // Verify Member+ permissions
    const workspaceId = item.task.column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    await prisma.checklistItem.delete({
      where: { id }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        taskId: item.taskId,
        userId,
        action: `deleted checklist item '${item.label}'`
      }
    });

    res.status(200).json({ data: { message: 'Checklist item deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};

