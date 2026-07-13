import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role, ProjectStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';
import config from '../utils/config';

// 1. Create Project (Admin+)
export const createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const { name, description } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (!name) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Project name is required.' } });
      return;
    }

    // Verify requester has OWNER or ADMIN role in the target workspace
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN]);

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        description: description || null,
        ownerId: userId,
        board: {
          create: {
            columns: {
              createMany: {
                data: config.defaultColumnNames.map((name, order) => ({ name, order }))
              }
            }
          }
        }
      },
      include: {
        board: {
          include: {
            columns: true
          }
        }
      }
    });

    res.status(201).json({ data: project });
  } catch (error) {
    next(error);
  }
};

// 2. List Projects (Member+)
export const listProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Verify user is a member of the workspace (any role)
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const projects = await prisma.project.findMany({
      where: { workspaceId }
    });

    res.status(200).json({ data: projects });
  } catch (error) {
    next(error);
  }
};

// 3. Get Project Details (Member+)
export const getProjectDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      return;
    }

    // Verify user has membership in the workspace containing this project
    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    res.status(200).json({ data: project });
  } catch (error) {
    next(error);
  }
};

// 4. Update Project (Admin+)
export const updateProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, description, status } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      return;
    }

    // Verify user is Admin or Owner of the project's workspace
    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN]);

    if (status && !['ACTIVE', 'ARCHIVED'].includes(status)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid project status. Must be ACTIVE or ARCHIVED.' } });
      return;
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        status: status !== undefined ? (status as ProjectStatus) : undefined
      }
    });

    res.status(200).json({ data: updatedProject });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Project (Admin+)
export const deleteProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      return;
    }

    // Verify user is Admin or Owner of the project's workspace
    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN]);

    await prisma.project.delete({
      where: { id }
    });

    res.status(200).json({ data: { message: 'Project deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};
