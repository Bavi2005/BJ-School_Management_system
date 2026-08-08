'use client';

import * as React from 'react';
import { CalendarPlus, Clock, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ColumnDef } from '@tanstack/react-table';
import { EventType, UserRole } from '@school-mgmt/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import { formatDateTime, getEventTypeColor } from '@/lib/utils';

interface EventRegistration {
  id: string;
  userId: string;
  status: string;
}

interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location: string | null;
  isPublic: boolean;
  maxParticipants: number | null;
  requiresRegistration: boolean;
  eventRegistrations: EventRegistration[];
  creator?: { id: string; firstName: string; lastName: string } | null;
}

interface EventsListResponse {
  data: {
    data: SchoolEvent[];
    meta: { total: number };
  };
}

interface EventForm {
  title: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  requiresRegistration: boolean;
  maxParticipants: string;
  googleCalendarSync: boolean;
}

const EMPTY_FORM: EventForm = {
  title: '',
  type: EventType.ACADEMIC,
  description: '',
  startDate: '',
  endDate: '',
  location: '',
  requiresRegistration: false,
  maxParticipants: '',
  googleCalendarSync: false,
};

const EVENT_TYPE_OPTIONS = Object.values(EventType);

function formatEventType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function toLocalInputValue(date: string): string {
  return date.slice(0, 16);
}

function getRegistrationStatus(event: SchoolEvent): {
  label: string;
  className: string;
} {
  if (!event.requiresRegistration) {
    return {
      label: 'Open',
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    };
  }
  if (new Date(event.startDate) < new Date()) {
    return {
      label: 'Ended',
      className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    };
  }
  const count = event.eventRegistrations?.length ?? 0;
  if (event.maxParticipants && count >= event.maxParticipants) {
    return {
      label: 'Full',
      className: 'bg-red-500/10 text-red-700 dark:text-red-300',
    };
  }
  return {
    label: 'Open',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  };
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = React.useState<SchoolEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<SchoolEvent | null>(null);
  const [form, setForm] = React.useState<EventForm>(EMPTY_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<SchoolEvent | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const isAdmin =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiClient<EventsListResponse>('/events?limit=100');
      setEvents(result.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const openCreateDialog = () => {
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (event: SchoolEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      type: event.type,
      description: event.description ?? '',
      startDate: toLocalInputValue(event.startDate),
      endDate: toLocalInputValue(event.endDate),
      location: event.location ?? '',
      requiresRegistration: event.requiresRegistration,
      maxParticipants: event.maxParticipants ? String(event.maxParticipants) : '',
      googleCalendarSync: false,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) return setFormError('Please enter a title');
    if (!form.type) return setFormError('Please select an event type');
    if (!form.startDate || !form.endDate) {
      return setFormError('Please select both start and end dates');
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      return setFormError('End date must be after the start date');
    }
    if (form.requiresRegistration && form.maxParticipants) {
      const max = Number(form.maxParticipants);
      if (!Number.isFinite(max) || max <= 0) {
        return setFormError('Max participants must be a positive number');
      }
    }

    const body = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      location: form.location.trim() || undefined,
      isAllDay: false,
      requiresRegistration: form.requiresRegistration,
      maxParticipants:
        form.requiresRegistration && form.maxParticipants
          ? Number(form.maxParticipants)
          : undefined,
    };

    setSubmitting(true);
    try {
      if (editingEvent) {
        await apiClient(`/events/${editingEvent.id}`, { method: 'PATCH', body });
        toast.success('Event updated successfully');
      } else {
        await apiClient('/events', {
          method: 'POST',
          body: { ...body, googleCalendarSync: form.googleCalendarSync },
        });
        toast.success('Event created successfully');
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: SchoolEvent) => {
    try {
      await apiClient(`/events/${event.id}/register`, { method: 'POST' });
      toast.success('Registered for event');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    }
  };

  const handleUnregister = async (event: SchoolEvent) => {
    try {
      await apiClient(`/events/${event.id}/register`, { method: 'DELETE' });
      toast.success('Registration cancelled');
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to cancel registration'
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient(`/events/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Event deleted successfully');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<SchoolEvent>[] = [
    {
      accessorKey: 'title',
      header: 'Event',
      cell: ({ row }) => {
        const event = row.original;
        return (
          <div>
            <p className="font-medium">{event.title}</p>
            {event.creator && (
              <p className="text-xs text-muted-foreground">
                by {event.creator.firstName} {event.creator.lastName}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge className={getEventTypeColor(row.original.type)}>
          {formatEventType(row.original.type)}
        </Badge>
      ),
    },
    {
      id: 'dateRange',
      header: 'Date',
      cell: ({ row }) => {
        const event = row.original;
        return (
          <div className="flex items-start gap-1.5 text-sm">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p>{formatDateTime(event.startDate)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.endDate)}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => {
        const location = row.original.location ?? 'TBD';
        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {location}
          </span>
        );
      },
    },
    {
      id: 'participants',
      header: 'Participants',
      cell: ({ row }) => {
        const event = row.original;
        const count = event.eventRegistrations?.length ?? 0;
        return (
          <div>
            <p className="flex items-center gap-1.5 font-medium">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              {count}
              {event.maxParticipants ? ` / ${event.maxParticipants}` : ''}
            </p>
            {event.maxParticipants !== null &&
              count >= event.maxParticipants &&
              count > 0 && <p className="text-xs text-red-500">Full</p>}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const { label, className } = getRegistrationStatus(row.original);
        return <Badge className={className}>{label}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const event = row.original;
        const isPast = new Date(event.startDate) < new Date();
        const registered =
          event.eventRegistrations?.some((r) => r.userId === user?.id) ?? false;
        return (
          <div className="flex items-center gap-1">
            {event.requiresRegistration && !isPast && (
              registered ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void handleUnregister(event)}
                >
                  Unregister
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => void handleRegister(event)}
                >
                  Register
                </Button>
              )
            )}
            {isAdmin && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Edit event"
                  onClick={() => openEditDialog(event)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  title="Delete event"
                  onClick={() => setDeleteTarget(event)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="School Events"
        description="Create, manage and register for school events"
        actions={
          isAdmin && (
            <Button variant="gradient" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          )
        }
      />

      {events.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 shadow-lg">
              <CalendarPlus className="h-7 w-7 text-white" />
            </div>
            <p className="text-sm font-medium">No events yet</p>
            <p className="text-sm">Create your first event to get started.</p>
            {isAdmin && (
              <Button
                variant="gradient"
                size="sm"
                className="mt-2"
                onClick={openCreateDialog}
              >
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={events} pageSize={10} />
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
            <DialogDescription>
              {editingEvent
                ? 'Update the event details below.'
                : 'Add a new event to the school calendar.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Annual Sports Day"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatEventType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g. Main Auditorium"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add details about the event"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="flex cursor-pointer items-center gap-2">
                <Input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.requiresRegistration}
                  onChange={(e) =>
                    setForm({ ...form, requiresRegistration: e.target.checked })
                  }
                />
                Requires registration
              </Label>
              {form.requiresRegistration && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="maxParticipants">Max Participants (optional)</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    value={form.maxParticipants}
                    onChange={(e) =>
                      setForm({ ...form, maxParticipants: e.target.value })
                    }
                  />
                </div>
              )}
              {!editingEvent && (
                <Label className="flex cursor-pointer items-center gap-2">
                  <Input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.googleCalendarSync}
                    onChange={(e) =>
                      setForm({ ...form, googleCalendarSync: e.target.checked })
                    }
                  />
                  Sync with Google Calendar
                </Label>
              )}
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={submitting}>
                {submitting
                  ? 'Saving...'
                  : editingEvent
                    ? 'Save Changes'
                    : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.title}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
