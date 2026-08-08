import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { notificationService } from '../services/notification.service';
import { isOverdue } from '@school-mgmt/shared';

export const createFee = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, feeType, academicYearId, termId, amount, dueDate, description, discountAmount, discountReason } = req.body;

  const fee = await prisma.$transaction(async (tx) => {
    const feeRecord = await tx.fee.create({
      data: {
        studentId,
        feeType,
        academicYearId,
        termId,
        amount,
        dueDate: new Date(dueDate),
        description,
        discountAmount: discountAmount ?? 0,
        discountReason,
      },
    });

    await tx.feeAccount.upsert({
      where: { studentId },
      create: { studentId, balance: amount - (discountAmount ?? 0) },
      update: { balance: { increment: Number(amount) - Number(discountAmount ?? 0) } },
    });

    return feeRecord;
  });

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { studentId },
    include: { user: { select: { id: true } } },
  });

  if (studentProfile) {
    await notificationService.create({
      userId: studentProfile.userId,
      type: 'FEE_DUE',
      title: `New fee: ${feeType.replace(/_/g, ' ')}`,
      message: `A new fee of $${amount} has been added and is due on ${new Date(dueDate).toLocaleDateString()}`,
      channels: ['IN_APP', 'EMAIL'],
      actionUrl: '/fees',
    });
  }

  sendCreated(res, fee);
});

export const listFees = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { studentId, status, feeType, academicYearId } = req.query;

  const where: Record<string, unknown> = {};
  if (studentId) where.studentId = String(studentId);
  if (status) where.status = String(status);
  if (feeType) where.feeType = String(feeType);
  if (academicYearId) where.academicYearId = String(academicYearId);

  const [fees, total] = await Promise.all([
    prisma.fee.findMany({
      where,
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        term: { select: { name: true } },
        payments: true,
      },
      orderBy: { dueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fee.count({ where }),
  ]);

  sendPaginated(res, fees, total, page, limit);
});

export const getFee = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const fee = await prisma.fee.findUnique({
    where: { id },
    include: {
      student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      term: true,
      payments: true,
    },
  });
  if (!fee) throw AppError.notFound('Fee not found');
  sendSuccess(res, fee);
});

export const updateFee = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, dueDate, status, description, discountAmount, discountReason } = req.body;

  const fee = await prisma.fee.update({
    where: { id },
    data: {
      ...(amount !== undefined ? { amount } : {}),
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      ...(status ? { status } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(discountAmount !== undefined ? { discountAmount } : {}),
      ...(discountReason !== undefined ? { discountReason } : {}),
    },
  });

  sendSuccess(res, fee);
});

export const deleteFee = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const fee = await prisma.fee.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!fee) throw AppError.notFound('Fee not found');
  if (fee.payments.length > 0) {
    throw AppError.conflict('Cannot delete fee with payments');
  }

  await prisma.fee.delete({ where: { id } });
  sendNoContent(res);
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, method, transactionId, notes, paidAt } = req.body;

  const fee = await prisma.fee.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!fee) throw AppError.notFound('Fee not found');

  const paidSoFar = fee.payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const remaining = Number(fee.amount) - Number(fee.discountAmount) - paidSoFar;

  if (amount > remaining) {
    throw AppError.badRequest(`Payment amount exceeds remaining balance of $${remaining}`);
  }

  const payment = await prisma.$transaction(async (tx) => {
    const paymentRecord = await tx.payment.create({
      data: {
        feeId: id,
        amount,
        method,
        transactionId,
        notes,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
    });

    const totalPaid = paidSoFar + amount;
    const newStatus = totalPaid >= Number(fee.amount) - Number(fee.discountAmount) ? 'PAID' : 'PARTIAL';

    await tx.fee.update({ where: { id }, data: { status: newStatus } });

    await tx.feeAccount.update({
      where: { studentId: fee.studentId },
      data: {
        balance: { decrement: amount },
        totalPaid: { increment: amount },
      },
    });

    return paymentRecord;
  });

  sendCreated(res, payment);
});

export const getFeeAccount = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;

  const account = await prisma.feeAccount.findUnique({
    where: { studentId },
    include: { fees: { include: { payments: true } } },
  });

  if (!account) throw AppError.notFound('No fee account found for this student');
  sendSuccess(res, account);
});

export const getFeeStats = asyncHandler(async (req: Request, res: Response) => {
  const fees = await prisma.fee.findMany();

  const stats = fees.reduce(
    (acc, f) => {
      acc.totalFees++;
      acc.totalAmount += Number(f.amount);
      acc.totalDiscount += Number(f.discountAmount);
      acc.statuses[f.status] = (acc.statuses[f.status] ?? 0) + 1;
      return acc;
    },
    { totalFees: 0, totalAmount: 0, totalDiscount: 0, statuses: {} as Record<string, number> }
  );

  const overdueCount = fees.filter((f) => f.status === 'PENDING' && isOverdue(f.dueDate)).length;

  sendSuccess(res, { ...stats, overdueCount });
});