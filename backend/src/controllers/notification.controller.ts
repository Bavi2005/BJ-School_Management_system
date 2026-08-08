import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { notificationService } from '../services/notification.service';
import { UserRole } from '@school-mgmt/shared';

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { page, limit } = req.pagination;
  const { unreadOnly, type } = req.query;

  const where: Record<string, unknown> = { userId: req.userId };
  if (unreadOnly === 'true') where.isRead = false;
  if (type) where.type = String(type);

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  sendPaginated(res, notifications, total, page, limit);
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const count = await prisma.notification.count({
    where: { userId: req.userId, isRead: false },
  });
  sendSuccess(res, { count });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.userId },
  });
  if (!notification) throw AppError.notFound('Notification not found');

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });

  sendSuccess(res, updated);
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const result = await prisma.notification.updateMany({
    where: { userId: req.userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  sendSuccess(res, { updated: result.count });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.userId },
  });
  if (!notification) throw AppError.notFound('Notification not found');

  await prisma.notification.delete({ where: { id } });
  sendNoContent(res);
});

export const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  if (req.userRole !== UserRole.SUPER_ADMIN && req.userRole !== UserRole.ADMIN && req.userRole !== UserRole.TEACHER) {
    throw AppError.forbidden('Only admins and teachers can create announcements');
  }

  const { title, message, targetRole, classIds, priority } = req.body;

  const targetWhere: Record<string, unknown> = {};
  if (targetRole) targetWhere.role = targetRole;

  const users = await prisma.user.findMany({
    where: targetWhere,
    select: { id: true },
  });

  if (classIds?.length) {
    const students = await prisma.studentProfile.findMany({
      where: { classId: { in: classIds } },
      include: { user: { select: { id: true } } },
    });
    const studentUserIds = students.map((s) => s.user.id);
    const userIds = new Set([...users.map((u) => u.id), ...studentUserIds]);
    await notificationService.createForMany(
      Array.from(userIds),
      {
        type: 'ANNOUNCEMENT',
        title,
        message,
        channels: ['IN_APP', 'EMAIL'],
        priority,
      },
      { createdBy: req.userId, targetRole }
    );
  } else {
    await notificationService.createForMany(
      users.map((u) => u.id),
      {
        type: 'ANNOUNCEMENT',
        title,
        message,
        channels: ['IN_APP', 'EMAIL'],
        priority,
      },
      { createdBy: req.userId, targetRole }
    );
  }

  sendSuccess(res, { message: 'Announcement sent successfully' });
});