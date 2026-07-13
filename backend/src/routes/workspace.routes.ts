import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createWorkspace,
  listWorkspaces,
  getWorkspaceDetails,
  updateWorkspace,
  deleteWorkspace,
  listMembers,
  createInvite,
  joinWorkspace,
  updateMemberRole,
  removeMember,
  listWorkspaceInvites,
  revokeWorkspaceInvite
} from '../controllers/workspace.controller';
import { createProject, listProjects } from '../controllers/project.controller';

const router = Router();

// Base endpoint is /api/v1/workspaces

// Note: /join is placed BEFORE /:id so it doesn't match as a UUID workspace ID parameter
router.post('/join', requireAuth, joinWorkspace);

router.post('/', requireAuth, createWorkspace);
router.get('/', requireAuth, listWorkspaces);

router.get('/:id', requireAuth, getWorkspaceDetails);
router.patch('/:id', requireAuth, updateWorkspace);
router.delete('/:id', requireAuth, deleteWorkspace);

// Invites list and revoke
router.get('/:id/invites', requireAuth, listWorkspaceInvites);
router.delete('/:id/invites/:inviteId', requireAuth, revokeWorkspaceInvite);

// Nested Project Routes under Workspace
router.get('/:workspaceId/projects', requireAuth, listProjects);
router.post('/:workspaceId/projects', requireAuth, createProject);

// Members and Invites
router.get('/:id/members', requireAuth, listMembers);
router.post('/:id/invites', requireAuth, createInvite);
router.patch('/:id/members/:userId', requireAuth, updateMemberRole);
router.delete('/:id/members/:userId', requireAuth, removeMember);

export default router;
