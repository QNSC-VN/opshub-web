import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, PackageSearch, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import type { SoftwareListing, FindingSeverity, FindingStatus } from '@/shared/api/types';

// ── Config ────────────────────────────────────────────────────────────────────

const LISTING_CLASS: Record<SoftwareListing, string> = {
  whitelisted: 'bg-green-50 text-green-700',
  blacklisted: 'bg-red-50 text-red-700',
  unknown: 'bg-zinc-100 text-zinc-500',
  review: 'bg-amber-50 text-amber-700',
};

const LISTING_LABEL: Record<SoftwareListing, string> = {
  whitelisted: 'Whitelisted',
  blacklisted: 'Blacklisted',
  unknown: 'Unknown',
  review: 'Under review',
};

const SEVERITY_CLASS: Record<FindingSeverity, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-50 text-orange-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-blue-50 text-blue-700',
};

const FINDING_STATUS_CLASS: Record<FindingStatus, string> = {
  open: 'bg-amber-50 text-amber-700',
  acknowledged: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-700',
  risk_accepted: 'bg-zinc-100 text-zinc-500',
};

const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  risk_accepted: 'Risk accepted',
};

// ── Software Catalog tab ──────────────────────────────────────────────────────

function SoftwareCatalogTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['compliance', 'software'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/compliance/software', {
        params: { query: { limit: 100 } },
      });
      if (error || !data) throw new Error('Failed to load software catalog');
      return data;
    },
  });

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Name</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Publisher</th>

            <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Listing</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {isLoading && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>
          )}
          {isError && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-red-500">Failed to load software catalog.</td></tr>
          )}
          {data?.data?.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <PackageSearch className="h-8 w-8 text-zinc-200" strokeWidth={1.5} />
                  <span className="text-sm text-zinc-400">No software entries found</span>
                </div>
              </td>
            </tr>
          )}
          {data?.data?.map((s) => (
            <tr key={s.id} className="transition-colors hover:bg-zinc-50">
              <td className="px-4 py-3 font-medium text-zinc-900">{s.name}</td>
              <td className="px-4 py-3 text-zinc-500">{s.publisher ?? '—'}</td>

              <td className="px-4 py-3">
                <span className={['inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', LISTING_CLASS[s.listing as SoftwareListing]].join(' ')}>
                  {LISTING_LABEL[s.listing as SoftwareListing]}
                </span>
              </td>
              <td className="px-4 py-3 max-w-xs truncate text-xs text-zinc-400" title={s.notes ?? ''}>
                {s.notes ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data?.pageInfo && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">
          {data.pageInfo.total} entr{data.pageInfo.total !== 1 ? 'ies' : 'y'}
        </div>
      )}
    </div>
  );
}

// ── Resolve modal ─────────────────────────────────────────────────────────────

interface ResolveModalProps {
  findingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ResolveModal({ findingId, onClose, onSuccess }: ResolveModalProps) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [riskAccepted, setRiskAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await api.POST('/v1/compliance/findings/{id}/resolve', {
      params: { path: { id: findingId } },
      body: { note: note || undefined, riskAccepted },
    });
    setLoading(false);
    if (error) { toast.error('Failed to resolve finding'); return; }
    toast.success(riskAccepted ? 'Finding marked as risk accepted' : 'Finding resolved');
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Resolve finding</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Resolution note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Describe how this finding was addressed…"
              className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={riskAccepted}
              onChange={(e) => setRiskAccepted(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-700">Accept residual risk (mark as risk accepted)</span>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Saving…' : riskAccepted ? 'Accept risk' : 'Resolve'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Findings tab ──────────────────────────────────────────────────────────────

const SEVERITY_FILTERS = [
  { value: '' as const, label: 'All' },
  { value: 'critical' as const, label: 'Critical' },
  { value: 'high' as const, label: 'High' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'low' as const, label: 'Low' },
];

function FindingsTab() {
  const qc = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | ''>('');
  const [resolveId, setResolveId] = useState<string | null>(null);

  const findings = useQuery({
    queryKey: ['compliance', 'findings', severityFilter],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/compliance/findings', {
        params: { query: { severity: (severityFilter || undefined) as never, limit: 100 } },
      });
      if (error || !data) throw new Error('Failed to load findings');
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['compliance', 'findings'] });

  async function handleAcknowledge(id: string) {
    const { error } = await api.POST('/v1/compliance/findings/{id}/acknowledge', {
      params: { path: { id } },
    });
    if (error) { toast.error('Failed to acknowledge finding'); return; }
    toast.success('Finding acknowledged');
    invalidate();
  }

  return (
    <>
      {resolveId && (
        <ResolveModal
          findingId={resolveId}
          onClose={() => setResolveId(null)}
          onSuccess={invalidate}
        />
      )}

      <div className="flex flex-col gap-4">
        {/* Severity filter */}
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
          {SEVERITY_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSeverityFilter(value)}
              className={[
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                severityFilter === value
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Software</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Version</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Severity</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Detected</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {findings.isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>
              )}
              {findings.isError && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-red-500">Failed to load findings.</td></tr>
              )}
              {findings.data?.data?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="h-8 w-8 text-zinc-200" strokeWidth={1.5} />
                      <span className="text-sm text-zinc-400">No findings found</span>
                    </div>
                  </td>
                </tr>
              )}
              {findings.data?.data?.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{f.softwareName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{f.softwareVersion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={['inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize', SEVERITY_CLASS[f.severity as FindingSeverity]].join(' ')}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={['inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', FINDING_STATUS_CLASS[f.status as FindingStatus]].join(' ')}>
                      {FINDING_STATUS_LABEL[f.status as FindingStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{new Date(f.detectedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {f.status === 'open' && (
                        <button
                          onClick={() => handleAcknowledge(f.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                        >
                          Acknowledge
                        </button>
                      )}
                      {(f.status === 'open' || f.status === 'acknowledged') && (
                        <button
                          onClick={() => setResolveId(f.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-50"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {findings.data?.pageInfo && (
            <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">
              {findings.data.pageInfo.total} finding{findings.data.pageInfo.total !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type ComplianceTab = 'software' | 'findings';

export function CompliancePage() {
  const [tab, setTab] = useState<ComplianceTab>('software');

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Compliance</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Software catalog, vulnerability findings, and remediation tracking.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex gap-6">
          {([['software', 'Software Catalog'], ['findings', 'Findings']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={[
                'pb-3 text-sm font-medium transition-colors',
                tab === value
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'software' && <SoftwareCatalogTab />}
      {tab === 'findings' && <FindingsTab />}
    </div>
  );
}
