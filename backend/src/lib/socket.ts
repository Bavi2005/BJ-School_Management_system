import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { config } from '../config/env';
import { authService } from '../services/auth.service';
import { prisma } from '../lib/prisma';
import { notificationService } from '../services/notification.service';
import { createLogger } from '../lib/logger';
import { WEBSOCKET_EVENTS } from '@school-mgmt/shared';

const log = createLogger('socket');

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function initializeSocket(server: HTTPServer): SocketServer {
  const io = new SocketServer(server, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
      if (!token) {
        next(new Error('Authentication required'));
        return;
      }

      const payload = authService.verifyAccessToken(String(token));
      socket.userId = payload.sub;
      socket.userRole = payload.role;

      await socket.join(`user:${payload.sub}`);
      await socket.join(`role:${payload.role}`);

      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on(WEBSOCKET_EVENTS.CONNECTION, (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    log.info(`Socket connected: ${socket.id} for user ${userId}`);

    socket.on(WEBSOCKET_EVENTS.JOIN_ROOM, (room: string) => {
      // Security: users may only join their own user room or their own role
      // room. Joining arbitrary rooms (e.g. user:<victim>) would allow
      // intercepting another user's notifications.
      const allowed =
        room === `user:${userId}` || (socket.userRole != null && room === `role:${socket.userRole}`);
      if (!allowed) {
        socket.emit('error', { message: 'Not authorized to join this room' });
        return;
      }
      socket.join(room);
      io.to(room).emit(WEBSOCKET_EVENTS.PRESENCE, {
        userId,
        room,
        action: 'joined',
      });
    });

    socket.on(WEBSOCKET_EVENTS.LEAVE_ROOM, (room: string) => {
      socket.leave(room);
      io.to(room).emit(WEBSOCKET_EVENTS.PRESENCE, {
        userId,
        room,
        action: 'left',
      });
    });

    socket.on(WEBSOCKET_EVENTS.TYPING, (data: { room: string; isTyping: boolean }) => {
      socket.to(data.room).emit(WEBSOCKET_EVENTS.TYPING, {
        userId,
        room: data.room,
        isTyping: data.isTyping,
      });
    });

    socket.on(WEBSOCKET_EVENTS.DISCONNECT, () => {
      log.info(`Socket disconnected: ${socket.id}`);
    });
  });

  notificationService.setSocketServer(io);

  return io;
}