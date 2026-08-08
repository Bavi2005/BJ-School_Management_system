'use client';

import * as React from 'react';
import {
  BookOpen,
  Bot,
  Bus,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  FileCheck,
  GraduationCap,
  BadgeCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  ChevronDown,
  ChevronUp,
  Info,
  CalendarClock,
  Award,
  Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

interface SchoolEvent {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  location: string | null;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; role: string } | null;
}

interface DashboardResponse {
  data: {
    overview: Record<string, number>;
    upcomingEvents?: SchoolEvent[];
    recentActivity?: ActivityLog[];
    timetable?: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string; subject: { name: string; code: string } | null }>;
    assignments?: Array<{ id: string; title: string; dueDate: string }>;
    recentGrades?: Array<{ id: string; score: number; maxScore: number; subject: { name: string } | null }>;
    children?: Array<{
      id: string;
      name: string;
      className: string;
      attendanceRate: number;
      averageScore: number;
      feesDue: number;
    }>;
  };
}

const OVERVIEW_LABELS: Record<string, string> = {
  totalStudents: 'Students',
  totalTeachers: 'Teachers',
  totalClasses: 'Classes',
  totalSubjects: 'Subjects',
  todayAttendance: "Today's Attendance",
  attendanceRate: 'Attendance Rate',
  pendingFees: 'Pending Fees',
  averageScore: 'Average Score',
  gradesCount: 'Grade Records',
  feesDue: 'Fees Due',
  assignmentsDue: 'Assignments Due',
  pendingGrading: 'Pending Grading',
  students: 'My Students',
  classes: 'My Classes',
  todayClasses: "Today's Classes",
  libraryBooks: 'Library Books',
  activeLoans: 'Active Loans',
  activeBuses: 'Active Buses',
  transportStudents: 'Transport Students',
  staffCount: 'Staff Members',
  pendingLeaves: 'Pending Leave',
  admissionApplications: 'New Admissions',
  examCount: 'Exams Awaiting Results',
};

const OVERVIEW_DETAILS: Record<string, string> = {
  totalStudents: 'Enrolled students across all classes in the current academic year',
  totalTeachers: 'Teaching staff currently employed at the school',
  totalClasses: 'Active classes organized by grade level and section',
  totalSubjects: 'Subjects offered across the curriculum',
  todayAttendance: 'Attendance records marked so far today',
  attendanceRate: 'Percentage of students present today',
  pendingFees: 'Total fees that are still unpaid or overdue',
  libraryBooks: 'Books available in the school library',
  activeLoans: 'Books currently checked out and not yet returned',
  activeBuses: 'Transport buses that are active on routes',
  transportStudents: 'Students assigned to school transport',
  staffCount: 'Non-teaching staff members on payroll',
  pendingLeaves: 'Leave requests awaiting approval',
  admissionApplications: 'New admission applications under review',
  examCount: 'Exams that still need results published',
};

const OVERVIEW_HINTS: Record<string, string> = {
  totalStudents: 'Review the Students page for enrollment details',
  totalTeachers: 'Manage staff in HR & Payroll',
  totalClasses: 'Open Classes to manage sections and teachers',
  pendingFees: 'Collect and track payments from Fees & Billing',
  activeLoans: 'Track returns in the Library module',
  activeBuses: 'Manage routes and assignments in Transport',
  pendingLeaves: 'Approve or reject from HR & Payroll',
  admissionApplications: 'Process applicants from Admissions',
  examCount: 'Publish results from the Exams module',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ExpandableSection({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Card className="glass-card border-0 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-accent/40"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary">
              {icon}
            </div>
          )}
          <div>
            <p className="font-semibold">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {badge && <Badge className="ml-2">{badge}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-border/60 p-5 animate-fade-in">{children}</div>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = React.useState<DashboardResponse['data'] | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const result = await apiClient<DashboardResponse>('/dashboard');
        setData(result.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  const overviewEntries = Object.entries(data.overview ?? {}).filter(
    ([key, value]) => value !== undefined && value !== null
  );

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 p-6 text-white shadow-2xl shadow-violet-500/25 animate-fade-in">
        <h2 className="text-xl font-bold">
          Welcome back, {user?.firstName}! 👋
        </h2>
        <p className="mt-1 text-sm text-white/80">
          Here's what's happening at your school today
        </p>
      </div>

      {/* Expandable stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {overviewEntries.map(([key, value], i) => (
          <ExpandableStatCard
            key={key}
            label={OVERVIEW_LABELS[key] ?? key}
            value={
              key === 'pendingFees' || key === 'feesDue' ? formatCurrency(value) : String(value)
            }
            suffix={key === 'attendanceRate' || key === 'averageScore' ? '%' : ''}
            gradientIndex={i}
            detail={OVERVIEW_DETAILS[key]}
            hint={OVERVIEW_HINTS[key]}
          />
        ))}
      </div>

      {/* AI CTA */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-violet-500/5 to-fuchsia-500/5">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 animate-float">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Need insights about your school?</p>
              <p className="text-sm text-muted-foreground">
                Ask the AI Assistant about performance, attendance risks, or schedules
              </p>
            </div>
          </div>
          <Button variant="gradient" onClick={() => router.push('/ai-assistant')}>
            <Bot className="h-4 w-4" />
            Open AI Assistant
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* Parent view: children cards */}
        {data.children && data.children.length > 0 && (
          <ExpandableSection
            title="My Children"
            subtitle="Attendance, grades and fees for each of your children"
            icon={<Users className="h-4 w-4" />}
            badge={`${data.children.length} children`}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {data.children.map((child) => (
                <div key={child.id} className="rounded-xl border p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={child.name} size="sm" />
                    <div>
                      <p className="font-medium">{child.name}</p>
                      <p className="text-xs text-muted-foreground">{child.className}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{child.attendanceRate}%</p>
                      <p className="text-xs text-muted-foreground">Attendance</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{child.averageScore}%</p>
                      <p className="text-xs text-muted-foreground">Average Score</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-lg font-bold">{formatCurrency(child.feesDue)}</p>
                      <p className="text-xs text-muted-foreground">Fees Due</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Recent events */}
        {data.upcomingEvents && (
          <ExpandableSection
            title="Upcoming Events"
            subtitle="What's coming up at the school"
            icon={<CalendarDays className="h-4 w-4" />}
            badge={`${data.upcomingEvents.length} events`}
          >
            <div className="space-y-3">
              {data.upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.startDate).toLocaleDateString()}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {event.type}
                  </Badge>
                </div>
              ))}
              {data.upcomingEvents.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No upcoming events
                </p>
              )}
              <Button variant="outline" size="sm" onClick={() => router.push('/events')}>
                View all events
              </Button>
            </div>
          </ExpandableSection>
        )}

        {/* Assignments */}
        {data.assignments && (
          <ExpandableSection
            title="Recent Assignments"
            subtitle="Homework and assignments that need attention"
            icon={<BookOpen className="h-4 w-4" />}
            badge={`${data.assignments.length} assignments`}
          >
            <div className="space-y-3">
              {data.assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                  <ClipboardList className="h-4 w-4 shrink-0 text-violet-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{assignment.title}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Due {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {data.assignments.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No assignments
                </p>
              )}
              <Button variant="outline" size="sm" onClick={() => router.push('/assignments')}>
                View all assignments
              </Button>
            </div>
          </ExpandableSection>
        )}

        {/* Recent grades */}
        {data.recentGrades && (
          <ExpandableSection
            title="Recent Grades"
            subtitle="Latest scores recorded for your courses"
            icon={<Award className="h-4 w-4" />}
            badge={`${data.recentGrades.length} grades`}
          >
            <div className="space-y-3">
              {data.recentGrades.map((grade) => (
                <div key={grade.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                  <FileBarChart className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {grade.subject?.name ?? 'Subject'}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {Math.round((grade.score / grade.maxScore) * 100)}%
                  </Badge>
                </div>
              ))}
              {data.recentGrades.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No grades yet
                </p>
              )}
              <Button variant="outline" size="sm" onClick={() => router.push('/grades')}>
                Open gradebook
              </Button>
            </div>
          </ExpandableSection>
        )}

        {/* Recent activity (admin) */}
        {data.recentActivity && (
          <ExpandableSection
            title="Recent Activity"
            subtitle="Latest actions across the school"
            icon={<Info className="h-4 w-4" />}
            badge={`${data.recentActivity.length} activities`}
          >
            <div className="space-y-3">
              {data.recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                  <Avatar
                    name={
                      activity.user
                        ? `${activity.user.firstName} ${activity.user.lastName}`
                        : 'System'
                    }
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {activity.action}
                    </p>
                    {activity.details && (
                      <p className="truncate text-xs text-muted-foreground">
                        {activity.details}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Timetable (student) */}
        {data.timetable && data.timetable.length > 0 && (
          <ExpandableSection
            title="Your Week"
            subtitle="Your class schedule at a glance"
            icon={<CalendarClock className="h-4 w-4" />}
            badge={`${data.timetable.length} classes`}
          >
            <div className="space-y-3">
              {data.timetable.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                  <Badge variant="outline" className="shrink-0">
                    {entry.subject?.code ?? '—'}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {entry.subject?.name ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DAY_NAMES[entry.dayOfWeek % 7]}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.startTime}–{entry.endTime}
                  </span>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => router.push('/timetable')}>
                Full timetable
              </Button>
            </div>
          </ExpandableSection>
        )}
      </div>
    </div>
  );
}

function ExpandableStatCard({
  label,
  value,
  suffix,
  gradientIndex,
  detail,
  hint,
}: {
  label: string;
  value: string;
  suffix?: string;
  gradientIndex: number;
  detail?: string;
  hint?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const gradients = [
    'bg-gradient-to-br from-blue-500 to-indigo-500',
    'bg-gradient-to-br from-emerald-500 to-teal-500',
    'bg-gradient-to-br from-violet-500 to-purple-500',
    'bg-gradient-to-br from-amber-500 to-orange-500',
    'bg-gradient-to-br from-rose-500 to-pink-500',
    'bg-gradient-to-br from-cyan-500 to-sky-500',
  ];
  const gradient = gradients[gradientIndex % gradients.length];

  return (
    <Card
      className={cn(
        'glass-card border-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer',
        open && '-translate-y-1 shadow-xl'
      )}
      onClick={() => setOpen((o) => !o)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-md', gradient)}>
            {label.includes('Fee') ? (
              <Wallet className="h-4 w-4" />
            ) : label.includes('Librar') || label.includes('Loan') ? (
              <BookOpen className="h-4 w-4" />
            ) : label.includes('Bus') || label.includes('Transport') ? (
              <Bus className="h-4 w-4" />
            ) : label.includes('Staff') || label.includes('Leave') ? (
              <BadgeCheck className="h-4 w-4" />
            ) : label.includes('Admission') ? (
              <FileCheck className="h-4 w-4" />
            ) : label.includes('Exam') ? (
              <FileBarChart className="h-4 w-4" />
            ) : label.includes('ttendance') ? (
              <ClipboardList className="h-4 w-4" />
            ) : label.includes('Score') || label.includes('Grade') ? (
              <FileBarChart className="h-4 w-4" />
            ) : label.includes('Class') ? (
              <GraduationCap className="h-4 w-4" />
            ) : label.includes('Student') ? (
              <Users className="h-4 w-4" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <p className="text-xl font-bold">
          {value}
          {suffix}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {open && detail && (
          <div className="mt-3 rounded-lg border border-border/60 bg-muted/40 p-3 animate-fade-in">
            <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
            {hint && (
              <p className="mt-2 text-[11px] text-primary/80">💡 {hint}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}