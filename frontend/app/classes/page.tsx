'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DoorOpen, GraduationCap, Pencil, Plus, Trash2, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
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
import { Textarea } from '@/components/ui/textarea';

interface AcademicYear {
  id: string;
  name: string;
  status: string;
}

interface TeacherUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
  section: string | null;
  academicYearId: string;
  teacherId: string | null;
  roomNumber: string | null;
  capacity: number | null;
  description: string | null;
  academicYear: { name: string } | null;
  teacher: { user: { firstName: string; lastName: string } } | null;
  _count?: { students: number; enrollments: number } | null;
}

interface ClassesResponse {
  data: {
    data: ClassItem[];
    meta: Record<string, unknown> | null;
  };
}

interface YearsResponse {
  data: { data: AcademicYear[] };
}

interface TeachersResponse {
  data: { data: TeacherUser[] };
}

interface EnrolledStudent {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  studentId?: string | null;
  status?: string | null;
}

interface ClassFormValues {
  name: string;
  gradeLevel: string;
  section: string;
  academicYearId: string;
  teacherId: string;
  roomNumber: string;
  capacity: string;
  description: string;
}

const EMPTY_FORM: ClassFormValues = {
  name: '',
  gradeLevel: '',
  section: '',
  academicYearId: '',
  teacherId: '',
  roomNumber: '',
  capacity: '30',
  description: '',
};

function ClassFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  years,
  teachers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial: ClassItem | null;
  years: AcademicYear[];
  teachers: TeacherUser[];
  onSaved: () => Promise<void> | void;
}) {
  const [values, setValues] = React.useState<ClassFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setValues(
      initial
        ? {
            name: initial.name,
            gradeLevel: String(initial.gradeLevel),
            section: initial.section ?? '',
            academicYearId: initial.academicYearId,
            teacherId: initial.teacherId ?? '',
            roomNumber: initial.roomNumber ?? '',
            capacity: String(initial.capacity ?? 30),
            description: initial.description ?? '',
          }
        : EMPTY_FORM
    );
  }, [open, initial]);

  const set = (key: keyof ClassFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const gradeLevel = Number(values.gradeLevel);
    if (!values.name.trim()) {
      toast.error('Class name is required');
      return;
    }
    if (!values.academicYearId) {
      toast.error('Select an academic year');
      return;
    }
    if (!gradeLevel || gradeLevel < 1 || gradeLevel > 12) {
      toast.error('Grade level must be between 1 and 12');
      return;
    }

    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      gradeLevel,
      academicYearId: values.academicYearId,
      capacity: Number(values.capacity) || 30,
    };
    if (values.section.trim()) payload.section = values.section.trim();
    if (values.teacherId) payload.teacherId = values.teacherId;
    if (values.roomNumber.trim()) payload.roomNumber = values.roomNumber.trim();
    if (values.description.trim()) payload.description = values.description.trim();

    setSubmitting(true);
    try {
      if (mode === 'create') {
        await apiClient('/academic/classes', { method: 'POST', body: payload });
        toast.success('Class created');
      } else if (initial) {
        await apiClient(`/academic/classes/${initial.id}`, { method: 'PATCH', body: payload });
        toast.success('Class updated');
      }
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save class');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Class' : 'Edit Class'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new class for the selected academic year.'
              : 'Update the class details.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="class-name">Name</Label>
            <Input
              id="class-name"
              placeholder="e.g. Grade 10 Alpha"
              value={values.name}
              onChange={(e) => set('name')(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="grade-level">Grade Level</Label>
              <Input
                id="grade-level"
                type="number"
                min={1}
                max={12}
                placeholder="1-12"
                value={values.gradeLevel}
                onChange={(e) => set('gradeLevel')(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                placeholder="e.g. A"
                value={values.section}
                onChange={(e) => set('section')(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Academic Year</Label>
            <Select value={values.academicYearId} onValueChange={set('academicYearId')}>
              <SelectTrigger>
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Teacher</Label>
            <Select value={values.teacherId || undefined} onValueChange={set('teacherId')}>
              <SelectTrigger>
                <SelectValue placeholder="Assign a teacher (optional)" />
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
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={values.capacity}
                onChange={(e) => set('capacity')(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Optional description"
              value={values.description}
              onChange={(e) => set('description')(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Saving...' : mode === 'create' ? 'Create Class' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudentsDialog({
  target,
  onOpenChange,
}: {
  target: ClassItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [students, setStudents] = React.useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setLoading(true);
    apiClient<unknown>(`/academic/classes/${target.id}/students`)
      .then((result) => {
        if (cancelled) return;
        const list = Array.isArray(result)
          ? (result as EnrolledStudent[])
          : ((result as { data?: EnrolledStudent[] }).data ?? []);
        setStudents(Array.isArray(list) ? list : []);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load students');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Students — {target?.name ?? ''}</DialogTitle>
          <DialogDescription>Students currently enrolled in this class.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))
          ) : students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No students enrolled yet
            </p>
          ) : (
            students.map((student) => {
              const name =
                student.name ??
                ([student.firstName, student.lastName].filter(Boolean).join(' ') || 'Unknown');
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    {student.studentId && (
                      <p className="text-xs text-muted-foreground">{student.studentId}</p>
                    )}
                  </div>
                  <Badge variant={student.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {student.status ?? '—'}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignTeacherDialog({
  target,
  teachers,
  onOpenChange,
  onAssigned,
}: {
  target: ClassItem | null;
  teachers: TeacherUser[];
  onOpenChange: (open: boolean) => void;
  onAssigned: () => Promise<void> | void;
}) {
  const [teacherId, setTeacherId] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (target) setTeacherId(target.teacherId ?? '');
  }, [target]);

  const handleAssign = async () => {
    if (!target) return;
    if (!teacherId) {
      toast.error('Select a teacher');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient(`/academic/classes/${target.id}/assign-teacher`, {
        method: 'POST',
        body: { teacherId },
      });
      toast.success('Teacher assigned');
      onOpenChange(false);
      await onAssigned();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign teacher');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Teacher</DialogTitle>
          <DialogDescription>
            Assign a homeroom teacher to {target?.name ?? 'this class'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Teacher</Label>
          <Select value={teacherId || undefined} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a teacher" />
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
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="gradient" onClick={() => void handleAssign()} disabled={submitting}>
            {submitting ? 'Assigning...' : 'Assign Teacher'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClassesPage() {
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [years, setYears] = React.useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = React.useState<TeacherUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ClassItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ClassItem | null>(null);
  const [studentsTarget, setStudentsTarget] = React.useState<ClassItem | null>(null);
  const [assignTarget, setAssignTarget] = React.useState<ClassItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    try {
      const result = await apiClient<ClassesResponse>('/academic/classes?limit=100');
      setClasses(result.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [yearsResult, teachersResult] = await Promise.all([
        apiClient<YearsResponse>('/academic/years?limit=100'),
        apiClient<TeachersResponse>('/users?role=TEACHER&limit=100'),
      ]);
      setYears(yearsResult.data?.data ?? []);
      setTeachers(teachersResult.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load options');
    }
  };

  React.useEffect(() => {
    void load();
    void loadOptions();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient(`/academic/classes/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Class deleted');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete class');
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<ClassItem>[] = [
    {
      accessorKey: 'name',
      header: 'Class',
      cell: ({ row }) => {
        const cls = row.original;
        return (
          <div>
            <p className="font-medium">{cls.name}</p>
            <p className="text-xs text-muted-foreground">
              Grade {cls.gradeLevel}
              {cls.section ? ` · Section ${cls.section}` : ''}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: 'academicYear',
      header: 'Academic Year',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.academicYear?.name ?? '—'}</Badge>
      ),
    },
    {
      accessorKey: 'teacher',
      header: 'Teacher',
      cell: ({ row }) => {
        const teacher = row.original.teacher;
        return teacher ? (
          <span className="text-sm">
            {teacher.user.firstName} {teacher.user.lastName}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Not assigned</span>
        );
      },
    },
    {
      accessorKey: 'capacity',
      header: 'Details',
      cell: ({ row }) => {
        const cls = row.original;
        const capacity = cls.capacity ?? 30;
        const count = cls._count?.students ?? 0;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={count >= capacity ? 'destructive' : 'secondary'}>
              {count}/{capacity} students
            </Badge>
            {cls.roomNumber && (
              <Badge variant="info" className="gap-1">
                <DoorOpen className="h-3 w-3" />
                {cls.roomNumber}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <GraduationCap className="h-3 w-3" />
              Grade {cls.gradeLevel}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'students',
      header: 'Students',
      cell: ({ row }) => {
        const count = row.original._count?.students ?? 0;
        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {count}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const cls = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Edit class"
              onClick={() => setEditTarget(cls)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="View students"
              onClick={() => setStudentsTarget(cls)}
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Assign teacher"
              onClick={() => setAssignTarget(cls)}
            >
              <UserCog className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              title="Delete class"
              onClick={() => setDeleteTarget(cls)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Classes"
        description={`${classes.length} classes in the system`}
        actions={
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Class
          </Button>
        }
      />
      <DataTable columns={columns} data={classes} />

      <ClassFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        initial={null}
        years={years}
        teachers={teachers}
        onSaved={load}
      />
      <ClassFormDialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        mode="edit"
        initial={editTarget}
        years={years}
        teachers={teachers}
        onSaved={load}
      />
      <StudentsDialog
        target={studentsTarget}
        onOpenChange={(open) => {
          if (!open) setStudentsTarget(null);
        }}
      />
      <AssignTeacherDialog
        target={assignTarget}
        teachers={teachers}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null);
        }}
        onAssigned={load}
      />
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot
              be undone.
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
