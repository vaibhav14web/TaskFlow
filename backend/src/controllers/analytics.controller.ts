import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyWorkspaceRole } from '../utils/rbac';
import { cache } from '../utils/cache';
import config from '../utils/config';

// 1. Project Status Breakdown (Viewer+)
// GET /projects/:id/analytics/status-breakdown
export const getStatusBreakdown = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      return;
    }

    // Security Verification: Check permissions BEFORE serving cache
    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const cacheKey = `project:${projectId}:analytics:status-breakdown`;
    if (req.query.refresh !== 'true') {
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.status(200).json({ data: cached });
        return;
      }
    }

    // Fetch column task count breakdown
    const columns = await prisma.column.findMany({
      where: { board: { projectId } },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { order: 'asc' }
    });

    const breakdown = columns.map(c => ({
      columnId: c.id,
      columnName: c.name,
      count: c._count.tasks
    }));

    // Cache breakdown for 5 minutes
    await cache.set(cacheKey, breakdown, config.cache.analyticsTTL);

    res.status(200).json({ data: breakdown });
  } catch (error) {
    next(error);
  }
};

// 2. Project Overdue Tasks (Viewer+)
// GET /projects/:id/analytics/overdue
export const getOverdueTasks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      return;
    }

    // Security Verification: Check permissions BEFORE serving cache
    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const cacheKey = `project:${projectId}:analytics:overdue`;
    if (req.query.refresh !== 'true') {
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.status(200).json({ data: cached });
        return;
      }
    }

    const now = new Date();
    // Get columns representing completed tasks (Done) to exclude them
    const doneColumns = await prisma.column.findMany({
      where: {
        board: { projectId },
        name: { mode: 'insensitive', equals: 'done' }
      }
    });
    const doneColumnIds = doneColumns.map(c => c.id);

    // Query active overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        column: { board: { projectId } },
        columnId: { notIn: doneColumnIds },
        dueDate: { lt: now }
      },
      orderBy: { dueDate: 'asc' }
    });

    await cache.set(cacheKey, overdueTasks, config.cache.analyticsTTL);

    res.status(200).json({ data: overdueTasks });
  } catch (error) {
    next(error);
  }
};

// 3. Project Completion Trend (Viewer+)
// GET /projects/:id/analytics/completion-trend
export const getCompletionTrend = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    const userId = req.userId;
    const range = (req.query.range as string) || '30d';

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      return;
    }

    // Security Verification: Check permissions BEFORE serving cache
    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const cacheKey = `project:${projectId}:analytics:completion-trend:${range}`;
    if (req.query.refresh !== 'true') {
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.status(200).json({ data: cached });
        return;
      }
    }

    let days = 30;
    if (range === '7d') days = 7;
    if (range === '90d') days = 90;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch activity logs where task was moved to 'Done' column
    const logs = await prisma.activityLog.findMany({
      where: {
        task: { column: { board: { projectId } } },
        action: { contains: "moved task to column 'Done'" },
        createdAt: { gte: cutoffDate }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Populate daily completion counts map
    const trendMap = new Map<string, number>();
    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendMap.set(dateStr, 0);
    }

    logs.forEach(log => {
      const dateStr = new Date(log.createdAt).toISOString().split('T')[0];
      if (trendMap.has(dateStr)) {
        trendMap.set(dateStr, trendMap.get(dateStr)! + 1);
      }
    });

    const trend = Array.from(trendMap.entries())
      .map(([date, completedCount]) => ({ date, completedCount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    await cache.set(cacheKey, trend, config.cache.analyticsTTL);

    res.status(200).json({ data: trend });
  } catch (error) {
    next(error);
  }
};

// 4. Project Bottleneck Columns (Viewer+)
// GET /projects/:id/analytics/bottlenecks
export const getBottlenecks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found.' } });
      return;
    }

    // Security Verification: Check permissions BEFORE serving cache
    await verifyWorkspaceRole(userId, project.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const cacheKey = `project:${projectId}:analytics:bottlenecks`;
    if (req.query.refresh !== 'true') {
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.status(200).json({ data: cached });
        return;
      }
    }

    // Fetch all active project tasks
    const tasks = await prisma.task.findMany({
      where: { column: { board: { projectId } } },
      include: { column: true }
    });

    // Fetch ALL relevant activity logs in ONE query to avoid N+1
    const taskIds = tasks.map(t => t.id);
    const allArrivalLogs = await prisma.activityLog.findMany({
      where: {
        taskId: { in: taskIds },
        action: { contains: 'moved task to column' }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Build a map: taskId -> most recent arrival log
    const latestArrivalByTask = new Map<string, Date>();
    for (const log of allArrivalLogs) {
      if (!latestArrivalByTask.has(log.taskId)) {
        latestArrivalByTask.set(log.taskId, new Date(log.createdAt));
      }
    }

    const columnTimesMap: { [columnId: string]: { name: string; durations: number[] } } = {};

    for (const task of tasks) {
      const arrivalTime = latestArrivalByTask.has(task.id)
        ? latestArrivalByTask.get(task.id)!.getTime()
        : new Date(task.createdAt).getTime();
      const lingerDurationMs = Date.now() - arrivalTime;

      if (!columnTimesMap[task.columnId]) {
        columnTimesMap[task.columnId] = { name: task.column.name, durations: [] };
      }
      columnTimesMap[task.columnId].durations.push(lingerDurationMs);
    }

    const bottlenecks = Object.keys(columnTimesMap).map(columnId => {
      const col = columnTimesMap[columnId];
      const sum = col.durations.reduce((a, b) => a + b, 0);
      const avg = col.durations.length > 0 ? sum / col.durations.length : 0;
      const avgDays = avg / (1000 * 60 * 60 * 24);
      return {
        columnId,
        columnName: col.name,
        averageLingerTimeMs: Math.round(avg),
        avgDays: Number(avgDays.toFixed(1))
      };
    }).sort((a, b) => b.averageLingerTimeMs - a.averageLingerTimeMs);

    await cache.set(cacheKey, bottlenecks, config.cache.analyticsTTL);

    res.status(200).json({ data: bottlenecks });
  } catch (error) {
    next(error);
  }
};

// 5. Workspace Member Workloads (Viewer+)
// GET /workspaces/:id/analytics/workload
export const getMemberWorkloads = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id as string;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    // Security Verification: Check permissions BEFORE serving cache
    await verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]);

    const cacheKey = `workspace:${workspaceId}:analytics:workload`;
    if (req.query.refresh !== 'true') {
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.status(200).json({ data: cached });
        return;
      }
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true }
    });

    const workloads = [];

    for (const member of members) {
      // Find tasks assigned to this user in this workspace
      const tasks = await prisma.task.findMany({
        where: {
          assignees: { some: { id: member.userId } },
          column: { board: { project: { workspaceId } } }
        },
        include: { column: true }
      });

      const activeTasksCount = tasks.filter(t => t.column.name.toLowerCase() !== 'done').length;
      const completedTasksCount = tasks.filter(t => t.column.name.toLowerCase() === 'done').length;

      workloads.push({
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        activeTasksCount,
        completedTasksCount
      });
    }

    await cache.set(cacheKey, workloads, config.cache.analyticsTTL);

    res.status(200).json({ data: workloads });
  } catch (error) {
    next(error);
  }
};
