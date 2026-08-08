import express, { Application } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import routes from './routes';
import { getHttpLogger } from './lib/logger';
import { swaggerSpec } from './docs/swagger';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: config.isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    })
  );
  app.use(corsMiddleware);
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(morgan(config.isDev ? 'dev' : 'combined', { stream: { write: getHttpLogger() } }));
  app.use(apiRateLimiter);

  if (config.swagger) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'school-mgmt-api',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}