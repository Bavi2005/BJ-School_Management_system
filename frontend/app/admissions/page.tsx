'use client';

import * as React from 'react';
import { FileText, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Application {
  id: string;
  applicationNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gradeApplying: number;
  status: string;
  guardianName: string;
  guardianPhone: string;
  previousSchool: string | null;
}

export default function AdmissionsPage() {
  const [apps, setApps] = React.useState<Application[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showNew, setShowNew] = React.useState(false);
  const [form, setForm] = React.useState<any>({});

  const load = React.useCallback(async () => {
    try {
      const [a, s] = await Promise.all([
        apiClient<{ data: { data: Application[] } }>('/admissions?limit=100'),
        apiClient<{ data: any }>('/admissions/stats'),
      ]);
      setApps(a.data?.data ?? []);
      setStats(s.data ?? null);
    } catch {
      toast.error('Failed to load admissions');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const createApp = async () => {
    try {
      await apiClient('/admissions', { method: 'POST', body: form });
      toast.success('Application submitted');
      setShowNew(false);
      load();
    } catch {
      toast.error('Failed to submit application');
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await apiClient(`/admissions/${id}/status`, { method: 'PATCH', body: { status } });
      toast.success(`Marked ${status}`);
      load();
    } catch {
      toast.error('Failed to update');
    }
  };

  const accept = async (id: string) => {
    try {
      await apiClient(`/admissions/${id}/accept`, { method: 'POST' });
      toast.success('Student admitted!');
      load();
    } catch {
      toast.error('Failed to admit');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admissions</h1>
          <p className="text-muted-foreground">Applications, review and enrollment</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="mr-2 h-4 w-4" /> New Application</Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Applications" value={String(stats?.total ?? 0)} icon={FileText} />
          <StatCard title="Under Review" value={String((stats?.submitted ?? 0) + (stats?.underReview ?? 0))} icon={FileText} />
          <StatCard title="Accepted" value={String(stats?.accepted ?? 0)} icon={CheckCircle2} />
          <StatCard title="Rejected" value={String(stats?.rejected ?? 0)} icon={XCircle} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {apps.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{a.firstName} {a.lastName} • Grade {a.gradeApplying} • {a.applicationNumber}</p>
                <p className="text-sm text-muted-foreground">
                  Guardian: {a.guardianName} • {a.guardianPhone} • {a.previousSchool ?? 'New applicant'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.status === 'ACCEPTED' ? 'default' : a.status === 'REJECTED' ? 'destructive' : 'secondary'}>{a.status}</Badge>
                {a.status === 'SUBMITTED' && <Button size="sm" variant="outline" onClick={() => setStatus(a.id, 'UNDER_REVIEW')}>Review</Button>}
                {a.status !== 'ACCEPTED' && a.status !== 'REJECTED' && (
                  <Button size="sm" onClick={() => accept(a.id)}><CheckCircle2 className="mr-1 h-3 w-3" /> Accept</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setStatus(a.id, a.status === 'REJECTED' ? 'SUBMITTED' : 'REJECTED')}><XCircle className="mr-1 h-3 w-3" /> Reject</Button>
              </div>
            </div>
          ))}
          {apps.length === 0 && <p className="text-sm text-muted-foreground">No applications yet.</p>}
        </CardContent>
      </Card>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Admission Application</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name</Label><Input value={form.firstName ?? ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><Label>Last Name</Label><Input value={form.lastName ?? ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            <div><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth ?? ''} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
            <div><Label>Grade Applying</Label><Input type="number" value={form.gradeApplying ?? ''} onChange={(e) => setForm({ ...form, gradeApplying: Number(e.target.value) })} /></div>
            <div><Label>Guardian Name</Label><Input value={form.guardianName ?? ''} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></div>
            <div><Label>Guardian Phone</Label><Input value={form.guardianPhone ?? ''} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Guardian Email</Label><Input value={form.guardianEmail ?? ''} onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Textarea value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={createApp}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}