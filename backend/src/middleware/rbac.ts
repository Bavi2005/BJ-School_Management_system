import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@school-mgmt/shared';
import { AppError } from '../utils/AppError';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }
    if (!roles.includes(req.userRole)) {
      next(AppError.forbidden('Insufficient role permissions'));
      return;
    }
    next();
  };
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userId) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }
    const userPermissions = req.permissions ?? [];
    const hasAll = permissions.every((perm) => userPermissions.includes(perm));
    if (!hasAll) {
      next(AppError.forbidden(`Missing required permissions: ${permissions.join(', ')}`));
      return;
    }
    next();
  };
}

export const isAdmin = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);
export const isTeacher = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER);
export const isStudent = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT);

export function requireSelfOrRoleWhenIdParam(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { id } = req.params;
    if (!req.userId) {
      next(AppError.unauthorized('Authentication required'));
      return;
    }
    if (req.userRole && roles.includes(req.userRole) || id === req.userId) {
      next();
      return;
    }
    next(AppError.forbidden('Insufficient permissions to access this resource'));
  };
}