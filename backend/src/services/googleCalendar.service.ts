import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { GoogleCalendarEvent } from '@school-mgmt/shared';
import { CalendarError, AppError } from '../utils/AppError';
import { createLogger } from '../lib/logger';
import { cache } from '../lib/cache';

const log = createLogger('google-calendar');

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  private createOAuthClient(): OAuth2Client {
    if (!config.google.clientId || !config.google.clientSecret) {
      throw new CalendarError(
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env'
      );
    }
    return new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret,
      config.google.callbackUrl
    );
  }

  getAuthUrl(state?: string): string {
    const client = this.createOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state,
    });
  }

  async handleOAuthCallback(code: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    email: string;
    googleUserId: string;
  }> {
    const client = this.createOAuthClient();
    try {
      const { tokens } = await client.getToken(code);
      if (!tokens.access_token) {
        throw new CalendarError('No access token returned from Google');
      }

      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      client.setCredentials({ access_token: tokens.access_token });
      const userInfo = await oauth2.userinfo.get({});

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        email: userInfo.data.email ?? '',
        googleUserId: userInfo.data.id ?? '',
      };
    } catch (err) {
      log.error('Google OAuth callback failed', { error: (err as Error).message });
      throw new CalendarError('Failed to authenticate with Google');
    }
  }

  async connectAccount(
    userId: string,
    code: string
  ): Promise<{ email: string; calendarId: string | null }> {
    const info = await this.handleOAuthCallback(code);

    const account = await prisma.googleCalendarAccount.upsert({
      where: {
        userId_googleUserId: { userId, googleUserId: info.googleUserId },
      },
      create: {
        userId,
        googleUserId: info.googleUserId,
        email: info.email,
        accessToken: info.accessToken,
        refreshToken: info.refreshToken,
        tokenExpiry: new Date(Date.now() + 3600 * 1000),
        status: 'CONNECTED',
      },
      update: {
        accessToken: info.accessToken,
        refreshToken: info.refreshToken,
        tokenExpiry: new Date(Date.now() + 3600 * 1000),
        status: 'CONNECTED',
      },
    });

    log.info(`Google Calendar connected for user ${userId}`);
    return { email: info.email, calendarId: account.calendarId };
  }

  private async getClientForUser(userId: string): Promise<OAuth2Client> {
    const account = await prisma.googleCalendarAccount.findFirst({
      where: { userId, status: 'CONNECTED' },
    });

    if (!account) {
      throw new CalendarError('Google Calendar is not connected for this user');
    }

    const client = this.createOAuthClient();
    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await prisma.googleCalendarAccount.update({
          where: { id: account.id },
          data: {
            accessToken: tokens.access_token,
            tokenExpiry: tokens.expiry_date
              ? new Date(tokens.expiry_date)
              : account.tokenExpiry,
          },
        });
      }
    });

    return client;
  }

  async listEvents(
    userId: string,
    params: { timeMin: string; timeMax: string; maxResults?: number }
  ): Promise<calendar_v3.Schema$Event[]> {
    const cacheKey = `calendar:events:${userId}:${params.timeMin}:${params.timeMax}`;
    const cached = await cache.get<calendar_v3.Schema$Event[]>(cacheKey);
    if (cached) return cached;

    const client = await this.getClientForUser(userId);
    const calendar = google.calendar({ version: 'v3', auth: client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      maxResults: params.maxResults ?? 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items ?? [];
    await cache.set(cacheKey, events, 300);
    return events;
  }

  async createEvent(
    userId: string,
    event: GoogleCalendarEvent
  ): Promise<calendar_v3.Schema$Event> {
    const client = await this.getClientForUser(userId);
    const calendar = google.calendar({ version: 'v3', auth: client });

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: {
            dateTime: event.start.dateTime,
            timeZone: event.start.timeZone ?? 'UTC',
          },
          end: {
            dateTime: event.end.dateTime,
            timeZone: event.end.timeZone ?? 'UTC',
          },
          ...(event.recurrence ? { recurrence: event.recurrence } : {}),
          ...(event.attendees ? { attendees: event.attendees } : {}),
          reminders: event.reminders ?? {
            useDefault: true,
          },
        },
      });
      return response.data;
    } catch (err) {
      log.error('Failed to create Google Calendar event', { error: (err as Error).message });
      throw new CalendarError('Failed to create event in Google Calendar');
    }
  }

  async updateEvent(
    userId: string,
    googleEventId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<calendar_v3.Schema$Event> {
    const client = await this.getClientForUser(userId);
    const calendar = google.calendar({ version: 'v3', auth: client });

    try {
      const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: {
          ...(event.summary ? { summary: event.summary } : {}),
          ...(event.description !== undefined ? { description: event.description } : {}),
          ...(event.location !== undefined ? { location: event.location } : {}),
          ...(event.start ? { start: event.start } : {}),
          ...(event.end ? { end: event.end } : {}),
          ...(event.reminders ? { reminders: event.reminders } : {}),
        },
      });
      return response.data;
    } catch (err) {
      log.error('Failed to update Google Calendar event', { error: (err as Error).message });
      throw new CalendarError('Failed to update event in Google Calendar');
    }
  }

  async deleteEvent(userId: string, googleEventId: string): Promise<void> {
    const client = await this.getClientForUser(userId);
    const calendar = google.calendar({ version: 'v3', auth: client });

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });
    } catch (err) {
      log.error('Failed to delete Google Calendar event', { error: (err as Error).message });
      throw new CalendarError('Failed to delete event from Google Calendar');
    }
  }

  async syncSchoolEventToGoogle(
    userId: string,
    event: {
      id: string;
      title: string;
      description?: string | null;
      location?: string | null;
      startDate: Date;
      endDate: Date;
      allDay?: boolean;
    }
  ): Promise<{ googleEventId: string }> {
    const existing = await prisma.calendarEvent.findFirst({
      where: { schoolEventId: event.id },
    });

    if (existing?.googleEventId) {
      const updated = await this.updateEvent(userId, existing.googleEventId, {
        summary: event.title,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        start: { dateTime: event.startDate.toISOString(), timeZone: 'UTC' },
        end: { dateTime: event.endDate.toISOString(), timeZone: 'UTC' },
      });
      await prisma.calendarEvent.update({
        where: { id: existing.id },
        data: { syncStatus: 'SYNCED', lastSyncedAt: new Date() },
      });
      return { googleEventId: updated.id ?? existing.googleEventId };
    }

    const created = await this.createEvent(userId, {
      summary: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      start: {
        dateTime: event.startDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endDate.toISOString(),
        timeZone: 'UTC',
      },
    });

    await prisma.calendarEvent.create({
      data: {
        schoolEventId: event.id,
        googleEventId: created.id,
        summary: event.title,
        startDateTime: event.startDate,
        endDateTime: event.endDate,
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
        createdBy: userId,
      },
    });

    return { googleEventId: created.id ?? '' };
  }

  async disconnectAccount(userId: string): Promise<void> {
    await prisma.googleCalendarAccount.updateMany({
      where: { userId },
      data: { status: 'DISCONNECTED' },
    });
    log.info(`Google Calendar disconnected for user ${userId}`);
  }

  async getAccountStatus(userId: string) {
    const account = await prisma.googleCalendarAccount.findFirst({
      where: { userId },
      select: {
        email: true,
        status: true,
        lastSyncAt: true,
        calendarId: true,
      },
    });
    return account;
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();