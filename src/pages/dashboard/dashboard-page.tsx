import { useQuery } from '@tanstack/react-query';
import { Laptop, ShieldCheck, ScanLine, CalendarClock } from 'lucide-react';
import { api } from '@/shared/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

function useAssetCount() {
  return useQuery({
    queryKey: ['assets', 'count'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/assets', { params: { query: { limit: 1 } } });
      if (error || !data) throw new Error('Failed to load assets');
      return data.page.total;
    },
  });
}

const tiles = [
  { key: 'assets', label: 'Hardware assets', icon: Laptop },
  { key: 'access', label: 'Pending access requests', icon: ShieldCheck },
  { key: 'findings', label: 'Open compliance findings', icon: ScanLine },
  { key: 'leave', label: 'Pending leave requests', icon: CalendarClock },
] as const;

export function DashboardPage() {
  const assetCount = useAssetCount();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500">Operations overview across all domains.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-neutral-500">{label}</CardTitle>
              <Icon className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {key === 'assets'
                  ? assetCount.isLoading
                    ? '—'
                    : (assetCount.data ?? 0)
                  : '—'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
