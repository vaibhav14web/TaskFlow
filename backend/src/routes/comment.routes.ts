import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { updateComment, deleteComment } from '../controllers/comment.controller';

const router = Router();

// Base path is /api/v1/comments

router.patch('/:id', requireAuth, updateComment);
router.delete('/:id', requireAuth, deleteComment);

export default router;
