import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createTimeLog, listTimeLogs, deleteTimeLog, getProjectBilling } from '../controllers/time-log.controller';

const router = Router();

// Project billing endpoint
router.get('/projects/:projectId/billing', requireAuth, getProjectBilling);

// Task time logging endpoints
router.post('/tasks/:id/time-logs', requireAuth, createTimeLog);
router.get('/tasks/:id/time-logs', requireAuth, listTimeLogs);
router.delete('/tasks/:taskId/time-logs/:logId', requireAuth, deleteTimeLog);

export default router;
