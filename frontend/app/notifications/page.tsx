'use client';

import * as React from 'react';
import { AlertTriangle, Bell, BellRing, CheckCheck, Mail, Megaphone, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { NotificationType, UserRole } from '@school-mgmt/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/page-header';
import { apiClient, unwrapList } from '@/lib/api-client';
import { cn, formatDateTime } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  channels: string[];
  priority: string;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: string;
}

interface NotificationListBody {
  data: NotificationItem[];
  meta: { total: number };
}

interface UnreadBody {
  data: { count: number } | NotificationItem[];
}

type FilterTab = 'all' | 'unread' | 'read';

type PriorityVariant = 'secondary' | 'warning' | 'destructive' | 'default';

const priorityVariantMap: Record<string, PriorityVariant> = {
  LOW: 'secondary',
  NORMAL: 'warning',
  HIGH: 'warning',
  URGENT: 'destructive',
};

const typeVariantMap: Record<string, string> = {
  [NotificationType.INFO]: 'info',
  [NotificationType.SUCCESS]: 'success',
  [NotificationType.WARNING]: 'warning',
  [NotificationType.ERROR]: 'destructive',
  [NotificationType.ANNOUNCEMENT]: 'gradient',
  [NotificationType.REMINDER]: 'info',
  [NotificationType.GRADE_POSTED]: 'success',
  [NotificationType.ATTENDANCE_ALERT]: 'warning',
  [NotificationType.FEE_DUE]: 'destructive',
  [NotificationType.EVENT_REMINDER]: 'info',
};

const channelIconMap: Record<string, React.ReactNode> = {
  IN_APP: <Bell className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  PUSH: <BellRing className="h-3 w-3" />,
};

const roleOptions: { value: UserRole; label: string }[] = [
  { value: UserRole.SUPER_ADMIN, label: 'Super Admins' },
  { value: UserRole.ADMIN, label: 'Admins' },
  { value: UserRole.TEACHER, label: 'Teachers' },
  { value: UserRole.STUDENT, label: 'Students' },
  { value: UserRole.PARENT, label: 'Parents' },
];

const priorityOptions = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<FilterTab>('all');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [targetRole, setTargetRole] = React.useState<string>('');
  const [priority, setPriority] = React.useState<string>('NORMAL');

  const load = async () => {
    setLoading(true);
    try {
      const [listResult, unreadResult] = await Promise.all([
        apiClient<NotificationListBody>('/notifications?limit=100'),
        apiClient<UnreadBody>('/notifications/unread-count'),
      ]);
      setNotifications(unwrapList<NotificationItem>(listResult));
      const unreadPayload = unreadResult.data;
      if (Array.isArray(unreadPayload)) {
        setUnreadCount(unreadPayload.length);
      } else if (typeof unreadPayload?.count === 'number') {
        setUnreadCount(unreadPayload.count);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setTargetRole('');
    setPriority('NORMAL');
  };

  const submitAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, string> = { title: title.trim(), message: message.trim(), priority };
      if (targetRole) body.targetRole = targetRole;
      await apiClient('/announcement', { method: 'POST', body });
      toast.success('Announcement sent successfully');
      setDialogOpen(false);
      resetForm();
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRead = async (notification: NotificationItem) => {
    if (notification.isRead) return;
    try {
      await apiClient(`/notifications/${notification.id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark all as read');
    }
  };

  const removeNotification = async (id: string) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await apiClient(`/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.isRead) setUnreadCount((count) => Math.max(0, count - 1));
        return prev.filter((n) => n.id !== id);
      });
      toast.success('Notification deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete notification');
    }
  };

  const filtered = (tab: FilterTab) =>
    notifications.filter((n) => (tab === 'all' ? true : tab === 'unread' ? !n.isRead : n.isRead));

  const renderList = (items: NotificationItem[]) =>
    items.length === 0 ? (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Megaphone className="h-12 w-12 opacity-40" />
        <p className="text-sm">No notifications here</p>
      </div>
    ) : (
      <div className="grid gap-4">
        {items.map((notification) => (
          <Card
            key={notification.id}
            className={cn(
              'glass-card border-0 transition-all duration-300 hover:shadow-lg',
              !notification.isRead && 'ring-1 ring-primary/30'
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md',
                      !notification.isRead
                        ? 'bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500'
                        : 'bg-muted-foreground/20'
                    )}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className={cn('text-base', notification.isRead && 'text-muted-foreground')}>
                        {notification.title}
                      </CardTitle>
                      <Badge variant={(priorityVariantMap[notification.priority] ?? 'default') as PriorityVariant}>
                        {notification.priority === 'URGENT' && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {notification.priority}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{formatDateTime(notification.createdAt)}</span>
                      <span aria-hidden>·</span>
                      <Badge
                        variant={(typeVariantMap[notification.type] ?? 'default') as 'gradient' | 'info' | 'success' | 'warning' | 'destructive' | 'default'}
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {notification.type}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!notification.isRead && (
                    <Button variant="ghost" size="icon" title="Mark as read" onClick={() => void toggleRead(notification)}>
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void removeNotification(notification.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{notification.message}</p>
              {notification.channels.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {notification.channels.map((channel) => (
                    <span
                      key={channel}
                      className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {channelIconMap[channel] ?? <Bell className="h-3 w-3" />}
                      {channel.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                    </span>
                  ))}
                </div>
              )}
              {notification.actionUrl && notification.actionLabel && (
                <a
                  href={notification.actionUrl}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {notification.actionLabel}
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );

  if (loading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass-card border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
        actions={
          <>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={() => void markAllRead()}>
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
            <Button variant="gradient" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Announcement
            </Button>
          </>
        }
      />

      <Tabs value={filter} onValueChange={(tab) => setFilter(tab as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderList(filtered('all'))}</TabsContent>
        <TabsContent value="unread">{renderList(filtered('unread'))}</TabsContent>
        <TabsContent value="read">{renderList(filtered('read'))}</TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>
              Broadcast a message to a group of users. Announcements are delivered in-app and via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Parent-Teacher Conference"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All users</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={() => void submitAnnouncement()} disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}