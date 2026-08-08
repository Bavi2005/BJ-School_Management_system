import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const { status, gradeApplying } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const where: any = {};
  if (status) where.status = String(status);
  if (gradeApplying) where.gradeApplying = Number(gradeApplying);
  const [items, total] = await Promise.all([
    prisma.admissionApplication.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.admissionApplication.count({ where }),
  ]);
  sendPaginated(res, items, total, page, limit);
});

export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  const app = await prisma.admissionApplication.findUnique({ where: { id: req.params.id } });
  if (!app) throw new AppError('Application not found');
  sendSuccess(res, app);
});

export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  const count = await prisma.admissionApplication.count();
  const app = await prisma.admissionApplication.create({
    data: {
      ...req.body,
      applicationNumber: `APP-2024-${String(count + 1).padStart(4, '0')}`,
      dateOfBirth: new Date(req.body.dateOfBirth),
      interviewDate: req.body.interviewDate ? new Date(req.body.interviewDate) : null,
      createdBy: req.userId,
    },
  });
  sendCreated(res, app);
});

export const updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, remarks, interviewDate, interviewNotes } = req.body;
  const app = await prisma.admissionApplication.update({
    where: { id: req.params.id },
    data: {
      status,
      remarks,
      interviewNotes,
      interviewDate: interviewDate ? new Date(interviewDate) : undefined,
    },
  });
  sendSuccess(res, app);
});

export const acceptApplication = asyncHandler(async (req: Request, res: Response) => {
  const app = await prisma.admissionApplication.findUnique({ where: { id: req.params.id } });
  if (!app) throw new AppError('Application not found');

  const { gradeApplying } = app;
  const section = Math.random() < 0.5 ? 'A' : 'B';
  const classData = await prisma.class.findFirst({
    where: { gradeLevel: gradeApplying, section, academicYear: { status: 'ACTIVE' } },
  });
  if (!classData) throw new AppError('No class available for this grade');

  const hashedEmail = `${app.firstName.toLowerCase()}.${app.lastName.toLowerCase()}@educore.dev`;
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: hashedEmail } });
    let userId = existing?.id;
    if (!existing) {
      const user = await tx.user.create({
        data: {
          email: hashedEmail,
          firstName: app.firstName,
          lastName: app.lastName,
          role: 'STUDENT',
          status: 'ACTIVE',
          phone: app.guardianPhone,
          dateOfBirth: app.dateOfBirth,
          address: app.address,
        },
      });
      userId = user.id;
      const studentCount = await tx.studentProfile.count();
      const profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          studentId: `STD-2024-${String(studentCount + 1).padStart(3, '0')}`,
          enrollmentNumber: `ENR-2024-${String(studentCount + 1).padStart(3, '0')}`,
          admissionDate: new Date(),
          bloodGroup: app.bloodGroup,
          emergencyContact: app.guardianPhone,
          medicalNotes: app.medicalNotes,
          classId: classData.id,
          isVerified: true,
        },
      });
      await tx.enrollment.create({
        data: { studentId: profile.id, classId: classData.id, academicYearId: classData.academicYearId },
      });
    }
    const updated = await tx.admissionApplication.update({
      where: { id: app.id },
      data: { status: 'ACCEPTED', admissionDate: new Date(), admittedStudentId: userId ? undefined : undefined },
    });
    return { updated, email: hashedEmail };
  });

  sendSuccess(res, result);
});

export const deleteApplication = asyncHandler(async (req: Request, res: Response) => {
  await prisma.admissionApplication.delete({ where: { id: req.params.id } });
  sendNoContent(res);
});

export const getAdmissionStats = asyncHandler(async (req: Request, res: Response) => {
  const [total, submitted, underReview, accepted, rejected, waitlisted, interviewed] = await Promise.all([
    prisma.admissionApplication.count(),
    prisma.admissionApplication.count({ where: { status: 'SUBMITTED' } }),
    prisma.admissionApplication.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.admissionApplication.count({ where: { status: 'ACCEPTED' } }),
    prisma.admissionApplication.count({ where: { status: 'REJECTED' } }),
    prisma.admissionApplication.count({ where: { status: 'WAITLISTED' } }),
    prisma.admissionApplication.count({ where: { status: 'INTERVIEW_SCHEDULED' } }),
  ]);
  sendSuccess(res, { total, submitted, underReview, accepted, rejected, waitlisted, interviewed });
});
