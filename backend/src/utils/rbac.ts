import { prisma } from './prisma';
import { Role } from '@prisma/client';

export const verifyWorkspaceRole = async (
  userId: string,
  workspaceId: string,
  allowedRoles: Role[]
) => {
  // 1. Fetch membership first to handle the happy path with 1 query
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId }
    }
  });

  if (membership) {
    if (!allowedRoles.includes(membership.role)) {
      const err: any = new Error('Forbidden: Insufficient permissions.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }
    return membership;
  }

  // 2. If membership not found, check if workspace exists to differentiate 404 vs 403
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true } // select only ID for performance
  });

  if (!workspace) {
    const err: any = new Error('Workspace not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const err: any = new Error('Forbidden: Insufficient permissions.');
  err.statusCode = 403;
  err.code = 'FORBIDDEN';
  throw err;
};
