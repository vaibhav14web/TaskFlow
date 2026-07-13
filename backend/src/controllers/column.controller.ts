import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';
import config from '../utils/config';

// 1. Create Column (Member+)
export const createColumn = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const { name } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const trimmedName = name ? String(name).trim() : '';
    if (!trimmedName) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Column name cannot be empty.' } });
      return;
    }

    if (trimmedName.length > config.validation.maxColumnName) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Column name cannot exceed ${config.validation.maxColumnName} characters.` } });
      return;
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      return;
    }

    // Verify user is a Member or higher (Owner, Admin, Member) in the workspace
    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    // Find project board
    const board = await prisma.board.findUnique({
      where: { projectId }
    });

    if (!board) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Board not found for this project.' } });
      return;
    }

    // Determine the next order index by finding the current highest order column
    const maxOrderColumn = await prisma.column.findFirst({
      where: { boardId: board.id },
      orderBy: { order: 'desc' }
    });

    const nextOrder = maxOrderColumn ? maxOrderColumn.order + 1 : 0;

    const column = await prisma.column.create({
      data: {
        boardId: board.id,
        name: trimmedName,
        order: nextOrder
      }
    });

    res.status(201).json({ data: column });
  } catch (error) {
    next(error);
  }
};

// 2. Update Column (Member+)
export const updateColumn = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, order } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    let trimmedName: string | undefined;
    if (name !== undefined) {
      trimmedName = String(name).trim();
      if (!trimmedName) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Column name cannot be empty.' } });
        return;
      }
      if (trimmedName.length > 50) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Column name cannot exceed 50 characters.' } });
        return;
      }
    }

    if (order !== undefined) {
      const orderNum = Number(order);
      if (isNaN(orderNum) || orderNum < 0) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Column order must be a non-negative number.' } });
        return;
      }
    }

    // Find column and verify workspace membership permissions
    const column = await prisma.column.findUnique({
      where: { id },
      include: {
        board: {
          include: {
            project: true
          }
        }
      }
    });

    if (!column) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Column not found.' } });
      return;
    }

    const workspaceId = column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const updatedColumn = await prisma.column.update({
      where: { id },
      data: {
        name: trimmedName,
        order: order !== undefined ? Number(order) : undefined
      }
    });

    res.status(200).json({ data: updatedColumn });
  } catch (error) {
    next(error);
  }
};

// 3. Delete Column (Admin+)
export const deleteColumn = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const column = await prisma.column.findUnique({
      where: { id },
      include: {
        board: {
          include: {
            project: true
          }
        }
      }
    });

    if (!column) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Column not found.' } });
      return;
    }

    // Verify Admin or Owner permissions
    const workspaceId = column.board.project.workspaceId;
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN]);

    await prisma.column.delete({
      where: { id }
    });

    res.status(200).json({ data: { message: 'Column deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};
