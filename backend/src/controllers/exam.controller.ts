import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const listExams = asyncHandler(async (req: Request, res: Response) => {
  const { classId, termId, type } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const where: any = {};
  if (classId) where.classId = String(classId);
  if (termId) where.termId = String(termId);
  if (type) where.type = String(type);
  const [items, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      include: { class: true, subject: true, term: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    prisma.exam.count({ where }),
  ]);
  sendPaginated(res, items, total, page, limit);
});

export const getExam = asyncHandler(async (req: Request, res: Response) => {
  const exam = await prisma.exam.findUnique({
    where: { id: req.params.id },
    include: {
      class: true,
      subject: true,
      term: true,
      results: { include: { student: { include: { user: true } } }, orderBy: { marksObtained: 'desc' } },
    },
  });
  if (!exam) throw new AppError('Exam not found', { statusCode: 400 });
  sendSuccess(res, exam);
});

export const createExam = asyncHandler(async (req: Request, res: Response) => {
  const exam = await prisma.exam.create({
    data: { ...req.body, date: new Date(req.body.date) },
  });
  sendCreated(res, exam);
});

export const updateExam = asyncHandler(async (req: Request, res: Response) => {
  const exam = await prisma.exam.update({
    where: { id: req.params.id },
    data: { ...req.body, date: req.body.date ? new Date(req.body.date) : undefined },
  });
  sendSuccess(res, exam);
});

export const deleteExam = asyncHandler(async (req: Request, res: Response) => {
  await prisma.exam.delete({ where: { id: req.params.id } });
  sendNoContent(res);
});

export const publishResults = asyncHandler(async (req: Request, res: Response) => {
  const exam = await prisma.exam.update({
    where: { id: req.params.id },
    data: { isPublished: req.body.isPublished ?? true },
  });
  sendSuccess(res, exam);
});

export const upsertResult = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, marksObtained, grade, remarks, isAbsent } = req.body;
  const result = await prisma.examResult.upsert({
    where: { examId_studentId: { examId: req.params.examId, studentId } },
    update: { marksObtained, grade, remarks, isAbsent, recordedBy: req.userId },
    create: {
      examId: req.params.examId,
      studentId,
      marksObtained,
      grade,
      remarks,
      isAbsent,
      recordedBy: req.userId,
    },
  });
  sendSuccess(res, result);
});

export const createResult = asyncHandler(async (req: Request, res: Response) => {
  const result = await prisma.examResult.create({
    data: { ...req.body, examId: req.params.examId, recordedBy: req.userId },
  });
  sendCreated(res, result);
});