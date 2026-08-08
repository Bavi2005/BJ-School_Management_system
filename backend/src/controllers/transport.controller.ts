import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const listRoutes = asyncHandler(async (req: Request, res: Response) => {
  const routes = await prisma.transportRoute.findMany({
    include: { buses: true, _count: { select: { assignments: true } } },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, routes);
});

export const createRoute = asyncHandler(async (req: Request, res: Response) => {
  const route = await prisma.transportRoute.create({ data: req.body });
  sendCreated(res, route);
});

export const updateRoute = asyncHandler(async (req: Request, res: Response) => {
  const route = await prisma.transportRoute.update({ where: { id: req.params.id }, data: req.body });
  sendSuccess(res, route);
});

export const deleteRoute = asyncHandler(async (req: Request, res: Response) => {
  await prisma.transportRoute.delete({ where: { id: req.params.id } });
  sendNoContent(res);
});

export const listBuses = asyncHandler(async (req: Request, res: Response) => {
  const buses = await prisma.bus.findMany({ include: { route: true }, orderBy: { busNumber: 'asc' } });
  sendSuccess(res, buses);
});

export const createBus = asyncHandler(async (req: Request, res: Response) => {
  const bus = await prisma.bus.create({ data: req.body });
  sendCreated(res, bus);
});

export const updateBus = asyncHandler(async (req: Request, res: Response) => {
  const bus = await prisma.bus.update({ where: { id: req.params.id }, data: req.body });
  sendSuccess(res, bus);
});

export const deleteBus = asyncHandler(async (req: Request, res: Response) => {
  await prisma.bus.delete({ where: { id: req.params.id } });
  sendNoContent(res);
});

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const where: any = {};
  if (status) where.status = String(status);
  const [items, total] = await Promise.all([
    prisma.transportAssignment.findMany({
      where,
      include: { student: { include: { user: true } }, route: true, bus: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transportAssignment.count({ where }),
  ]);
  sendPaginated(res, items, total, page, limit);
});

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await prisma.transportAssignment.create({ data: req.body });
  sendCreated(res, assignment);
});

export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await prisma.transportAssignment.update({ where: { id: req.params.id }, data: req.body });
  sendSuccess(res, assignment);
});

export const deleteAssignment = asyncHandler(async (req: Request, res: Response) => {
  await prisma.transportAssignment.delete({ where: { id: req.params.id } });
  sendNoContent(res);
});

export const getTransportStats = asyncHandler(async (req: Request, res: Response) => {
  const [activeBuses, activeRoutes, activeAssignments, capacityAgg, studentsAssigned] = await Promise.all([
    prisma.bus.count({ where: { status: 'ACTIVE' } }),
    prisma.transportRoute.count({ where: { status: 'ACTIVE' } }),
    prisma.transportAssignment.count({ where: { status: 'ACTIVE' } }),
prisma.bus.aggregate({ where: { status: 'ACTIVE' }, _sum: { capacity: true } }),
    prisma.transportAssignment.count(),
  ]);
  sendSuccess(res, {
    activeBuses,
    activeRoutes,
    activeAssignments,
    totalCapacity: capacityAgg._sum?.capacity ?? 0,
    studentsAssigned,
  });
});
