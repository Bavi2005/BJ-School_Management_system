import { Server as SocketServer } from 'socket.io';
import { prisma } from '../lib/prisma';
import { NotificationType } from '@school-mgmt/shared';
import { createLogger } from '../lib/logger';

const log = createLogger('notifications');

type NotificationTypeValue = `${NotificationType}` | NotificationType;

export interface CreateNotificationInput {
  userId: string;
  type: NotificationTypeValue;
  title: string;
  message: string;
  channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'PUSH')[];
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  actionLabel?: string;
  scheduledFor?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private io?: SocketServer;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  setSocketServer(io: SocketServer): void {
    this.io = io;
  }

  async create(input: CreateNotificationInput, metadata?: Record<string, unknown>): Promise<void> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type as NotificationType,
          title: input.title,
          message: input.message,
          channels: input.channels,
          priority: input.priority ?? 'NORMAL',
          actionUrl: input.actionUrl,
          actionLabel: input.actionLabel,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
          scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
        },
      });

      if (!input.scheduledFor) {
        this.emitToUser(input.userId, {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          createdAt: notification.createdAt,
        });
      }
    } catch (err) {
      log.error('Failed to create notification', { error: (err as Error).message });
    }
  }

  async createForMany(
    userIds: string[],
    input: Omit<CreateNotificationInput, 'userId'>,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const now = new Date();
    const data = userIds.map((userId) => ({
      userId,
      type: input.type as NotificationType,
      title: input.title,
      message: input.message,
      channels: input.channels,
      priority: input.priority ?? 'NORMAL',
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      sentAt: now,
    }));

    try {
      await prisma.notification.createMany({ data });

      for (const userId of userIds) {
        this.emitToUser(userId, {
          type: input.type,
          title: input.title,
          message: input.message,
          priority: input.priority ?? 'NORMAL',
          createdAt: now,
        });
      }
    } catch (err) {
      log.error('Failed to create bulk notifications', { error: (err as Error).message });
    }
  }

  emitToUser(userId: string, payload: unknown): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit('notification', payload);
  }

  emitToRole(role: string, payload: unknown): void {
    if (!this.io) return;
    this.io.to(`role:${role}`).emit('notification', payload);
  }

  emitToClass(classId: string, event: string, payload: unknown): void {
    if (!this.io) return;
    this.io.to(`class:${classId}`).emit(event, payload);
  }
}

export const notificationService = NotificationService.getInstance();