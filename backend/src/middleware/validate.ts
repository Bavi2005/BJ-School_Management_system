import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

type Source = 'body' | 'query' | 'params' | 'headers';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      (req as unknown as Record<string, unknown>)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.reduce(
          (acc, e) => {
            const path = e.path.join('.');
            acc[path] = e.message;
            return acc;
          },
          {} as Record<string, string>
        );
        next(AppError.badRequest('Invalid request data', details));
        return;
      }
      next(err);
    }
  };
}

export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}

export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}