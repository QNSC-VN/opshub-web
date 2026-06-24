/**
 * AuditLogsPage — filterable audit trail for it-admin / security roles.
 *
 * Features:
 *  - Filter by actor email, resource type, action keyword
 *  - Offset-paginated table (50 per page)
 *  - Expandable row showing changes + metadata JSON
 *  - Auto-refresh every 30 s
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, ShieldAlert } from 'lucide-react';
import { api } from '@/shared/api/client';
import type { AuditLogResponse } from '@/shared/api/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_CLASS: Record<string, string> = {
  create: 'bg-green-50 text-green-700',
  update: 'bg-blue-50 text-blue-700',
  delete: 'bg-red-50 text-red-700',
  approve: 'bg-emerald-50 text-emerald-700',
  reject: 'bg-red-50 text-red-600',
  assign: 'bg-violet-50 text-violet-700',
  revoke: 'bg-orange-50 text-orange-700',
};

function actionClass(action: string): string {
  const verb = action.split('.').pop() ?? action;
  return ACTION_CLASS[verb] ?? 'bg-zinc-100 text-zinc-600';
}

const inputClass =
  'h-8 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

// ── Row ───────────────────────────────────────────────────────────────────────

function AuditRow({ log }: { log: AuditLogResponse }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = (log.changes && Object.keys(log.changes).length > 0) ||
    (log.metadata && Object.keys(log.metadata).length > 0);

  return (
    <>
      <tr
        className={`border-b border-zinc-50 transition-colors ${hasDetail ? 'cursor-pointer hover:bg-zinc-50' : ''}`}
        onClick={() => hasDetail && setExpanded((e) => !e)}
      >
        <td className="px-4 py-2.5 text-xs text-zinc-400 tabular-nums">{formatTs(log.occurredAt)}</td>
        <td className="px-4 py-2.5">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${actionClass(log.action)}`}>
            {log.action}
          </span>
        </td>
        <td className="px-4 py-2.5 text-xs text-zinc-600">{log.resourceType}</td>
        <td className="px-4 py-2.5 text-xs font-mono text-zinc-500 truncate max-w-[120px]">
          {log.resourceId ?? '—'}
        </td>
        <td className="px-4 py-2.5 text-xs text-zinc-600">
          {log.actorEmail ?? log.actorId ?? 'system'}
        </td>
        {hasDetail && (
          <td className="px-4 py-2.5">
            <ChevronDown
              className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
              strokeWidth={2}
            />
          </td>
        )}
        {!hasDetail && <td className="px-4 py-2.5" />}
      </tr>
      {expanded && hasDetail && (
        <tr className="border-b border-zinc-50 bg-zinc-50/60">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              {log.changes && Object.keys(log.changes).length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">Changes</p>
                  <pre className="overflow-x-auto rounded-md bg-white border border-zinc-100 p-2 text-[11px] text-zinc-700">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                </div>
              )}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">Metadata</p>
                  <pre className="overflow-x-auto rounded-md bg-white border border-zinc-100 p-2 text-[11px] text-zinc-700">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

interface AuditListResponse {
  data?: AuditLogResponse[];
  pageInfo?: { total: number; limit: number; offset: number; hasNextPage: boolean };
}

export function AuditLogsPage() {
  const [actorEmail, setActorEmail] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [offset, setOffset] = useState(0);

  // Committed filters — only applied when user stops typing (debounce via key)
  const [committed, setCommitted] = useState({ actorEmail: '', resourceType: '', action: '' });

  function applyFilters() {
    setCommitted({ actorEmail, resourceType, action });
    setOffset(0);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') applyFilters();
  }

  const { data, isLoading, isError } = useQuery<AuditListResponse>({
    queryKey: ['audit-logs', committed, offset],
    queryFn: async () => {
      const query: Record<string, string | number> = { limit: PAGE_SIZE, offset };
      if (committed.resourceType) query['resourceType'] = committed.resourceType;
      if (committed.action) query['action'] = committed.action;
      const { data, error } = await api.GET('/v1/audit-logs', {
        params: { query: query as never },
      });
      if (error || !data) throw new Error();
      return data as AuditListResponse;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const rows = data?.data ?? [];
  const total = data?.pageInfo?.total ?? 0;
  const hasNext = data?.pageInfo?.hasNextPage ?? false;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-zinc-400" strokeWidth={1.75} />
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Audit Logs</h1>
          <p className="text-sm text-zinc-500">Compliance-grade action history for all OpsHub operations.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            className={`${inputClass} pl-8 w-52`}
            placeholder="Actor email…"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>
        <input
          className={`${inputClass} w-44`}
          placeholder="Resource type…"
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          onKeyDown={handleKey}
        />
        <input
          className={`${inputClass} w-44`}
          placeholder="Action…"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          onClick={applyFilters}
          className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Search
        </button>
        {(committed.actorEmail || committed.resourceType || committed.action) && (
          <button
            onClick={() => {
              setActorEmail(''); setResourceType(''); setAction('');
              setCommitted({ actorEmail: '', resourceType: '', action: '' });
              setOffset(0);
            }}
            className="h-8 rounded-md border border-zinc-200 px-3 text-sm text-zinc-500 hover:bg-zinc-50"
          >
            Clear
          </button>
        )}
        {total > 0 && (
          <span className="ml-auto text-xs text-zinc-400">{total.toLocaleString()} entries</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500 w-44">Time</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Action</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Resource</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500 w-32">Resource ID</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Actor</th>
              <th className="px-4 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-zinc-400">Loading…</td></tr>
            )}
            {isError && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-red-500">Failed to load audit logs.</td></tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <ShieldAlert className="mx-auto h-8 w-8 text-zinc-200" strokeWidth={1.5} />
                  <p className="mt-2 text-sm text-zinc-400">No audit logs found</p>
                </td>
              </tr>
            )}
            {rows.map((log) => <AuditRow key={log.id} log={log} />)}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-xs text-zinc-400">
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="h-8 rounded-md border border-zinc-200 px-3 text-sm text-zinc-600 disabled:opacity-40 hover:bg-zinc-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={!hasNext}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="h-8 rounded-md border border-zinc-200 px-3 text-sm text-zinc-600 disabled:opacity-40 hover:bg-zinc-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
