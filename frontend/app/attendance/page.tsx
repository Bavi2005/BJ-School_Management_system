'use client';

import * as React from 'react';
import {
  ClipboardCheck,
  Clock,
  Pencil,
  Percent,
  Plus,
  ShieldCheck,
  Timer,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import { formatDate, getStatusColor } from '@/lib/utils';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'HALF_DAY';

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
  'HALF_DAY',
];

interface AttendanceStats {
  total: number;
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EXCUSED: number;
  HALF_DAY: number;
  attendanceRate: number;
}

interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number;
  section?: string | null;
}

interface StudentUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

interface ClassStudent {
  id: string;
  studentId?: string;
  userId?: string;
  user?: StudentUser;
  student?: { user?: StudentUser };
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string | null;
  user?: StudentUser;
  student?: { user?: StudentUser };
  class?: { name?: string } | null;
  subject?: { name?: string } | null;
}

function getStudentName(item: ClassStudent | AttendanceRecord): string {
  const user = item.user ?? item.student?.user;
  if (!user?.firstName) return 'Unknown Student';
  return `${user.firstName} ${user.lastName ?? ''}`.trim();
}

export default function AttendancePage() {
  const { user } = useAuth();

  const [stats, setStats] = React.useState<AttendanceStats | null>(null);
  const [history, setHistory] = React.useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [markOpen, setMarkOpen] = React.useState(false);
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = React.useState('');
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = React.useState<ClassStudent[]>([]);
  const [studentStatuses, setStudentStatuses] = React.useState<Record<string, AttendanceStatus>>(
    {}
  );
  const [loadingStudents, setLoadingStudents] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [editRecord, setEditRecord] = React.useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = React.useState<AttendanceStatus>('PRESENT');
  const [savingEdit, setSavingEdit] = React.useState(false);

  const loadStats = async () => {
    try {
      const result = await apiClient<{ data: AttendanceStats }>('/attendance/stats');
      setStats(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load attendance stats');
    }
  };

  const loadHistory = async () => {
    try {
      const result = await apiClient<{ data: AttendanceRecord[] }>('/attendance/today');
      setHistory(result.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load attendance history');
    }
  };

  React.useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([loadStats(), loadHistory()]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const loadClasses = async () => {
    try {
      const result = await apiClient<{ data: { data: ClassItem[] } }>('/academic/classes?limit=100');
      setClasses(result.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load classes');
    }
  };

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    setStudents([]);
    setStudentStatuses({});
    try {
      setLoadingStudents(true);
      const result = await apiClient<{ data: ClassStudent[] }>(
        `/academic/classes/${classId}/students`
      );
      const items = result.data ?? [];
      setStudents(items);
      setStudentStatuses(Object.fromEntries(items.map((s) => [s.id, 'PRESENT' as AttendanceStatus])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const submitAttendance = async () => {
    if (!user) {
      toast.error('You must be signed in to mark attendance');
      return;
    }
    if (!selectedClassId) {
      toast.error('Select a class first');
      return;
    }
    try {
      setSubmitting(true);
      const records = students.map((s) => ({
        studentId: s.id,
        status: studentStatuses[s.id] ?? ('PRESENT' as AttendanceStatus),
      }));
      const result = await apiClient<{ data: { total: number; recorded: number } }>(
        '/attendance/bulk',
        {
          method: 'POST',
          body: {
            classId: selectedClassId,
            date: new Date(date).toISOString(),
            records,
            recordedBy: user.id,
          },
        }
      );
      toast.success(`Attendance marked for ${result.data?.recorded ?? records.length} students`);
      setMarkOpen(false);
      setSelectedClassId('');
      setStudents([]);
      setStudentStatuses({});
      void loadStats();
      void loadHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async () => {
    if (!editRecord) return;
    try {
      setSavingEdit(true);
      await apiClient(`/attendance/${editRecord.id}`, {
        method: 'PATCH',
        body: { status: editStatus },
      });
      toast.success('Attendance status updated');
      setEditRecord(null);
      void loadStats();
      void loadHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update attendance');
    } finally {
      setSavingEdit(false);
    }
  };

  const columns: ColumnDef<AttendanceRecord>[] = [
    {
      id: 'student',
      header: 'Student',
      cell: ({ row }) => {
        const record = row.original;
        const name = getStudentName(record);
        const avatarUrl = record.user?.avatarUrl ?? record.student?.user?.avatarUrl ?? null;
        return (
          <div className="flex items-center gap-3">
            <Avatar name={name} src={avatarUrl} size="sm" />
            <span className="font-medium">{name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'class.name',
      header: 'Class',
      cell: ({ row }) => row.original.class?.name ?? '—',
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>{row.original.status}</Badge>
      ),
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => row.original.remarks ?? '—',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          title="Edit status"
          onClick={() => {
            setEditRecord(row.original);
            setEditStatus(row.original.status);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Records', value: stats.total, icon: ClipboardCheck, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Present', value: stats.PRESENT, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Absent', value: stats.ABSENT, icon: UserX, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Late', value: stats.LATE, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Excused', value: stats.EXCUSED, icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Half Day', value: stats.HALF_DAY, icon: Timer, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Attendance Rate', value: `${stats.attendanceRate}%`, icon: Percent, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' },
  ];

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Track and manage student attendance"
        actions={
          <Button variant="gradient" onClick={() => setMarkOpen(true)}>
            <Plus className="h-4 w-4" />
            Mark Attendance
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="glass-card border-0">
            <CardContent className="p-4">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${bg} ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={history} pageSize={10} />
        </CardContent>
      </Card>

      <Dialog
        open={markOpen}
        onOpenChange={(open) => {
          setMarkOpen(open);
          if (open) void loadClasses();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Mark Attendance
            </DialogTitle>
            <DialogDescription>
              Select a class and date, then set a status for each student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClassId} onValueChange={(v) => void handleClassChange(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.gradeLevel ? ` (Grade ${c.gradeLevel})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendance-date">Date</Label>
                <Input
                  id="attendance-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {loadingStudents ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-md" />
                ))}
              </div>
            ) : students.length > 0 ? (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {students.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={getStudentName(s)} size="sm" />
                      <span className="truncate text-sm font-medium">{getStudentName(s)}</span>
                    </div>
                    <Select
                      value={studentStatuses[s.id] ?? 'PRESENT'}
                      onValueChange={(v) =>
                        setStudentStatuses((prev) => ({
                          ...prev,
                          [s.id]: v as AttendanceStatus,
                        }))
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTENDANCE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Select a class to load enrolled students.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              disabled={!selectedClassId || students.length === 0 || submitting}
              onClick={() => void submitAttendance()}
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Saving...' : 'Mark Attendance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editRecord !== null} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>Change the attendance status for this record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={editStatus}
              onValueChange={(v) => setEditStatus(v as AttendanceStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>
              Cancel
            </Button>
            <Button variant="gradient" disabled={savingEdit} onClick={() => void saveEdit()}>
              {savingEdit ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
