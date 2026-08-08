'use client';

import * as React from 'react';
import {
  Bell,
  BookOpen,
  Bot,
  Bus,
  Calendar,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  FileBarChart,
  FileCheck,
  FileText,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Library,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Sidebar, SidebarItem } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    section: 'Dashboard',
    href: '/dashboard',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/ai-assistant', label: 'AI Assistant', icon: Bot },
      { href: '/notifications', label: 'Announcements', icon: Bell },
    ],
  },
  {
    section: 'Academics',
    href: '/academics',
    items: [
      { href: '/classes', label: 'Classes', icon: GraduationCap },
      { href: '/students', label: 'Students (SIS)', icon: Users },
      { href: '/grades', label: 'Gradebook', icon: FileBarChart },
      { href: '/attendance', label: 'Attendance', icon: ClipboardList },
      { href: '/timetable', label: 'Timetable', icon: CalendarDays },
      { href: '/assignments', label: 'Assignments (LMS)', icon: BookOpen },
      { href: '/exams', label: 'Exams', icon: FileCheck },
      { href: '/admissions', label: 'Admissions', icon: FileText },
    ],
  },
  {
    section: 'Operations',
    href: '/operations',
    items: [
      { href: '/bookings', label: 'Room & Hall Booking', icon: DoorOpen },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
      { href: '/events', label: 'Events', icon: CalendarDays },
      { href: '/health', label: 'Health Center', icon: Stethoscope },
      { href: '/fees', label: 'Fees & Billing', icon: Wallet },
      { href: '/library', label: 'Library', icon: Library },
      { href: '/transport', label: 'Transport', icon: Bus },
      { href: '/hr', label: 'HR & Payroll', icon: Landmark },
    ],
  },
  {
    section: 'Settings',
    href: '/settings',
    items: [
      { href: '/users', label: 'Users & Staff', icon: UserCog },
      { href: '/settings/roles', label: 'Roles & Permissions', icon: ShieldCheck },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const pageTitle =
    NAV_ITEMS.flatMap((s) => s.items)
      .find((item) => pathname.startsWith(item.href))
      ?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/50 dark:from-slate-950 dark:via-slate-950 dark:to-violet-950/20">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar>
          <button
            className="flex h-16 items-center gap-3 border-b px-6 text-left"
            onClick={() => router.push('/dashboard')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg shadow-primary/25">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">
                EduCore <span className="gradient-text">Nexus</span>
              </p>
              <p className="text-xs text-muted-foreground">AI-Powered School Management</p>
            </div>
          </button>

          <nav className="flex-1 space-y-4 overflow-y-auto p-4">
            {NAV_ITEMS.map((section) => (
              <div key={section.section}>
                <button
                  className={cn(
                    'mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-accent hover:text-foreground',
                    pathname === section.href
                      ? 'text-primary'
                      : 'text-muted-foreground/70'
                  )}
                  onClick={() => {
                    router.push(section.href);
                    setMobileOpen(false);
                  }}
                >
                  {section.section}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.href}
                      icon={item.icon}
                      label={item.label}
                      active={pathname.startsWith(item.href)}
                      onClick={() => {
                        router.push(item.href);
                        setMobileOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t p-4">
            <div className="rounded-xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-fuchsia-500/10 p-4">
              <p className="text-sm font-semibold">AI-Driven Insights</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Predictive analytics for student performance &amp; attendance risk
              </p>
            </div>
          </div>
        </Sidebar>
      </aside>

      <div className="lg:pl-64">
        <Topbar
          title={pageTitle}
          subtitle="School Management System"
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="animate-fade-in p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}