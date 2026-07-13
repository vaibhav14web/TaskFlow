import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role, TaskPriority } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';
import { emitToProject } from '../utils/socket';
import config from '../utils/config';

// 1. Create Task (Member+)
// Note: This endpoint is nested as POST /columns/:id/tasks, so req.params.id is the columnId
export const createTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const columnId = req.params.id as string;
    const { title, description, priority = 'MEDIUM', dueDate } = req.body;

    // Trim and validate title
    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (!trimmedTitle) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Task title is required and cannot be empty.' } });
      return;
    }
    if (trimmedTitle.length > config.validation.maxTaskTitle) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Task title must not exceed ${config.validation.maxTaskTitle} characters.` } });
      return;
    }
    // Validate description length if provided
    if (description && typeof description === 'string' && description.length > config.validation.maxTaskDescription) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Task description must not exceed ${config.validation.maxTaskDescription} characters.` } });
      return;
    }
    // Use trimmed title for creation
    const finalTitle = trimmedTitle;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Find column to get workspace
    const column = await prisma.column.findUnique({
      where: { id: columnId },
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

    if (priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid task priority level.' } });
      return;
    }

    // Find task order by counting tasks in current column
    const taskCount = await prisma.task.count({
      where: { columnId }
    });

    const task = await prisma.task.create({
      data: {
        columnId,
        title: finalTitle,
        description: description || null,
        priority: priority as TaskPriority,
        dueDate: dueDate ? new Date(dueDate) : null,
        order: taskCount
      }
    });

    emitToProject(column.board.projectId, 'task.created', { task });

    res.status(201).json({ data: task });
  } catch (error) {
    next(error);
  }
};

// 2. Get Task Details (Viewer+)
export const getTaskDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
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

    res.status(200).json({ data: task });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { title, description, priority, dueDate, columnId, order } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
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
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    if (priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid task priority level.' } });
      return;
    }

    let targetColumnId = task.columnId;
    let targetOrder = task.order;

    // Handle moving to another column
    if (columnId && columnId !== task.columnId) {
      const targetColumn = await prisma.column.findUnique({
        where: { id: columnId },
        include: { board: true }
      });

      if (!targetColumn) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target column not found.' } });
        return;
      }

      // Ensure the column belongs to the same project board
      if (targetColumn.boardId !== task.column.boardId) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cannot move task to a column in a different project.' } });
        return;
      }

      targetColumnId = columnId;

      if (order === undefined) {
        // Append at the end of the new column
        targetOrder = await prisma.task.count({ where: { columnId } });
      }
    }

    if (order !== undefined) {
      targetOrder = Number(order);
    }

    // Collect what fields are changing to write ActivityLog records
    const changes: string[] = [];
    if (title !== undefined && title !== task.title) {
      changes.push(`changed title to '${title}'`);
    }
    if (description !== undefined && description !== task.description) {
      changes.push(`changed description`);
    }
    if (priority !== undefined && priority !== task.priority) {
      changes.push(`changed priority to '${priority}'`);
    }
    if (dueDate !== undefined) {
      const oldTime = task.dueDate ? new Date(task.dueDate).getTime() : 0;
      const newTime = dueDate ? new Date(dueDate).getTime() : 0;
      if (oldTime !== newTime) {
        changes.push(dueDate ? `changed due date to '${new Date(dueDate).toISOString()}'` : `removed due date`);
      }
    }
    if (columnId !== undefined && columnId !== task.columnId) {
      const newCol = await prisma.column.findUnique({ where: { id: columnId } });
      changes.push(`moved task to column '${newCol?.name || columnId}'`);
    } else if (order !== undefined && order !== task.order) {
      changes.push(`reordered task to position ${order}`);
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        priority: priority !== undefined ? (priority as TaskPriority) : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        columnId: targetColumnId,
        order: targetOrder
      }
    });

    if (changes.length > 0) {
      await prisma.activityLog.createMany({
        data: changes.map(action => ({
          taskId: id,
          userId,
          action
        }))
      });
    }

    // Emit real-time updates
    const projectId = task.column.board.projectId;
    if (columnId !== undefined || order !== undefined) {
      emitToProject(projectId, 'task.moved', {
        taskId: id,
        columnId: targetColumnId,
        order: targetOrder
      });
    } else if (changes.length > 0) {
      emitToProject(projectId, 'task.updated', { task: updatedTask });
    }

    res.status(200).json({ data: updatedTask });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Task (Member+)
export const deleteTask = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
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
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const projectId = task.column.board.projectId;

    await prisma.task.delete({
      where: { id }
    });

    emitToProject(projectId, 'task.deleted', { taskId: id });

    res.status(200).json({ data: { message: 'Task deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};
