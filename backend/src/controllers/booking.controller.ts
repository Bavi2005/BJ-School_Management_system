import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { UserRole } from '@school-mgmt/shared';

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { type, status, search } = req.query;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { location: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where,
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'APPROVED'] } },
          select: { id: true, startTime: true, endTime: true, title: true },
          orderBy: { startTime: 'asc' },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.room.count({ where }),
  ]);

  sendPaginated(res, rooms, total, page, limit);
});

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      bookings: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { startTime: 'asc' },
      },
    },
  });
  if (!room) throw AppError.notFound('Room not found');
  sendSuccess(res, room);
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const { name, type, capacity, location, description, equipment, status } = req.body;

  const existing = await prisma.room.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (existing) throw AppError.conflict('A room with this name already exists');

  const room = await prisma.room.create({
    data: {
      name,
      type,
      capacity: capacity ?? 30,
      location,
      description,
      equipment,
      status,
    },
  });
  sendCreated(res, room);
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, type, capacity, location, description, equipment, status } = req.body;

  const room = await prisma.room.update({
    where: { id },
    data: { name, type, capacity, location, description, equipment, status },
  });
  sendSuccess(res, room);
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.room.delete({ where: { id } });
  sendNoContent(res);
});

export const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { status, roomId, upcoming } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (roomId) where.roomId = roomId;
  if (upcoming === 'true') where.startTime = { gte: new Date() };

  const isAdmin = req.userRole === UserRole.SUPER_ADMIN || req.userRole === UserRole.ADMIN;
  if (!isAdmin) where.userId = req.userId;

  const [bookings, total] = await Promise.all([
    prisma.roomBooking.findMany({
      where,
      include: {
        room: { select: { id: true, name: true, type: true, location: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startTime: 'desc' },
    }),
    prisma.roomBooking.count({ where }),
  ]);

  sendPaginated(res, bookings, total, page, limit);
});

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const { roomId, title, purpose, startTime, endTime, attendees, notes } = req.body;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw AppError.notFound('Room not found');

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (end <= start) throw AppError.badRequest('End time must be after start time');

  if (room.status === 'MAINTENANCE' || room.status === 'CLOSED') {
    throw AppError.conflict(`Room is currently ${room.status.toLowerCase()}`);
  }

  const conflict = await prisma.roomBooking.findFirst({
    where: {
      roomId,
      status: { in: ['PENDING', 'APPROVED'] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });
  if (conflict) {
    throw AppError.conflict('This room is already booked during the requested time');
  }

  const booking = await prisma.roomBooking.create({
    data: {
      roomId,
      userId: req.userId,
      title,
      purpose,
      startTime: start,
      endTime: end,
      attendees,
      notes,
    },
  });

  await prisma.room.update({
    where: { id: roomId },
    data: { status: 'IN_USE' },
  });

  sendCreated(res, booking);
});

export const updateBooking = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, purpose, startTime, endTime, attendees, notes, status } = req.body;

  const booking = await prisma.roomBooking.findUnique({ where: { id } });
  if (!booking) throw AppError.notFound('Booking not found');

  const isAdmin = req.userRole === UserRole.SUPER_ADMIN || req.userRole === UserRole.ADMIN;
  if (!isAdmin && booking.userId !== req.userId) {
    throw AppError.forbidden('You can only manage your own bookings');
  }

  const data: Record<string, unknown> = { title, purpose, attendees, notes };
  if (startTime) data.startTime = new Date(startTime);
  if (endTime) data.endTime = new Date(endTime);
  if (status) data.status = status;

  if ((startTime || endTime) && (data.startTime || data.endTime)) {
    const start = (data.startTime as Date) ?? booking.startTime;
    const end = (data.endTime as Date) ?? booking.endTime;
    if (end <= start) throw AppError.badRequest('End time must be after start time');

    const conflict = await prisma.roomBooking.findFirst({
      where: {
        id: { not: id },
        roomId: booking.roomId,
        status: { in: ['PENDING', 'APPROVED'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    if (conflict) {
      throw AppError.conflict('This room is already booked during the requested time');
    }
  }

  const updated = await prisma.roomBooking.update({ where: { id }, data });
  sendSuccess(res, updated);
});

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const booking = await prisma.roomBooking.findUnique({ where: { id } });
  if (!booking) throw AppError.notFound('Booking not found');

  const isAdmin = req.userRole === UserRole.SUPER_ADMIN || req.userRole === UserRole.ADMIN;
  if (!isAdmin && booking.userId !== req.userId) {
    throw AppError.forbidden('You can only cancel your own bookings');
  }

  const updated = await prisma.roomBooking.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  const activeCount = await prisma.roomBooking.count({
    where: { roomId: booking.roomId, status: { in: ['PENDING', 'APPROVED'] } },
  });
  if (activeCount === 0) {
    await prisma.room.update({ where: { id: booking.roomId }, data: { status: 'AVAILABLE' } });
  }

  sendSuccess(res, updated);
});

export const getBookingStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalRooms, availableRooms, totalBookings, pendingBookings, approvedBookings, todayBookings] =
    await Promise.all([
      prisma.room.count(),
      prisma.room.count({ where: { status: 'AVAILABLE' } }),
      prisma.roomBooking.count(),
      prisma.roomBooking.count({ where: { status: 'PENDING' } }),
      prisma.roomBooking.count({ where: { status: 'APPROVED' } }),
      prisma.roomBooking.count({
        where: {
          startTime: { lte: new Date() },
          endTime: { gte: new Date() },
          status: 'APPROVED',
        },
      }),
    ]);

  sendSuccess(res, {
    totalRooms,
    availableRooms,
    inUseRooms: totalRooms - availableRooms,
    totalBookings,
    pendingBookings,
    approvedBookings,
    todayBookings,
  });
});
