'use client';

import * as React from 'react';
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { ColumnDef } from '@tanstack/react-table';
import { UserRole, UserStatus } from '@school-mgmt/shared';
import { useAuth } from '@/components/auth-provider';
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
import { formatDate, getStatusColor } from '@/lib/utils';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
  avatarUrl: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  createdAt: string;
}

interface UsersResponse {
  data: {
    data: UserRow[];
    meta: Record<string, unknown>;
  };
}

interface UserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  status: string;
}

const EMPTY_FORM: UserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: UserRole.TEACHER,
  phone: '',
  dateOfBirth: '',
  address: '',
  status: UserStatus.ACTIVE,
};

const PASSWORD_RULES = [
  { pattern: /.{8,}/, label: 'At least 8 characters' },
  { pattern: /[a-z]/, label: 'Contains a lowercase letter' },
  { pattern: /[A-Z]/, label: 'Contains an uppercase letter' },
  { pattern: /[0-9]/, label: 'Contains a digit' },
  { pattern: /[^A-Za-z0-9]/, label: 'Contains a special character' },
];

const ALL_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.TEACHER,
  UserRole.STUDENT,
  UserRole.PARENT,
];

const ROLE_FILTERS = ['ALL', ...ALL_ROLES];

const STATUS_OPTIONS = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.SUSPENDED,
  UserStatus.PENDING_VERIFICATION,
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  ADMIN: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  TEACHER: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  STUDENT: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  PARENT: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
};

type DialogMode = 'add' | 'edit' | null;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('ALL');

  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);
  const [form, setForm] = React.useState<UserForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingUser, setDeletingUser] = React.useState<UserRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = async () => {
    try {
      const result = await apiClient<UsersResponse>('/users?limit=100');
      setUsers(result.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const filteredUsers = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesSearch =
        !query ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  const openAddDialog = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogMode('add');
  };

  const openEditDialog = (user: UserRow) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone ?? '',
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
      address: user.address ?? '',
      status: user.status,
    });
    setFormError(null);
    setDialogMode('edit');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setFormError('First name, last name, and email are required');
      return;
    }

    if (dialogMode === 'add') {
      const failedRule = PASSWORD_RULES.find(({ pattern }) => !pattern.test(form.password));
      if (failedRule) {
        setFormError(failedRule.label);
        return;
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
            role: form.role,
            phone: form.phone || undefined,
            dateOfBirth,
            address: form.address || undefined,
          },
        });
        toast.success('User added successfully');
      } else if (dialogMode === 'edit' && editingUser) {
        await apiClient(`/users/${editingUser.id}`, {
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
        toast.success('User updated successfully');
      }
      setDialogMode(null);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await apiClient(`/users/${deletingUser.id}`, { method: 'DELETE' });
      toast.success('User deleted successfully');
      setDeleteOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: 'firstName',
      header: 'User',
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
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge className={ROLE_COLORS[row.original.role] ?? ROLE_COLORS.TEACHER}>
          <span className="flex items-center gap-1">
            {(row.original.role === UserRole.SUPER_ADMIN ||
              row.original.role === UserRole.ADMIN) && (
              <ShieldCheck className="h-3 w-3" />
            )}
            {row.original.role}
          </span>
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>{row.original.status}</Badge>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone ?? '—',
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const isSelf = row.original.id === currentUser?.id;
        if (isSelf) {
          return (
            <span className="text-xs text-muted-foreground" title="You cannot modify your own account">
              You
            </span>
          );
        }
        return (
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
                setDeletingUser(row.original);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const hasUsers = users.length > 0;
  const showEmptyState = !loading && !hasUsers;
  const showTable = !loading && hasUsers;

  return (
    <>
      <PageHeader
        title="Users"
        description={`${users.length} users in the system`}
        actions={
          <Button variant="gradient" onClick={openAddDialog}>
            <UserPlus className="h-4 w-4" />
            Add User
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
            <p className="text-sm font-medium">No users yet</p>
            <p className="text-sm">Add staff, teachers, students, or parents to get started.</p>
            <Button variant="gradient" size="sm" onClick={openAddDialog} className="mt-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </CardContent>
        </Card>
      )}

      {showTable && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-sm pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role === 'ALL' ? 'All Roles' : role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable columns={columns} data={filteredUsers} pageSize={10} />
        </>
      )}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add User' : 'Edit User'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add'
                ? 'Create a new user account. The user can sign in with these credentials.'
                : 'Update the user profile details.'}
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
            {dialogMode === 'add' ? (
              <>
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
                  <ul className="grid gap-1 pt-1 sm:grid-cols-2">
                    {PASSWORD_RULES.map(({ pattern, label }) => {
                      const met = pattern.test(form.password);
                      return (
                        <li
                          key={label}
                          className={`text-xs ${
                            met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                          }`}
                        >
                          {met ? '✓' : '○'} {label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={form.role} disabled />
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
                {dialogMode === 'add' ? 'Create User' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deletingUser ? `${deletingUser.firstName} ${deletingUser.lastName}` : ''}
              </span>
              ? This action cannot be undone and will permanently remove the account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
