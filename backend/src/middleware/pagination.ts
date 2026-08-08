import { Request, Response, NextFunction } from 'express';

export function paginationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;

  req.pagination = { page, limit, skip };

  res.locals.pagination = { page, limit, skip };
  next();
}

declare global {
  namespace Express {
    interface Request {
      pagination: { page: number; limit: number; skip: number };
    }
  }
}