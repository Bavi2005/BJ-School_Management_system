import { Request, Response, NextFunction } from 'express';
import { generateRequestId } from '@school-mgmt/shared';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateRequestId();
  req.requestId = requestId;
  req.startTime = Date.now();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}