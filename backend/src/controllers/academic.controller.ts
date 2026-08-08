import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

// ----- Academic Year -----

export const createAcademicYear = asyncHandler(async (req: Request, res: Response) => {
  const { name, startDate, endDate, description } = req.body;

  const existing = await prisma.academicYear.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) throw AppError.conflict('Academic year with this name already exists');

  const academicYear = await prisma.academicYear.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description,
    },
  });

  sendCreated(res, academicYear);
});

export const listAcademicYears = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { status } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where.status = String(status);

  const [academicYears, total] = await Promise.all([
    prisma.academicYear.findMany({
      where,
      include: { _count: { select: { classes: true, terms: true, enrollments: true } } },
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.academicYear.count({ where }),
  ]);

  sendPaginated(res, academicYears, total, page, limit);
});

export const getAcademicYear = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const academicYear = await prisma.academicYear.findUnique({
    where: { id },
    include: {
      terms: true,
      classes: { include: { _count: { select: { students: true } } } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!academicYear) throw AppError.notFound('Academic year not found');
  sendSuccess(res, academicYear);
});

export const updateAcademicYear = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, startDate, endDate, description, status } = req.body;

  const academicYear = await prisma.academicYear.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status ? { status } : {}),
    },
  });

  sendSuccess(res, academicYear);
});

export const deleteAcademicYear = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const academicYear = await prisma.academicYear.findUnique({
    where: { id },
    include: { _count: { select: { enrollments: true, terms: true } } },
  });
  if (!academicYear) throw AppError.notFound('Academic year not found');

  if (academicYear._count.enrollments > 0) {
    throw AppError.conflict('Cannot delete academic year with active enrollments');
  }

  await prisma.academicYear.delete({ where: { id } });
  sendNoContent(res);
});

export const activateAcademicYear = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.$transaction([
    prisma.academicYear.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'UPCOMING' },
    }),
    prisma.academicYear.update({
      where: { id },
      data: { status: 'ACTIVE' },
    }),
  ]);

  sendSuccess(res, { message: 'Academic year activated' });
});

// ========= Term =========

export const createTerm = asyncHandler(async (req: Request, res: Response) => {
  const { academicYearId, name, type, startDate, endDate, isActive } = req.body;

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });
  if (!academicYear) throw AppError.notFound('Academic year not found');

  const existing = await prisma.term.findUnique({
    where: { academicYearId_name: { academicYearId, name } },
  });
  if (existing) throw AppError.conflict('Term with this name already exists in the year');

  const term = await prisma.term.create({
    data: {
      academicYearId,
      name,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive,
    },
  });

  sendCreated(res, term);
});

export const listTerms = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { academicYearId, isActive } = req.query;

  const where: Record<string, unknown> = {};
  if (academicYearId) where.academicYearId = String(academicYearId);
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [terms, total] = await Promise.all([
    prisma.term.findMany({
      where,
      include: {
        academicYear: { select: { name: true } },
        _count: { select: { grades: true, fees: true } },
      },
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.term.count({ where }),
  ]);

  sendPaginated(res, terms, total, page, limit);
});

export const getTerm = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const term = await prisma.term.findUnique({
    where: { id },
    include: {
      academicYear: true,
      _count: { select: { grades: true, fees: true } },
    },
  });
  if (!term) throw AppError.notFound('Term not found');
  sendSuccess(res, term);
});

export const updateTerm = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, startDate, endDate, isActive, type } = req.body;

  const term = await prisma.term.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(type ? { type } : {}),
    },
  });

  sendSuccess(res, term);
});

export const deleteTerm = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const term = await prisma.term.findUnique({
    where: { id },
    include: { _count: { select: { grades: true } } },
  });
  if (!term) throw AppError.notFound('Term not found');

  if (term._count.grades > 0) {
    throw AppError.conflict('Cannot delete term with existing grades');
  }

  await prisma.term.delete({ where: { id } });
  sendNoContent(res);
});

// ============== Class ==============

export const createClass = asyncHandler(async (req: Request, res: Response) => {
  const { name, gradeLevel, section, academicYearId, teacherId, roomNumber, capacity, description } = req.body;

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });
  if (!academicYear) throw AppError.notFound('Academic year not found');

  const existing = await prisma.class.findUnique({
    where: { name_academicYearId: { name, academicYearId } },
  });
  if (existing) throw AppError.conflict('A class with this name already exists in this academic year');

  const classData = await prisma.class.create({
    data: {
      name,
      gradeLevel,
      section,
      academicYearId,
      teacherId,
      roomNumber,
      capacity: capacity ?? 30,
      description,
    },
  });

  sendCreated(res, classData);
});

export const listClasses = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { gradeLevel, academicYearId, teacherId } = req.query;

  const where: Record<string, unknown> = {};
  if (gradeLevel) where.gradeLevel = parseInt(String(gradeLevel), 10);
  if (academicYearId) where.academicYearId = String(academicYearId);
  if (teacherId) where.teacherId = String(teacherId);

  // Filter by user role
  if (req.userRole === 'TEACHER' && req.userId) {
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: req.userId } });
    if (profile) where.teacherId = profile.id;
  }

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      include: {
        academicYear: { select: { name: true } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { students: true, enrollments: true } },
      },
      orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.class.count({ where }),
  ]);

  sendPaginated(res, classes, total, page, limit);
});

export const getClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const classData = await prisma.class.findUnique({
    where: { id },
    include: {
      academicYear: true,
      teacher: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      students: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
      },
      subjects: { include: { subject: true, teacher: { include: { user: true } } } },
      timetableEntries: { include: { subject: true, teacher: { include: { user: true } } } },
    },
  });
  if (!classData) throw AppError.notFound('Class not found');

  sendSuccess(res, {
    ...classData,
    studentCount: classData.students.length,
  });
});

export const updateClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, gradeLevel, section, roomNumber, capacity, teacherId, description } = req.body;

  const classData = await prisma.class.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(gradeLevel ? { gradeLevel } : {}),
      ...(section !== undefined ? { section } : {}),
      ...(roomNumber !== undefined ? { roomNumber } : {}),
      ...(capacity ? { capacity } : {}),
      ...(teacherId !== undefined ? { teacherId } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

  sendSuccess(res, classData);
});

export const deleteClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const classData = await prisma.class.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!classData) throw AppError.notFound('Class not found');
  if (classData._count.students > 0) {
    throw AppError.conflict('Cannot delete class with enrolled students');
  }

  await prisma.class.delete({ where: { id } });
  sendNoContent(res);
});

export const getClassStudents = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const students = await prisma.studentProfile.findMany({
    where: { classId: id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          status: true,
        },
      },
    },
    orderBy: { user: { lastName: 'asc' } },
  });

  sendSuccess(res, students);
});

export const getClassSubjects = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const subjects = await prisma.classSubject.findMany({
    where: { classId: id },
    include: {
      subject: true,
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  sendSuccess(res, subjects);
});

export const assignSubjectsToClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { subjectIds } = req.body;

  if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
    throw AppError.badRequest('subjectIds array is required');
  }

  const results = await prisma.$transaction(
    subjectIds.map((subjectId: string) =>
      prisma.classSubject.upsert({
        where: { classId_subjectId: { classId: id, subjectId } },
        update: {},
        create: { classId: id, subjectId },
      })
    )
  );

  sendSuccess(res, { count: results.length });
});

export const assignTeacherToClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { teacherId } = req.body;

  if (!teacherId) throw AppError.badRequest('teacherId is required');

  const classData = await prisma.class.update({
    where: { id },
    data: { teacherId },
    include: {
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  sendSuccess(res, classData);
});

// =============== Subject ===============

export const createSubject = asyncHandler(async (req: Request, res: Response) => {
  const { name, code, description, credits, isCore, teacherId } = req.body;

  const existing = await prisma.subject.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (existing) throw AppError.conflict('A subject with this code already exists');

  const subject = await prisma.subject.create({
    data: {
      name,
      code: code.toUpperCase(),
      description,
      credits: credits ?? 1,
      isCore: isCore ?? true,
      teacherId,
    },
  });

  sendCreated(res, subject);
});

export const listSubjects = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { isCore, teacherId, search } = req.query;

  const where: Record<string, unknown> = {};
  if (isCore !== undefined) where.isCore = isCore === 'true';
  if (teacherId) where.teacherId = String(teacherId);
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { code: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      include: {
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { grades: true, classSubjects: true } },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.subject.count({ where }),
  ]);

  sendPaginated(res, subjects, total, page, limit);
});

export const getSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      teacher: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      classSubjects: { include: { class: true } },
    },
  });
  if (!subject) throw AppError.notFound('Subject not found');
  sendSuccess(res, subject);
});

export const updateSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, credits, isCore, teacherId } = req.body;

  const subject = await prisma.subject.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(credits ? { credits } : {}),
      ...(isCore !== undefined ? { isCore } : {}),
      ...(teacherId !== undefined ? { teacherId } : {}),
    },
  });

  sendSuccess(res, subject);
});

export const deleteSubject = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: { _count: { select: { grades: true } } },
  });
  if (!subject) throw AppError.notFound('Subject not found');

  if (subject._count.grades > 0) {
    throw AppError.conflict('Cannot delete subject with existing grades');
  }

  await prisma.subject.delete({ where: { id } });
  sendNoContent(res);
});

// ================= Enrollment =================

export const createEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, classId, academicYearId, enrollmentDate } = req.body;

  const existing = await prisma.enrollment.findUnique({
    where: {
      studentId_classId_academicYearId: { studentId, classId, academicYearId },
    },
  });
  if (existing) throw AppError.conflict('Student is already enrolled in this class');

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { students: true } } },
  });
  if (!classData) throw AppError.notFound('Class not found');

  if (classData.capacity && classData._count.students >= classData.capacity) {
    throw AppError.conflict('Class has reached maximum capacity');
  }

  const enrollment = await prisma.$transaction(async (tx) => {
    const enrollmentRecord = await tx.enrollment.create({
      data: {
        studentId,
        classId,
        academicYearId,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      },
    });

    await tx.studentProfile.update({
      where: { id: studentId },
      data: { classId },
    });

    return enrollmentRecord;
  });

  sendCreated(res, enrollment);
});

export const listEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { classId, academicYearId, status, studentId } = req.query;

  const where: Record<string, unknown> = {};
  if (classId) where.classId = String(classId);
  if (academicYearId) where.academicYearId = String(academicYearId);
  if (status) where.status = String(status);
  if (studentId) where.studentId = String(studentId);

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
        class: { select: { name: true, gradeLevel: true, section: true } },
        academicYear: { select: { name: true } },
      },
      orderBy: { enrollmentDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.enrollment.count({ where }),
  ]);

  sendPaginated(res, enrollments, total, page, limit);
});

export const deleteEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: { student: true },
  });
  if (!enrollment) throw AppError.notFound('Enrollment not found');

  await prisma.$transaction([
    prisma.enrollment.delete({ where: { id } }),
    prisma.studentProfile.update({
      where: { id: enrollment.studentId },
      data: { classId: null },
    }),
  ]);

  sendNoContent(res);
});