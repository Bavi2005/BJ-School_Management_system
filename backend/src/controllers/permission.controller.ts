import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { UserRole } from '@school-mgmt/shared';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { Role } from '../constants/permissions';
import { getRolePermissions } from '../services/permission.service';

export const listAllPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });

  const grouped = permissions.reduce<Record<string, Array<{ name: string; action: string; description: string | null }>>>(
    (acc, p) => {
      const module = p.module.charAt(0).toUpperCase() + p.module.slice(1);
      if (!acc[module]) acc[module] = [];
      acc[module].push({ name: p.name, action: p.action, description: p.description });
      return acc;
    },
    {}
  );

  sendSuccess(res, {
    permissions,
    grouped,
    modules: Object.keys(grouped),
  });
});

export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = Object.values(UserRole).map((role) => ({
    role,
    permissions: getRolePermissions(role as unknown as UserRole),
  }));

  const [grantedCount, activeCount] = await Promise.all([
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
      where: { deletedAt: null },
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
      where: { deletedAt: null, status: 'ACTIVE' },
    }),
  ]);

  const usersByRole = Object.fromEntries(grantedCount.map((g) => [g.role, g._count._all]));
  const activeByRole = Object.fromEntries(activeCount.map((g) => [g.role, g._count._all]));

  sendSuccess(
    res,
    roles.map((r) => ({
      ...r,
      userCount: usersByRole[r.role] ?? 0,
      activeUsers: activeByRole[r.role] ?? 0,
    }))
  );
});

export const updateRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const { role: roleParam } = req.params as { role: string };
  const { permissions } = req.body as { permissions?: string[] };

  const role = roleParam as PrismaUserRole;
  if (!Object.values(UserRole).includes(roleParam as UserRole)) {
    throw AppError.badRequest('Invalid role');
  }
  if (role === PrismaUserRole.SUPER_ADMIN) {
    throw AppError.badRequest('SUPER_ADMIN permissions are fixed and cannot be changed');
  }
  if (!Array.isArray(permissions)) {
    throw AppError.badRequest('permissions must be an array of permission names');
  }
  if (!req.userId) throw AppError.unauthorized();

  const known = await prisma.permission.findMany({ where: { name: { in: permissions } } });
  if (known.length !== permissions.length) {
    throw AppError.badRequest('One or more permissions do not exist');
  }

  await prisma.$transaction([
    prisma.permissionAssignment.deleteMany({ where: { role: role as never } }),
    ...permissions.map((name) =>
      prisma.permissionAssignment.create({
        data: {
          role: role as never,
          permissionId: known.find((p) => p.name === name)!.id,
          assignedBy: req.userId!,
        },
      })
    ),
  ]);

  sendSuccess(res, { role, permissions });
});

export const getUserGrants = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const grants = await prisma.permissionGrant.findMany({
    where: { userId: id },
    include: { permission: { select: { name: true, description: true, module: true, action: true } } },
    orderBy: { grantedAt: 'desc' },
  });

  sendSuccess(res, grants);
});

export const grantUserPermission = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permissionId } = req.body as { permissionId?: string };

  if (!req.userId) throw AppError.unauthorized();
  if (!permissionId) throw AppError.badRequest('permissionId is required');

  const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
  if (!permission) throw AppError.notFound('Permission not found');

  const grant = await prisma.permissionGrant.upsert({
    where: { permissionId_userId: { permissionId, userId: id } },
    update: { grantedBy: req.userId, expiresAt: null },
    create: { permissionId, userId: id, grantedBy: req.userId },
  });

  sendSuccess(res, grant);
});

export const revokeUserPermission = asyncHandler(async (req: Request, res: Response) => {
  const { id, permissionId } = req.params;
  await prisma.permissionGrant.deleteMany({ where: { userId: id, permissionId } });
  sendNoContent(res);
});

export const getPermissionOptions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
    select: { id: true, name: true, description: true, module: true, action: true },
  });
  sendSuccess(res, permissions);
});
