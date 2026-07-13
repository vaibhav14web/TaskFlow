import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getStatusBreakdown,
  getOverdueTasks,
  getCompletionTrend,
  getBottlenecks,
  getMemberWorkloads
} from '../controllers/analytics.controller';

const router = Router();

// Mounted at /api/v1 (endpoints use project/workspace routes structure)

router.get('/projects/:id/analytics/status-breakdown', requireAuth, getStatusBreakdown);
router.get('/projects/:id/analytics/overdue', requireAuth, getOverdueTasks);
router.get('/projects/:id/analytics/completion-trend', requireAuth, getCompletionTrend);
router.get('/projects/:id/analytics/bottlenecks', requireAuth, getBottlenecks);
router.get('/workspaces/:id/analytics/workload', requireAuth, getMemberWorkloads);

export default router;
