'use client';

import * as React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { apiClient } from '@/lib/api-client';
import { getEventTypeColor } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  type?: string;
  source?: string;
}

interface CalendarResponse {
  data: {
    items?: CalendarEvent[];
    events?: CalendarEvent[];
    source?: string;
  };
}

export default function CalendarPage() {
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const timeMin = new Date();
      timeMin.setHours(0, 0, 0, 0);
      const timeMax = new Date(timeMin);
      timeMax.setDate(timeMax.getDate() + 60);

      const result = await apiClient<CalendarResponse>(
        `/calendar/events?timeMin=${encodeURIComponent(timeMin.toISOString())}&timeMax=${encodeURIComponent(
          timeMax.toISOString()
        )}&maxResults=50`
      );
      setEvents(result.data.items ?? result.data.events ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const syncGoogle = async () => {
    try {
      const result = await apiClient<{ data: { url: string } }>('/calendar/auth-url');
      window.location.href = result.data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect Google');
    }
  };

  return (
    <>
      <PageHeader
        title="Calendar"
        description="School schedule with Google Calendar sync"
        actions={
          <>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="gradient" onClick={() => void syncGoogle()}>
              <Calendar className="h-4 w-4" />
              Connect Google Calendar
            </Button>
          </>
        }
      />

      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            Events
            <Badge variant="outline">{events.length} upcoming</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : events.length ? (
            <div className="space-y-3">
              {events.map((event) => {
                const start = new Date(event.startTime);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-white">
                      <span className="text-sm font-bold leading-none">{start.getDate()}</span>
                      <span className="text-[10px] uppercase">
                        {start.toLocaleString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{event.title}</p>
                        <Badge className={getEventTypeColor(event.type ?? 'OTHER')}>
                          {event.type ?? 'OTHER'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {start.toLocaleString('en-US', {
                          weekday: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {event.source}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p className="text-sm">No calendar events found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}