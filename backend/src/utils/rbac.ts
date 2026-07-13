import { prisma } from './prisma';
import { Role } from '@prisma/client';

export const verifyWorkspaceRole = async (
  userId: string,
  workspaceId: string,
  allowedRoles: Role[]
) => {
  // First, verify that the workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId }
  });

  if (!workspace) {
    const err: any = new Error('Workspace not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Next, verify that the user is a member with an allowed role
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId }
    }
  });

  if (!membership || !allowedRoles.includes(membership.role)) {
    const err: any = new Error('Forbidden: Insufficient permissions.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  return membership;
};
