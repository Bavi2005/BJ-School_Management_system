import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { timeToMinutes } from '@school-mgmt/shared';

export const getClassTimetable = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const entries = await prisma.timetableEntry.findMany({
    where: { classId },
    include: {
      subject: true,
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  const grouped = entries.reduce(
    (acc, entry) => {
      const day = entry.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(entry);
      return acc;
    },
    {} as Record<number, typeof entries>
  );

  sendSuccess(res, { entries, grouped });
});

export const getTeacherTimetable = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = req.params;
  const entries = await prisma.timetableEntry.findMany({
    where: { teacherId },
    include: {
      subject: true,
      class: true,
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  sendSuccess(res, entries);
});

export const getStudentTimetable = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: req.userId },
    select: { classId: true },
  });

  if (!profile?.classId) {
    sendSuccess(res, []);
    return;
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { classId: profile.classId },
    include: {
      subject: true,
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  sendSuccess(res, entries);
});

export const createTimetableEntry = asyncHandler(async (req: Request, res: Response) => {
  const {
    classId,
    subjectId,
    teacherId,
    academicYearId,
    dayOfWeek,
    startTime,
    endTime,
    roomNumber,
    effectiveFrom,
    effectiveUntil,
  } = req.body;

  const conflicting = await prisma.timetableEntry.findFirst({
    where: {
      classId,
      dayOfWeek,
      OR: [
        { startTime: { lte: startTime }, endTime: { gt: startTime } },
        { startTime: { lt: endTime }, endTime: { gte: endTime } },
      ],
    },
  });

  if (conflicting) {
    throw AppError.conflict('Class already has a lesson scheduled during this time');
  }

  const teacherConflicting = await prisma.timetableEntry.findFirst({
    where: {
      teacherId,
      dayOfWeek,
      OR: [
        { startTime: { lte: startTime }, endTime: { gt: startTime } },
        { startTime: { lt: endTime }, endTime: { gte: endTime } },
      ],
    },
  });

  if (teacherConflicting) {
    throw AppError.conflict('Teacher already has a lesson scheduled during this time');
  }

  const entry = await prisma.timetableEntry.create({
    data: {
      classId,
      subjectId,
      teacherId,
      academicYearId,
      dayOfWeek,
      startTime,
      endTime,
      roomNumber,
      effectiveFrom: new Date(effectiveFrom ?? new Date()),
      effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined,
    },
  });

  sendCreated(res, entry);
});

export const updateTimetableEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dayOfWeek, startTime, endTime, roomNumber, subjectId, teacherId, effectiveFrom, effectiveUntil } = req.body;

  const existing = await prisma.timetableEntry.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Timetable entry not found');

  const entry = await prisma.timetableEntry.update({
    where: { id },
    data: {
      ...(dayOfWeek !== undefined ? { dayOfWeek } : {}),
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
      ...(roomNumber !== undefined ? { roomNumber } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(teacherId ? { teacherId } : {}),
      ...(effectiveFrom ? { effectiveFrom: new Date(effectiveFrom) } : {}),
      ...(effectiveUntil !== undefined ? { effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null } : {}),
    },
  });

  sendSuccess(res, entry);
});

export const deleteTimetableEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.timetableEntry.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Timetable entry not found');

  await prisma.timetableEntry.delete({ where: { id } });
  sendNoContent(res);
});

export const checkConflicts = asyncHandler(async (req: Request, res: Response) => {
  const { classId, teacherId, dayOfWeek, startTime, endTime, excludeEntryId } = req.body;

  const conflicts = await prisma.timetableEntry.findMany({
    where: {
      dayOfWeek,
      NOT: excludeEntryId ? { id: excludeEntryId } : undefined,
      OR: [
        { startTime: { lte: startTime }, endTime: { gt: startTime } },
        { startTime: { lt: endTime }, endTime: { gte: endTime } },
      ],
      AND: [{ OR: [{ classId: classId ?? '__none__' }, { teacherId: teacherId ?? '__none__' }] }],
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  sendSuccess(res, { conflicts, hasConflicts: conflicts.length > 0 });
});