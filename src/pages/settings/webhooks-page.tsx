import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, ChevronDown, ChevronRight, RotateCcw, Circle, CheckCircle2 } from 'lucide-react';
import { api } from '@/shared/api/client';
import type { components } from '@/shared/api/types';

type WebhookSub = components['schemas']['WebhookSubscriptionResponseDto'];
type WebhookDelivery = components['schemas']['WebhookDeliveryResponseDto'];

// ── Available events ──────────────────────────────────────────────────────────

const ALL_EVENTS = [
  'request.submitted',
  'request.step_approved',
  'request.approved',
  'request.rejected',
  'request.cancelled',
  'request.expired',
] as const;

type EventType = (typeof ALL_EVENTS)[number];

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useSubscriptions() {
  return useQuery({
    queryKey: ['webhooks', 'subscriptions'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/webhooks/subscriptions');
      if (error || !data) throw new Error('Failed to load webhook subscriptions');
      return data;
    },
  });
}

function useDeliveries(subId: string | null) {
  return useQuery({
    queryKey: ['webhooks', 'deliveries', subId],
    queryFn: async () => {
      if (!subId) return [];
      const { data, error } = await api.GET('/v1/webhooks/subscriptions/{id}/deliveries', {
        params: { path: { id: subId } },
      });
      if (error || !data) throw new Error('Failed to load deliveries');
      return data;
    },
    enabled: !!subId,
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EventBadge({ event }: { event: string }) {
  const colorMap: Record<string, string> = {
    'request.submitted': 'bg-blue-50 text-blue-700',
    'request.step_approved': 'bg-violet-50 text-violet-700',
    'request.approved': 'bg-green-50 text-green-700',
    'request.rejected': 'bg-red-50 text-red-700',
    'request.cancelled': 'bg-zinc-100 text-zinc-500',
    'request.expired': 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${colorMap[event] ?? 'bg-zinc-100 text-zinc-500'}`}>
      {event}
    </span>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'delivered'
      ? 'bg-green-50 text-green-700'
      : status === 'pending'
      ? 'bg-zinc-100 text-zinc-500'
      : 'bg-red-50 text-red-500';
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

// ── Create subscription modal ─────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateSubscriptionModal({ onClose, onSuccess }: CreateModalProps) {
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<EventType[]>([]);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error: err } = await api.POST('/v1/webhooks/subscriptions', {
        body: {
          url,
          secret,
          description: description || undefined,
          events,
        },
      });
      if (err || !data) throw new Error('Failed to create subscription');
      return data;
    },
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  const toggleEvent = (event: EventType) =>
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );

  const inputClass =
    'h-8 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Register webhook</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="flex flex-col gap-4 p-5"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Endpoint URL *</label>
            <input
              type="url" required value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass} placeholder="https://example.com/hooks/opshub"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Signing secret *</label>
            <input
              type="password" required value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className={inputClass} placeholder="At least 16 chars — stored as bcrypt hash"
            />
            <p className="text-xs text-zinc-400">
              Deliveries are signed with <code className="rounded bg-zinc-100 px-1">X-OpsHub-Signature: sha256=…</code>
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Description <span className="text-zinc-400">(optional)</span></label>
            <input
              type="text" value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass} placeholder="Production alert channel…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Events *</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_EVENTS.map((event) => (
                <button
                  key={event} type="button" onClick={() => toggleEvent(event)}
                  className={[
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    events.includes(event)
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
                  ].join(' ')}
                >
                  {event}
                </button>
              ))}
            </div>
            {events.length === 0 && <p className="text-xs text-red-400">Select at least one event</p>}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={mutation.isPending || events.length === 0}
              className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {mutation.isPending ? 'Registering…' : 'Register webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delivery row ──────────────────────────────────────────────────────────────

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  const qc = useQueryClient();

  const retry = useMutation({
    mutationFn: async () => {
      const { error } = await api.POST('/v1/webhooks/deliveries/{id}/retry', {
        params: { path: { id: delivery.id } },
      });
      if (error) throw new Error('Retry failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks', 'deliveries', delivery.subscriptionId] }),
  });

  return (
    <tr className="text-xs">
      <td className="px-4 py-2.5 font-mono text-zinc-400">{delivery.id.slice(0, 8)}…</td>
      <td className="px-4 py-2.5"><EventBadge event={delivery.eventType} /></td>
      <td className="px-4 py-2.5"><DeliveryStatusBadge status={delivery.status} /></td>
      <td className="px-4 py-2.5 text-zinc-500">{delivery.attempts}</td>
      <td className="px-4 py-2.5 text-zinc-400">{delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleString() : '—'}</td>
      <td className="px-4 py-2.5 text-right">
        {delivery.status !== 'delivered' && (
          <button
            onClick={() => retry.mutate()}
            disabled={retry.isPending}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Subscription row ──────────────────────────────────────────────────────────

function SubscriptionRow({ sub, onDelete }: { sub: WebhookSub; onDelete: () => void }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const toggle = useMutation({
    mutationFn: async () => {
      const { error } = await api.PATCH('/v1/webhooks/subscriptions/{id}/active', {
        params: { path: { id: sub.id } },
        body: { active: !sub.active },
      });
      if (error) throw new Error('Toggle failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks', 'subscriptions'] }),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await api.DELETE('/v1/webhooks/subscriptions/{id}', {
        params: { path: { id: sub.id } },
      });
      if (error) throw new Error('Delete failed');
    },
    onSuccess: onDelete,
  });

  const deliveries = useDeliveries(expanded ? sub.id : null);

  return (
    <>
      <tr className="transition-colors hover:bg-zinc-50">
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-600"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="font-mono text-sm text-zinc-900 truncate max-w-xs">{sub.url}</div>
          {sub.description && <div className="text-xs text-zinc-400">{sub.description}</div>}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {sub.events.map((e) => <EventBadge key={e} event={e} />)}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-zinc-400">{new Date(sub.createdAt).toLocaleDateString()}</td>
        <td className="px-4 py-3">
          <button
            onClick={() => toggle.mutate()}
            disabled={toggle.isPending}
            className="flex items-center gap-1.5 text-xs font-medium"
            title={sub.active ? 'Click to disable' : 'Click to enable'}
          >
            {sub.active ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-700">Active</span>
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-zinc-500">Inactive</span>
              </>
            )}
          </button>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => del.mutate()}
            disabled={del.isPending}
            className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
            title="Delete subscription"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-zinc-50 px-4 pb-4 pt-0">
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2">
                <span className="text-xs font-medium text-zinc-500">Recent deliveries</span>
              </div>
              {deliveries.isLoading && (
                <p className="px-4 py-4 text-xs text-zinc-400">Loading…</p>
              )}
              {deliveries.data && deliveries.data.length === 0 && (
                <p className="px-4 py-4 text-xs text-zinc-400">No deliveries yet.</p>
              )}
              {deliveries.data && deliveries.data.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">Event</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">Attempts</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">Delivered at</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {deliveries.data.map((d) => <DeliveryRow key={d.id} delivery={d} />)}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function WebhooksPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError } = useSubscriptions();
  const refetch = () => qc.invalidateQueries({ queryKey: ['webhooks', 'subscriptions'] });

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Webhooks</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Receive real-time event notifications at your own HTTPS endpoints.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Register webhook
        </button>
      </div>

      {/* Info box */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-xs text-blue-700">
          Each delivery is signed with <code className="rounded bg-blue-100 px-1">X-OpsHub-Signature: sha256=&lt;HMAC-SHA256&gt;</code>.
          Verify this header against your secret before processing. Retries follow exponential back-off: 1 min → 5 min → 15 min → 1 hr (max 5 attempts).
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="w-8 px-4 py-2.5" />
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">URL</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Events</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Created</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>
            )}
            {isError && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-red-500">Failed to load subscriptions.</td></tr>
            )}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-zinc-400">No webhooks registered</span>
                    <span className="text-xs text-zinc-300">Register one to start receiving real-time events</span>
                  </div>
                </td>
              </tr>
            )}
            {data?.map((sub) => (
              <SubscriptionRow key={sub.id} sub={sub} onDelete={refetch} />
            ))}
          </tbody>
        </table>
        {data && data.length > 0 && (
          <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">
            {data.length} subscription{data.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {creating && (
        <CreateSubscriptionModal
          onClose={() => setCreating(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
