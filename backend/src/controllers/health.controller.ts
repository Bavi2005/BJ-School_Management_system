import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const createHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const {
    studentId,
    type,
    title,
    description,
    date,
    severity,
    isConfidential,
    attachments,
    followUpDate,
    followUpNotes,
  } = req.body;

  const record = await prisma.healthRecord.create({
    data: {
      studentId,
      type,
      title,
      description,
      date: new Date(date),
      severity: severity ?? 'LOW',
      isConfidential: isConfidential ?? false,
      attachments: attachments ? JSON.stringify(attachments) : undefined,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      followUpNotes,
      recordedBy: req.userId,
    },
  });

  sendCreated(res, record);
});

export const listHealthRecords = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { studentId, type, severity } = req.query;

  const where: Record<string, unknown> = {};
  if (studentId) where.studentId = String(studentId);
  if (type) where.type = String(type);
  if (severity) where.severity = String(severity);

  if (req.userRole === 'STUDENT' && req.userId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.userId },
      select: { id: true },
    });
    if (profile) {
      where.studentId = profile.id;
      where.isConfidential = false;
    }
  }

  const [records, total] = await Promise.all([
    prisma.healthRecord.findMany({
      where,
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.healthRecord.count({ where }),
  ]);

  sendPaginated(res, records, total, page, limit);
});

export const getHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const record = await prisma.healthRecord.findUnique({
    where: { id },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
    },
  });
  if (!record) throw AppError.notFound('Health record not found');

  if (record.isConfidential && req.userRole === 'STUDENT') {
    throw AppError.forbidden('This health record is confidential');
  }

  sendSuccess(res, record);
});

export const updateHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    type,
    title,
    description,
    date,
    severity,
    isConfidential,
    followUpDate,
    followUpNotes,
    followUpDone,
  } = req.body;

  const existing = await prisma.healthRecord.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Health record not found');

  const record = await prisma.healthRecord.update({
    where: { id },
    data: {
      ...(type ? { type } : {}),
      ...(title ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(date ? { date: new Date(date) } : {}),
      ...(severity ? { severity } : {}),
      ...(isConfidential !== undefined ? { isConfidential } : {}),
      ...(followUpDate !== undefined ? { followUpDate: followUpDate ? new Date(followUpDate) : null } : {}),
      ...(followUpNotes !== undefined ? { followUpNotes } : {}),
      ...(followUpDone !== undefined ? { followUpDone } : {}),
    },
  });

  sendSuccess(res, record);
});

export const deleteHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.healthRecord.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Health record not found');

  await prisma.healthRecord.delete({ where: { id } });
  sendNoContent(res);
});

export const getStudentHealthSummary = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!student) throw AppError.notFound('Student not found');

  const records = await prisma.healthRecord.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
  });

  const summary = {
    totalRecords: records.length,
    allergies: records.filter((r) => r.type === 'ALLERGY'),
    vaccinations: records.filter((r) => r.type === 'VACCINATION'),
    recentIllnesses: records.filter((r) => r.type === 'ILLNESS').slice(0, 5),
    medications: records.filter((r) => r.type === 'MEDICATION'),
    pendingFollowUps: records.filter((r) => r.followUpDate && !r.followUpDone),
    severityDistribution: records.reduce(
      (acc, r) => {
        acc[r.severity] = (acc[r.severity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  sendSuccess(res, { student, summary });
});