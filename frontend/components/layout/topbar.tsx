'use client';

import * as React from 'react';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth-provider';
import { useSocket } from '@/components/socket-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  className?: string;
}

export function Topbar({ title, subtitle, onMenuClick, className }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { notifications, connected } = useSocket();

  const unreadCount = notifications.length;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-xl',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border px-3 py-1">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connected ? 'bg-emerald-500 animate-pulse-glow' : 'bg-red-500'
            )}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {Math.min(unreadCount, 9)}
            </span>
          )}
        </Button>

        {user && (
          <div className="flex items-center gap-3">
            <Avatar name={`${user.firstName} ${user.lastName}`} src={user.avatarUrl} size="sm" />
            <div className="hidden md:block">
              <p className="text-sm font-medium leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}