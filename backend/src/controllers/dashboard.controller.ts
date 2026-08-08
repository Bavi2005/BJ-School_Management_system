import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { cache } from '../lib/cache';
import { UserRole } from '@school-mgmt/shared';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) return;

  const cacheKey = `dashboard:${req.userId}:${new Date().toDateString()}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    sendSuccess(res, cached);
    return;
  }

  let stats: Record<string, unknown>;

  if (req.userRole === UserRole.SUPER_ADMIN || req.userRole === UserRole.ADMIN) {
    stats = await getAdminDashboard();
  } else if (req.userRole === UserRole.TEACHER) {
    stats = await getTeacherDashboard(req.userId);
  } else if (req.userRole === UserRole.STUDENT) {
    stats = await getStudentDashboard(req.userId);
  } else if (req.userRole === UserRole.PARENT) {
    stats = await getParentDashboard(req.userId);
  } else {
    stats = {};
  }

  await cache.set(cacheKey, stats, 300);
  sendSuccess(res, stats);
});

async function getAdminDashboard() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    totalSubjects,
    todayAttendance,
    pendingFees,
    upcomingEvents,
    recentActivity,
    libraryBooks,
    activeLoans,
    activeBuses,
    transportStudents,
    staffCount,
    pendingLeaves,
    admissionApplications,
    examCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: UserRole.STUDENT } }),
    prisma.user.count({ where: { role: UserRole.TEACHER } }),
    prisma.class.count(),
    prisma.subject.count(),
    prisma.attendanceRecord.count({ where: { date: { gte: startOfDay } } }),
    prisma.fee.count({ where: { status: { in: ['PENDING', 'OVERDUE'] } } }),
    prisma.schoolEvent.findMany({
      where: { startDate: { gte: now } },
      orderBy: { startDate: 'asc' },
      take: 5,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
    }),
    prisma.libraryBook.count(),
    prisma.bookLoan.count({ where: { returnedAt: null } }),
    prisma.bus.count({ where: { status: 'ACTIVE' } }),
    prisma.transportAssignment.count({ where: { status: 'ACTIVE' } }),
    prisma.staffRecord.count(),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.admissionApplication.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
    prisma.exam.count({ where: { isPublished: false } }),
  ]);

  const attendanceRate = todayAttendance > 0
    ? await calculateAttendanceRate(startOfDay)
    : null;

  return {
    overview: {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      todayAttendance,
      attendanceRate,
      pendingFees,
      libraryBooks,
      activeLoans,
      activeBuses,
      transportStudents,
      staffCount,
      pendingLeaves,
      admissionApplications,
      examCount,
    },
    upcomingEvents,
    recentActivity,
  };
}

async function getTeacherDashboard(userId: string) {
  const profile = await prisma.teacherProfile.findUnique({ where: { userId } });
  if (!profile) return {};

  const now = new Date();

  const [classes, todayClasses, pendingGrading, upcomingEvents] = await Promise.all([
    prisma.class.findMany({ where: { teacherId: profile.id } }),
    prisma.timetableEntry.count({
      where: {
        teacherId: profile.id,
        dayOfWeek: now.getDay() === 0 ? 6 : now.getDay() - 1,
      },
    }),
    prisma.submission.count({
      where: {
        status: { in: ['SUBMITTED', 'LATE'] },
        gradedAt: null,
      },
    }),
    prisma.schoolEvent.findMany({
      where: { startDate: { gte: now } },
      orderBy: { startDate: 'asc' },
      take: 5,
    }),
  ]);

  const students = await prisma.studentProfile.count({
    where: { class: { teacherId: profile.id } },
  });

  return {
    overview: {
      classes: classes.length,
      todayClasses,
      students,
      pendingGrading,
    },
    upcomingEvents,
  };
}

async function getStudentDashboard(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) return {};

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [attendanceRecords, grades, fees, timetable, upcomingEvents, assignments] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId: profile.id },
      select: { status: true },
    }),
    prisma.grade.findMany({
      where: { studentId: profile.id },
      orderBy: { date: 'desc' },
      take: 50,
    }),
    prisma.fee.findMany({
      where: { studentId: profile.id, status: { in: ['PENDING', 'OVERDUE'] } },
    }),
    prisma.timetableEntry.findMany({
      where: { class: { students: { some: { id: profile.id } } } },
      include: { subject: true, teacher: { include: { user: true } } },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.schoolEvent.findMany({
      where: { startDate: { gte: now } },
      orderBy: { startDate: 'asc' },
      take: 5,
    }),
    prisma.assignment.findMany({
      where: {
        class: { students: { some: { id: profile.id } } },
        status: { in: ['PUBLISHED', 'SUBMITTED'] },
        dueDate: { gte: new Date(now.getTime() - 7 * 86400000) },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
  ]);

  const present = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
  const attendanceRate = attendanceRecords.length
    ? (present / attendanceRecords.length) * 100
    : 0;

  const averageScore = grades.length
    ? grades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / grades.length
    : 0;

  const totalFeesDue = fees.reduce((acc, f) => acc + Number(f.amount) - Number(f.discountAmount), 0);

  return {
    overview: {
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      gradesCount: grades.length,
      feesDue: totalFeesDue,
      totalClasses: timetable.length,
      assignmentsDue: assignments.filter((a) => a.status === 'PUBLISHED').length,
    },
    timetable: timetable.slice(0, 10),
    upcomingEvents,
    assignments,
    recentGrades: grades.slice(0, 5),
  };
}

async function getParentDashboard(userId: string) {
  const profile = await prisma.parentProfile.findUnique({
    where: { userId },
    include: {
      children: {
        include: {
          student: {
            include: {
              user: { select: { firstName: true, lastName: true, avatarUrl: true } },
              class: true,
            },
          },
        },
      },
    },
  });

  if (!profile) return {};

  const children = await Promise.all(
    profile.children.map(async ({ student }) => {
      const [attendanceRecords, grades, fees] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where: { studentId: student.id },
          select: { status: true },
        }),
        prisma.grade.findMany({
          where: { studentId: student.id },
          orderBy: { date: 'desc' },
          take: 20,
        }),
        prisma.fee.findMany({
          where: { studentId: student.id, status: { in: ['PENDING', 'OVERDUE'] } },
        }),
      ]);

      const present = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
      const attendanceRate = attendanceRecords.length
        ? (present / attendanceRecords.length) * 100
        : 0;
      const averageScore = grades.length
        ? grades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / grades.length
        : 0;
      const feesDue = fees.reduce((acc, f) => acc + Number(f.amount) - Number(f.discountAmount), 0);

      return {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        avatarUrl: student.user.avatarUrl,
        className: student.class?.name ?? 'Not assigned',
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100,
        feesDue,
        recentGrades: grades.slice(0, 5),
      };
    })
  );

  return { children };
}

async function calculateAttendanceRate(startOfDay: Date) {
  const [present, total] = await Promise.all([
    prisma.attendanceRecord.count({ where: { status: 'PRESENT', date: { gte: startOfDay } } }),
    prisma.attendanceRecord.count({ where: { date: { gte: startOfDay } } }),
  ]);
  return total > 0 ? Math.round((present / total) * 10000) / 100 : 0;
}