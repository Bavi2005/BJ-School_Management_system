import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { aiClient } from '../services/aiClient.service';
import { notificationService } from '../services/notification.service';

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { classId, subjectId, title, description, dueDate, maxScore, attachments } = req.body;

  const assignment = await prisma.assignment.create({
    data: {
      classId,
      subjectId,
      title,
      description,
      dueDate: new Date(dueDate),
      maxScore,
      attachments: attachments ? JSON.stringify(attachments) : undefined,
      status: 'PUBLISHED',
    },
  });

  const students = await prisma.studentProfile.findMany({
    where: { classId },
    include: { user: { select: { id: true } } },
  });

  await notificationService.createForMany(
    students.map((s) => s.user.id),
    {
      type: 'INFO',
      title: `New assignment: ${title}`,
      message: `A new assignment has been published for your class. Due: ${new Date(dueDate).toLocaleDateString()}`,
      channels: ['IN_APP', 'EMAIL'],
    },
    { assignmentId: assignment.id }
  );

  sendCreated(res, assignment);
});

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { classId, subjectId, status } = req.query;

  const where: Record<string, unknown> = {};
  if (classId) where.classId = String(classId);
  if (subjectId) where.subjectId = String(subjectId);
  if (status) where.status = String(status);

  if (req.userRole === 'STUDENT' && req.userId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.userId },
      select: { classId: true },
    });
    if (profile?.classId) where.classId = profile.classId;
  }

  if (req.userRole === 'TEACHER' && req.userId) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: req.userId },
      select: { id: true },
    });
    if (profile) {
      const classIds = await prisma.class.findMany({
        where: { teacherId: profile.id },
        select: { id: true },
      });
      where.classId = { in: classIds.map((c) => c.id) };
    }
  }

  const [assignments, total] = await Promise.all([
    prisma.assignment.findMany({
      where,
      include: {
        class: { select: { name: true, gradeLevel: true, section: true } },
        subject: { select: { name: true, code: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.assignment.count({ where }),
  ]);

  sendPaginated(res, assignments, total, page, limit);
});

export const getAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      submissions: {
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });
  if (!assignment) throw AppError.notFound('Assignment not found');
  sendSuccess(res, assignment);
});

export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, dueDate, maxScore, status, attachments } = req.body;

  const existing = await prisma.assignment.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Assignment not found');

  const assignment = await prisma.assignment.update({
    where: { id },
    data: {
      ...(title ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      ...(maxScore ? { maxScore } : {}),
      ...(status ? { status } : {}),
      ...(attachments ? { attachments: JSON.stringify(attachments) } : {}),
    },
  });

  sendSuccess(res, assignment);
});

export const deleteAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.assignment.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Assignment not found');

  await prisma.assignment.delete({ where: { id } });
  sendNoContent(res);
});

export const submitAssignment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const { id } = req.params;
  const { content, attachments } = req.body;

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) throw AppError.notFound('Assignment not found');

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: req.userId },
  });
  if (!studentProfile) throw AppError.forbidden('Only students can submit assignments');

  const existingSubmission = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId: id, studentId: studentProfile.id } },
  });

  if (existingSubmission) {
    const isLate = new Date() > assignment.dueDate;
    const updated = await prisma.submission.update({
      where: { id: existingSubmission.id },
      data: {
        content,
        attachments: attachments ? JSON.stringify(attachments) : (existingSubmission.attachments as unknown as string | undefined),
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    sendSuccess(res, updated);
    return;
  }

  const isLate = new Date() > assignment.dueDate;
  const submission = await prisma.submission.create({
    data: {
      assignmentId: id,
      studentId: studentProfile.id,
      content,
      attachments: attachments ? JSON.stringify(attachments) : undefined,
      status: isLate ? 'LATE' : 'SUBMITTED',
    },
  });

  sendCreated(res, submission);
});

export const listSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.query;

const submissions = await prisma.submission.findMany({
    where: {
      assignmentId: id,
      ...(status ? { status: String(status) as never } : {}),
    },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  });

  sendSuccess(res, submissions);
});

export const gradeSubmission = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const { submissionId } = req.params;
  const { grade, feedback, useAI } = req.body;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });
  if (!submission) throw AppError.notFound('Submission not found');

  let aiGrade;
  let aiFeedback;
  let aiConfidence;

  if (useAI) {
    try {
      const aiResult = await aiClient.autoGrade({
        content: submission.content,
        maxScore: submission.assignment.maxScore,
        rubric: submission.assignment.aiRubric,
      });
      const aiData = aiResult.data;
      aiGrade = typeof aiData.prediction === 'object' && aiData.prediction !== null
        ? (aiData.prediction as { score?: number }).score
        : undefined;
      aiFeedback = aiData.explanation;
      aiConfidence = aiData.confidence;
    } catch {
      // AI is optional
    }
  }

const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      grade: aiGrade ?? grade ?? undefined,
      maxScore: submission.assignment.maxScore,
      feedback,
      aiGrade: aiGrade,
      aiFeedback: aiFeedback,
      aiConfidence: aiConfidence,
      gradedAt: new Date(),
      gradedBy: req.userId,
      status: 'GRADED',
    },
  });

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { id: submission.studentId },
    include: { user: { select: { id: true } } },
  });

  if (studentProfile) {
    await notificationService.create({
      userId: studentProfile.userId,
      type: 'GRADE_POSTED',
      title: `Your assignment has been graded`,
      message: `Your submission for "${submission.assignment.title}" has been graded.`,
      channels: ['IN_APP'],
      actionUrl: `/assignments/${submission.assignmentId}`,
    });
  }

  sendSuccess(res, updated);
});

export const getMySubmissions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: req.userId },
  });
  if (!studentProfile) throw AppError.forbidden('Only students can view submissions');

  const submissions = await prisma.submission.findMany({
    where: { studentId: studentProfile.id },
    include: {
      assignment: {
        include: {
          subject: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  sendSuccess(res, submissions);
});