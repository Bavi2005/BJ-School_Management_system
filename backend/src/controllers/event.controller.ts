import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { googleCalendarService } from '../services/googleCalendar.service';
import { UserRole, NotificationType } from '@school-mgmt/shared';

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const {
    title,
    description,
    type,
    startDate,
    endDate,
    location,
    isAllDay,
    targetAudience,
    classIds,
    requiresRegistration,
    maxParticipants,
    googleCalendarSync,
  } = req.body;

  const event = await prisma.schoolEvent.create({
    data: {
      title,
      description,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay: isAllDay ?? false,
      location,
      targetAudience: targetAudience ? JSON.stringify(targetAudience) : undefined,
      maxParticipants,
      createdBy: req.userId,
      ...(classIds?.length
        ? {
            classes: {
              connect: classIds.map((id: string) => ({ id })),
            },
          }
        : {}),
    },
  });

  if (googleCalendarSync) {
    try {
      await googleCalendarService.syncSchoolEventToGoogle(req.userId, {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        allDay: event.allDay,
      });
    } catch (err) {
      await prisma.calendarEvent.updateMany({
        where: { schoolEventId: event.id },
        data: { syncStatus: 'SYNC_FAILED', syncError: (err as Error).message },
      });
    }
  }

  sendCreated(res, event);
});

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { type, startDate, endDate, isPublic } = req.query;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (isPublic !== undefined) where.isPublic = isPublic === 'true';
  if (startDate || endDate) {
    where.startDate = {
      ...(startDate ? { gte: new Date(String(startDate)) } : {}),
      ...(endDate ? { lte: new Date(String(endDate)) } : {}),
    };
  }

  const [events, total] = await Promise.all([
    prisma.schoolEvent.findMany({
      where,
      include: {
        classes: true,
        eventRegistrations: { select: { id: true, userId: true, status: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: 'desc' },
    }),
    prisma.schoolEvent.count({ where }),
  ]);

  sendPaginated(res, events, total, page, limit);
});

export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const event = await prisma.schoolEvent.findUnique({
    where: { id },
    include: {
      classes: true,
      eventRegistrations: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      creator: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!event) throw AppError.notFound('Event not found');
  sendSuccess(res, event);
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.schoolEvent.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Event not found');

  const {
    title,
    description,
    type,
    startDate,
    endDate,
    location,
    isAllDay,
    maxParticipants,
    requiresRegistration,
  } = req.body;

  const event = await prisma.schoolEvent.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(type ? { type } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(isAllDay !== undefined ? { allDay: isAllDay } : {}),
      ...(maxParticipants !== undefined ? { maxParticipants } : {}),
      ...(requiresRegistration !== undefined ? { requiresRegistration } : {}),
    },
  });

  if (req.userId) {
    try {
      await googleCalendarService.syncSchoolEventToGoogle(req.userId, {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        allDay: event.allDay,
      });
    } catch (err) {
      await prisma.calendarEvent.updateMany({
        where: { schoolEventId: event.id },
        data: { syncStatus: 'SYNC_FAILED', syncError: (err as Error).message },
      });
    }
  }

  sendSuccess(res, event);
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.schoolEvent.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Event not found');

  await prisma.schoolEvent.delete({ where: { id } });
  sendNoContent(res);
});

export const registerForEvent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { id } = req.params;

  const event = await prisma.schoolEvent.findUnique({
    where: { id },
    include: { eventRegistrations: true },
  });

  if (!event) throw AppError.notFound('Event not found');

  if (event.requiresRegistration && event.maxParticipants) {
    if (event.eventRegistrations.length >= event.maxParticipants) {
      throw AppError.conflict('Event is at full capacity');
    }
  }

  const existingRegistration = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: id, userId: req.userId } },
  });

  if (existingRegistration) {
    throw AppError.conflict('Already registered for this event');
  }

  const registration = await prisma.eventRegistration.create({
    data: {
      eventId: id,
      userId: req.userId,
      status: 'REGISTERED',
    },
  });

  sendCreated(res, registration);
});

export const unregisterFromEvent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { id } = req.params;

  await prisma.eventRegistration.delete({
    where: { eventId_userId: { eventId: id, userId: req.userId } },
  });

  sendNoContent(res);
});

export const listUpcomingEvents = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const now = new Date();

  if (req.userRole === UserRole.STUDENT) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.userId },
      select: { classId: true },
    });

    if (!profile?.classId) {
      sendSuccess(res, []);
      return;
    }

    const events = await prisma.schoolEvent.findMany({
      where: {
        startDate: { gte: now },
        OR: [
          { isPublic: true },
          { classes: { some: { id: profile.classId } } },
        ],
      },
      include: {
        classes: true,
        eventRegistrations: {
          where: { userId: req.userId },
          select: { id: true, status: true },
        },
      },
      orderBy: { startDate: 'asc' },
      take: 20,
    });

    sendSuccess(res, events);
    return;
  }

  const events = await prisma.schoolEvent.findMany({
    where: { startDate: { gte: now } },
    include: { classes: true },
    orderBy: { startDate: 'asc' },
    take: 20,
  });

  sendSuccess(res, events);
});