import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { notificationService } from '../services/notification.service';
import { aiClient } from '../services/aiClient.service';

export const createGrade = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const {
    studentId,
    subjectId,
    termId,
    type,
    title,
    maxScore,
    score,
    weight,
    date,
    feedback,
    useAI,
  } = req.body;

  let aiAssisted = false;
  let aiConfidence: number | undefined;
  let aiFeedback: string | undefined;

  if (useAI) {
    try {
      const aiResult = await aiClient.autoGrade({
        studentId,
        subjectId,
        termId,
        title,
        maxScore,
        score,
        feedback,
      });
      aiAssisted = true;
      const aiData = aiResult.data;
      aiConfidence = aiData.confidence;
      aiFeedback = aiData.explanation;
    } catch {
      // AI is optional - grade still gets saved
    }
  }

  const grade = await prisma.grade.create({
    data: {
      studentId,
      subjectId,
      termId,
      type,
      title,
      maxScore,
      score,
      weight: weight ?? 1,
      date: new Date(date),
      feedback,
      gradedBy: req.userId,
      aiAssisted,
      aiConfidence,
      aiFeedback,
    },
  });

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { studentId },
    include: { user: { select: { id: true } } },
  });

  if (studentProfile) {
    await notificationService.create({
      userId: studentProfile.userId,
      type: 'GRADE_POSTED',
      title: `New grade: ${title}`,
      message: `Your grade for ${title} has been posted (${score}/${maxScore})`,
      channels: ['IN_APP'],
      actionUrl: '/grades',
    });
  }

  sendCreated(res, grade);
});

export const bulkCreateGrades = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const { grades } = req.body;
  if (!Array.isArray(grades) || grades.length === 0) {
    throw AppError.badRequest('Grades array is required');
  }

  const results = await prisma.$transaction(
    grades.map((g) =>
      prisma.grade.create({
        data: {
          studentId: g.studentId,
          subjectId: g.subjectId,
          termId: g.termId,
          type: g.type,
          title: g.title,
          maxScore: g.maxScore,
          score: g.score,
          weight: g.weight ?? 1,
          date: new Date(g.date),
          feedback: g.feedback,
          gradedBy: req.userId!,
        },
      })
    )
  );

  sendCreated(res, { count: results.length, grades: results });
});

export const listGrades = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { studentId, subjectId, termId, classId } = req.query;

  const where: Record<string, unknown> = {};
  if (studentId) where.studentId = String(studentId);
  if (subjectId) where.subjectId = String(subjectId);
  if (termId) where.termId = String(termId);

  if (classId) {
    const students = await prisma.studentProfile.findMany({
      where: { classId: String(classId) },
      select: { id: true },
    });
    where.studentId = { in: students.map((s) => s.id) };
  }

  if (req.userRole === 'STUDENT') {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.userId },
      select: { id: true },
    });
    if (profile) where.studentId = profile.id;
  }

  const [grades, total] = await Promise.all([
    prisma.grade.findMany({
      where,
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: true,
        term: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    prisma.grade.count({ where }),
  ]);

  sendPaginated(res, grades, total, page, limit);
});

export const getGrade = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const grade = await prisma.grade.findUnique({
    where: { id },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true } } } },
      subject: true,
      term: { include: { academicYear: true } },
    },
  });
  if (!grade) throw AppError.notFound('Grade not found');
  sendSuccess(res, grade);
});

export const updateGrade = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { score, maxScore, feedback, type, title, date, weight } = req.body;

  const existing = await prisma.grade.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Grade not found');

  const grade = await prisma.grade.update({
    where: { id },
    data: {
      ...(score !== undefined ? { score } : {}),
      ...(maxScore !== undefined ? { maxScore } : {}),
      ...(feedback !== undefined ? { feedback } : {}),
      ...(type ? { type } : {}),
      ...(title ? { title } : {}),
      ...(date ? { date: new Date(date) } : {}),
      ...(weight !== undefined ? { weight } : {}),
    },
  });

  sendSuccess(res, grade);
});

export const deleteGrade = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.grade.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Grade not found');

  await prisma.grade.delete({ where: { id } });
  sendNoContent(res);
});

export const getStudentGrades = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const { termId } = req.query;

  const where: Record<string, unknown> = { studentId };
  if (termId) where.termId = String(termId);

  const grades = await prisma.grade.findMany({
    where,
    include: {
      subject: true,
      term: true,
    },
    orderBy: { date: 'desc' },
  });

  sendSuccess(res, grades);
});

export const getStudentTranscript = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;

  const grades = await prisma.grade.findMany({
    where: { studentId },
    include: {
      subject: true,
      term: { include: { academicYear: true } },
    },
    orderBy: [{ term: { startDate: 'asc' } }, { subject: { name: 'asc' } }],
  });

  const byTerm = grades.reduce(
    (acc, g) => {
      const key = g.term.id;
      if (!acc[key]) {
        acc[key] = {
          term: { id: g.term.id, name: g.term.name, academicYear: g.term.academicYear.name },
          subjects: {},
        };
      }
      acc[key].subjects[g.subject.name] = {
        type: g.type,
        score: g.score,
        maxScore: g.maxScore,
        percentage: Math.round((g.score / g.maxScore) * 10000) / 100,
      };
      return acc;
    },
    {} as Record<string, { term: unknown; subjects: Record<string, unknown> }>
  );

  const allPercentages = grades.map((g) => (g.score / g.maxScore) * 100);
  const average = allPercentages.length
    ? Math.round((allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length) * 100) / 100
    : 0;

  const gradePoints: number[] = grades.map((g) => {
    const pct = (g.score / g.maxScore) * 100;
    if (pct >= 90) return 4.0;
    if (pct >= 80) return 3.0;
    if (pct >= 70) return 2.0;
    if (pct >= 60) return 1.0;
    return 0.0;
  });

  const gpa = gradePoints.length
    ? Math.round((gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length) * 100) / 100
    : 0;

  sendSuccess(res, {
    studentId,
    average: `${average}%`,
    gpa,
    byTerm: Object.values(byTerm),
    totalGrades: grades.length,
  });
});