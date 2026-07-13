import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';
import { emitToProject } from '../utils/socket';

// 1. List Comments (Viewer+)
// GET /tasks/:id/comments
export const listComments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    // Verify Viewer+ role
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
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

    res.status(200).json({ data: comments });
  } catch (error) {
    next(error);
  }
};

// 2. Create Comment (Member+)
// POST /tasks/:id/comments
export const createComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const { body } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (!body) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Comment body is required.' } });
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
    // Verify Member+ role
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId,
        body
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

    // Parse @mentions
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    });

    for (const member of workspaceMembers) {
      // Don't notify the commenter themselves
      if (member.userId === userId) continue;

      const isMentioned =
        body.includes(`@${member.user.name}`) ||
        body.includes(`@${member.user.email}`);

      if (isMentioned) {
        await prisma.notification.create({
          data: {
            userId: member.userId,
            type: 'MENTION',
            payload: {
              taskId,
              taskTitle: task.title,
              commentId: comment.id,
              mentionedById: userId
            }
          }
        });
      }
    }

    // Emit real-time comment event
    const projectId = task.column.board.projectId;
    emitToProject(projectId, 'comment.created', { comment });

    res.status(201).json({ data: comment });
  } catch (error) {
    next(error);
  }
};

// 3. Update Comment (Member+ and creator only)
// PATCH /comments/:id
export const updateComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { body } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (!body) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Comment body is required.' } });
      return;
    }

    const comment = await prisma.comment.findUnique({
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

    if (!comment) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Comment not found.' } });
      return;
    }

    // Check if user is the creator of the comment
    if (comment.userId !== userId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only edit your own comments.' } });
      return;
    }

    const workspaceId = comment.task.column.board.project.workspaceId;
    // Verify Member+ role in workspace
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const updated = await prisma.comment.update({
      where: { id },
      data: { body },
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

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
};

// 4. Delete Comment (Creator OR Admin+)
// DELETE /comments/:id
export const deleteComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const comment = await prisma.comment.findUnique({
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

    if (!comment) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Comment not found.' } });
      return;
    }

    const workspaceId = comment.task.column.board.project.workspaceId;

    // Check workspace membership of requester
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } }
    });

    if (!membership) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient workspace permissions.' } });
      return;
    }

    // Allowed if commenter is the user OR if requester is ADMIN/OWNER (Moderator deletion)
    const isCreator = comment.userId === userId;
    const isModerator = membership.role === Role.OWNER || membership.role === Role.ADMIN;

    if (!isCreator && !isModerator) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this comment.' } });
      return;
    }

    await prisma.comment.delete({
      where: { id }
    });

    res.status(200).json({ data: { message: 'Comment deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};
