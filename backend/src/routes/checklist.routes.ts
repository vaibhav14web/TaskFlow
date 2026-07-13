import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { updateChecklistItem, deleteChecklistItem } from '../controllers/checklist.controller';

const router = Router();

// Base path is /api/v1/checklist

router.patch('/:id', requireAuth, updateChecklistItem);
router.delete('/:id', requireAuth, deleteChecklistItem);

export default router;
