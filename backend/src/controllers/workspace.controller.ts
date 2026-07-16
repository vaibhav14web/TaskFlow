import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';
import { sendEmail } from '../utils/email';
import logger from '../utils/logger';

// 1. Create Workspace
export const createWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (!name) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Workspace name is required.' } });
      return;
    }

    // Create workspace and add owner as member with Role.OWNER in a single query
    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: Role.OWNER
          }
        }
      }
    });

    res.status(201).json({
      data: {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        createdAt: workspace.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. List Workspaces for Authenticated User
export const listWorkspaces = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true
      }
    });

    const workspaces = memberships.map(m => m.workspace);

    res.status(200).json({ data: workspaces });
  } catch (error) {
    next(error);
  }
};

// 3. Get Workspace Details (Member+)
export const getWorkspaceDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Verify membership (any role allowed)
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
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
        }
      }
    });

    res.status(200).json({ data: workspace });
  } catch (error) {
    next(error);
  }
};

// 4. Update Workspace Settings (Admin+)
export const updateWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const userId = req.userId;
    const { name, description, allowedDomains } = req.body;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Verify Owner or Admin role
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN]);

    // Build update data
    const updateData: any = {};
    if (name !== undefined) {
      if (name.trim() === '') {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Workspace name cannot be empty.' } });
        return;
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description.trim() === '' ? null : description.trim();
    }
    if (allowedDomains !== undefined) {
      updateData.allowedDomains = allowedDomains.trim() === '' ? null : allowedDomains.trim();
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Workspace (Owner only)
export const deleteWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Verify Owner role
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER]);

    await prisma.workspace.delete({
      where: { id: workspaceId }
    });

    res.status(200).json({ data: { message: 'Workspace deleted successfully.' } });
  } catch (error) {
    next(error);
  }
};

// 6. List Members (Member+)
export const listMembers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Verify membership
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
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

    res.status(200).json({ data: members });
  } catch (error) {
    next(error);
  }
};

// 7. Create Invite (Admin+)
export const createInvite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const userId = req.userId;
    const { email, role = 'MEMBER', expiresAt } = req.body;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Verify Owner or Admin role
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN]);

    if (!['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid target membership role.' } });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: email || null,
        role: role as Role,
        token,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        invitedById: userId
      }
    });

    // If a target email is provided, send the email directly in the background
    if (email) {
      (async () => {
        try {
          const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { name: true }
          });
          const inviter = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
          });

          const workspaceName = workspace?.name || 'a workspace';
          const inviterName = inviter?.name || 'Someone';
          const origin = (req.headers.origin as string) || (req.headers.referer as string) || '';
          const rawUrl = origin || process.env.FRONTEND_URL || 'https://taskflow-4lp.pages.dev';
          const frontendUrl = rawUrl.replace(/\/$/, '');
          const inviteLink = `${frontendUrl}/join?token=${token}`;

          const subject = `You've been invited to join ${workspaceName} on TaskFlow`;
          const htmlContent = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #6366f1;">You're invited to join ${workspaceName} on TaskFlow!</h2>
              <p>Hi there,</p>
              <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace as a <strong>${role}</strong>.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${inviteLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Join Workspace</a>
              </div>
              <p>If you don't have a TaskFlow account yet, you'll be asked to create one after clicking the button.</p>
              <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
              <p style="font-size: 12px; color: #888888;">If the button above doesn't work, copy and paste this URL into your browser:<br>${inviteLink}</p>
            </div>
          `;
          const textContent = `${inviterName} has invited you to join the ${workspaceName} workspace as a ${role} on TaskFlow. Click here to join: ${inviteLink}`;

          await sendEmail(email, subject, htmlContent, textContent);
        } catch (emailError) {
          // Log the error but don't fail the API request
          console.error(`Failed to send workspace invite email to ${email}:`, emailError);
        }
      })();
    }

    res.status(201).json({
      data: {
        id: invite.id,
        workspaceId: invite.workspaceId,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// 8. Join Workspace (Authenticated User)
export const joinWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (!token) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invite token is required.' } });
      return;
    }

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: true }
    });

    if (!invite) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invite token not found.' } });
      return;
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      await prisma.workspaceInvite.delete({ where: { id: invite.id } }).catch((err) => logger.warn({ err }, 'Failed to delete expired invite'));
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invite link has expired.' } });
      return;
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
      return;
    }

    // Enforce allowedDomains restriction on the workspace
    if (invite.workspace.allowedDomains) {
      const allowedList = invite.workspace.allowedDomains
        .split(',')
        .map((d: string) => d.trim().toLowerCase())
        .filter(Boolean);
      const userDomain = currentUser.email.split('@')[1]?.toLowerCase();
      if (allowedList.length > 0 && (!userDomain || !allowedList.includes(userDomain))) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Your email domain is not allowed to join this workspace. Allowed domains: ${allowedList.join(', ')}`
          }
        });
        return;
      }
    }

    // If specific email invite, verify email matches current user
    if (invite.email && invite.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This invite is for a different email address.' } });
      return;
    }

    // Check duplicate membership
    const existingMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } }
    });

    if (existingMember) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'You are already a member of this workspace.' } });
      return;
    }

    await prisma.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role
      }
    });

    // Delete single-use email invites after they are consumed
    if (invite.email) {
      await prisma.workspaceInvite.delete({ where: { id: invite.id } }).catch((err) => logger.warn({ err }, 'Failed to delete consumed invite'));
    }

    res.status(200).json({
      data: {
        message: 'Successfully joined workspace.',
        workspace: {
          id: invite.workspace.id,
          name: invite.workspace.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 9. Update Member Role (Admin+)
export const updateMemberRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const userId = req.userId;
    const { role } = req.body;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    if (!role || !['ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid role (ADMIN, MEMBER, VIEWER) is required.' } });
      return;
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found.' } });
      return;
    }

    // Verify requester's role is Admin or Owner
    const requesterMember = await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN]);

    if (userId === targetUserId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'You cannot change your own role.' } });
      return;
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });

    if (!targetMember) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found in workspace.' } });
      return;
    }

    // Enforce constraints
    if (workspace.ownerId === targetUserId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot modify the role of the workspace owner.' } });
      return;
    }

    if (requesterMember.role === Role.ADMIN && targetMember.role === Role.ADMIN) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admins cannot modify the roles of other Admins.' } });
      return;
    }

    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role: role as Role }
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
};

// 10. Remove Member (Admin+)
export const removeMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found.' } });
      return;
    }

    // Verify requester role
    const requesterMember = await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN]);

    if (userId === targetUserId) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'You cannot remove yourself from the workspace.' } });
      return;
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });

    if (!targetMember) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found in workspace.' } });
      return;
    }

    // Enforce constraints
    if (workspace.ownerId === targetUserId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot remove the workspace owner.' } });
      return;
    }

    if (requesterMember.role === Role.ADMIN && targetMember.role === Role.ADMIN) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admins cannot remove other Admins.' } });
      return;
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });

    res.status(200).json({ data: { message: 'Member removed successfully.' } });
  } catch (error) {
    next(error);
  }
};

// 11. List Pending Invites (Admin+)
export const listWorkspaceInvites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Verify Admin/Owner role
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN]);

    const invites = await prisma.workspaceInvite.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(200).json({ data: invites });
  } catch (error) {
    next(error);
  }
};

// 12. Revoke Invite (Admin+)
export const revokeWorkspaceInvite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const inviteId = req.params.inviteId as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Verify Admin/Owner role
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN]);

    const invite = await prisma.workspaceInvite.findFirst({
      where: { id: inviteId, workspaceId }
    });

    if (!invite) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invite not found.' } });
      return;
    }

    await prisma.workspaceInvite.delete({
      where: { id: inviteId }
    });

    res.status(200).json({ data: { message: 'Invite revoked successfully.' } });
  } catch (error) {
    next(error);
  }
};
