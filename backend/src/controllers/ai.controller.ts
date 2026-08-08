import { Request, Response } from 'express';
import { aiClient } from '../services/aiClient.service';
import { sendSuccess } from '../utils/apiResponder';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { prisma } from '../lib/prisma';

export const predictPerformance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const result = await aiClient.predictPerformance({
    user: req.userId,
    ...req.body,
  });
  sendSuccess(res, result);
});

export const predictAttendanceRisk = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const result = await aiClient.predictAttendanceRisk({
    user: req.userId,
    ...req.body,
  });
  sendSuccess(res, result);
});

export const generateSchedule = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const result = await aiClient.generateSchedule({
    user: req.userId,
    ...req.body,
  });
  sendSuccess(res, result);
});

export const autoGrade = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const result = await aiClient.autoGrade({
    user: req.userId,
    ...req.body,
  });
  sendSuccess(res, result);
});

export const chat = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();

  const { message, sessionId, context } = req.body as {
    message: string;
    sessionId?: string;
    context?: Record<string, unknown>;
  };

  if (!message?.trim()) {
    throw AppError.badRequest('Message is required');
  }

  let conversationId = sessionId;

  if (!conversationId) {
    const conversation = await prisma.aIConversation.create({
      data: {
        userId: req.userId,
        title: message.slice(0, 50),
        context: context ? JSON.stringify(context) : undefined,
      },
    });
    conversationId = conversation.id;
  }

  await prisma.aIChatMessage.create({
    data: {
      conversationId,
      role: 'USER',
      content: message,
    },
  });

  const history = await prisma.aIChatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { role: true, content: true },
  });

  const result = await aiClient.sendChatMessage({
    message,
    history,
    context: { role: context?.role ?? 'user', userId: req.userId },
  });

  const reply = result.data;
  const content = reply?.response ?? JSON.stringify(result);

  await prisma.aIChatMessage.create({
    data: {
      conversationId,
      role: 'ASSISTANT',
      content,
      model: 'chatbot-v1',
      metadata: JSON.stringify({ confidence: reply?.confidence ?? 0.5 }),
    },
  });

  sendSuccess(res, { conversationId, message: content, result });
});

export const generateRecommendations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const result = await aiClient.generateRecommendations({
    user: req.userId,
    ...req.body,
  });
  sendSuccess(res, result);
});

export const detectAnomalies = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const result = await aiClient.detectAnomalies({
    user: req.userId,
    ...req.body,
  });
  sendSuccess(res, result);
});

export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.userId) throw AppError.unauthorized();
  const conversations = await prisma.aIConversation.findMany({
    where: { userId: req.userId },
    include: {
      messages: { orderBy: { createdAt: 'asc' }, take: 50 },
    },
    orderBy: { updatedAt: 'desc' },
  });
  sendSuccess(res, conversations);
});

export const checkHealth = asyncHandler(async (_req: Request, res: Response) => {
  const health = await aiClient.checkHealth();
  sendSuccess(res, health);
});