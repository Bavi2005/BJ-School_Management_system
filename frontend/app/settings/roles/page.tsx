'use client';

import * as React from 'react';
import {
  Check,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@school-mgmt/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface RoleInfo {
  role: UserRole;
  permissions: string[];
  userCount: number;
  activeUsers: number;
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
}

interface PermissionOptions {
  data: {
    permissions: Permission[];
    grouped: Record<string, Array<{ name: string; action: string; description: string | null }>>;
    modules: string[];
  };
}

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-gradient-to-r from-primary to-fuchsia-500 text-white',
  ADMIN: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white',
  TEACHER: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
  STUDENT: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
  PARENT: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
};

export default function RolesPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const [tab, setTab] = React.useState('roles');
  const [roles, setRoles] = React.useState<RoleInfo[]>([]);
  const [perms, setPerms] = React.useState<PermissionOptions['data'] | null>(null);
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [selectedRole, setSelectedRole] = React.useState<RoleInfo | null>(null);
  const [pendingPerms, setPendingPerms] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);

  const [selectedUser, setSelectedUser] = React.useState<UserRow | null>(null);
  const [userGrants, setUserGrants] = React.useState<Array<{ id: string; permission: { id: string; name: string; description: string | null } }>>([]);
  const [grantTarget, setGrantTarget] = React.useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, usersRes] = await Promise.all([
        apiClient<{ data: RoleInfo[] }>('/permissions/roles'),
        apiClient<PermissionOptions>('/permissions'),
        apiClient<{ data: { data: UserRow[] } }>('/users?limit=100'),
      ]);
      setRoles(rolesRes.data ?? []);
      setPerms(permsRes.data ?? null);
      setUsers(usersRes.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const openRoleEditor = (role: RoleInfo) => {
    setSelectedRole(role);
    setPendingPerms(new Set(role.permissions));
  };

  const togglePermission = (name: string) => {
    setPendingPerms((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await apiClient(`/permissions/roles/${selectedRole.role}`, {
        method: 'PUT',
        body: { permissions: Array.from(pendingPerms) },
      });
      toast.success(`${ROLE_LABELS[selectedRole.role]} permissions updated`);
      setSelectedRole(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const openUserGrants = async (u: UserRow) => {
    setSelectedUser(u);
    setGrantTarget('');
    try {
      const res = await apiClient<{ data: Array<{ id: string; permission: { id: string; name: string; description: string | null } }> }>(
        `/permissions/users/${u.id}/grants`
      );
      setUserGrants(res.data ?? []);
    } catch {
      setUserGrants([]);
    }
  };

  const grantPermission = async () => {
    if (!selectedUser || !grantTarget) return;
    try {
      await apiClient(`/permissions/users/${selectedUser.id}/grants`, {
        method: 'POST',
        body: { permissionId: grantTarget },
      });
      toast.success('Permission granted');
      setGrantTarget('');
      await openUserGrants(selectedUser);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to grant permission');
    }
  };

  const revokePermission = async (permissionId: string) => {
    if (!selectedUser) return;
    try {
      await apiClient(`/permissions/users/${selectedUser.id}/grants/${permissionId}`, {
        method: 'DELETE',
      });
      toast.success('Permission revoked');
      await openUserGrants(selectedUser);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke permission');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Control what each role and user can do across the system"
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">User Permissions</TabsTrigger>
        </TabsList>

        {/* Roles tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.role} className="glass-card border-0">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white', ROLE_COLORS[role.role])}>
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{ROLE_LABELS[role.role]}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {role.permissions.length} permissions · {role.activeUsers} active users
                        </p>
                      </div>
                    </div>
                    {role.role !== UserRole.SUPER_ADMIN && (
                      <Button size="sm" variant="outline" onClick={() => openRoleEditor(role)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.slice(0, 8).map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px]">
                        {p}
                      </Badge>
                    ))}
                    {role.permissions.length > 8 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{role.permissions.length - 8} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Users tab */}
        <TabsContent value="users" className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={ROLE_COLORS[u.role]}>
                            {ROLE_LABELS[u.role] ?? u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn(u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-500/10 text-slate-600')}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" onClick={() => openUserGrants(u)}>
                            <Users className="h-3.5 w-3.5" />
                            Manage Permissions
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role editor dialog */}
      <Dialog open={!!selectedRole} onOpenChange={(open) => !open && setSelectedRole(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {selectedRole ? ROLE_LABELS[selectedRole.role] : ''} Permissions</DialogTitle>
            <DialogDescription>
              Toggle which permissions this role can access. Changes apply immediately.
            </DialogDescription>
          </DialogHeader>

          {perms && (
            <div className="space-y-4">
              {perms.modules.map((module) => (
                <div key={module}>
                  <p className="mb-2 text-sm font-semibold capitalize">{module}</p>
                  <div className="flex flex-wrap gap-2">
                    {(perms.grouped[module] ?? []).map((p) => {
                      const checked = pendingPerms.has(p.name);
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => togglePermission(p.name)}
                          title={p.description ?? p.name}
                          className={cn(
                            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                            checked
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          )}
                        >
                          {checked ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-50" />}
                          {p.action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRole(null)}>
              Cancel
            </Button>
            <Button onClick={saveRolePermissions} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User grants dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Extra Permissions for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
            <DialogDescription>
              Grant or revoke individual permissions beyond what their role provides.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                className="flex h-10 flex-1 rounded-md border bg-background px-3 text-sm"
                value={grantTarget}
                onChange={(e) => setGrantTarget(e.target.value)}
              >
                <option value="">Select a permission to grant…</option>
                {perms?.permissions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.description ? `— ${p.description}` : ''}
                  </option>
                ))}
              </select>
              <Button onClick={grantPermission} disabled={!grantTarget}>
                <Plus className="h-4 w-4" />
                Grant
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Current extra grants</p>
              {userGrants.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No extra permissions granted.
                </p>
              )}
              {userGrants.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{g.permission.name}</p>
                    {g.permission.description && (
                      <p className="text-xs text-muted-foreground">{g.permission.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => revokePermission(g.permission.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
