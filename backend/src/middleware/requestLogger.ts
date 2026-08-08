import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    if (res.statusCode >= 500) {
      // Handled by error logger
    } else if (res.statusCode >= 400) {
      console.warn(message);
    } else {
      if (config.isDev) console.log(message);
    }
  });
  next();
}