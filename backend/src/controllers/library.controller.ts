import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const listBooks = asyncHandler(async (req: Request, res: Response) => {
  const { search, category, status } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: String(search), mode: 'insensitive' } },
      { author: { contains: String(search), mode: 'insensitive' } },
      { isbn: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  if (category) where.category = String(category);
  if (status) where.status = String(status);

  const [items, total] = await Promise.all([
    prisma.libraryBook.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { title: 'asc' } }),
    prisma.libraryBook.count({ where }),
  ]);
  sendPaginated(res, items, total, page, limit);
});

export const getBook = asyncHandler(async (req: Request, res: Response) => {
  const book = await prisma.libraryBook.findUnique({
    where: { id: req.params.id },
    include: { loans: { include: { student: { include: { user: true } } }, orderBy: { issuedAt: 'desc' }, take: 5 } },
  });
  if (!book) throw new AppError('Book not found', { statusCode: 400 });
  sendSuccess(res, book);
});

export const createBook = asyncHandler(async (req: Request, res: Response) => {
  const book = await prisma.libraryBook.create({ data: req.body });
  sendCreated(res, book);
});

export const updateBook = asyncHandler(async (req: Request, res: Response) => {
  const book = await prisma.libraryBook.update({ where: { id: req.params.id }, data: req.body });
  sendSuccess(res, book);
});

export const deleteBook = asyncHandler(async (req: Request, res: Response) => {
  await prisma.libraryBook.delete({ where: { id: req.params.id } });
  sendNoContent(res);
});

export const listLoans = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const where: any = {};
  if (status) where.status = String(status);
  const [items, total] = await Promise.all([
    prisma.bookLoan.findMany({
      where,
      include: { book: true, student: { include: { user: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { issuedAt: 'desc' },
    }),
    prisma.bookLoan.count({ where }),
  ]);
  sendPaginated(res, items, total, page, limit);
});

export const issueBook = asyncHandler(async (req: Request, res: Response) => {
  const { bookId, studentId, dueDate } = req.body;
  const loan = await prisma.$transaction(async (tx) => {
    const book = await tx.libraryBook.findUnique({ where: { id: bookId } });
    if (!book) throw new AppError('Book not found', { statusCode: 400 });
    if (book.availableCopies <= 0) throw new AppError('No copies available', { statusCode: 400 });
    const newLoan = await tx.bookLoan.create({
      data: { bookId, studentId, issuedBy: req.userId!, dueDate: new Date(dueDate) },
    });
    await tx.libraryBook.update({
      where: { id: bookId },
      data: { availableCopies: { decrement: 1 }, status: book.availableCopies - 1 <= 0 ? 'CHECKED_OUT' : 'AVAILABLE' },
    });
    return newLoan;
  });
  sendCreated(res, loan);
});

export const returnBook = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { fineAmount } = req.body;
  const loan = await prisma.$transaction(async (tx) => {
    const existing = await tx.bookLoan.findUnique({ where: { id } });
    if (!existing) throw new AppError('Loan not found', { statusCode: 400 });
    const updated = await tx.bookLoan.update({
      where: { id },
      data: { returnedAt: new Date(), status: 'RETURNED', fineAmount: fineAmount ?? 0, finePaid: Number(fineAmount ?? 0) === 0 },
    });
    await tx.libraryBook.update({
      where: { id: existing.bookId },
      data: { availableCopies: { increment: 1 }, status: 'AVAILABLE' },
    });
    return updated;
  });
  sendSuccess(res, loan);
});

export const getLibraryStats = asyncHandler(async (req: Request, res: Response) => {
  const [totalBooks, checkedOut, overdue, activeLoans, finePending] = await Promise.all([
    prisma.libraryBook.count(),
    prisma.bookLoan.count({ where: { status: 'ACTIVE' } }),
    prisma.bookLoan.count({ where: { status: 'OVERDUE' } }),
    prisma.bookLoan.count({ where: { returnedAt: null } }),
    prisma.bookLoan.aggregate({ where: { finePaid: false, fineAmount: { gt: 0 } }, _sum: { fineAmount: true } }),
  ]);
  sendSuccess(res, {
    totalBooks,
    checkedOut,
    overdue,
    activeLoans,
    totalFinesPending: Number(finePending._sum.fineAmount ?? 0),
  });
});
