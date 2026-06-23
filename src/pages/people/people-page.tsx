import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, X } from 'lucide-react';
import { api } from '@/shared/api/client';
import type { EmployeeResponse } from '@/shared/api/generated/api';

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  offboarded: 'Offboarded',
};

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  on_leave: 'bg-amber-50 text-amber-700',
  offboarded: 'bg-zinc-100 text-zinc-500',
};

const ALL_ROLES = ['it-admin', 'hr', 'security', 'manager', 'employee'];

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'offboarded', label: 'Offboarded' },
];

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useEmployees(search: string, status: string) {
  return useQuery({
    queryKey: ['employees', 'list', search, status],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/employees', {
        params: {
          query: {
            search: search || undefined,
            status: (status || undefined) as EmployeeResponse['status'] | undefined,
            limit: 100,
          },
        },
      });
      if (error || !data) throw new Error('Failed to load employees');
      return data;
    },
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
      {initials}
    </div>
  );
}

function RoleChip({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      {role}
    </span>
  );
}

// ── Status select ─────────────────────────────────────────────────────────────

function StatusSelect({ employee, onSuccess }: { employee: EmployeeResponse; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as EmployeeResponse['status'];
    setLoading(true);
    await api.PATCH('/v1/employees/{employeeId}/status', {
      params: { path: { employeeId: employee.id } },
      body: { status },
    });
    setLoading(false);
    onSuccess();
  }

  return (
    <select
      value={employee.status}
      onChange={handleChange}
      disabled={loading}
      className={[
        'cursor-pointer rounded-md border-0 py-0.5 pl-2 pr-6 text-xs font-medium',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-wait',
        STATUS_CLASS[employee.status] ?? 'bg-zinc-100 text-zinc-500',
      ].join(' ')}
    >
      <option value="active">{STATUS_LABEL.active}</option>
      <option value="on_leave">{STATUS_LABEL.on_leave}</option>
      <option value="offboarded">{STATUS_LABEL.offboarded}</option>
    </select>
  );
}

// ── Employee modal ────────────────────────────────────────────────────────────

interface ModalProps {
  mode: 'create' | 'edit';
  employee?: EmployeeResponse;
  onClose: () => void;
  onSuccess: () => void;
}

function EmployeeModal({ mode, employee, onClose, onSuccess }: ModalProps) {
  const [form, setForm] = useState({
    email: employee?.email ?? '',
    displayName: employee?.displayName ?? '',
    department: employee?.department ?? '',
    jobTitle: employee?.jobTitle ?? '',
    roles: employee?.roles ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleRole = (role: string) =>
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'create') {
      const { error: err } = await api.POST('/v1/employees', {
        body: {
          email: form.email,
          displayName: form.displayName,
          department: form.department || undefined,
          jobTitle: form.jobTitle || undefined,
          roles: form.roles,
        },
      });
      if (err) { setError('Failed to create employee'); setLoading(false); return; }
    } else if (employee) {
      const { error: err } = await api.PATCH('/v1/employees/{employeeId}', {
        params: { path: { employeeId: employee.id } },
        body: {
          displayName: form.displayName,
          department: form.department || null,
          jobTitle: form.jobTitle || null,
          roles: form.roles,
        },
      });
      if (err) { setError('Failed to update employee'); setLoading(false); return; }
    }

    setLoading(false);
    onSuccess();
    onClose();
  }

  const inputClass =
    'h-8 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            {mode === 'create' ? 'Add employee' : 'Edit employee'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5">
          {mode === 'create' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-700">Email *</label>
              <input
                type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass} placeholder="user@company.com"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Display name *</label>
            <input
              type="text" required value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className={inputClass} placeholder="Jane Smith"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-700">Department</label>
              <input
                type="text" value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className={inputClass} placeholder="Engineering"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-700">Job title</label>
              <input
                type="text" value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className={inputClass} placeholder="Engineer"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Roles</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ROLES.map((role) => (
                <button
                  key={role} type="button" onClick={() => toggleRole(role)}
                  className={[
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    form.roles.includes(role)
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
                  ].join(' ')}
                >
                  {role}
                </button>
              ))}
            </div>
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
              type="submit" disabled={loading}
              className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PeoplePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; employee?: EmployeeResponse } | null>(null);

  const employees = useEmployees(search, statusFilter);
  const refetch = () => qc.invalidateQueries({ queryKey: ['employees'] });

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">People</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Employee directory and role management.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Add employee
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value} onClick={() => setStatusFilter(value)}
              className={[
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                statusFilter === value
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" strokeWidth={1.75} />
          <input
            type="text" placeholder="Search name or email…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Department</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Job Title</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Roles</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wide text-zinc-500">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {employees.isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>
            )}
            {employees.isError && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-red-500">Failed to load employees. Is the API running?</td></tr>
            )}
            {employees.data?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-zinc-400">No employees found</span>
                    <span className="text-xs text-zinc-300">Add your first employee or adjust the filter</span>
                  </div>
                </td>
              </tr>
            )}
            {employees.data?.data.map((emp) => (
              <tr key={emp.id} className="transition-colors hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={emp.displayName} />
                    <div>
                      <div className="font-medium text-zinc-900">{emp.displayName}</div>
                      <div className="text-xs text-zinc-400">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {emp.department ?? <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {emp.jobTitle ?? <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {emp.roles.length
                      ? emp.roles.map((r) => <RoleChip key={r} role={r} />)
                      : <span className="text-xs text-zinc-300">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusSelect employee={emp} onSuccess={refetch} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setModal({ mode: 'edit', employee: emp })}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    title="Edit employee"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.data && (
          <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-400">
            {employees.data.pageInfo.total} employee{employees.data.pageInfo.total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {modal && (
        <EmployeeModal
          mode={modal.mode}
          employee={modal.employee}
          onClose={() => setModal(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
