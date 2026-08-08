'use client';

import * as React from 'react';
import { BookOpen, Search, Plus, ArrowLeftRight, ClipboardList, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  availableCopies: number;
  totalCopies: number;
  status: string;
  shelfNumber: string | null;
  publisher: string | null;
}

interface BookLoan {
  id: string;
  status: string;
  issuedAt: string;
  dueDate: string;
  book: Book | null;
  student: { user: { firstName: string; lastName: string } } | null;
}

const CATEGORIES = ['Fiction', 'Classics', 'Fantasy', 'Science', 'History', 'Autobiography', 'Philosophy', 'Finance', 'Self-help', 'Biography', 'Sci-Fi', 'Thriller'];

export default function LibraryPage() {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [loans, setLoans] = React.useState<BookLoan[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [showIssue, setShowIssue] = React.useState(false);
  const [issueForm, setIssueForm] = React.useState({ bookId: '', studentId: '', dueDate: '' });
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [b, l, s] = await Promise.all([
        apiClient<{ data: { data: Book[] } }>('/library/books?limit=100'),
        apiClient<{ data: { data: BookLoan[] } }>('/library/loans?limit=50'),
        apiClient<{ data: any }>('/library/stats'),
      ]);
      setBooks(b.data?.data ?? []);
      setLoans(l.data?.data ?? []);
      setStats(s.data ?? null);
    } catch {
      toast.error('Failed to load library data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = books.filter((b) =>
    (search === '' || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()))
  );

  const issueBook = async () => {
    setCreating(true);
    try {
      await apiClient('/library/loans', {
        method: 'POST',
        body: { ...issueForm, dueDate: new Date(issueForm.dueDate).toISOString() },
      });
      toast.success('Book issued');
      setShowIssue(false);
      load();
    } catch {
      toast.error('Failed to issue book');
    } finally {
      setCreating(false);
    }
  };

  const returnBook = async (id: string) => {
    try {
      await apiClient(`/library/loans/${id}/return`, { method: 'PATCH' });
      toast.success('Book returned');
      load();
    } catch {
      toast.error('Failed to return book');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Library Management</h1>
          <p className="text-muted-foreground">Catalog, check-in/out and fines</p>
        </div>
        <Button onClick={() => setShowIssue(true)}>
          <Plus className="mr-2 h-4 w-4" /> Issue Book
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Books in Catalog" value={String(stats?.totalBooks ?? 0)} icon={BookOpen} />
          <StatCard title="Active Loans" value={String(stats?.activeLoans ?? 0)} icon={ClipboardList} />
          <StatCard title="Booked Out" value={String(stats?.checkedOut ?? 0)} icon={CheckCircle2} />
          <StatCard title="Overdue" value={String(stats?.overdue ?? 0)} icon={AlertTriangle} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Book Catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by title or author..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {filtered.map((b) => (
                <div key={b.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{b.title}</p>
                    <p className="text-sm text-muted-foreground">{b.author} • {b.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={b.availableCopies > 0 ? 'default' : 'destructive'}>
                      {b.availableCopies}/{b.totalCopies}
                    </Badge>
                    <Badge variant="outline">{b.status}</Badge>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground">No books match.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {loans.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{l.book?.title ?? 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.student?.user?.firstName ?? ''} {l.student?.user?.lastName ?? ''} • Due {new Date(l.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === 'OVERDUE' ? 'destructive' : l.status === 'RETURNED' ? 'secondary' : 'default'}>{l.status}</Badge>
                    {l.status !== 'RETURNED' && (
                      <Button size="sm" variant="outline" onClick={() => returnBook(l.id)}>
                        <ArrowLeftRight className="mr-1 h-3 w-3" /> Return
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue a Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Book ID</Label>
              <Input list="book-options" value={issueForm.bookId} onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })} placeholder="book-1..." />
              <datalist id="book-options">{books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</datalist>
            </div>
            <div>
              <Label>Student ID</Label>
              <Input value={issueForm.studentId} onChange={(e) => setIssueForm({ ...issueForm, studentId: e.target.value })} placeholder="student id" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={issueForm.dueDate} onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssue(false)}>Cancel</Button>
            <Button onClick={issueBook} disabled={creating}>Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

