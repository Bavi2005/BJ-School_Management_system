'use client';

import * as React from 'react';
import { Monitor, Moon, Sun, Shield, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, refresh } = useAuth();
  const [firstName, setFirstName] = React.useState(user?.firstName ?? '');
  const [lastName, setLastName] = React.useState(user?.lastName ?? '');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
    }
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient(`/users/${user?.id}`, {
        method: 'PATCH',
        body: { firstName, lastName },
      });
      toast.success('Profile updated');
      void refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Manage your preferences" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Profile
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar
                  name={`${firstName} ${lastName}`}
                  src={user?.avatarUrl}
                  size="lg"
                />
                <div>
                  <p className="font-medium">
                    {firstName} {lastName}
                  </p>
                  <p className="text-sm capitalize text-muted-foreground">{user?.role}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Monitor className="h-5 w-5 text-violet-500" />
              Appearance
            </CardTitle>
            <CardDescription>Customize how EduCore looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all hover:border-primary/40',
                    theme === value && 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="glass-card border-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-emerald-500" />
              Security
            </CardTitle>
            <CardDescription>
              Your session is protected with JWT authentication and role-based access control
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Role</p>
                <p className="mt-1 text-sm capitalize text-muted-foreground">{user?.role}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Account ID</p>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {user?.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}