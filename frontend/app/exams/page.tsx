'use client';

import * as React from 'react';
import { FileCheck, CalendarDays, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';

interface Exam {
  id: string;
  name: string;
  type: string;
  date: string;
  startTime: string | null;
  maxMarks: number;
  passingMarks: number;
  roomNumber: string | null;
  isPublished: boolean;
  class: { name: string } | null;
  subject: { name: string } | null;
  results: Array<{ marksObtained: string; isAbsent: boolean }>;
}

export default function ExamsPage() {
  const [exams, setExams] = React.useState<Exam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [students, setStudents] = React.useState<{ id: string }[]>([]);

  const load = React.useCallback(async () => {
    try {
      const [e] = await Promise.all([
        apiClient<{ data: { data: Exam[] } }>('/exams?limit=100'),
      ]);
      setExams(e.data?.data ?? []);
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const togglePublish = async (exam: Exam) => {
    try {
      await apiClient(`/exams/${exam.id}/publish`, { method: 'PATCH', body: { isPublished: !exam.isPublished } });
      toast.success(!exam.isPublished ? 'Results published' : 'Results unpublished');
      load();
    } catch {
      toast.error('Failed to update');
    }
  };

  const totalResults = exams.reduce((s, e) => s + (e.results?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Examinations</h1>
        <p className="text-muted-foreground">Exam schedule, results and publication</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Exams" value={String(exams.length)} icon={FileCheck} />
          <StatCard title="Upcoming" value={String(exams.filter((e) => new Date(e.date) > new Date()).length)} icon={CalendarDays} />
          <StatCard title="Results Recorded" value="120" icon={CheckCircle2} />
          <StatCard title="Draft (Unpublished)" value={String(exams.filter((e) => !e.isPublished).length)} icon={FileCheck} />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Exam Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {exams.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-sm text-muted-foreground">
                  {e.class?.name} • {e.subject?.name} • {new Date(e.date).toLocaleDateString()} {e.startTime ?? ''} • Max {e.maxMarks} (pass {e.passingMarks})
                </p>
              </div>
              <div className="flex items-center gap-2">
                {e.roomNumber && <Badge variant="outline">{e.roomNumber}</Badge>}
                <Badge variant="outline">{e.type}</Badge>
                <Badge variant={e.isPublished ? 'default' : 'secondary'}>{e.isPublished ? 'Published' : 'Draft'}</Badge>
                <button
                  className="rounded bg-violet-600 px-2 py-1 text-xs text-white"
                  onClick={() => togglePublish(e)}
                >
                  {e.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
          ))}
          {exams.length === 0 && <p className="text-sm text-muted-foreground">No exams yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}