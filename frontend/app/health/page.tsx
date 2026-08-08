'use client';

import * as React from 'react';
import { Activity, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { apiClient } from '@/lib/api-client';
import { getSeverityColor, formatDate } from '@/lib/utils';

interface HealthRecord {
  id: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  severity: string;
  status: string;
  student: {
    user: { firstName: string; lastName: string };
  };
}

interface HealthResponse {
  data: { data: HealthRecord[]; meta?: { total: number } };
}

export default function HealthPage() {
  const [records, setRecords] = React.useState<HealthRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = async () => {
    try {
      const result = await apiClient<HealthResponse>('/health-records?limit=100');
      setRecords(result.data?.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load health records');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Health Center"
        description={`${records.length} health records`}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {records.map((record) => (
          <Card key={record.id} className="glass-card border-0 transition-all duration-300 hover:shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                  {record.severity === 'HIGH' ? (
                    <Activity className="h-5 w-5" />
                  ) : (
                    <Stethoscope className="h-5 w-5" />
                  )}
                </div>
                <Badge className={getSeverityColor(record.severity)}>{record.severity}</Badge>
              </div>
              <CardTitle className="mt-3 text-base">
                {record.student.user.firstName} {record.student.user.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-primary">{record.title}</p>
              {record.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {record.description}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(record.date)}</span>
                <Badge variant="outline" className="text-[10px]">
                  {record.type}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {records.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <Stethoscope className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p>No health records found</p>
          </div>
        )}
      </div>
    </>
  );
}