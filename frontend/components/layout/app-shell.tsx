'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth-provider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isLoginPage, setIsLoginPage] = React.useState(false);

  React.useEffect(() => {
    setIsLoginPage(pathname === '/login');
  }, [pathname]);

  React.useEffect(() => {
    if (!isLoginPage && !loading && !user) {
      router.replace('/login');
    }
  }, [isLoginPage, loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50 dark:from-slate-950 dark:to-slate-950">
        <div className="w-full max-w-md space-y-4 p-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50 dark:from-slate-950 dark:to-slate-950">
        <div className="w-full max-w-md space-y-4 p-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
