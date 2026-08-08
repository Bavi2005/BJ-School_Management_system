import { createServer } from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { testDatabaseConnection } from './lib/prisma';
import { initializeSocket } from './lib/socket';
import { cache } from './lib/cache';
import { logger } from './lib/logger';

async function bootstrap(): Promise<void> {
  try {
    await testDatabaseConnection();

    await cache.connect().catch(() => {
      logger.warn('Redis connection failed - continuing without cache');
    });

    const app = createApp();
    const server = createServer(app);

    initializeSocket(server);

    server.listen(config.port, () => {
      logger.info(`🚀 API server running on port ${config.port}`);
      logger.info(`📚 API Docs available at http://localhost:${config.port}/api-docs`);
      logger.info(`✅ Health check at http://localhost:${config.port}/health`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      server.close(async () => {
        await cache.disconnect().catch(() => {});
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message, stack: (error as Error).stack });
    process.exit(1);
  }
}

bootstrap();