import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getProjectDetails,
  updateProject,
  deleteProject
} from '../controllers/project.controller';

const router = Router();

// Base endpoint is /api/v1/projects

router.get('/:id', requireAuth, getProjectDetails);
router.patch('/:id', requireAuth, updateProject);
router.delete('/:id', requireAuth, deleteProject);

export default router;
