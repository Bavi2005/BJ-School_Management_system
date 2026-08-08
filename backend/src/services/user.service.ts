import { prisma } from '../lib/prisma';
import { authService } from './auth.service';
import { getUserPermissions } from './permission.service';
import { AppError } from '../utils/AppError';
import { UserRole } from '@school-mgmt/shared';
import { cache } from '../lib/cache';

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
  avatarUrl: string | null;
  phone: string | null;
  createdAt: Date;
}

const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  avatarUrl: true,
  phone: true,
  dateOfBirth: true,
  address: true,
  createdAt: true,
} as const;

export class UserService {
  static async findById(id: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) return null;

    const profile = await this.getProfileWithDetails(id);
    return { ...(user as SafeUser), profile } as SafeUser;
  }

  private static toSafeUser(user: Record<string, unknown>): SafeUser {
    return user as unknown as SafeUser;
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  static async findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
  }

  static async listUsers(query: {
    page: number;
    limit: number;
    role?: UserRole;
    search?: string;
    status?: string;
  }) {
    const { page, limit, role, search, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(role ? { role } : {}),
      ...(status ? { status: status as never } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    } as never;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: safeUserSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { users: users as SafeUser[], total };
  }

  static async createUser(input: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
    dateOfBirth?: Date;
    address?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw AppError.conflict('A user with this email already exists');
    }

    const hashedPassword = input.password
      ? await authService.hashPassword(input.password)
      : null;

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
        address: input.address,
      },
      select: safeUserSelect,
    });

    await this.createProfile(user, input);
    return user as unknown as SafeUser;
  }

  static async createProfile(
    user: SafeUser | Record<string, unknown>,
    input: { role: UserRole; phone?: string }
  ): Promise<void> {
    const { id, role } = user as SafeUser;

    if (role === UserRole.TEACHER) {
      const employeeId = `TCH-${Date.now().toString(36).toUpperCase()}`;
      await prisma.teacherProfile.create({
        data: { userId: id, employeeId },
      });
    } else if (role === UserRole.STUDENT) {
      const studentId = `STD-${Date.now().toString(36).toUpperCase()}`;
      const enrollmentNumber = `ENR-${Date.now().toString(36).toUpperCase()}`;
      await prisma.studentProfile.create({
        data: { userId: id, studentId, enrollmentNumber },
      });
    } else if (role === UserRole.PARENT) {
      await prisma.parentProfile.create({
        data: { userId: id },
      });
    }
  }

  static async updateUser(
    id: string,
    input: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      dateOfBirth?: Date;
      address?: string;
      bio?: string;
      avatarUrl?: string;
      status?: string;
    }
  ) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.firstName ? { firstName: input.firstName } : {}),
        ...(input.lastName ? { lastName: input.lastName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.dateOfBirth ? { dateOfBirth: input.dateOfBirth } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.status ? { status: input.status as never } : {}),
      },
      select: safeUserSelect,
    });

    await cache.del(`user:profile:${id}`);
    return user as SafeUser;
  }

  static async deleteUser(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await cache.del(`user:profile:${id}`);
  }

  static async getProfileWithDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacherProfile: { include: { classes: true, teachingSubjects: true } },
        studentProfile: { include: { class: true, enrollments: true } },
        parentProfile: { include: { children: { include: { student: { include: { user: true } } } } } },
      },
    });
    return user;
  }

  static async getPermissions(userId: string): Promise<string[]> {
    const cacheKey = `user:permissions:${userId}`;
    const cached = await cache.get<string[]>(cacheKey);
    if (cached) return cached;

    const permissions = await getUserPermissions(userId);
    await cache.set(cacheKey, permissions, 1800);
    return permissions;
  }
}