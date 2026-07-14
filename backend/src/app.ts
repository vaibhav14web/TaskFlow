import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import config from './utils/config';
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import projectRoutes from './routes/project.routes';
import boardRoutes from './routes/board.routes';
import columnRoutes from './routes/column.routes';
import taskRoutes from './routes/task.routes';
import notificationRoutes from './routes/notification.routes';
import checklistRoutes from './routes/checklist.routes';
import commentRoutes from './routes/comment.routes';
import analyticsRoutes from './routes/analytics.routes';
import attachmentRoutes from './routes/attachment.routes';
import timeLogRoutes from './routes/time-log.routes';
import { requireAuth } from './middleware/auth.middleware';
import logger from './utils/logger';
import { prisma } from './utils/prisma';

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Trust proxy for correct client IP behind Render/Cloudflare
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
if (config.server.corsOrigin) {
  allowedOrigins.push(config.server.corsOrigin.replace(/\/$/, ''));
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: config.server.bodyLimit }));

// Serve static uploads (require authentication)
app.use('/uploads', requireAuth, express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/projects', boardRoutes);
app.use('/api/v1/columns', columnRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/checklist', checklistRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/attachments', attachmentRoutes);
app.use('/api/v1', analyticsRoutes);
app.use('/api/v1', timeLogRoutes);

// Basic Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// In-memory cache variables for public stats
let cachedStats: any = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Public System Statistics (for Landing Page production wiring)
app.get('/api/v1/public/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = Date.now();
    if (cachedStats && now < cacheExpiry) {
      return res.status(200).json({ data: cachedStats });
    }

    const [usersCount, workspacesCount, projectsCount, tasksCount] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.project.count(),
      prisma.task.count()
    ]);

    cachedStats = {
      users: usersCount,
      workspaces: workspacesCount,
      projects: projectsCount,
      tasks: tasksCount,
      uptimeSla: '99.99%'
    };
    cacheExpiry = now + CACHE_TTL_MS;

    res.status(200).json({ data: cachedStats });
  } catch (error) {
    next(error);
  }
});

// Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, req, body: req.body }, 'Unhandled error');
  
  let status = err.statusCode || 500;
  if (err.code === 'LIMIT_FILE_SIZE' || err.message === 'Invalid file type. Allowed types: images, PDF, zip, DOC/X, XLS/X, TXT.') {
    status = 400;
  }
  
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message
    }
  });
});

export default app;
