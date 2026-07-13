import http from 'http';
import cron from 'node-cron';
import app from './app';
import { initSocket } from './utils/socket';
import { runDueDateCheck } from './controllers/notification.controller';
import config from './utils/config';
import logger from './utils/logger';

const PORT = config.server.port;

const requiredProductionEnvironment = ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'FRONTEND_URL'];
if (process.env.NODE_ENV === 'production') {
  const missing = requiredProductionEnvironment.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
}

const server = http.createServer(app);

// Initialize Socket.IO server
initSocket(server);

// Schedule due-date notification check every hour
cron.schedule('0 * * * *', async () => {
  logger.info('Running due-date check...');
  try {
    const count = await runDueDateCheck();
    logger.info({ count }, 'Due-date check complete');
  } catch (err) {
    logger.error({ err }, 'Due-date check failed');
  }
});

// Global handler for unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason instanceof Error ? reason : new Error(String(reason)) }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
