import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';

const STATUS_TONE: Record<string, 'neutral' | 'green' | 'amber' | 'red' | 'blue'> = {
  in_stock: 'blue',
  assigned: 'green',
  in_repair: 'amber',
  retired: 'neutral',
  lost: 'red',
};

function useAssets(search: string) {
  return useQuery({
    queryKey: ['assets', 'list', search],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/assets', {
        params: { query: { search: search || undefined, limit: 50 } },
      });
      if (error || !data) throw new Error('Failed to load assets');
      return data;
    },
  });
}

export function AssetsPage() {
  const [search, setSearch] = useState('');
  const assets = useAssets(search);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-neutral-500">Laptops and hardware inventory.</p>
        </div>
        <Input
          placeholder="Search tag, model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Tag</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Model</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {assets.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  Loading…
                </td>
              </tr>
            )}
            {assets.isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-500">
                  Failed to load. Is the API running on :3000?
                </td>
              </tr>
            )}
            {assets.data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                  No assets yet.
                </td>
              </tr>
            )}
            {assets.data?.data.map((a) => (
              <tr key={a.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2.5 font-medium">{a.assetTag}</td>
                <td className="px-4 py-2.5 text-neutral-600">{a.type}</td>
                <td className="px-4 py-2.5 text-neutral-600">
                  {[a.manufacturer, a.model].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={STATUS_TONE[a.status] ?? 'neutral'}>{a.status}</Badge>
                </td>
                <td className="px-4 py-2.5 text-neutral-600">{a.assignedTo ? 'Yes' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
