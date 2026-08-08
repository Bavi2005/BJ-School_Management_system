'use client';

import * as React from 'react';
import {
  CalendarDays,
  Droplets,
  Eye,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Search,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { apiClient } from '@/lib/api-client';
import { formatDate, getStatusColor } from '@/lib/utils';

interface Student {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  createdAt: string;
}

interface StudentProfile {
  id: string;
  studentId: string;
  enrollmentNumber: string;
  admissionDate: string | null;
  bloodGroup: string | null;
  emergencyContact: string | null;
  medicalNotes: string | null;
  classId: string | null;
  class: { id: string; name: string } | null;
}

interface StudentDetail extends Student {
  studentProfile: StudentProfile | null;
}

interface UsersResponse {
  data: {
    data: Student[];
    meta: Record<string, unknown>;
  };
}

interface UserDetailResponse {
  data: StudentDetail;
}

interface StudentForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  status: string;
}

const EMPTY_FORM: StudentForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  status: 'ACTIVE',
};

const PASSWORD_REGEXES = [
  { pattern: /.{8,}/, message: 'Password must be at least 8 characters' },
  { pattern: /[a-z]/, message: 'Password must contain a lowercase letter' },
  { pattern: /[A-Z]/, message: 'Password must contain an uppercase letter' },
  { pattern: /[0-9]/, message: 'Password must contain a digit' },
  { pattern: /[^A-Za-z0-9]/, message: 'Password must contain a special character' },
];

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'];

type DialogMode = 'add' | 'edit' | null;

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [form, setForm] = React.useState<StudentForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailStudent, setDetailStudent] = React.useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingStudent, setDeletingStudent] = React.useState<Student | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    try {
      const result = await apiClient<UsersResponse>('/users?role=STUDENT&limit=100');
      setStudents(result.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const filteredStudents = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
    );
  }, [students, search]);

  const openAddDialog = () => {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogMode('add');
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      password: '',
      phone: student.phone ?? '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      address: student.address ?? '',
      status: student.status,
    });
    setFormError(null);
    setDialogMode('edit');
  };

  const openDetailDialog = async (student: Student) => {
    setDetailStudent(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const result = await apiClient<UserDetailResponse>(`/users/${student.id}`);
      setDetailStudent(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load student details');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setFormError('First name, last name, and email are required');
      return;
    }

    if (dialogMode === 'add') {
      for (const { pattern, message } of PASSWORD_REGEXES) {
        if (!pattern.test(form.password)) {
          setFormError(message);
          return;
        }
      }
    }

    const dateOfBirth = form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined;

    setSubmitting(true);
    try {
      if (dialogMode === 'add') {
        await apiClient('/users', {
          method: 'POST',
          body: {
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
            role: 'STUDENT',
            phone: form.phone || undefined,
            dateOfBirth,
            address: form.address || undefined,
          },
        });
        toast.success('Student added successfully');
      } else if (dialogMode === 'edit' && editingStudent) {
        await apiClient(`/users/${editingStudent.id}`, {
          method: 'PATCH',
          body: {
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone || undefined,
            dateOfBirth,
            address: form.address || undefined,
            status: form.status,
          },
        });
        toast.success('Student updated successfully');
      }
      setDialogMode(null);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    setDeleting(true);
    try {
      await apiClient(`/users/${deletingStudent.id}`, { method: 'DELETE' });
      toast.success('Student deleted successfully');
      setDeleteOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'firstName',
      header: 'Student',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={`${row.original.firstName} ${row.original.lastName}`}
            src={row.original.avatarUrl}
            size="sm"
          />
          <div>
            <p className="font-medium">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone ?? '—',
    },
    {
      accessorKey: 'dateOfBirth',
      header: 'Date of Birth',
      cell: ({ row }) =>
        row.original.dateOfBirth ? formatDate(row.original.dateOfBirth) : '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>{row.original.status}</Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="View"
            onClick={() => void openDetailDialog(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Edit"
            onClick={() => openEditDialog(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            title="Delete"
            onClick={() => {
              setDeletingStudent(row.original);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const hasStudents = students.length > 0;
  const showEmptyState = !loading && !hasStudents;
  const showTable = !loading && hasStudents;

  return (
    <>
      <PageHeader
        title="Students"
        description={`${students.length} students enrolled`}
        actions={
          <Button variant="gradient" onClick={openAddDialog}>
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        }
      />

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      )}

      {showEmptyState && (
        <Card className="border-0 shadow-lg">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 shadow-lg">
              <Users className="h-7 w-7 text-white" />
            </div>
            <p className="text-sm font-medium">No students yet</p>
            <p className="text-sm">Add your first student to get started.</p>
            <Button variant="gradient" size="sm" onClick={openAddDialog} className="mt-2">
              <UserPlus className="h-4 w-4" />
              Add Student
            </Button>
          </CardContent>
        </Card>
      )}

      {showTable && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm pl-9"
            />
          </div>
          <DataTable columns={columns} data={filteredStudents} pageSize={10} />
        </>
      )}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add Student' : 'Edit Student'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add'
                ? 'Create a new student account. The student can sign in with these credentials.'
                : 'Update the student profile details.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@school.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={dialogMode === 'edit'}
                required
              />
            </div>
            {dialogMode === 'add' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters with upper, lower, digit & special"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be 8+ characters and include an uppercase, lowercase, digit, and special
                  character.
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth (optional)</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Textarea
                id="address"
                placeholder="123 Main Street, Springfield"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            {dialogMode === 'edit' && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogMode(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {dialogMode === 'add' ? 'Create Student' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>Full profile information</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detailStudent ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar
                  name={`${detailStudent.firstName} ${detailStudent.lastName}`}
                  src={detailStudent.avatarUrl}
                  size="xl"
                />
                <div>
                  <p className="text-lg font-semibold">
                    {detailStudent.firstName} {detailStudent.lastName}
                  </p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {detailStudent.email}
                  </p>
                  <Badge className={`mt-1 ${getStatusColor(detailStudent.status)}`}>
                    {detailStudent.status}
                  </Badge>
                </div>
              </div>

              {detailStudent.studentProfile && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem
                    icon={<GraduationCap className="h-4 w-4" />}
                    label="Student ID"
                    value={detailStudent.studentProfile.studentId}
                  />
                  <DetailItem
                    icon={<GraduationCap className="h-4 w-4" />}
                    label="Enrollment No."
                    value={detailStudent.studentProfile.enrollmentNumber}
                  />
                  <DetailItem
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Admission Date"
                    value={
                      detailStudent.studentProfile.admissionDate
                        ? formatDate(detailStudent.studentProfile.admissionDate)
                        : null
                    }
                  />
                  <DetailItem
                    icon={<GraduationCap className="h-4 w-4" />}
                    label="Class"
                    value={detailStudent.studentProfile.class?.name ?? null}
                  />
                  <DetailItem
                    icon={<Droplets className="h-4 w-4" />}
                    label="Blood Group"
                    value={detailStudent.studentProfile.bloodGroup}
                  />
                  <DetailItem
                    icon={<Phone className="h-4 w-4" />}
                    label="Emergency Contact"
                    value={detailStudent.studentProfile.emergencyContact}
                  />
                  <DetailItem
                    icon={<Stethoscope className="h-4 w-4" />}
                    label="Medical Notes"
                    value={detailStudent.studentProfile.medicalNotes}
                    full
                  />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={detailStudent.phone}
                />
                <DetailItem
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Date of Birth"
                  value={detailStudent.dateOfBirth ? formatDate(detailStudent.dateOfBirth) : null}
                />
                <DetailItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Address"
                  value={detailStudent.address}
                  full
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deletingStudent
                  ? `${deletingStudent.firstName} ${deletingStudent.lastName}`
                  : ''}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailItem({
  icon,
  label,
  value,
  full = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  full?: boolean;
}) {
  return (
    <div className={`${full ? 'sm:col-span-2' : ''} rounded-xl border bg-muted/40 p-3`}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-medium break-words">{value ?? '—'}</p>
    </div>
  );
}
