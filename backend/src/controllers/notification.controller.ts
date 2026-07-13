import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import config from '../utils/config';

// 1. List Notifications
export const listNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ data: notifications });
  } catch (error) {
    next(error);
  }
};

// 2. Mark Notification as Read
export const markRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== userId) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    next(error);
  }
};

// 3. Mark All Notifications as Read
export const markAllRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    res.status(200).json({ data: { message: 'All notifications marked as read.' } });
  } catch (error) {
    next(error);
  }
};

// 4. Core logic for due date checks (used by both HTTP handler and cron)
export const runDueDateCheck = async (): Promise<number> => {
  const now = new Date();
  const targetTime = new Date(now.getTime() + config.dueDate.lookaheadMs);

  const upcomingTasks = await prisma.task.findMany({
    where: {
      dueDate: {
        gt: now,
        lte: targetTime
      }
    },
    include: {
      assignees: true
    }
  });

  let count = 0;
  for (const task of upcomingTasks) {
    for (const assignee of task.assignees) {
      const existingNotifications = await prisma.notification.findMany({
        where: {
          userId: assignee.id,
          type: 'DUE_DATE'
        }
      });

      const alreadyNotified = existingNotifications.some(n => {
        const payload = n.payload as any;
        return payload && payload.taskId === task.id;
      });

      if (!alreadyNotified) {
        await prisma.notification.create({
          data: {
            userId: assignee.id,
            type: 'DUE_DATE',
            payload: {
              taskId: task.id,
              taskTitle: task.title,
              dueDate: task.dueDate?.toISOString()
            }
          }
        });
        count++;
      }
    }
  }

  return count;
};

// 5. Trigger Due Dates Warning Job (HTTP endpoint)
export const checkDueDatesJob = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const count = await runDueDateCheck();
    res.status(200).json({ data: { message: `Due date check completed. Generated ${count} notifications.` } });
  } catch (error) {
    next(error);
  }
};
