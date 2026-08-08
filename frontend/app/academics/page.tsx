'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  FileBarChart,
  FileCheck,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    href: '/classes',
    title: 'Classes',
    description: 'Classes, sections, subjects and class teachers',
    icon: GraduationCap,
    color: 'text-blue-500 bg-blue-500/10',
    endpoint: '/academic/classes?limit=1',
    label: 'classes',
    statKey: null,
  },
  {
    href: '/students',
    title: 'Students (SIS)',
    description: 'Student records, enrollments and academic profiles',
    icon: Users,
    color: 'text-violet-500 bg-violet-500/10',
    endpoint: '/users?role=STUDENT&limit=1',
    label: 'students',
    statKey: null,
  },
  {
    href: '/grades',
    title: 'Gradebook',
    description: 'Scores, term averages and report cards',
    icon: FileBarChart,
    color: 'text-emerald-500 bg-emerald-500/10',
    endpoint: '/grades?limit=1',
    label: 'grades',
    statKey: null,
  },
  {
    href: '/attendance',
    title: 'Attendance',
    description: 'Daily attendance, reports and tracking',
    icon: ClipboardList,
    color: 'text-amber-500 bg-amber-500/10',
    endpoint: '/attendance/stats',
    label: 'records',
    statKey: 'total',
  },
  {
    href: '/timetable',
    title: 'Timetable',
    description: 'Class schedules and period planning',
    icon: BookOpen,
    color: 'text-cyan-500 bg-cyan-500/10',
    endpoint: '/academic/classes?limit=1',
    label: 'classes scheduled',
    statKey: null,
  },
  {
    href: '/assignments',
    title: 'Assignments (LMS)',
    description: 'Homework, submissions and grading',
    icon: FileText,
    color: 'text-pink-500 bg-pink-500/10',
    endpoint: '/assignments?limit=1',
    label: 'assignments',
    statKey: null,
  },
  {
    href: '/exams',
    title: 'Exams',
    description: 'Exam schedules, results and transcripts',
    icon: FileCheck,
    color: 'text-orange-500 bg-orange-500/10',
    endpoint: '/exams?limit=1',
    label: 'exams',
    statKey: null,
  },
  {
    href: '/admissions',
    title: 'Admissions',
    description: 'Applications, interviews and enrollment',
    icon: FileText,
    color: 'text-indigo-500 bg-indigo-500/10',
    endpoint: '/admissions/stats',
    label: 'applications',
    statKey: 'total',
  },
];

export default function AcademicsPage() {
  const [counts, setCounts] = React.useState<Record<string, { value: string; label: string }>>({});

  React.useEffect(() => {
    const load = async () => {
      const next: Record<string, { value: string; label: string }> = {};
      await Promise.all(
        SECTIONS.map(async (s) => {
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
        title="Academics"
        description="Everything about classes, students, grades and learning"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map(({ href, title, description, icon: Icon, color }) => (
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
