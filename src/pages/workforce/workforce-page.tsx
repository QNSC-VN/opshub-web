import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Clock, Calendar, Zap, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import type {
  TimesheetStatus,
  LeaveType,
  LeaveStatus,
  OvertimeStatus,
  ShiftType,
} from '@/shared/api/types';

// ── Shared ────────────────────────────────────────────────────────────────────

const inputClass =
  'h-8 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

const TIMESHEET_STATUS_CLASS: Record<TimesheetStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-500',
  submitted: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const LEAVE_STATUS_CLASS: Record<LeaveStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-zinc-100 text-zinc-500',
};

const OVERTIME_STATUS_CLASS: Record<OvertimeStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const SHIFT_TYPE_LABEL: Record<ShiftType, string> = {
  night: 'Night',
  on_call: 'On-call',
  weekend: 'Weekend',
};

function StatusBadge({ className, label }: { className: string; label: string }) {
  return (
    <span className={['inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', className].join(' ')}>
      {label}
    </span>
  );
}

// ── Timesheets tab ────────────────────────────────────────────────────────────

const TS_FILTERS: { value: TimesheetStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

interface LogTimesheetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function LogTimesheetModal({ onClose, onSuccess }: LogTimesheetModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ workDate: '', minutesWorked: 480, note: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await api.POST('/v1/workforce/timesheets', {
      body: {
        workDate: form.workDate,
        minutesWorked: form.minutesWorked,
        note: form.note || undefined,
      },
    });
    setLoading(false);
    if (error) { toast.error('Failed to log timesheet'); return; }
    toast.success('Timesheet logged');
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Log timesheet</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Work date *</label>
            <input type="date" required value={form.workDate} onChange={(e) => setForm(f => ({ ...f, workDate: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Minutes worked *</label>
            <input type="number" required min={1} max={1440} value={form.minutesWorked}
              onChange={(e) => setForm(f => ({ ...f, minutesWorked: Number(e.target.value) }))} className={inputClass} />
            <p className="text-xs text-zinc-400">{Math.floor(form.minutesWorked / 60)}h {form.minutesWorked % 60}m</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Note</label>
            <textarea value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2} placeholder="Optional notes…"
              className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button>
            <button type="submit" disabled={loading} className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Saving…' : 'Log'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TimesheetsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | ''>('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workforce', 'timesheets', statusFilter],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/workforce/timesheets', {
        params: { query: { status: (statusFilter || undefined) as never, limit: 50 } },
      });
      if (error || !data) throw new Error('Failed to load timesheets');
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['workforce', 'timesheets'] });

  async function handleSubmitTs(id: string) {
    const { error } = await api.POST('/v1/workforce/timesheets/{id}/submit', { params: { path: { id } } });
    if (error) { toast.error('Failed to submit timesheet'); return; }
    toast.success('Timesheet submitted for review');
    invalidate();
  }

  async function handleReviewTs(id: string, approve: boolean) {
    const { error } = await api.POST('/v1/workforce/timesheets/{id}/review', {
      params: { path: { id } }, body: { approve },
    });
    if (error) { toast.error(`Failed to ${approve ? 'approve' : 'reject'} timesheet`); return; }
    toast.success(`Timesheet ${approve ? 'approved' : 'rejected'}`);
    invalidate();
  }

  return (
    <>
      {showForm && <LogTimesheetModal onClose={() => setShowForm(false)} onSuccess={invalidate} />}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
            {TS_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setStatusFilter(value)}
                className={['rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  statusFilter === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" strokeWidth={2} /> Log timesheet
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Work date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Minutes</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Note</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>}
              {isError && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-red-500">Failed to load timesheets.</td></tr>}
              {data?.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">No timesheets found</td></tr>}
              {data?.data?.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-900">{new Date(t.workDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-zinc-500">{t.minutesWorked} min ({Math.floor(t.minutesWorked / 60)}h {t.minutesWorked % 60}m)</td>
                  <td className="px-4 py-3 max-w-xs truncate text-xs text-zinc-400">{t.note ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge className={TIMESHEET_STATUS_CLASS[t.status]} label={t.status.charAt(0).toUpperCase() + t.status.slice(1)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {t.status === 'draft' && (
                        <button onClick={() => handleSubmitTs(t.id)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">Submit</button>
                      )}
                      {t.status === 'submitted' && (<>
                        <button onClick={() => handleReviewTs(t.id, true)} className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">Approve</button>
                        <button onClick={() => handleReviewTs(t.id, false)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Reject</button>
                      </>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.pageInfo && <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">{data.pageInfo.total} record{data.pageInfo.total !== 1 ? 's' : ''}</div>}
        </div>
      </div>
    </>
  );
}

// ── Leave tab ─────────────────────────────────────────────────────────────────

interface RequestLeaveModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function RequestLeaveModal({ onClose, onSuccess }: RequestLeaveModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ leaveType: 'annual' as LeaveType, startDate: '', endDate: '', reason: '' });

async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await api.POST('/v1/workforce/leave', {
      body: {
        leaveType: form.leaveType as 'annual' | 'sick' | 'unpaid' | 'parental' | 'other',
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
      },
    });
    setLoading(false);
    if (error) { toast.error('Failed to submit leave request'); return; }
    toast.success('Leave request submitted');
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Request leave</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Leave type *</label>
            <select value={form.leaveType} onChange={(e) => setForm(f => ({ ...f, leaveType: e.target.value as LeaveType }))}
              className={inputClass}>
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="unpaid">Unpaid</option>
              <option value="parental">Parental</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-700">Start date *</label>
              <input type="date" required value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-700">End date *</label>
              <input type="date" required value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={2} placeholder="Optional reason…"
              className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button>
            <button type="submit" disabled={loading} className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Submitting…' : 'Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeaveTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [showForm, setShowForm] = useState(false);

  const LEAVE_FILTERS: { value: LeaveStatus | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workforce', 'leave', statusFilter],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/workforce/leave', {
        params: { query: { status: (statusFilter || undefined) as never, limit: 50 } },
      });
      if (error || !data) throw new Error('Failed to load leave');
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['workforce', 'leave'] });

  async function handleReview(id: string, approve: boolean) {
    const { error } = await api.POST('/v1/workforce/leave/{id}/review', {
      params: { path: { id } }, body: { approve },
    });
    if (error) { toast.error(`Failed to ${approve ? 'approve' : 'reject'} leave`); return; }
    toast.success(`Leave ${approve ? 'approved' : 'rejected'}`);
    invalidate();
  }

  async function handleCancel(id: string) {
    const { error } = await api.POST('/v1/workforce/leave/{id}/cancel', {
      params: { path: { id } },
    });
    if (error) { toast.error('Failed to cancel leave request'); return; }
    toast.success('Leave request cancelled');
    invalidate();
  }

  return (
    <>
      {showForm && <RequestLeaveModal onClose={() => setShowForm(false)} onSuccess={invalidate} />}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
            {LEAVE_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setStatusFilter(value)}
                className={['rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  statusFilter === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" strokeWidth={2} /> Request leave
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Start</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">End</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Reason</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>}
              {isError && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-red-500">Failed to load leave records.</td></tr>}
              {data?.data?.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">No leave records found</td></tr>}
              {data?.data?.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 capitalize text-zinc-900">{l.leaveType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(l.startDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(l.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-xs text-zinc-400">{l.reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge className={LEAVE_STATUS_CLASS[l.status]}
                      label={l.status.charAt(0).toUpperCase() + l.status.slice(1)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {l.status === 'pending' && (<>
                        <button onClick={() => handleReview(l.id, true)} className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">Approve</button>
                        <button onClick={() => handleReview(l.id, false)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Reject</button>
                        <button onClick={() => handleCancel(l.id)} className="rounded px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100">Cancel</button>
                      </>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.pageInfo && <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">{data.pageInfo.total} record{data.pageInfo.total !== 1 ? 's' : ''}</div>}
        </div>
      </div>
    </>
  );
}

// ── Overtime tab ──────────────────────────────────────────────────────────────

interface LogOvertimeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function LogOvertimeModal({ onClose, onSuccess }: LogOvertimeModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ workDate: '', hours: 2, reason: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await api.POST('/v1/workforce/overtime', {
      body: { workDate: form.workDate, hours: form.hours, reason: form.reason },
    });
    setLoading(false);
    if (error) { toast.error('Failed to log overtime'); return; }
    toast.success('Overtime logged');
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Log overtime</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Work date *</label>
            <input type="date" required value={form.workDate} onChange={(e) => setForm(f => ({ ...f, workDate: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Hours *</label>
            <input type="number" required min={0.5} max={24} step={0.5} value={form.hours}
              onChange={(e) => setForm(f => ({ ...f, hours: Number(e.target.value) }))} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Reason *</label>
            <textarea value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              required rows={2} placeholder="Why was overtime worked?"
              className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button>
            <button type="submit" disabled={loading} className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Saving…' : 'Log'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OvertimeTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OvertimeStatus | ''>('');
  const [showForm, setShowForm] = useState(false);

  const OT_FILTERS: { value: OvertimeStatus | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workforce', 'overtime', statusFilter],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/workforce/overtime', {
        params: { query: { status: (statusFilter || undefined) as never, limit: 50 } },
      });
      if (error || !data) throw new Error('Failed to load overtime');
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['workforce', 'overtime'] });

  async function handleReview(id: string, approve: boolean) {
    const { error } = await api.POST('/v1/workforce/overtime/{id}/review', {
      params: { path: { id } }, body: { approve },
    });
    if (error) { toast.error(`Failed to ${approve ? 'approve' : 'reject'} overtime`); return; }
    toast.success(`Overtime ${approve ? 'approved' : 'rejected'}`);
    invalidate();
  }

  return (
    <>
      {showForm && <LogOvertimeModal onClose={() => setShowForm(false)} onSuccess={invalidate} />}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
            {OT_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setStatusFilter(value)}
                className={['rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  statusFilter === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" strokeWidth={2} /> Log overtime
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Work date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Hours</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Reason</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>}
              {isError && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-red-500">Failed to load overtime records.</td></tr>}
              {data?.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">No overtime records found</td></tr>}
              {data?.data?.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-900">{new Date(o.workDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-zinc-500">{o.hours}h</td>
                  <td className="px-4 py-3 max-w-xs truncate text-xs text-zinc-400">{o.reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge className={OVERTIME_STATUS_CLASS[o.status]}
                      label={o.status.charAt(0).toUpperCase() + o.status.slice(1)} />
                  </td>
                  <td className="px-4 py-3">
                    {o.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleReview(o.id, true)} className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">Approve</button>
                        <button onClick={() => handleReview(o.id, false)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.pageInfo && <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">{data.pageInfo.total} record{data.pageInfo.total !== 1 ? 's' : ''}</div>}
        </div>
      </div>
    </>
  );
}

// ── Shifts tab ────────────────────────────────────────────────────────────────

interface LogShiftModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function LogShiftModal({ onClose, onSuccess }: LogShiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ shiftType: 'night' as ShiftType, startsAt: '', endsAt: '', note: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // datetime-local returns 'YYYY-MM-DDTHH:MM' — append seconds + Z for ISO 8601
    const toIso = (s: string) => s.length === 16 ? s + ':00.000Z' : s;
    const { error } = await api.POST('/v1/workforce/shifts', {
      body: {
        shiftType: form.shiftType as 'night' | 'on_call' | 'weekend',
        startsAt: toIso(form.startsAt),
        endsAt: toIso(form.endsAt),
        note: form.note || undefined,
      },
    });
    setLoading(false);
    if (error) { toast.error('Failed to log shift'); return; }
    toast.success('Shift logged');
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Log shift</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Shift type *</label>
            <select value={form.shiftType} onChange={(e) => setForm(f => ({ ...f, shiftType: e.target.value as ShiftType }))}
              className={inputClass}>
              <option value="night">Night</option>
              <option value="on_call">On-call</option>
              <option value="weekend">Weekend</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Starts at *</label>
            <input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm(f => ({ ...f, startsAt: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Ends at *</label>
            <input type="datetime-local" required value={form.endsAt} onChange={(e) => setForm(f => ({ ...f, endsAt: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Note</label>
            <textarea value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2} placeholder="Optional notes…"
              className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button>
            <button type="submit" disabled={loading} className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Saving…' : 'Log shift'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShiftsTab() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<ShiftType | ''>('');
  const [showForm, setShowForm] = useState(false);

  const TYPE_FILTERS: { value: ShiftType | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'night', label: 'Night' },
    { value: 'on_call', label: 'On-call' },
    { value: 'weekend', label: 'Weekend' },
  ];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workforce', 'shifts', typeFilter],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/workforce/shifts', {
        params: { query: { shiftType: (typeFilter || undefined) as never, limit: 50 } },
      });
      if (error || !data) throw new Error('Failed to load shifts');
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['workforce', 'shifts'] });

  return (
    <>
      {showForm && <LogShiftModal onClose={() => setShowForm(false)} onSuccess={invalidate} />}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
            {TYPE_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setTypeFilter(value)}
                className={['rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  typeFilter === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" strokeWidth={2} /> Log shift
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Starts</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Ends</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Note</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>}
              {isError && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-red-500">Failed to load shift records.</td></tr>}
              {data?.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">No shift records found</td></tr>}
              {data?.data?.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      <Moon className="h-3 w-3" />
                      {SHIFT_TYPE_LABEL[s.shiftType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(s.startsAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(s.endsAt).toLocaleString()}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-xs text-zinc-400">{s.note ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.pageInfo && <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">{data.pageInfo.total} record{data.pageInfo.total !== 1 ? 's' : ''}</div>}
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type WorkforceTab = 'timesheets' | 'leave' | 'overtime' | 'shifts';

const TABS: { value: WorkforceTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'timesheets', label: 'Timesheets', icon: (p) => <Clock {...p} /> },
  { value: 'leave', label: 'Leave', icon: (p) => <Calendar {...p} /> },
  { value: 'overtime', label: 'Overtime', icon: (p) => <Zap {...p} /> },
  { value: 'shifts', label: 'Shifts', icon: (p) => <Moon {...p} /> },
];

export function WorkforcePage() {
  const [tab, setTab] = useState<WorkforceTab>('timesheets');

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Workforce</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Manage timesheets, leave requests, overtime, and special shift logging.
        </p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={[
                'flex items-center gap-2 pb-3 text-sm font-medium transition-colors',
                tab === value
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-700',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'timesheets' && <TimesheetsTab />}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'overtime' && <OvertimeTab />}
      {tab === 'shifts' && <ShiftsTab />}
    </div>
  );
}
