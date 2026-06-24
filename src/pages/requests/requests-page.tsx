/**
 * RequestsPage — unified approval inbox.
 *
 * Shows all request items across types (access, leave, overtime, onboarding…).
 * Approvers can filter by "My queue" (pending items where they're the assignee),
 * review each item, and approve/reject from an inline note modal.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, ChevronDown, Check, X, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import type { RequestItemResponse, RequestStatus, RequestPriority } from '@/shared/api/types';

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const STATUS_CLASS: Record<RequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  in_review: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-zinc-100 text-zinc-500',
  expired: 'bg-zinc-100 text-zinc-400',
};

const PRIORITY_CLASS: Record<RequestPriority, string> = {
  low: 'text-zinc-400',
  normal: 'text-zinc-500',
  high: 'text-amber-600',
  urgent: 'text-red-600',
};

const PRIORITY_DOT: Record<RequestPriority, string> = {
  low: 'bg-zinc-300',
  normal: 'bg-zinc-400',
  high: 'bg-amber-500',
  urgent: 'bg-red-500',
};

const REQUEST_TYPE_LABEL: Record<string, string> = {
  access_request: 'Access Request',
  leave_request: 'Leave',
  overtime: 'Overtime',
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',
};

const STATUS_TABS: { value: RequestStatus | 'my_queue' | ''; label: string }[] = [
  { value: 'my_queue', label: 'My Queue' },
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSlaAtRisk(req: RequestItemResponse): boolean {
  if (!req.slaDeadline || req.status !== 'pending' && req.status !== 'in_review') return false;
  const remaining = new Date(req.slaDeadline).getTime() - Date.now();
  return remaining < 8 * 3_600_000 && remaining > 0; // < 8 h left
}

function isSlaBreached(req: RequestItemResponse): boolean {
  return !!req.slaBreachedAt;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useRequests(filter: RequestStatus | 'my_queue' | '') {
  return useQuery<{ data: RequestItemResponse[]; total: number }>({
    queryKey: ['requests', 'list', filter],
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = { limit: 50 };
      if (filter === 'my_queue') {
        params['myQueue'] = true;
      } else if (filter) {
        params['status'] = filter;
      }
      const { data, error } = await api.GET('/v1/requests', {
        params: { query: params as never },
      });
      if (error || !data) throw new Error('Failed to load requests');
      return data as unknown as { data: RequestItemResponse[]; total: number };
    },
  });
}

// ── Review modal ──────────────────────────────────────────────────────────────

interface ReviewModalProps {
  request: RequestItemResponse;
  action: 'approve' | 'reject';
  onClose: () => void;
  onSuccess: () => void;
}

function ReviewModal({ request, action, onClose, onSuccess }: ReviewModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const typeLabel = REQUEST_TYPE_LABEL[request.type] ?? request.type;
  const isApprove = action === 'approve';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isApprove && !note.trim()) { setErr('A reason is required for rejection.'); return; }
    setLoading(true);
    setErr('');

    const endpoint = isApprove ? '/v1/requests/{id}/approve' : '/v1/requests/{id}/reject';
    const { error } = await api.POST(endpoint, {
      params: { path: { id: request.id } },
      body: { note: note.trim() || undefined },
    });
    setLoading(false);
    if (error) { setErr('Failed to process request. Please try again.'); return; }

    toast.success(isApprove ? 'Request approved' : 'Request rejected');
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            {isApprove ? 'Approve' : 'Reject'} {typeLabel}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Request summary */}
        <div className="mx-5 mt-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-400">Type</span>
            <span className="font-medium">{typeLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Step</span>
            <span className="font-medium">{request.currentStep} / {request.totalSteps}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Submitted</span>
            <span className="font-medium">{formatDate(request.submittedAt)}</span>
          </div>
          {request.slaDeadline && (
            <div className="flex justify-between">
              <span className="text-zinc-400">SLA deadline</span>
              <span className={isSlaBreached(request) ? 'font-medium text-red-600' : 'font-medium'}>
                {formatDate(request.slaDeadline)}
                {isSlaBreached(request) && ' ⚠ Breached'}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">
              Note {isApprove ? '(optional)' : '*'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={isApprove ? 'Add an approval note…' : 'Explain why this is being rejected…'}
              className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className={[
                'h-8 rounded-md px-3.5 text-sm font-medium text-white disabled:opacity-60',
                isApprove ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700',
              ].join(' ')}
            >
              {loading ? 'Processing…' : isApprove ? 'Approve' : 'Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Expandable row ────────────────────────────────────────────────────────────

interface RequestRowProps {
  req: RequestItemResponse;
  onAction: (req: RequestItemResponse, action: 'approve' | 'reject') => void;
}

function RequestRow({ req, onAction }: RequestRowProps) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = REQUEST_TYPE_LABEL[req.type] ?? req.type;
  const status = req.status as RequestStatus;
  const priority = req.priority as RequestPriority;
  const atRisk = isSlaAtRisk(req);
  const breached = isSlaBreached(req);
  const isActionable = status === 'pending' || status === 'in_review';

  return (
    <>
      <tr
        className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <ChevronDown
              className={['h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform', expanded ? 'rotate-0' : '-rotate-90'].join(' ')}
              strokeWidth={2}
            />
            <div>
              <p className="text-sm font-medium text-zinc-900">{typeLabel}</p>
              <p className="text-xs text-zinc-400 font-mono">{req.id.slice(0, 8)}…</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={['inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', STATUS_CLASS[status]].join(' ')}>
            {STATUS_LABEL[status]}
            {req.totalSteps > 1 && isActionable && (
              <span className="opacity-60">· {req.currentStep}/{req.totalSteps}</span>
            )}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className={['h-1.5 w-1.5 rounded-full shrink-0', PRIORITY_DOT[priority]].join(' ')} />
            <span className={['text-xs capitalize', PRIORITY_CLASS[priority]].join(' ')}>{priority}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(req.submittedAt)}</td>
        <td className="px-4 py-3">
          {(atRisk || breached) && (
            <span className={['inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', breached ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'].join(' ')}>
              <AlertTriangle className="h-3 w-3" strokeWidth={2} />
              {breached ? 'Breached' : 'At risk'}
            </span>
          )}
          {!atRisk && !breached && req.slaDeadline && isActionable && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <Clock className="h-3 w-3" strokeWidth={1.75} />
              Due {formatDate(req.slaDeadline)}
            </span>
          )}
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {isActionable && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onAction(req, 'approve')}
                className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Approve
              </button>
              <button
                onClick={() => onAction(req, 'reject')}
                className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
                Reject
              </button>
            </div>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-zinc-50 bg-zinc-50/50">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
              <div>
                <p className="text-zinc-400">Requester ID</p>
                <p className="font-mono text-zinc-700">{req.requesterId}</p>
              </div>
              {req.assigneeId && (
                <div>
                  <p className="text-zinc-400">Assignee ID</p>
                  <p className="font-mono text-zinc-700">{req.assigneeId}</p>
                </div>
              )}
              {req.resolutionNote && (
                <div>
                  <p className="text-zinc-400">Resolution note</p>
                  <p className="text-zinc-700">{req.resolutionNote}</p>
                </div>
              )}
              {req.resolvedAt && (
                <div>
                  <p className="text-zinc-400">Resolved</p>
                  <p className="text-zinc-700">{formatDate(req.resolvedAt)}</p>
                </div>
              )}
              {/* Approval history */}
              {(req.approvals?.length ?? 0) > 0 && (
                <div className="col-span-full">
                  <p className="text-zinc-400 mb-1">Approval history</p>
                  <div className="flex flex-col gap-1">
                    {req.approvals!.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-xs">
                        <span className={['rounded px-1.5 py-0.5 font-medium', a.decision === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'].join(' ')}>
                          Step {a.step} — {a.decision}
                        </span>
                        <span className="text-zinc-400">{formatDate(a.decidedAt)}</span>
                        {a.note && <span className="text-zinc-500">"{a.note}"</span>}
                      </div>
                    ))}
                  </div>
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

export function RequestsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<RequestStatus | 'my_queue' | ''>('my_queue');
  const [modal, setModal] = useState<{ req: RequestItemResponse; action: 'approve' | 'reject' } | null>(null);

  const { data, isLoading, isError } = useRequests(tab);
  const rows = data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['requests'] });

  return (
    <>
      {modal && (
        <ReviewModal
          request={modal.req}
          action={modal.action}
          onClose={() => setModal(null)}
          onSuccess={invalidate}
        />
      )}

      <div className="flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Requests Inbox</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Unified approval queue across all request types.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={[
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                tab === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Request</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Priority</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Submitted</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">SLA</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">Loading…</td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-red-500">Failed to load requests.</td>
                </tr>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Inbox className="mx-auto h-8 w-8 text-zinc-200" strokeWidth={1.5} />
                    <p className="mt-2 text-sm text-zinc-400">No requests found</p>
                  </td>
                </tr>
              )}
              {rows.map((req) => (
                <RequestRow
                  key={req.id}
                  req={req}
                  onAction={(r, a) => setModal({ req: r, action: a })}
                />
              ))}
            </tbody>
          </table>
        </div>

        {data && (
          <p className="text-xs text-zinc-400">
            Showing {rows.length} of {data.total} requests
          </p>
        )}
      </div>
    </>
  );
}
