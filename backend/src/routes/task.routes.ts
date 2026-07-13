import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getTaskDetails, updateTask, deleteTask } from '../controllers/task.controller';
import { assignUser, getTaskAssignees, unassignUser } from '../controllers/assignment.controller';
import { addChecklistItem, getChecklist } from '../controllers/checklist.controller';
import { addAttachment, getAttachments, upload } from '../controllers/attachment.controller';
import { getTaskActivity } from '../controllers/activity.controller';
import { listComments, createComment } from '../controllers/comment.controller';

const router = Router();

// Base path is /api/v1/tasks

router.get('/:id', requireAuth, getTaskDetails);
router.patch('/:id', requireAuth, updateTask);
router.delete('/:id', requireAuth, deleteTask);

// Assignees
router.post('/:id/assignees', requireAuth, assignUser);
router.delete('/:id/assignees/:userId', requireAuth, unassignUser);
router.get('/:id/assignees', requireAuth, getTaskAssignees);

// Checklist / Sub-tasks
router.post('/:id/checklist', requireAuth, addChecklistItem);
router.get('/:id/checklist', requireAuth, getChecklist);

// Attachments
router.post('/:id/attachments', requireAuth, upload.single('file'), addAttachment);
router.get('/:id/attachments', requireAuth, getAttachments);

// Activity Logs
router.get('/:id/activity', requireAuth, getTaskActivity);

// Comments
router.get('/:id/comments', requireAuth, listComments);
router.post('/:id/comments', requireAuth, createComment);

export default router;
