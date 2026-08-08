'use client';

import * as React from 'react';
import { Banknote, Users, CalendarCheck, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';

interface Staff {
  id: string;
  employeeId: string;
  department: string;
  designation: string;
  basicSalary: string;
  user: { firstName: string; lastName: string; email: string };
}

interface Payroll {
  id: string;
  month: number;
  year: number;
  basicPay: string;
  allowances: string;
  deductions: string;
  netPay: string;
  status: string;
  staff: { user: { firstName: string; lastName: string } };
}

interface LeaveRequest {
  id: string;
  type: string;
  fromDate: string;
  toDate: string;
  status: string;
  staff: { user: { firstName: string; lastName: string } };
}

export default function HRPage() {
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [payroll, setPayroll] = React.useState<Payroll[]>([]);
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const [s, p, l, st] = await Promise.all([
        apiClient<{ data: { data: Staff[] } }>('/hr/staff?limit=100'),
        apiClient<{ data: { data: Payroll[] } }>('/hr/payroll?limit=50'),
        apiClient<{ data: { data: LeaveRequest[] } }>('/hr/leaves?limit=50'),
        apiClient<{ data: any }>('/hr/stats'),
      ]);
      setStaff(s.data?.data ?? []);
      setPayroll(p.data?.data ?? []);
      setLeaves(l.data?.data ?? []);
      setStats(st.data ?? null);
    } catch {
      toast.error('Failed to load HR data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const decideLeave = async (id: string, approve: boolean) => {
    try {
      await apiClient(`/hr/leaves/${id}/decide`, {
        method: 'PATCH',
        body: { status: approve ? 'APPROVED' : 'REJECTED', notes: approve ? 'Approved' : 'Rejected' },
      });
      toast.success(approve ? 'Leave approved' : 'Leave rejected');
      load();
    } catch {
      toast.error('Failed to update leave');
    }
  };

  const totalPayroll = payroll.reduce((s, p) => s + Number(p.netPay), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR & Payroll</h1>
        <p className="text-muted-foreground">Staff records, contracts, salaries and leave</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Staff" value={String(stats?.totalStaff ?? staff.length)} icon={Users} />
          <StatCard title="Teachers" value={String(stats?.teachers ?? 0)} icon={CalendarCheck} />
          <StatCard title="Pending Leaves" value={String(stats?.pendingLeaves ?? 0)} icon={FileText} />
          <StatCard title="Monthly Payroll (Nov)" value={`₹${totalPayroll.toLocaleString()}`} icon={Banknote} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Staff Directory</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{s.user.firstName} {s.user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{s.designation} • {s.department} • {s.employeeId}</p>
                </div>
                <p className="text-sm font-medium">₹{Number(s.basicSalary).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Records</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {payroll.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{p.staff.user.firstName} {p.staff.user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{new Date(p.year, p.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">₹{Number(p.netPay).toLocaleString()}</p>
                  <Badge variant={p.status === 'COMPLETED' ? 'default' : 'secondary'}>{p.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaves.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{l.staff.user.firstName} {l.staff.user.lastName} • {l.type}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(l.fromDate).toLocaleDateString()} → {new Date(l.toDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={l.status === 'APPROVED' ? 'default' : l.status === 'REJECTED' ? 'destructive' : 'secondary'}>{l.status}</Badge>
                {l.status === 'PENDING' && (
                  <>
                    <button className="rounded bg-green-600 px-2 py-1 text-xs text-white" onClick={() => decideLeave(l.id, true)}>Approve</button>
                    <button className="rounded bg-red-600 px-2 py-1 text-xs text-white" onClick={() => decideLeave(l.id, false)}>Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
          {leaves.length === 0 && <p className="text-sm text-muted-foreground">No leave requests.</p>}
        </CardContent>
      </Card>
    </div>
  );
}