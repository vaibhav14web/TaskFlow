import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getProjectBoard } from '../controllers/board.controller';
import { createColumn } from '../controllers/column.controller';

const router = Router();

// Mounted at /api/v1/projects

router.get('/:projectId/board', requireAuth, getProjectBoard);
router.post('/:projectId/columns', requireAuth, createColumn);

export default router;
