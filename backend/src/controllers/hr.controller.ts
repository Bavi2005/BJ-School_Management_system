import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const { department, designation } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const where: any = {};
  if (department) where.department = String(department);
  if (designation) where.designation = String(designation);
  const [items, total] = await Promise.all([
    prisma.staffRecord.findMany({
      where,
      include: { user: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { employeeId: 'asc' },
    }),
    prisma.staffRecord.count({ where }),
  ]);
  sendPaginated(res, items, total, page, limit);
});

export const getStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await prisma.staffRecord.findUnique({
    where: { id: req.params.id },
    include: { user: true, contracts: true, paySlips: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 6 }, leaves: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });
  if (!staff) throw new AppError('Staff not found', { statusCode: 400 });
  sendSuccess(res, staff);
});

export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await prisma.staffRecord.update({ where: { id: req.params.id }, data: req.body });
  sendSuccess(res, staff);
});

export const deleteStaff = asyncHandler(async (req: Request, res: Response) => {
  await prisma.staffRecord.delete({ where: { id: req.params.id } });
  sendNoContent(res);
});

export const listPayroll = asyncHandler(async (req: Request, res: Response) => {
  const { month, year, status } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const where: any = {};
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);
  if (status) where.status = String(status);
  const [items, total] = await Promise.all([
    prisma.payrollRecord.findMany({
      where,
      include: { staff: { include: { user: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    prisma.payrollRecord.count({ where }),
  ]);
  sendPaginated(res, items, total, page, limit);
});

export const createPayroll = asyncHandler(async (req: Request, res: Response) => {
  const { staffId, month, year, basicPay, allowances, deductions, bonus } = req.body;
  const netPay = Number(basicPay ?? 0) + Number(allowances ?? 0) - Number(deductions ?? 0) + Number(bonus ?? 0);
  const record = await prisma.payrollRecord.upsert({
    where: { staffId_month_year: { staffId, month, year } },
    update: { basicPay, allowances, deductions, bonus, netPay },
    create: { staffId, month, year, basicPay, allowances, deductions, bonus, netPay, status: 'DRAFT' },
  });
  sendCreated(res, record);
});

export const markPayrollPaid = asyncHandler(async (req: Request, res: Response) => {
  const record = await prisma.payrollRecord.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED', paidAt: new Date(), method: req.body.method ?? 'BANK_TRANSFER' },
  });
  sendSuccess(res, record);
});

export const listLeaves = asyncHandler(async (req: Request, res: Response) => {
  const { status, staffId } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const where: any = {};
  if (status) where.status = String(status);
  if (staffId) where.staffId = String(staffId);
  const [items, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: { staff: { include: { user: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  sendPaginated(res, items, total, page, limit);
});

export const createLeave = asyncHandler(async (req: Request, res: Response) => {
  const leave = await prisma.leaveRequest.create({
    data: { ...req.body, fromDate: new Date(req.body.fromDate), toDate: new Date(req.body.toDate) },
  });
  sendCreated(res, leave);
});

export const decideLeave = asyncHandler(async (req: Request, res: Response) => {
  const { status, notes } = req.body;
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status, decisionNotes: notes, approvedBy: status === 'APPROVED' ? req.userId : null, decidedAt: new Date() },
  });
  sendSuccess(res, leave);
});

export const getHRStats = asyncHandler(async (req: Request, res: Response) => {
  const [totalStaff, teachers, adminStaff, pendingLeaves, payrollThisMonth, staffPresentToday] = await Promise.all([
    prisma.staffRecord.count(),
    prisma.staffRecord.count({ where: { department: { not: 'Administration' } } }),
    prisma.staffRecord.count({ where: { department: 'Administration' } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.payrollRecord.count({ where: { month: 11, year: 2024, status: 'COMPLETED' } }),
    prisma.staffAttendanceRecord.count({ where: { date: new Date(), status: 'PRESENT' } }),
  ]);
  sendSuccess(res, { totalStaff, teachers, adminStaff, pendingLeaves, payrollThisMonth, staffPresentToday });
});
