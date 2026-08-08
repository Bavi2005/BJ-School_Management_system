'use client';

import * as React from 'react';
import { Bus, MapPin, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';

interface Route {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  stops: string[] | null;
  status: string;
  fare: number | null;
}

interface BusData {
  id: string;
  busNumber: string;
  registrationNo: string;
  model: string | null;
  capacity: number;
  driverName: string | null;
  status: string;
  route: Route | null;
}

export default function TransportPage() {
  const [routes, setRoutes] = React.useState<Route[]>([]);
  const [buses, setBuses] = React.useState<BusData[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const [r, b, s] = await Promise.all([
        apiClient<{ data: Route[] }>('/transport/routes'),
        apiClient<{ data: BusData[] }>('/transport/buses'),
        apiClient<{ data: any }>('/transport/stats'),
      ]);
      setRoutes(r.data ?? []);
      setBuses(b.data ?? []);
      setStats(s.data ?? null);
    } catch {
      toast.error('Failed to load transport data');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transport Management</h1>
        <p className="text-muted-foreground">Bus routes, vehicles and student allocation</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Active Buses" value={String(stats?.activeBuses ?? 0)} icon={Bus} />
          <StatCard title="Active Routes" value={String(stats?.activeRoutes ?? 0)} icon={MapPin} />
          <StatCard title="Students on Transport" value={String(stats?.studentsAssigned ?? 0)} icon={Users} />
          <StatCard title="Total Capacity" value={String(stats?.totalCapacity ?? 0)} icon={Bus} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bus Routes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {routes.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.name}</p>
                  <Badge variant={r.status === 'ACTIVE' ? 'default' : 'secondary'}>{r.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.startPoint} → {r.endPoint}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(r.stops ?? []).map((s) => (
                    <Badge key={s} variant="outline">{s}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fleet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {buses.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{b.busNumber} • {b.registrationNo}</p>
                  <p className="text-sm text-muted-foreground">
                    {b.driverName ?? 'No driver'} • Cap {b.capacity} • {b.route?.name ?? 'Unassigned'}
                  </p>
                </div>
                <Badge variant={b.status === 'ACTIVE' ? 'default' : b.status === 'MAINTENANCE' ? 'destructive' : 'secondary'}>{b.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}