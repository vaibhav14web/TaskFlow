import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { updateColumn, deleteColumn } from '../controllers/column.controller';
import { createTask } from '../controllers/task.controller';

const router = Router();

// Mounted at /api/v1/columns

router.patch('/:id', requireAuth, updateColumn);
router.delete('/:id', requireAuth, deleteColumn);
router.post('/:id/tasks', requireAuth, createTask);

export default router;
