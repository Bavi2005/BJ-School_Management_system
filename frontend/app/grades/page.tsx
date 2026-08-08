'use client';

import * as React from 'react';
import {
  Award,
  ClipboardList,
  Loader2,
  Pencil,
  Percent,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/auth-provider';
import { calculatePercentage, formatDate } from '@/lib/utils';

type GradeType = 'QUIZ' | 'ASSIGNMENT' | 'MIDTERM' | 'FINAL' | 'OTHER';

interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  termId: string;
  type: GradeType;
  title: string;
  maxScore: number;
  score: number;
  weight: number;
  date: string;
  feedback: string | null;
  student: { user: { firstName: string; lastName: string } };
  subject: { name: string; code: string };
  term: { name: string };
}

interface Option {
  id: string;
  name: string;
  code?: string;
}

interface ListResponse<T> {
  data: T[];
}

interface GradesResponse {
  data: ListResponse<Grade>;
}

interface OptionsResponse {
  data: ListResponse<Option>;
}

const GRADE_TYPES: GradeType[] = ['QUIZ', 'ASSIGNMENT', 'MIDTERM', 'FINAL', 'OTHER'];

const TYPE_BADGE_VARIANT: Record<GradeType, 'info' | 'secondary' | 'warning' | 'success' | 'outline'> =
  {
    QUIZ: 'info',
    ASSIGNMENT: 'secondary',
    MIDTERM: 'warning',
    FINAL: 'success',
    OTHER: 'outline',
  };

type DialogMode = 'add' | 'edit' | null;

interface GradeForm {
  studentId: string;
  subjectId: string;
  termId: string;
  type: GradeType | '';
  title: string;
  maxScore: string;
  score: string;
  weight: string;
  date: string;
  feedback: string;
}

const EMPTY_FORM: GradeForm = {
  studentId: '',
  subjectId: '',
  termId: '',
  type: '',
  title: '',
  maxScore: '100',
  score: '',
  weight: '1',
  date: new Date().toISOString().slice(0, 10),
  feedback: '',
};

export default function GradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [subjectFilter, setSubjectFilter] = React.useState('all');

  const [students, setStudents] = React.useState<Option[]>([]);
  const [subjects, setSubjects] = React.useState<Option[]>([]);
  const [terms, setTerms] = React.useState<Option[]>([]);
  const [optionsLoading, setOptionsLoading] = React.useState(true);

  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [editingGrade, setEditingGrade] = React.useState<Grade | null>(null);
  const [form, setForm] = React.useState<GradeForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingGrade, setDeletingGrade] = React.useState<Grade | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    try {
      const result = await apiClient<GradesResponse>('/grades?limit=100');
      setGrades(result.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    setOptionsLoading(true);
    try {
      const [studentsResult, subjectsResult, termsResult] = await Promise.all([
        apiClient<OptionsResponse>('/users?role=STUDENT&limit=100'),
        apiClient<OptionsResponse>('/academic/subjects?limit=100'),
        apiClient<OptionsResponse>('/academic/terms?limit=100'),
      ]);
      setStudents(studentsResult.data?.data ?? []);
      setSubjects(subjectsResult.data?.data ?? []);
      setTerms(termsResult.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load form options');
    } finally {
      setOptionsLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
    void loadOptions();
  }, []);

  const stats = React.useMemo(() => {
    const graded = grades.filter((g) => g.maxScore > 0);
    const total = graded.length;
    const percentages = graded.map((g) => calculatePercentage(g.score, g.maxScore));
    const average = total
      ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / total)
      : 0;
    const highest = total ? Math.max(...percentages) : 0;
    const passRate = total
      ? Math.round((percentages.filter((p) => p >= 60).length / total) * 100)
      : 0;
    return { total, average, highest, passRate };
  }, [grades]);

  const availableSubjects = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const grade of grades) {
      if (grade.subject && !seen.has(grade.subjectId)) {
        seen.set(grade.subjectId, grade.subject.name);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [grades]);

  const filteredGrades = React.useMemo(() => {
    if (subjectFilter === 'all') return grades;
    return grades.filter((g) => g.subjectId === subjectFilter);
  }, [grades, subjectFilter]);

  const openAddDialog = () => {
    setEditingGrade(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogMode('add');
  };

  const openEditDialog = (grade: Grade) => {
    setEditingGrade(grade);
    setForm({
      studentId: grade.studentId,
      subjectId: grade.subjectId,
      termId: grade.termId,
      type: grade.type,
      title: grade.title,
      maxScore: String(grade.maxScore),
      score: String(grade.score),
      weight: String(grade.weight),
      date: grade.date.slice(0, 10),
      feedback: grade.feedback ?? '',
    });
    setFormError(null);
    setDialogMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const maxScore = Number(form.maxScore);
    const score = Number(form.score);
    const weight = Number(form.weight);

    if (!form.studentId || !form.subjectId || !form.termId || !form.type || !form.title.trim()) {
      setFormError('Student, subject, term, type, and title are required');
      return;
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      setFormError('Max score must be a positive number');
      return;
    }
    if (!Number.isFinite(score) || score < 0) {
      setFormError('Score must be a valid number');
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      setFormError('Weight must be a positive number');
      return;
    }

    const body = {
      studentId: form.studentId,
      subjectId: form.subjectId,
      termId: form.termId,
      type: form.type,
      title: form.title.trim(),
      maxScore,
      score,
      weight,
      date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
      gradedBy: user?.id,
      feedback: form.feedback.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (dialogMode === 'add') {
        await apiClient('/grades', { method: 'POST', body });
        toast.success('Grade recorded successfully');
      } else if (dialogMode === 'edit' && editingGrade) {
        await apiClient(`/grades/${editingGrade.id}`, { method: 'PATCH', body });
        toast.success('Grade updated successfully');
      }
      setDialogMode(null);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save grade');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGrade) return;
    setDeleting(true);
    try {
      await apiClient(`/grades/${deletingGrade.id}`, { method: 'DELETE' });
      toast.success('Grade deleted successfully');
      setDeleteOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete grade');
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Grade>[] = [
    {
      accessorKey: 'student.user.firstName',
      header: 'Student',
      cell: ({ row }) => {
        const grade = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar
              name={`${grade.student.user.firstName} ${grade.student.user.lastName}`}
              size="sm"
            />
            <div>
              <p className="font-medium">
                {grade.student.user.firstName} {grade.student.user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{grade.title}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'subject.name',
      header: 'Subject',
      cell: ({ row }) => {
        const subject = row.original.subject;
        return subject ? (
          <div>
            <p className="font-medium">{subject.name}</p>
            {subject.code && (
              <p className="text-xs text-muted-foreground">{subject.code}</p>
            )}
          </div>
        ) : (
          '—'
        );
      },
    },
    {
      accessorKey: 'term.name',
      header: 'Term',
      cell: ({ row }) => row.original.term?.name ?? '—',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={TYPE_BADGE_VARIANT[row.original.type] ?? 'outline'}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: ({ row }) => {
        const grade = row.original;
        const percentage = calculatePercentage(grade.score, grade.maxScore);
        return (
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap font-semibold">
              {grade.score} / {grade.maxScore}
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <Badge
              variant={percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'destructive'}
            >
              {percentage}%
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: 'feedback',
      header: 'Feedback',
      cell: ({ row }) => {
        const feedback = row.original.feedback;
        return feedback ? (
          <span
            title={feedback}
            className="block max-w-[180px] cursor-help truncate text-xs text-muted-foreground"
          >
            {feedback}
          </span>
        ) : (
          '—'
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
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
              setDeletingGrade(row.original);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Grades"
        description={`${grades.length} grade records`}
        actions={
          <Button variant="gradient" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Record Grade
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-lg">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Grades</p>
        </Card>
        <Card className="border-0 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{stats.average}%</p>
          <p className="text-sm text-muted-foreground">Average Score</p>
        </Card>
        <Card className="border-0 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-lg">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{stats.highest}%</p>
          <p className="text-sm text-muted-foreground">Highest Score</p>
        </Card>
        <Card className="border-0 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-lg">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold">{stats.passRate}%</p>
          <p className="text-sm text-muted-foreground">Pass Rate</p>
        </Card>
      </div>

      <div className="mb-4 w-full max-w-xs">
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {availableSubjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={filteredGrades} pageSize={10} />

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Record Grade' : 'Edit Grade'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add'
                ? 'Record a new grade for a student.'
                : 'Update the grade details.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student</Label>
                <Select
                  value={form.studentId}
                  onValueChange={(value) => setForm({ ...form, studentId: value })}
                >
                  <SelectTrigger id="studentId">
                    <SelectValue placeholder={optionsLoading ? 'Loading...' : 'Select student'} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subjectId">Subject</Label>
                <Select
                  value={form.subjectId}
                  onValueChange={(value) => setForm({ ...form, subjectId: value })}
                >
                  <SelectTrigger id="subjectId">
                    <SelectValue placeholder={optionsLoading ? 'Loading...' : 'Select subject'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                        {subject.code ? ` (${subject.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="termId">Term</Label>
                <Select
                  value={form.termId}
                  onValueChange={(value) => setForm({ ...form, termId: value })}
                >
                  <SelectTrigger id="termId">
                    <SelectValue placeholder={optionsLoading ? 'Loading...' : 'Select term'} />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value as GradeType })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Chapter 5 Quiz"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="maxScore">Max Score</Label>
                <Input
                  id="maxScore"
                  type="number"
                  min={1}
                  step="any"
                  placeholder="100"
                  value={form.maxScore}
                  onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="score">Score</Label>
                <Input
                  id="score"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="82"
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  min={0.1}
                  step="any"
                  placeholder="1"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Notes about this grade..."
                rows={2}
                value={form.feedback}
                onChange={(e) => setForm({ ...form, feedback: e.target.value })}
              />
            </div>
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
                {dialogMode === 'add' ? 'Record Grade' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Grade</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deletingGrade ? `${deletingGrade.title} (${deletingGrade.score}/${deletingGrade.maxScore})` : ''}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
