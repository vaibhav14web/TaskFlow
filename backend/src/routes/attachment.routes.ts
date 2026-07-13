import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { deleteAttachment } from '../controllers/attachment.controller';

const router = Router();

// Base path is /api/v1/attachments

router.delete('/:id', requireAuth, deleteAttachment);

export default router;
