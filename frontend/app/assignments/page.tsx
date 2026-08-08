'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@school-mgmt/shared';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import { formatDateTime, getStatusColor } from '@/lib/utils';

interface AssignmentItem {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  description: string | null;
  dueDate: string;
  maxScore: number;
  status: string;
  createdAt: string;
  class: { name: string; gradeLevel: number | null; section: string | null } | null;
  subject: { name: string; code: string | null } | null;
  _count?: { submissions: number };
}

interface SubjectItem {
  id: string;
  name: string;
  code: string | null;
}

interface ClassItem {
  id: string;
  name: string;
  gradeLevel: number | null;
  section: string | null;
}

interface SubmissionItem {
  id: string;
  assignmentId: string;
  content: string | null;
  status: string;
  grade: number | null;
  maxScore: number | null;
  feedback: string | null;
  submittedAt: string;
  student: {
    user: { firstName: string; lastName: string; avatarUrl: string | null };
  } | null;
}

interface MySubmission {
  id: string;
  assignmentId: string;
  content: string | null;
  status: string;
  grade: number | null;
  maxScore: number | null;
  feedback: string | null;
  submittedAt: string;
  assignment: {
    title: string;
    subject: { name: string } | null;
    class: { name: string } | null;
  };
}

type GradeDraft = { score: string; feedback: string };

function isClosed(assignment: AssignmentItem): boolean {
  return assignment.status === 'CLOSED' || new Date(assignment.dueDate) < new Date();
}

function toDateTimeLocal(value: string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getStudentName(submission: SubmissionItem): string {
  const user = submission.student?.user;
  if (!user?.firstName) return 'Unknown Student';
  return `${user.firstName} ${user.lastName ?? ''}`.trim();
}

export default function AssignmentsPage() {
  const { user } = useAuth();

  const isStaff =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.TEACHER;
  const isStudent = user?.role === UserRole.STUDENT;

  const [assignments, setAssignments] = React.useState<AssignmentItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [mySubmissions, setMySubmissions] = React.useState<MySubmission[]>([]);
  const [mySubmissionsLoading, setMySubmissionsLoading] = React.useState(false);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AssignmentItem | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [subjects, setSubjects] = React.useState<SubjectItem[]>([]);
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const [classId, setClassId] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [maxScore, setMaxScore] = React.useState('100');

  const [submissionsAssignment, setSubmissionsAssignment] =
    React.useState<AssignmentItem | null>(null);
  const [submissions, setSubmissions] = React.useState<SubmissionItem[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = React.useState(false);
  const [gradeDrafts, setGradeDrafts] = React.useState<Record<string, GradeDraft>>({});
  const [gradingId, setGradingId] = React.useState<string | null>(null);

  const [submitTarget, setSubmitTarget] = React.useState<AssignmentItem | null>(null);
  const [submitContent, setSubmitContent] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<AssignmentItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadAssignments = async () => {
    try {
      const result = await apiClient<{ data: { data: AssignmentItem[] } }>(
        '/assignments?limit=100'
      );
      setAssignments(result.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load assignments');
    }
  };

  const loadMySubmissions = async () => {
    try {
      setMySubmissionsLoading(true);
      const result = await apiClient<{ data: MySubmission[] }>('/assignments/my-submissions');
      setMySubmissions(result.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load your submissions');
    } finally {
      setMySubmissionsLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [subjectsRes, classesRes] = await Promise.all([
        apiClient<{ data: { data: SubjectItem[] } }>('/academic/subjects?limit=100'),
        apiClient<{ data: { data: ClassItem[] } }>('/academic/classes?limit=100'),
      ]);
      setSubjects(subjectsRes.data?.data ?? []);
      setClasses(classesRes.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load options');
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await loadAssignments();
        if (!cancelled && isStudent) await loadMySubmissions();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent]);

  const openEditor = (assignment?: AssignmentItem) => {
    setEditing(assignment ?? null);
    setTitle(assignment?.title ?? '');
    setDescription(assignment?.description ?? '');
    setSubjectId(assignment?.subjectId ?? '');
    setClassId(assignment?.classId ?? '');
    setDueDate(assignment ? toDateTimeLocal(assignment.dueDate) : '');
    setMaxScore(assignment ? String(assignment.maxScore) : '100');
    setEditorOpen(true);
    void loadOptions();
  };

  const saveAssignment = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!subjectId) {
      toast.error('Select a subject');
      return;
    }
    if (!classId) {
      toast.error('Select a class');
      return;
    }
    if (!dueDate) {
      toast.error('Set a due date');
      return;
    }
    try {
      setSaving(true);
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        subjectId,
        classId,
        dueDate: new Date(dueDate).toISOString(),
        maxScore: Number(maxScore) || 0,
      };
      if (editing) {
        await apiClient(`/assignments/${editing.id}`, { method: 'PATCH', body });
        toast.success('Assignment updated');
      } else {
        await apiClient('/assignments', { method: 'POST', body });
        toast.success('Assignment created');
      }
      setEditorOpen(false);
      setEditing(null);
      void loadAssignments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  const openSubmissions = async (assignment: AssignmentItem) => {
    setSubmissionsAssignment(assignment);
    setSubmissions([]);
    setGradeDrafts({});
    try {
      setSubmissionsLoading(true);
      const result = await apiClient<{ data: SubmissionItem[] }>(
        `/assignments/${assignment.id}/submissions`
      );
      setSubmissions(result.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const updateGradeDraft = (submissionId: string, field: keyof GradeDraft, value: string) => {
    setGradeDrafts((prev) => ({
      ...prev,
      [submissionId]: { ...(prev[submissionId] ?? { score: '', feedback: '' }), [field]: value },
    }));
  };

  const gradeSubmission = async (submissionId: string) => {
    const draft = gradeDrafts[submissionId];
    const score = Number(draft?.score);
    if (!draft?.score || Number.isNaN(score)) {
      toast.error('Enter a score first');
      return;
    }
    const submission = submissions.find((s) => s.id === submissionId);
    const max = submission?.maxScore ?? submissionsAssignment?.maxScore;
    if (max !== null && max !== undefined && score > max) {
      toast.error(`Score cannot exceed ${max}`);
      return;
    }
    try {
      setGradingId(submissionId);
      await apiClient(`/assignments/submissions/${submissionId}/grade`, {
        method: 'POST',
        body: { grade: score, feedback: draft.feedback.trim() || undefined },
      });
      toast.success('Submission graded');
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? {
                ...s,
                grade: score,
                feedback: draft.feedback.trim() || null,
                status: 'GRADED',
              }
            : s
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to grade submission');
    } finally {
      setGradingId(null);
    }
  };

  const submitAssignment = async () => {
    if (!submitTarget) return;
    if (!submitContent.trim()) {
      toast.error('Write something to submit');
      return;
    }
    try {
      setSubmitting(true);
      await apiClient(`/assignments/${submitTarget.id}/submit`, {
        method: 'POST',
        body: { content: submitContent.trim() },
      });
      toast.success('Assignment submitted');
      setSubmitTarget(null);
      setSubmitContent('');
      void loadAssignments();
      void loadMySubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAssignment = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiClient(`/assignments/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Assignment deleted');
      setDeleteTarget(null);
      void loadAssignments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete assignment');
    } finally {
      setDeleting(false);
    }
  };

  const mySubmissionMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    mySubmissions.forEach((s) => {
      map[s.assignmentId] = s.status;
    });
    return map;
  }, [mySubmissions]);

  const columns: ColumnDef<AssignmentItem>[] = [
    {
      accessorKey: 'title',
      header: 'Assignment',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.title}</p>
            {row.original.description && (
              <p className="line-clamp-1 max-w-xs text-xs text-muted-foreground">
                {row.original.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'subject.name',
      header: 'Subject',
      cell: ({ row }) => row.original.subject?.name ?? '—',
    },
    {
      accessorKey: 'class.name',
      header: 'Class',
      cell: ({ row }) => row.original.class?.name ?? '—',
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => formatDateTime(row.original.dueDate),
    },
    {
      accessorKey: 'maxScore',
      header: 'Max Score',
      cell: ({ row }) => row.original.maxScore,
    },
    {
      id: 'submissions',
      header: 'Submissions',
      cell: ({ row }) => row.original._count?.submissions ?? 0,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        isClosed(row.original) ? (
          <Badge variant="secondary">CLOSED</Badge>
        ) : (
          <Badge variant="success">OPEN</Badge>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const assignment = row.original;
        if (isStaff) {
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                title="View submissions"
                onClick={() => void openSubmissions(assignment)}
              >
                <ClipboardList className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Edit assignment"
                onClick={() => openEditor(assignment)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Delete assignment"
                onClick={() => setDeleteTarget(assignment)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        }
        if (isStudent) {
          const submitted = mySubmissionMap[assignment.id];
          return (
            <Button
              variant="ghost"
              size="sm"
              disabled={isClosed(assignment)}
              title={submitted ? 'Resubmit your work' : 'Submit your work'}
              onClick={() => {
                setSubmitTarget(assignment);
                setSubmitContent('');
              }}
            >
              <Upload className="h-4 w-4" />
              {submitted ? 'Resubmit' : 'Submit'}
            </Button>
          );
        }
        return null;
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const openCount = assignments.filter((a) => !isClosed(a)).length;
  const closedCount = assignments.length - openCount;

  const statCards = [
    {
      label: 'Total Assignments',
      value: assignments.length,
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Open',
      value: openCount,
      icon: ClipboardList,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Closed',
      value: closedCount,
      icon: CheckCircle2,
      color: 'text-fuchsia-500',
      bg: 'bg-fuchsia-500/10',
    },
  ];

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Homework, submissions, and grading"
        actions={
          isStaff ? (
            <Button variant="gradient" onClick={() => openEditor()}>
              <Plus className="h-4 w-4" />
              Create Assignment
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Assignments</TabsTrigger>
          {isStudent && <TabsTrigger value="my">My Submissions</TabsTrigger>}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="glass-card border-0">
                <CardContent className="p-4">
                  <div
                    className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${bg} ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">All Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <BookOpen className="h-12 w-12 opacity-40" />
                  <p className="text-sm">No assignments found</p>
                  {isStaff && (
                    <Button variant="gradient" size="sm" onClick={() => openEditor()}>
                      <Plus className="h-4 w-4" />
                      Create the first assignment
                    </Button>
                  )}
                </div>
              ) : (
                <DataTable columns={columns} data={assignments} pageSize={10} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isStudent && (
          <TabsContent value="my">
            {mySubmissionsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : mySubmissions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Upload className="h-12 w-12 opacity-40" />
                <p className="text-sm">You have not submitted any assignments yet</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {mySubmissions.map((submission) => (
                  <Card key={submission.id} className="glass-card border-0">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="truncate text-sm">
                              {submission.assignment.title}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {submission.assignment.subject?.name}
                              {submission.assignment.class?.name
                                ? ` · ${submission.assignment.class.name}`
                                : ''}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(submission.status)}>
                          {submission.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {submission.content && (
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {submission.content}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDateTime(submission.submittedAt)}
                      </p>
                      {submission.grade !== null && submission.grade !== undefined ? (
                        <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 p-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                              {submission.grade} / {submission.maxScore ?? '—'}
                            </p>
                            {submission.feedback && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {submission.feedback}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-300">
                          Awaiting grade
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={editorOpen} onOpenChange={(open) => !open && setEditorOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <Pencil className="h-5 w-5 text-primary" />
              ) : (
                <Plus className="h-5 w-5 text-primary" />
              )}
              {editing ? 'Edit Assignment' : 'Create Assignment'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the assignment details.'
                : 'Publish a new assignment for a class.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignment-title">Title</Label>
              <Input
                id="assignment-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 5 Problem Set"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-description">Description</Label>
              <Textarea
                id="assignment-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions, resources, and expectations"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        {s.code ? ` (${s.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={classId} onValueChange={setClassId}>
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assignment-due">Due Date</Label>
                <Input
                  id="assignment-due"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-score">Max Score</Label>
                <Input
                  id="assignment-score"
                  type="number"
                  min={0}
                  step="any"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" disabled={saving} onClick={() => void saveAssignment()}>
              <Plus className="h-4 w-4" />
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={submissionsAssignment !== null}
        onOpenChange={(open) => !open && setSubmissionsAssignment(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Submissions
            </DialogTitle>
            <DialogDescription>
              {submissionsAssignment?.title ?? ''} — {submissions.length} submission
              {submissions.length === 1 ? '' : 's'}
            </DialogDescription>
          </DialogHeader>
          {submissionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-40" />
              <p className="text-sm">No submissions yet</p>
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {submissions.map((submission) => {
                const draft = gradeDrafts[submission.id] ?? { score: '', feedback: '' };
                const isGraded =
                  submission.grade !== null && submission.grade !== undefined;
                const max = submission.maxScore ?? submissionsAssignment?.maxScore;
                return (
                  <div key={submission.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={getStudentName(submission)}
                          src={submission.student?.user.avatarUrl}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium">{getStudentName(submission)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(submission.submittedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isGraded ? (
                          <Badge variant="success">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {submission.grade}/{max ?? '—'}
                          </Badge>
                        ) : (
                          <Badge variant="warning">Ungraded</Badge>
                        )}
                        <Badge className={getStatusColor(submission.status)}>
                          {submission.status}
                        </Badge>
                      </div>
                    </div>
                    {submission.content && (
                      <div className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                        {submission.content}
                      </div>
                    )}
                    {submission.feedback && (
                      <p className="mt-2 text-xs italic text-muted-foreground">
                        Feedback: {submission.feedback}
                      </p>
                    )}
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <div className="flex-1">
                        <Label className="text-xs">Score (max {max ?? '—'})</Label>
                        <Input
                          type="number"
                          min={0}
                          max={max ?? undefined}
                          step="any"
                          value={draft.score}
                          onChange={(e) => updateGradeDraft(submission.id, 'score', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex-[2]">
                        <Label className="text-xs">Feedback</Label>
                        <Input
                          value={draft.feedback}
                          onChange={(e) =>
                            updateGradeDraft(submission.id, 'feedback', e.target.value)
                          }
                          placeholder="Feedback for the student"
                        />
                      </div>
                      <Button
                        variant="gradient"
                        size="sm"
                        className="sm:self-end"
                        disabled={gradingId === submission.id}
                        onClick={() => void gradeSubmission(submission.id)}
                      >
                        {gradingId === submission.id ? 'Saving...' : 'Grade'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={submitTarget !== null}
        onOpenChange={(open) => !open && setSubmitTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              {submitTarget && mySubmissionMap[submitTarget.id] ? 'Resubmit' : 'Submit'} Assignment
            </DialogTitle>
            <DialogDescription>{submitTarget?.title ?? ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="submission-content">Your Work</Label>
            <Textarea
              id="submission-content"
              rows={6}
              value={submitContent}
              onChange={(e) => setSubmitContent(e.target.value)}
              placeholder="Type your answer, summary, or explanation here"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              disabled={submitting || !submitContent.trim()}
              onClick={() => void submitAssignment()}
            >
              <Upload className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot
              be undone and will remove all submissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void deleteAssignment()}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
