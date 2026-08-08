'use client';

import * as React from 'react';
import { AlertTriangle, CalendarDays, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SUBJECT_GRADIENTS = [
  'from-primary via-violet-500 to-fuchsia-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-sky-500 via-blue-500 to-indigo-500',
  'from-rose-500 via-pink-500 to-fuchsia-500',
  'from-lime-500 via-green-500 to-emerald-500',
];

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface TeacherUser {
  id: string;
  user: { firstName: string; lastName: string };
}

interface TimetableEntry {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string | null;
  isRecurring: boolean;
  effectiveFrom: string;
  subject: SubjectOption | null;
  teacher: TeacherUser | null;
}

interface ClassTimetableResponse {
  data: { entries: TimetableEntry[]; grouped: Record<string, TimetableEntry[]> };
}

interface ClassListResponse {
  data: { data: ClassOption[]; meta: Record<string, unknown> | null };
}

interface SubjectListResponse {
  data: { data: SubjectOption[]; meta: Record<string, unknown> | null };
}

interface TeacherListResponse {
  data: { data: TeacherOption[]; meta: Record<string, unknown> | null };
}

interface ConflictEntry {
  id: string;
  class: { name: string } | null;
  subject: { name: string } | null;
  teacher: { user: { firstName: string; lastName: string } } | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ConflictsResponse {
  data: { conflicts: ConflictEntry[]; hasConflicts: boolean };
}

interface EntryPayload {
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  isRecurring: boolean;
  effectiveFrom: string;
}

interface EntryFormValues {
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  effectiveFrom: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): EntryFormValues {
  return {
    classId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: '0',
    startTime: '08:00',
    endTime: '09:00',
    roomNumber: '',
    effectiveFrom: todayISO(),
  };
}

function gradientFor(subjectId: string): string {
  const hash = Array.from(subjectId).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SUBJECT_GRADIENTS[hash % SUBJECT_GRADIENTS.length];
}

function TimetableEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: TimetableEntry;
  onEdit: (entry: TimetableEntry) => void;
  onDelete: (entry: TimetableEntry) => void;
}) {
  return (
    <div
      className={cn(
        'group relative rounded-lg bg-gradient-to-br p-3 text-white shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        gradientFor(entry.subjectId)
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <Badge
          variant="outline"
          className="border-white/30 bg-white/10 text-[10px] text-white"
        >
          {entry.subject?.code ?? '—'}
        </Badge>
        <span className="flex items-center gap-1 text-[10px] font-medium text-white/80">
          <Clock className="h-3 w-3" />
          {entry.startTime}–{entry.endTime}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold leading-tight">
        {entry.subject?.name ?? '—'}
      </p>
      <p className="mt-0.5 truncate text-xs text-white/80">
        {entry.teacher
          ? `${entry.teacher.user.firstName} ${entry.teacher.user.lastName}`
          : '—'}
      </p>
      {entry.roomNumber && <p className="truncate text-xs text-white/70">Room {entry.roomNumber}</p>}
      <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-white hover:bg-white/20 hover:text-white"
          title="Edit entry"
          onClick={() => onEdit(entry)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-white hover:bg-white/20 hover:text-white"
          title="Delete entry"
          onClick={() => onDelete(entry)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EntryDialog({
  open,
  onOpenChange,
  mode,
  initial,
  classes,
  subjects,
  teachers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial: TimetableEntry | null;
  classes: ClassOption[];
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  onSaved: () => Promise<void> | void;
}) {
  const [values, setValues] = React.useState<EntryFormValues>(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [conflicts, setConflicts] = React.useState<ConflictEntry[]>([]);
  const [conflictsOpen, setConflictsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setValues(
      initial
        ? {
            classId: initial.classId,
            subjectId: initial.subjectId,
            teacherId: initial.teacherId,
            dayOfWeek: String(initial.dayOfWeek),
            startTime: initial.startTime,
            endTime: initial.endTime,
            roomNumber: initial.roomNumber ?? '',
            effectiveFrom: initial.effectiveFrom.slice(0, 10),
          }
        : emptyForm()
    );
    setConflicts([]);
  }, [open, initial]);

  const set = (key: keyof EntryFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const buildPayload = (): EntryPayload | null => {
    const dayOfWeek = Number(values.dayOfWeek);
    if (!values.classId || !values.subjectId || !values.teacherId) {
      toast.error('Select a class, subject and teacher');
      return null;
    }
    if (!values.startTime || !values.endTime) {
      toast.error('Start and end times are required');
      return null;
    }
    if (values.endTime <= values.startTime) {
      toast.error('End time must be after start time');
      return null;
    }
    const payload: EntryPayload = {
      classId: values.classId,
      subjectId: values.subjectId,
      teacherId: values.teacherId,
      dayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime,
      isRecurring: true,
      effectiveFrom: new Date(values.effectiveFrom).toISOString(),
    };
    const room = values.roomNumber.trim();
    if (room) payload.roomNumber = room;
    return payload;
  };

  const handleCheckConflicts = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setChecking(true);
    try {
      const result = await apiClient<ConflictsResponse>('/timetable/conflicts', {
        method: 'POST',
        body: {
          classId: payload.classId,
          teacherId: payload.teacherId,
          dayOfWeek: payload.dayOfWeek,
          startTime: payload.startTime,
          endTime: payload.endTime,
          excludeEntryId: initial?.id,
        },
      });
      setConflicts(result.data?.conflicts ?? []);
      setConflictsOpen(true);
      if (result.data?.hasConflicts) {
        toast.warning('Conflicts found for this schedule');
      } else {
        toast.success('No conflicts — schedule is clear');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check conflicts');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await apiClient('/timetable', { method: 'POST', body: payload });
        toast.success('Timetable entry added');
      } else if (initial) {
        const patch: Record<string, unknown> = {
          subjectId: payload.subjectId,
          teacherId: payload.teacherId,
          dayOfWeek: payload.dayOfWeek,
          startTime: payload.startTime,
          endTime: payload.endTime,
          effectiveFrom: payload.effectiveFrom,
        };
        if (payload.roomNumber) patch.roomNumber = payload.roomNumber;
        await apiClient(`/timetable/${initial.id}`, { method: 'PATCH', body: patch });
        toast.success('Timetable entry updated');
      }
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save timetable entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Add Timetable Entry' : 'Edit Timetable Entry'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Schedule a lesson for a class on a specific day and time.'
                : 'Update the lesson details.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Class</Label>
              <Select
                value={values.classId || undefined}
                onValueChange={set('classId')}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Subject</Label>
                <Select value={values.subjectId || undefined} onValueChange={set('subjectId')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Teacher</Label>
                <Select value={values.teacherId || undefined} onValueChange={set('teacherId')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Day of Week</Label>
              <Select value={values.dayOfWeek} onValueChange={set('dayOfWeek')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, index) => (
                    <SelectItem key={day} value={String(index)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={values.startTime}
                  onChange={(e) => set('startTime')(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={values.endTime}
                  onChange={(e) => set('endTime')(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="room-number">Room Number</Label>
                <Input
                  id="room-number"
                  placeholder="e.g. 201"
                  value={values.roomNumber}
                  onChange={(e) => set('roomNumber')(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="effective-from">Effective From</Label>
                <Input
                  id="effective-from"
                  type="date"
                  value={values.effectiveFrom}
                  onChange={(e) => set('effectiveFrom')(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => void handleCheckConflicts()}
              disabled={checking || submitting}
            >
              <AlertTriangle className="h-4 w-4" />
              {checking ? 'Checking...' : 'Check Conflicts'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? 'Saving...' : mode === 'create' ? 'Add Entry' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={conflictsOpen} onOpenChange={setConflictsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Conflict Check
            </DialogTitle>
            <DialogDescription>
              {conflicts.length === 0
                ? 'No conflicts detected for this schedule.'
                : 'The following scheduling conflicts were detected.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CalendarDays className="h-6 w-6" />
                </span>
                <p className="text-sm">Schedule is clear</p>
              </div>
            ) : (
              conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {conflict.subject?.name ?? 'Unknown subject'}
                    </p>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {DAYS[conflict.dayOfWeek]} · {conflict.startTime}–{conflict.endTime}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {conflict.teacher
                      ? `${conflict.teacher.user.firstName} ${conflict.teacher.user.lastName}`
                      : '—'}{' '}
                    · {conflict.class?.name ?? '—'}
                  </p>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TimetablePage() {
  const [classes, setClasses] = React.useState<ClassOption[]>([]);
  const [subjects, setSubjects] = React.useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = React.useState<TeacherOption[]>([]);
  const [selectedClassId, setSelectedClassId] = React.useState('');
  const [entries, setEntries] = React.useState<TimetableEntry[]>([]);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const [loadingTimetable, setLoadingTimetable] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<TimetableEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<TimetableEntry | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadOptions = async () => {
    try {
      const [classesResult, subjectsResult, teachersResult] = await Promise.all([
        apiClient<ClassListResponse>('/academic/classes?limit=100'),
        apiClient<SubjectListResponse>('/academic/subjects?limit=100'),
        apiClient<TeacherListResponse>('/users?role=TEACHER&limit=100'),
      ]);
      setClasses(classesResult.data?.data ?? []);
      setSubjects(subjectsResult.data?.data ?? []);
      setTeachers(teachersResult.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load options');
    } finally {
      setLoadingOptions(false);
    }
  };

  React.useEffect(() => {
    void loadOptions();
  }, []);

  React.useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  React.useEffect(() => {
    if (!selectedClassId) return;
    let cancelled = false;
    setLoadingTimetable(true);
    apiClient<ClassTimetableResponse>(`/timetable/class/${selectedClassId}`)
      .then((result) => {
        if (!cancelled) setEntries(result.data?.entries ?? []);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load timetable');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTimetable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient(`/timetable/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Timetable entry deleted');
      setDeleteTarget(null);
      setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete entry');
    } finally {
      setDeleting(false);
    }
  };

  const reloadTimetable = async () => {
    if (!selectedClassId) return;
    try {
      const result = await apiClient<ClassTimetableResponse>(`/timetable/class/${selectedClassId}`);
      setEntries(result.data?.entries ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reload timetable');
    }
  };

  const times = React.useMemo(() => {
    const unique = new Set(entries.map((e) => e.startTime));
    return Array.from(unique).sort();
  }, [entries]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  if (loadingOptions) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <>
        <PageHeader title="Weekly Timetable" description="Manage class schedules for the week" />
        <Card className="glass-card border-0">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 opacity-40" />
            <p className="text-sm">No classes available. Create a class first.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Weekly Timetable"
        description="Manage class schedules for the week"
        actions={
          <>
            <Select value={selectedClassId || undefined} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="gradient" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </>
        }
      />

      <Card className="glass-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            {selectedClass?.name ?? 'Timetable'}
            <Badge variant="secondary" className="ml-1">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTimetable ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          ) : entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No entries for this class yet. Click &quot;Add Entry&quot; to schedule a lesson.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: '56px repeat(7, minmax(132px, 1fr))' }}
                >
                  <div />
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="flex items-center justify-center rounded-lg bg-primary/5 py-2 text-center text-xs font-semibold uppercase tracking-wide text-primary"
                    >
                      {day}
                    </div>
                  ))}
                  {times.map((time) => (
                    <React.Fragment key={time}>
                      <div className="pt-2 text-right text-xs font-medium text-muted-foreground">
                        {time}
                      </div>
                      {DAYS.map((_, dayIndex) => {
                        const dayEntries = entries.filter(
                          (e) => e.dayOfWeek === dayIndex && e.startTime === time
                        );
                        return (
                          <div
                            key={`${time}-${dayIndex}`}
                            className="min-h-[104px] space-y-1.5 rounded-lg bg-accent/40 p-1.5"
                          >
                            {dayEntries.map((entry) => (
                              <TimetableEntryCard
                                key={entry.id}
                                entry={entry}
                                onEdit={setEditTarget}
                                onDelete={setDeleteTarget}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EntryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        initial={null}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        onSaved={reloadTimetable}
      />
      <EntryDialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        mode="edit"
        initial={editTarget}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        onSaved={reloadTimetable}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Timetable Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              {deleteTarget?.subject?.name ? `"${deleteTarget.subject.name}"` : 'this entry'} (
              {deleteTarget?.startTime}–{deleteTarget?.endTime})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
