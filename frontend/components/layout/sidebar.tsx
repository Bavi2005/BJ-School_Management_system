'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

function Sidebar({ className, children, ...props }: SidebarProps) {
  return (
    <div
      className={cn(
        'flex h-full w-64 flex-col border-r bg-card/50 backdrop-blur-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
Sidebar.displayName = 'Sidebar';

function SidebarSection({
  className,
  label,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: string }) {
  return (
    <div className={cn('px-3 py-2', className)} {...props}>
      {label && (
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </p>
      )}
    </div>
  );
}
SidebarSection.displayName = 'SidebarSection';

interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
}

function SidebarItem({ icon: Icon, label, active, badge, ...props }: SidebarItemProps) {
  return (
    <button
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-gradient-to-r from-primary/15 to-violet-500/15 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      {...props}
    >
      <Icon
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          !active && 'group-hover:scale-110'
        )}
      />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
          {badge}
        </span>
      )}
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
    </button>
  );
}
SidebarItem.displayName = 'SidebarItem';

export { Sidebar, SidebarSection, SidebarItem };