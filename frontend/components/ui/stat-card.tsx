import * as React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: number;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn('glass-card border-0 p-4', className)}>
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-lg shadow-primary/25">
            <Icon className="h-5 w-5" />
          </div>
          {trend !== undefined && (
            <span
              className={cn(
                'rounded-full px-2 py-1 text-xs font-medium',
                trend >= 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              )}
            >
              {trend >= 0 ? '+' : ''}
              {trend}%
            </span>
          )}
        </div>
        <CardTitle className="mt-4 text-2xl font-bold">{value}</CardTitle>
        <CardDescription className="mt-1 text-sm">{title}</CardDescription>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </Card>
    </motion.div>
  );
}