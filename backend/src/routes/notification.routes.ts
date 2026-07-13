import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  listNotifications,
  markRead,
  markAllRead,
  checkDueDatesJob
} from '../controllers/notification.controller';

const router = Router();

// Base path is /api/v1/notifications

router.get('/', requireAuth, listNotifications);
router.post('/check-due-dates', requireAuth, checkDueDatesJob);
router.patch('/read-all', requireAuth, markAllRead);
router.patch('/:id/read', requireAuth, markRead);

export default router;
