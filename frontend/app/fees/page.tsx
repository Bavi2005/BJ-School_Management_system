'use client';

import * as React from 'react';
import {
  Banknote,
  CreditCard,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
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
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

interface Payment {
  id: string;
  amount: string;
  method: string;
  transactionId: string | null;
  notes: string | null;
  paidAt: string;
}

interface Fee {
  id: string;
  studentId: string;
  feeType: string;
  amount: string;
  discountAmount: string;
  dueDate: string;
  status: string;
  description: string | null;
  academicYearId: string | null;
  termId: string | null;
  term: { name: string } | null;
  payments: Payment[];
  student: { user: { firstName: string; lastName: string } };
}

interface FeesResponse {
  data: {
    data: Fee[];
    meta: { total: number };
  };
}

interface FeeStats {
  totalFees: number;
  totalAmount: number;
  totalDiscount: number;
  overdueCount: number;
  statuses: Record<string, number>;
}

interface StatsResponse {
  data: FeeStats;
}

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface YearOption {
  id: string;
  name: string;
  status: string;
}

interface TermOption {
  id: string;
  name: string;
}

interface UsersResponse {
  data: { data: StudentOption[]; meta: unknown };
}

interface YearsResponse {
  data: { data: YearOption[]; meta: unknown };
}

interface TermsResponse {
  data: { data: TermOption[]; meta: unknown };
}

const FEE_TYPES = [
  'TUITION',
  'TRANSPORT',
  'HOSTEL',
  'UNIFORM',
  'BOOKS',
  'EXAM',
  'ACTIVITY',
  'OTHER',
] as const;

const PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'UPI',
  'CHEQUE',
  'ONLINE',
] as const;

const EMPTY_FEE_FORM = {
  studentId: '',
  feeType: '',
  academicYearId: '',
  termId: '',
  amount: '',
  dueDate: '',
  description: '',
  discountAmount: '0',
  discountReason: '',
};

const EMPTY_PAYMENT_FORM = {
  amount: '',
  method: 'CASH',
  transactionId: '',
  notes: '',
};

function formatFeeType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function paidOf(fee: Fee): number {
  return (fee.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
}

function remainingOf(fee: Fee): number {
  return Math.max(0, Number(fee.amount) - Number(fee.discountAmount ?? 0) - paidOf(fee));
}

export default function FeesPage() {
  const [fees, setFees] = React.useState<Fee[]>([]);
  const [stats, setStats] = React.useState<FeeStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  const [createOpen, setCreateOpen] = React.useState(false);
  const [optionsLoading, setOptionsLoading] = React.useState(false);
  const [students, setStudents] = React.useState<StudentOption[]>([]);
  const [years, setYears] = React.useState<YearOption[]>([]);
  const [terms, setTerms] = React.useState<TermOption[]>([]);
  const [feeForm, setFeeForm] = React.useState(EMPTY_FEE_FORM);
  const [submittingFee, setSubmittingFee] = React.useState(false);
  const [feeFormError, setFeeFormError] = React.useState<string | null>(null);

  const [payFee, setPayFee] = React.useState<Fee | null>(null);
  const [payForm, setPayForm] = React.useState(EMPTY_PAYMENT_FORM);
  const [submittingPayment, setSubmittingPayment] = React.useState(false);
  const [payFormError, setPayFormError] = React.useState<string | null>(null);

  const [deleteFee, setDeleteFee] = React.useState<Fee | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    try {
      const [feesResult, statsResult] = await Promise.all([
        apiClient<FeesResponse>('/fees?limit=100'),
        apiClient<StatsResponse>('/fees/stats'),
      ]);
      setFees(feesResult.data?.data ?? []);
      setStats(statsResult.data ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const openCreateDialog = async () => {
    setCreateOpen(true);
    setFeeForm(EMPTY_FEE_FORM);
    setFeeFormError(null);
    setOptionsLoading(true);
    try {
      const [usersResult, yearsResult, termsResult] = await Promise.all([
        apiClient<UsersResponse>('/users?role=STUDENT&limit=100'),
        apiClient<YearsResponse>('/academic/years?limit=100'),
        apiClient<TermsResponse>('/academic/terms?limit=100'),
      ]);
      const yearOptions = yearsResult.data?.data ?? [];
      setStudents(usersResult.data?.data ?? []);
      setYears(yearOptions);
      setTerms(termsResult.data?.data ?? []);
      setFeeForm((form) => ({
        ...form,
        academicYearId:
          yearOptions.find((y) => y.status === 'ACTIVE')?.id ??
          yearOptions[0]?.id ??
          '',
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load options');
    } finally {
      setOptionsLoading(false);
    }
  };

  const openPayDialog = (fee: Fee) => {
    setPayFee(fee);
    setPayForm({ ...EMPTY_PAYMENT_FORM, amount: String(remainingOf(fee)) });
    setPayFormError(null);
  };

  const handleCreateFee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeeFormError(null);

    const amount = Number(feeForm.amount);
    const discountAmount = Number(feeForm.discountAmount || 0);
    if (!feeForm.studentId) return setFeeFormError('Please select a student');
    if (!feeForm.feeType) return setFeeFormError('Please select a fee type');
    if (!feeForm.academicYearId) return setFeeFormError('Please select an academic year');
    if (!feeForm.dueDate) return setFeeFormError('Please select a due date');
    if (!amount || amount <= 0) return setFeeFormError('Amount must be greater than 0');
    if (discountAmount < 0 || discountAmount > amount)
      return setFeeFormError('Discount must be between 0 and the amount');
    if (discountAmount > 0 && !feeForm.discountReason.trim())
      return setFeeFormError('Please provide a reason for the discount');

    setSubmittingFee(true);
    try {
      await apiClient('/fees', {
        method: 'POST',
        body: {
          studentId: feeForm.studentId,
          feeType: feeForm.feeType,
          academicYearId: feeForm.academicYearId,
          termId: feeForm.termId || undefined,
          amount,
          dueDate: new Date(feeForm.dueDate).toISOString(),
          description: feeForm.description.trim() || undefined,
          discountAmount,
          discountReason: feeForm.discountReason.trim() || undefined,
        },
      });
      toast.success('Fee created successfully');
      setCreateOpen(false);
      await load();
    } catch (error) {
      setFeeFormError(error instanceof Error ? error.message : 'Failed to create fee');
    } finally {
      setSubmittingFee(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payFee) return;
    setPayFormError(null);

    const remaining = remainingOf(payFee);
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return setPayFormError('Amount must be greater than 0');
    if (amount > remaining) {
      return setPayFormError(
        `Payment amount exceeds the remaining balance of ${formatCurrency(remaining)}`
      );
    }

    setSubmittingPayment(true);
    try {
      await apiClient(`/fees/${payFee.id}/pay`, {
        method: 'POST',
        body: {
          amount,
          method: payForm.method,
          transactionId: payForm.transactionId.trim() || undefined,
          notes: payForm.notes.trim() || undefined,
        },
      });
      toast.success('Payment recorded successfully');
      setPayFee(null);
      await load();
    } catch (error) {
      setPayFormError(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteFee) return;
    setDeleting(true);
    try {
      await apiClient(`/fees/${deleteFee.id}`, { method: 'DELETE' });
      toast.success('Fee deleted successfully');
      setDeleteFee(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete fee');
    } finally {
      setDeleting(false);
    }
  };

  const filteredFees = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return fees;
    return fees.filter((fee) => {
      const studentName = `${fee.student?.user.firstName ?? ''} ${
        fee.student?.user.lastName ?? ''
      }`.toLowerCase();
      return (
        studentName.includes(query) ||
        fee.feeType.toLowerCase().includes(query) ||
        fee.status.toLowerCase().includes(query)
      );
    });
  }, [fees, search]);

  const columns: ColumnDef<Fee>[] = [
    {
      accessorKey: 'student',
      header: 'Student',
      cell: ({ row }) => {
        const fee = row.original;
        const name = `${fee.student?.user.firstName ?? ''} ${
          fee.student?.user.lastName ?? ''
        }`.trim();
        return (
          <div className="flex items-center gap-3">
            <Avatar name={name || 'Student'} size="sm" />
            <div>
              <p className="font-medium">{name || '—'}</p>
              <p className="text-xs text-muted-foreground">{fee.term?.name ?? '—'}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'feeType',
      header: 'Fee Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {formatFeeType(row.original.feeType)}
        </Badge>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const fee = row.original;
        const discount = Number(fee.discountAmount ?? 0);
        return (
          <div>
            <p className="font-medium">{formatCurrency(Number(fee.amount))}</p>
            {discount > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(discount)} discount
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: 'payments',
      header: 'Paid / Remaining',
      cell: ({ row }) => {
        const fee = row.original;
        const paid = paidOf(fee);
        const remaining = remainingOf(fee);
        return (
          <div>
            <p className="font-medium text-emerald-600 dark:text-emerald-400">
              {formatCurrency(paid)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(remaining)} remaining
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => formatDate(row.original.dueDate),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>{row.original.status}</Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const fee = row.original;
        const remaining = remainingOf(fee);
        return (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              title="Record Payment"
              disabled={remaining <= 0}
              onClick={() => openPayDialog(fee)}
            >
              <Wallet className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              title="Delete"
              onClick={() => setDeleteFee(fee)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const safeStats: FeeStats = stats ?? {
    totalFees: 0,
    totalAmount: 0,
    totalDiscount: 0,
    overdueCount: 0,
    statuses: {},
  };
  const pendingCount =
    (safeStats.statuses.PENDING ?? 0) + (safeStats.statuses.PARTIAL ?? 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Fees & Invoicing"
        description="Create fees, track payments and manage outstanding balances"
        actions={
          <Button variant="gradient" onClick={() => void openCreateDialog()}>
            <Plus className="h-4 w-4" />
            Create Fee
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Collected"
          value={formatCurrency(
            Number(safeStats.totalAmount) - Number(safeStats.totalDiscount)
          )}
          icon={Banknote}
          description="After discounts"
        />
        <StatCard
          title="Pending Fees"
          value={pendingCount}
          icon={Wallet}
          description="Awaiting payment"
        />
        <StatCard
          title="Overdue Fees"
          value={safeStats.overdueCount}
          icon={TrendingUp}
          description="Past due date"
        />
        <StatCard
          title="Total Fee Items"
          value={safeStats.totalFees}
          icon={Receipt}
          description="Across all students"
        />
      </div>

      {fees.length > 0 && (
        <div className="relative mb-4 mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by student, fee type or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm pl-9"
          />
        </div>
      )}

      {fees.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 shadow-lg">
              <Receipt className="h-7 w-7 text-white" />
            </div>
            <p className="text-sm font-medium">No fee records yet</p>
            <p className="text-sm">Create your first fee to get started.</p>
            <Button
              variant="gradient"
              size="sm"
              className="mt-2"
              onClick={() => void openCreateDialog()}
            >
              <Plus className="h-4 w-4" />
              Create Fee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6">
          <DataTable columns={columns} data={filteredFees} pageSize={10} />
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Fee</DialogTitle>
            <DialogDescription>
              Add a new fee record for a student. Discounts are optional.
            </DialogDescription>
          </DialogHeader>
          {optionsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={(e) => void handleCreateFee(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student</Label>
                  <Select
                    value={feeForm.studentId}
                    onValueChange={(value) => setFeeForm({ ...feeForm, studentId: value })}
                  >
                    <SelectTrigger id="studentId">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.length === 0 && (
                        <SelectItem value="__none__" disabled>
                          No students available
                        </SelectItem>
                      )}
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeType">Fee Type</Label>
                  <Select
                    value={feeForm.feeType}
                    onValueChange={(value) => setFeeForm({ ...feeForm, feeType: value })}
                  >
                    <SelectTrigger id="feeType">
                      <SelectValue placeholder="Select fee type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatFeeType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academicYearId">Academic Year</Label>
                  <Select
                    value={feeForm.academicYearId}
                    onValueChange={(value) => setFeeForm({ ...feeForm, academicYearId: value })}
                  >
                    <SelectTrigger id="academicYearId">
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.length === 0 && (
                        <SelectItem value="__none__" disabled>
                          No academic years available
                        </SelectItem>
                      )}
                      {years.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termId">Term (optional)</Label>
                  <Select
                    value={feeForm.termId}
                    onValueChange={(value) => setFeeForm({ ...feeForm, termId: value })}
                  >
                    <SelectTrigger id="termId">
                      <SelectValue placeholder="Select term (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No term</SelectItem>
                      {terms.length === 0 && (
                        <SelectItem value="__none__" disabled>
                          No terms available
                        </SelectItem>
                      )}
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={feeForm.dueDate}
                    onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="e.g. First term tuition fee"
                  rows={2}
                  value={feeForm.description}
                  onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="discountAmount">Discount Amount</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={feeForm.discountAmount}
                    onChange={(e) =>
                      setFeeForm({ ...feeForm, discountAmount: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountReason">Discount Reason</Label>
                  <Input
                    id="discountReason"
                    placeholder="e.g. Scholarship"
                    value={feeForm.discountReason}
                    onChange={(e) =>
                      setFeeForm({ ...feeForm, discountReason: e.target.value })
                    }
                  />
                </div>
              </div>
              {feeFormError && <p className="text-sm text-destructive">{feeFormError}</p>}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={submittingFee}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" disabled={submittingFee}>
                  {submittingFee && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Fee
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={payFee !== null} onOpenChange={(open) => !open && setPayFee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              {payFee
                ? `${payFee.student?.user.firstName ?? ''} ${
                    payFee.student?.user.lastName ?? ''
                  } — ${formatFeeType(payFee.feeType)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {payFee && (
            <form onSubmit={(e) => void handleRecordPayment(e)} className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p>
                  Remaining balance:{' '}
                  <span className="font-semibold">
                    {formatCurrency(remainingOf(payFee))}
                  </span>
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payAmount">Amount</Label>
                  <Input
                    id="payAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Method</Label>
                  <Select
                    value={payForm.method}
                    onValueChange={(value) => setPayForm({ ...payForm, method: value })}
                  >
                    <SelectTrigger id="method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {formatFeeType(method)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionId">Transaction ID (optional)</Label>
                <Input
                  id="transactionId"
                  placeholder="e.g. Txn 874512"
                  value={payForm.transactionId}
                  onChange={(e) =>
                    setPayForm({ ...payForm, transactionId: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payNotes">Notes (optional)</Label>
                <Textarea
                  id="payNotes"
                  placeholder="e.g. Paid at the school office"
                  rows={2}
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                />
              </div>
              {payFormError && <p className="text-sm text-destructive">{payFormError}</p>}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayFee(null)}
                  disabled={submittingPayment}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" disabled={submittingPayment}>
                  {submittingPayment && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record Payment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteFee !== null} onOpenChange={(open) => !open && setDeleteFee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Fee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this fee for{' '}
              <span className="font-medium text-foreground">
                {deleteFee
                  ? `${deleteFee.student?.user.firstName ?? ''} ${
                      deleteFee.student?.user.lastName ?? ''
                    }`
                  : ''}
              </span>
              ? Fees with recorded payments cannot be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteFee(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Fee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
