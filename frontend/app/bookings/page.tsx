'use client';

import * as React from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  DoorOpen,
  Loader2,
  MapPin,
  Plus,
  User,
  Users,
  XCircle,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@school-mgmt/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  location: string | null;
  description: string | null;
  equipment: string | null;
  status: string;
  bookings?: Array<{ id: string; startTime: string; endTime: string; title: string }>;
}

interface Booking {
  id: string;
  title: string;
  purpose: string | null;
  startTime: string;
  endTime: string;
  attendees: number | null;
  status: string;
  notes: string | null;
  room: { id: string; name: string; type: string; location: string | null };
  user: { id: string; firstName: string; lastName: string; email: string; role: string };
}

interface Stats {
  totalRooms: number;
  availableRooms: number;
  inUseRooms: number;
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  todayBookings: number;
}

interface ListResponse<T> {
  data: { data: T[]; meta: Record<string, unknown> };
}

const ROOM_TYPES = [
  'CLASSROOM',
  'LABORATORY',
  'AUDITORIUM',
  'HALL',
  'GYMNASIUM',
  'COMPUTER_LAB',
  'MEETING_ROOM',
  'LIBRARY',
  'OTHER',
];

const ROOM_TYPE_LABELS: Record<string, string> = {
  CLASSROOM: 'Classroom',
  LABORATORY: 'Laboratory',
  AUDITORIUM: 'Auditorium',
  HALL: 'Hall',
  GYMNASIUM: 'Gymnasium',
  COMPUTER_LAB: 'Computer Lab',
  MEETING_ROOM: 'Meeting Room',
  LIBRARY: 'Library',
  OTHER: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  IN_USE: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  MAINTENANCE: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  CLOSED: 'bg-red-500/10 text-red-700 dark:text-red-300',
  PENDING: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  REJECTED: 'bg-red-500/10 text-red-700 dark:text-red-300',
  CANCELLED: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  COMPLETED: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
};

function toLocalInputValue(date: string): string {
  return date.slice(0, 16);
}

export default function BookingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const [tab, setTab] = React.useState('rooms');
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [roomDialogOpen, setRoomDialogOpen] = React.useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = React.useState(false);
  const [editingRoom, setEditingRoom] = React.useState<Room | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [roomForm, setRoomForm] = React.useState({
    name: '',
    type: 'CLASSROOM',
    capacity: '30',
    location: '',
    description: '',
    equipment: '',
    status: 'AVAILABLE',
  });

  const [bookingForm, setBookingForm] = React.useState({
    roomId: '',
    title: '',
    purpose: '',
    startTime: '',
    endTime: '',
    attendees: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [roomsRes, bookingsRes, statsRes] = await Promise.all([
        apiClient<ListResponse<Room>>('/bookings/rooms?limit=100'),
        apiClient<ListResponse<Booking>>('/bookings/bookings?limit=100'),
        apiClient<{ data: Stats }>('/bookings/stats'),
      ]);
      setRooms(roomsRes.data?.data ?? []);
      setBookings(bookingsRes.data?.data ?? []);
      setStats(statsRes.data ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const openCreateRoom = () => {
    setEditingRoom(null);
    setRoomForm({
      name: '',
      type: 'CLASSROOM',
      capacity: '30',
      location: '',
      description: '',
      equipment: '',
      status: 'AVAILABLE',
    });
    setRoomDialogOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      type: room.type,
      capacity: String(room.capacity),
      location: room.location ?? '',
      description: room.description ?? '',
      equipment: room.equipment ?? '',
      status: room.status,
    });
    setRoomDialogOpen(true);
  };

  const openCreateBooking = (roomId?: string) => {
    setBookingForm({
      roomId: roomId ?? '',
      title: '',
      purpose: '',
      startTime: '',
      endTime: '',
      attendees: '',
      notes: '',
    });
    setBookingDialogOpen(true);
  };

  const submitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        name: roomForm.name.trim(),
        type: roomForm.type,
        capacity: Number(roomForm.capacity) || 30,
        location: roomForm.location.trim() || undefined,
        description: roomForm.description.trim() || undefined,
        equipment: roomForm.equipment.trim() || undefined,
        status: roomForm.status,
      };
      if (editingRoom) {
        await apiClient(`/bookings/rooms/${editingRoom.id}`, { method: 'PATCH', body });
        toast.success('Room updated successfully');
      } else {
        await apiClient('/bookings/rooms', { method: 'POST', body });
        toast.success('Room created successfully');
      }
      setRoomDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save room');
    } finally {
      setSubmitting(false);
    }
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        roomId: bookingForm.roomId,
        title: bookingForm.title.trim(),
        purpose: bookingForm.purpose.trim() || undefined,
        startTime: new Date(bookingForm.startTime).toISOString(),
        endTime: new Date(bookingForm.endTime).toISOString(),
        attendees: bookingForm.attendees ? Number(bookingForm.attendees) : undefined,
        notes: bookingForm.notes.trim() || undefined,
      };
      await apiClient('/bookings/bookings', { method: 'POST', body });
      toast.success('Booking requested successfully');
      setBookingDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const updateBookingStatus = async (booking: Booking, status: string) => {
    try {
      await apiClient(`/bookings/bookings/${booking.id}`, {
        method: 'PATCH',
        body: { status },
      });
      toast.success(`Booking ${status.toLowerCase()}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update booking');
    }
  };

  const cancelBooking = async (booking: Booking) => {
    try {
      await apiClient(`/bookings/bookings/${booking.id}`, { method: 'DELETE' });
      toast.success('Booking cancelled');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel booking');
    }
  };

  const deleteRoom = async (room: Room) => {
    if (!window.confirm(`Delete room "${room.name}"?`)) return;
    try {
      await apiClient(`/bookings/rooms/${room.id}`, { method: 'DELETE' });
      toast.success('Room deleted');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete room');
    }
  };

  if (loading && !rooms.length) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Room & Hall Booking"
        description="Book classrooms, labs, halls and facilities for school activities"
        actions={
          <Button onClick={() => openCreateBooking()}>
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats?.totalRooms ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Rooms</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-600">{stats?.availableRooms ?? 0}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">{stats?.inUseRooms ?? 0}</p>
            <p className="text-xs text-muted-foreground">In Use</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats?.totalBookings ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">{stats?.pendingBookings ?? 0}</p>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-violet-600">{stats?.todayBookings ?? 0}</p>
            <p className="text-xs text-muted-foreground">In Progress Today</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rooms">Rooms & Facilities</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        {/* Rooms tab */}
        <TabsContent value="rooms" className="space-y-4">
          {isAdmin && (
            <Button variant="outline" onClick={openCreateRoom}>
              <Building2 className="h-4 w-4" />
              Add Room
            </Button>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room.id} className="glass-card border-0 transition-all hover:-translate-y-1 hover:shadow-xl">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-white">
                        <DoorOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{room.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {ROOM_TYPE_LABELS[room.type] ?? room.type}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[room.status]}>
                      {room.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> Capacity: {room.capacity}
                    </p>
                    {room.location && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" /> {room.location}
                      </p>
                    )}
                    {room.equipment && (
                      <p className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" /> {room.equipment}
                      </p>
                    )}
                  </div>

                  {room.bookings && room.bookings.length > 0 && (
                    <div className="mt-3 space-y-1.5 rounded-lg border bg-muted/40 p-2.5">
                      <p className="text-xs font-medium text-foreground">Active bookings:</p>
                      {room.bookings.slice(0, 3).map((b) => (
                        <p key={b.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarClock className="h-3 w-3" />
                          {new Date(b.startTime).toLocaleDateString()} {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {b.title}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={room.status === 'MAINTENANCE' || room.status === 'CLOSED'}
                      onClick={() => openCreateBooking(room.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Book
                    </Button>
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openEditRoom(room)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteRoom(room)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {rooms.length === 0 && (
              <p className="col-span-full py-10 text-center text-muted-foreground">
                No rooms yet. {isAdmin ? 'Click "Add Room" to create one.' : 'Contact the admin to add rooms.'}
              </p>
            )}
          </div>
        </TabsContent>

        {/* Bookings tab */}
        <TabsContent value="bookings" className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Room</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">When</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Requested By</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{booking.title}</p>
                          {booking.purpose && (
                            <p className="text-xs text-muted-foreground">{booking.purpose}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p>{booking.room.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ROOM_TYPE_LABELS[booking.room.type] ?? booking.room.type}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p>
                            {new Date(booking.startTime).toLocaleDateString()}{' '}
                            {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            to{' '}
                            {new Date(booking.endTime).toLocaleDateString()}{' '}
                            {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {booking.attendees && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" /> {booking.attendees}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {booking.user.firstName} {booking.user.lastName}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {booking.user.role.toLowerCase().replace('_', ' ')}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[booking.status]}>
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {isAdmin && booking.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-600"
                                  onClick={() => updateBookingStatus(booking, 'APPROVED')}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive"
                                  onClick={() => updateBookingStatus(booking, 'REJECTED')}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {(isAdmin || booking.user.id === user?.id) &&
                              (booking.status === 'PENDING' || booking.status === 'APPROVED') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-muted-foreground"
                                  onClick={() => cancelBooking(booking)}
                                >
                                  Cancel
                                </Button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="h-24 text-center text-muted-foreground">
                          No bookings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Room dialog */}
      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
            <DialogDescription>
              {editingRoom
                ? 'Update the details of this room or facility.'
                : 'Add a new classroom, lab, hall or facility.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRoom} className="space-y-4">
            <div className="space-y-2">
              <Label>Room Name</Label>
              <Input
                value={roomForm.name}
                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                placeholder="e.g. Room 101"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={roomForm.type}
                  onValueChange={(v) => setRoomForm({ ...roomForm, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ROOM_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={roomForm.location}
                onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                placeholder="e.g. Block A - Ground Floor"
              />
            </div>
            <div className="space-y-2">
              <Label>Equipment / Amenities</Label>
              <Input
                value={roomForm.equipment}
                onChange={(e) => setRoomForm({ ...roomForm, equipment: e.target.value })}
                placeholder="e.g. Projector, Whiteboard"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={roomForm.status}
                onValueChange={(v) => setRoomForm({ ...roomForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'CLOSED'].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={roomForm.description}
                onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingRoom ? 'Save Changes' : 'Add Room'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Booking dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Booking Request</DialogTitle>
            <DialogDescription>
              Request a room for your activity. An admin will need to approve it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBooking} className="space-y-4">
            <div className="space-y-2">
              <Label>Room</Label>
              <Select
                value={bookingForm.roomId}
                onValueChange={(v) => setBookingForm({ ...bookingForm, roomId: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms
                    .filter((r) => r.status !== 'CLOSED')
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({ROOM_TYPE_LABELS[r.type] ?? r.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={bookingForm.title}
                onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                placeholder="e.g. Parent-Teacher Meeting"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea
                value={bookingForm.purpose}
                onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                placeholder="What is this booking for?"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type="datetime-local"
                  value={bookingForm.startTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input
                  type="datetime-local"
                  value={bookingForm.endTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expected Attendees</Label>
              <Input
                type="number"
                min={1}
                value={bookingForm.attendees}
                onChange={(e) => setBookingForm({ ...bookingForm, attendees: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                placeholder="Optional notes for the admin"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Booking Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
