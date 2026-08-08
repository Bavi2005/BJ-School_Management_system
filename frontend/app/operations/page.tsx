'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bus,
  Calendar,
  CalendarDays,
  DoorOpen,
  Landmark,
  Library,
  Stethoscope,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    href: '/bookings',
    title: 'Room & Hall Booking',
    description: 'Book classrooms, labs, halls and facilities',
    icon: DoorOpen,
    color: 'text-blue-500 bg-blue-500/10',
    endpoint: '/bookings/rooms?limit=1',
    label: 'rooms',
    statKey: null,
  },
  {
    href: '/calendar',
    title: 'Calendar',
    description: 'Schedules, events and shared calendars',
    icon: Calendar,
    color: 'text-violet-500 bg-violet-500/10',
    endpoint: null,
    label: null,
    statKey: null,
  },
  {
    href: '/events',
    title: 'Events',
    description: 'School events, ceremonies and activities',
    icon: CalendarDays,
    color: 'text-emerald-500 bg-emerald-500/10',
    endpoint: '/events?limit=1',
    label: 'events',
    statKey: null,
  },
  {
    href: '/health',
    title: 'Health Center',
    description: 'Student health records and check-ups',
    icon: Stethoscope,
    color: 'text-rose-500 bg-rose-500/10',
    endpoint: '/health-records?limit=1',
    label: 'records',
    statKey: null,
  },
  {
    href: '/fees',
    title: 'Fees & Billing',
    description: 'Invoices, payments and fee structure',
    icon: Wallet,
    color: 'text-amber-500 bg-amber-500/10',
    endpoint: '/fees?limit=1',
    label: 'invoices',
    statKey: null,
  },
  {
    href: '/library',
    title: 'Library',
    description: 'Books, loans and catalogue',
    icon: Library,
    color: 'text-cyan-500 bg-cyan-500/10',
    endpoint: '/library/books?limit=1',
    label: 'books',
    statKey: null,
  },
  {
    href: '/transport',
    title: 'Transport',
    description: 'Routes, buses and stops',
    icon: Bus,
    color: 'text-pink-500 bg-pink-500/10',
    endpoint: '/transport/stats',
    label: 'routes',
    statKey: 'activeRoutes',
  },
  {
    href: '/hr',
    title: 'HR & Payroll',
    description: 'Staff, leaves and payroll',
    icon: Landmark,
    color: 'text-indigo-500 bg-indigo-500/10',
    endpoint: '/hr/stats',
    label: 'staff',
    statKey: 'totalStaff',
  },
];

export default function OperationsPage() {
  const [counts, setCounts] = React.useState<Record<string, { value: string; label: string }>>({});

  React.useEffect(() => {
    const load = async () => {
      const next: Record<string, { value: string; label: string }> = {};
      await Promise.all(
        SECTIONS.map(async (s) => {
          if (!s.endpoint) return;
          try {
            const res = await apiClient<{ data: Record<string, unknown> }>(s.endpoint);
            const d = res.data ?? {};
            let value: unknown = null;
            if (s.statKey && typeof d[s.statKey] === 'number') {
              value = d[s.statKey];
            } else if (typeof d.meta === 'object' && d.meta && 'total' in d.meta) {
              value = (d.meta as { total: number }).total;
            }
            next[s.href] = value != null ? { value: String(value), label: s.label } : { value: '—', label: s.label };
          } catch {
            next[s.href] = { value: '—', label: s.label };
          }
        })
      );
      setCounts(next);
    };
    void load();
  }, []);

  return (
    <>
      <PageHeader
        title="Operations"
        description="Run the school day — facilities, events, finance and services"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map(({ href, title, description, icon: Icon, color, label }) => (
          <Link key={href} href={href}>
            <Card className="glass-card group h-full border-0 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10">
              <CardHeader>
                <div
                  className={cn(
                    'mb-3 flex h-11 w-11 items-center justify-center rounded-xl',
                    color
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="text-sm">{description}</CardDescription>
              </CardHeader>
              <CardContent>
                {counts[href] ? (
                  <div className="flex items-baseline gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
                    <span className="text-lg font-bold">{counts[href].value}</span>
                    <span className="text-xs text-muted-foreground">{counts[href].label}</span>
                  </div>
                ) : (
                  <Skeleton className="h-8 w-full rounded-lg" />
                )}
                <p className="mt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Open {title} →
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
