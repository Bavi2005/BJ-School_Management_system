import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

export function calculatePercentage(score: number, max: number): number {
  return max === 0 ? 0 : Math.round((score / max) * 100);
}

export function getGradeLetter(percentage: number): string {
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  return 'F';
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
    CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  };
  return colors[severity] ?? colors.LOW;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    INACTIVE: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
    SUSPENDED: 'bg-red-500/10 text-red-700 dark:text-red-300',
    PENDING: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    PAID: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    OVERDUE: 'bg-red-500/10 text-red-700 dark:text-red-300',
    PRESENT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    ABSENT: 'bg-red-500/10 text-red-700 dark:text-red-300',
    LATE: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    EXCUSED: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  };
  return colors[status] ?? 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
}

export function getEventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ACADEMIC: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100',
    SPORTS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100',
    CULTURAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100',
    MEETING: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    HOLIDAY: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-100',
    EXAM: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100',
    OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  };
  return colors[type] ?? colors.OTHER;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}