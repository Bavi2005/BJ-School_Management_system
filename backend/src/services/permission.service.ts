import { prisma } from '../lib/prisma';
import { Role } from '../constants/permissions';
import { UserRole } from '@school-mgmt/shared';

export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return [];

  const rolePermissions = getRolePermissions(user.role as unknown as UserRole);

  const extraGrants = await prisma.permissionGrant.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: {
      permission: {
        select: {
          name: true,
          action: true,
          module: true,
        },
      },
    },
  });

  const extraPermissions = extraGrants.map(
    (g) => `${g.permission.module}:${g.permission.action}`
  );

  return [...new Set([...rolePermissions, ...extraPermissions])];
}

export function getRolePermissions(role: UserRole): string[] {
  return [...(Role[role] ?? [])];
}

export async function seedDefaultPermissions(): Promise<void> {
  const permissionDefinitions = Object.values(Role).flat();

  for (const permission of permissionDefinitions) {
    if (permission === '*') continue;
    const [module, action] = permission.split(':');
    await prisma.permission.upsert({
      where: { name: permission },
      update: { module, action },
      create: {
        name: permission,
        module,
        action,
        description: `${action.replace(/_/g, ' ')} on ${module.replace(/_/g, ' ')}`,
      },
    });
  }
}