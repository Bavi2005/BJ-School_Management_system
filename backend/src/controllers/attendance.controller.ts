import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { notificationService } from '../services/notification.service';
import { AttendanceStatus } from '@school-mgmt/shared';

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const { studentId, classId, subjectId, date, status, remarks } = req.body;

  const attendance = await prisma.attendanceRecord.upsert({
    where: {
      studentId_classId_subjectId_date: {
        studentId,
        classId,
        subjectId: subjectId ?? '',
        date: new Date(date),
      },
    },
    update: {
      status,
      remarks,
      recordedBy: req.userId,
    },
    create: {
      studentId,
      classId,
      subjectId: subjectId ?? undefined,
      date: new Date(date),
      status,
      remarks,
      recordedBy: req.userId,
    },
  });

  if (status === AttendanceStatus.ABSENT) {
    await notificationService.create({
      userId: req.userId,
      type: 'ATTENDANCE_ALERT',
      title: 'Attendance Marked Absent',
      message: `Student marked absent for ${date}`,
      channels: ['IN_APP'],
    });
  }

  sendCreated(res, attendance);
});

export const bulkMarkAttendance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const { classId, subjectId, date, records } = req.body;
  const dateObj = new Date(date);

  const studentsInClass = await prisma.enrollment.findMany({
    where: { classId, status: 'ACTIVE' },
    select: { studentId: true },
  });

  const validStudentIds = new Set(studentsInClass.map((s) => s.studentId));

  const validRecords = records.filter((r: { studentId: string }) =>
    validStudentIds.has(r.studentId)
  );

  const results = await Promise.all(
    validRecords.map((record: { studentId: string; status: AttendanceStatus; remarks?: string }) =>
      prisma.attendanceRecord.upsert({
        where: {
          studentId_classId_subjectId_date: {
            studentId: record.studentId,
            classId,
            subjectId: subjectId ?? '',
            date: dateObj,
          },
        },
        update: {
          status: record.status,
          remarks: record.remarks,
          recordedBy: req.userId!,
        },
        create: {
          studentId: record.studentId,
          classId,
          subjectId: subjectId ?? undefined,
          date: dateObj,
          status: record.status,
          remarks: record.remarks,
          recordedBy: req.userId!,
        },
      })
    )
  );

  sendCreated(res, {
    total: validRecords.length,
    recorded: results.length,
    records: results,
  });
});

export const getClassAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const { date } = req.query;

  const where = {
    classId,
    ...(date ? { date: new Date(String(date)) } : {}),
  };

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      student: {
        include: {
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  sendSuccess(res, records);
});

export const getStudentAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const pageNum = parseInt(String(req.query.page ?? '1'), 10);
  const limitNum = parseInt(String(req.query.limit ?? '30'), 10);

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId },
      include: {
        subject: { select: { name: true, code: true } },
        class: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.attendanceRecord.count({ where: { studentId } }),
  ]);

  const statusCounts = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const rate = total > 0
    ? ((statusCounts.PRESENT ?? 0) / total) * 100
    : 0;

  sendSuccess(res, { records, total, statusCounts, attendanceRate: Math.round(rate * 100) / 100 });
});

export const getTodayAttendance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const records = await prisma.attendanceRecord.findMany({
    where: { date: { gte: startOfDay, lte: endOfDay } },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      class: { select: { name: true } },
    },
  });

  sendSuccess(res, records);
});

export const updateAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  const existing = await prisma.attendanceRecord.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Attendance record not found');

  const updated = await prisma.attendanceRecord.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(remarks !== undefined ? { remarks } : {}),
    },
  });

  sendSuccess(res, updated);
});

export const getAttendanceStats = asyncHandler(async (req: Request, res: Response) => {
  const { classId, subjectId, startDate, endDate } = req.query;

  const where: Record<string, unknown> = {
    ...(classId ? { classId: String(classId) } : {}),
    ...(subjectId ? { subjectId: String(subjectId) } : {}),
    ...(startDate && endDate
      ? { date: { gte: new Date(String(startDate)), lte: new Date(String(endDate)) } }
      : {}),
  };

  const records = await prisma.attendanceRecord.findMany({ where });

  const stats = records.reduce(
    (acc, r) => {
      acc.total++;
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { total: 0, PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, HALF_DAY: 0 } as Record<string, number>
  );

  stats.attendanceRate = stats.total > 0
    ? Math.round(((stats.PRESENT + stats.LATE) / stats.total) * 10000) / 100
    : 0;

  sendSuccess(res, stats);
});