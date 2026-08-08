import { Request, Response } from 'express';
import { googleCalendarService } from '../services/googleCalendar.service';
import { sendSuccess, sendNoContent } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { prisma } from '../lib/prisma';

export const getAuthUrl = asyncHandler(async (req: Request, res: Response) => {
  const url = googleCalendarService.getAuthUrl(req.query.state as string | undefined);
  sendSuccess(res, { authUrl: url });
});

export const connectAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { code } = req.body;
  if (!code) throw AppError.badRequest('Authorization code is required');

  const result = await googleCalendarService.connectAccount(req.userId, code);
  sendSuccess(res, result);
});

export const getAccountStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const status = await googleCalendarService.getAccountStatus(req.userId);
  sendSuccess(res, status ?? { status: 'NOT_CONNECTED' });
});

export const disconnectAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  await googleCalendarService.disconnectAccount(req.userId);
  sendNoContent(res);
});

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const { timeMin, timeMax, maxResults } = req.query;

  if (!timeMin || !timeMax) {
    throw AppError.badRequest('timeMin and timeMax are required');
  }

  const events = await googleCalendarService.listEvents(req.userId, {
    timeMin: String(timeMin),
    timeMax: String(timeMax),
    maxResults: maxResults ? parseInt(String(maxResults), 10) : undefined,
  });

  sendSuccess(res, events);
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const event = await googleCalendarService.createEvent(req.userId, req.body);
  sendSuccess(res, event, 201);
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { googleEventId } = req.params;
  const event = await googleCalendarService.updateEvent(req.userId, googleEventId, req.body);
  sendSuccess(res, event);
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { googleEventId } = req.params;
  await googleCalendarService.deleteEvent(req.userId, googleEventId);
  sendNoContent(res);
});

export const syncSchoolEvent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const { eventId } = req.params;

  const schoolEvent = await prisma.schoolEvent.findUnique({
    where: { id: eventId },
  });

  if (!schoolEvent) throw AppError.notFound('School event not found');

  const result = await googleCalendarService.syncSchoolEventToGoogle(req.userId, {
    id: schoolEvent.id,
    title: schoolEvent.title,
    description: schoolEvent.description,
    location: schoolEvent.location,
    startDate: schoolEvent.startDate,
    endDate: schoolEvent.endDate,
    allDay: schoolEvent.allDay,
  });

  sendSuccess(res, result);
});