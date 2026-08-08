import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { UserService } from '../services/user.service';
import { sendSuccess, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.pagination;
  const { role, search, status } = req.query;

  const result = await UserService.listUsers({
    page,
    limit,
    role: role as never,
    search: search as string,
    status: status as string,
  });

  sendPaginated(res, result.users, result.total, page, limit);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, role, phone, dateOfBirth, address } = req.body;
  const user = await UserService.createUser({
    email,
    password,
    firstName,
    lastName,
    role,
    phone,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    address,
  });
  sendSuccess(res, user, 201);
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await UserService.findById(id);
  if (!user) throw AppError.notFound('User not found');
  sendSuccess(res, user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, phone, dateOfBirth, address, bio, avatarUrl, status } = req.body;
  const user = await UserService.updateUser(id, {
    firstName,
    lastName,
    phone,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    address,
    bio,
    avatarUrl,
    status,
  });
  sendSuccess(res, user);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (req.userId === id) {
    throw AppError.badRequest('Cannot delete your own account');
  }
  await UserService.deleteUser(id);
  sendNoContent(res);
});

export const getUserActivity = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page, limit } = req.pagination;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activityLog.count({ where: { userId: id } }),
  ]);

  sendPaginated(res, logs, total, page, limit);
});