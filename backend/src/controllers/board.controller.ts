import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role, TaskPriority, Board } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';
import { cache } from '../utils/cache';

// 1. Get Project Board (Viewer+)
export const getProjectBoard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.userId;
    const { search, priority } = req.query;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
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

    // Verify member permissions (Viewer+)
    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    // Validate priority query parameter if present
    if (priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority as string)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid priority filter.' } });
      return;
    }

    // Build the query where clause for filtering tasks
    const searchFilter = search ? String(search).trim().slice(0, 200) : '';
    const priorityFilter = priority ? (priority as TaskPriority) : undefined;

    // Check board cache using version-based key
    const versionKey = `project:${projectId}:board_version`;
    const version = await cache.get<number>(versionKey) || 1;
    const cacheKey = `project:${projectId}:board:${version}:${searchFilter}:${priorityFilter || ''}`;

    if (req.query.refresh !== 'true') {
      const cached = await cache.get<Board>(cacheKey);
      if (cached) {
        res.status(200).json({ data: cached });
        return;
      }
    }

    const board = await prisma.board.findFirst({
      where: { projectId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              where: {
                AND: [
                  searchFilter
                    ? {
                        OR: [
                          { title: { contains: searchFilter, mode: 'insensitive' } },
                          { description: { contains: searchFilter, mode: 'insensitive' } }
                        ]
                      }
                    : {},
                  priorityFilter ? { priority: priorityFilter } : {}
                ]
              },
              include: {
                assignees: true,
                checklist: true,
                timeLogs: true
              }
            }
          }
        }
      }
    });

    if (!board) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Board not found for this project.' } });
      return;
    }

    // Cache the board data for 1 hour (3600 seconds)
    await cache.set(cacheKey, board, 3600);

    res.status(200).json({ data: board });
  } catch (error) {
    next(error);
  }
};
