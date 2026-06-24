/**
 * RbacPage — role-based access control admin panel.
 *
 * Tabs:
 *  1. Roles    — list system + custom roles, create/delete custom roles, manage permissions per role
 *  2. Assignments — view all role assignments, assign a role to a user, revoke
 *  3. Delegations — list active approval delegations, create, delete
 *
 * Only visible to users with the 'it-admin' or 'security' role.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, ShieldCheck, Users, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import type {
  RoleResponse,
  PermissionResponse,
  RoleAssignmentResponse,
  DelegationResponse,
} from '@/shared/api/types';

// ── Shared helpers ────────────────────────────────────────────────────────────

const inputClass =
  'h-8 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// ── Tab 1: Roles ──────────────────────────────────────────────────────────────

function useRoles() {
  return useQuery<RoleResponse[]>({
    queryKey: ['authz', 'roles'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/authz/roles');
      if (error || !data) throw new Error();
      return data as RoleResponse[];
    },
  });
}

function usePermissions() {
  return useQuery<PermissionResponse[]>({
    queryKey: ['authz', 'permissions'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/authz/permissions');
      if (error || !data) throw new Error();
      return data as PermissionResponse[];
    },
  });
}

interface CreateRoleModalProps { onClose: () => void; onSuccess: () => void }
function CreateRoleModal({ onClose, onSuccess }: CreateRoleModalProps) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !name.trim()) { setErr('Key and name are required.'); return; }
    setLoading(true); setErr('');
    const { error } = await api.POST('/v1/authz/roles', { body: { key: key.trim(), name: name.trim(), permissions: [] } });
    setLoading(false);
    if (error) { setErr('Failed to create role. Key may already exist.'); return; }
    toast.success('Role created');
    onSuccess(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Create Role</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Key (slug)</label>
            <input className={inputClass} placeholder="e.g. compliance-reviewer" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Display name</label>
            <input className={inputClass} placeholder="e.g. Compliance Reviewer" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button>
            <button type="submit" disabled={loading} className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RolesTab() {
  const qc = useQueryClient();
  const { data: roles, isLoading } = useRoles();
  const { data: allPerms } = usePermissions();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['authz', 'roles'] });

  async function deleteRole(id: string) {
    if (!confirm('Delete this role? This cannot be undone.')) return;
    const { error } = await api.DELETE('/v1/authz/roles/{id}', { params: { path: { id } } });
    if (error) { toast.error('Failed to delete role'); return; }
    toast.success('Role deleted');
    invalidate();
  }

  async function addPermission(roleId: string, permKey: string) {
    const role = roles?.find((r) => r.id === roleId);
    if (!role) return;
    const next = [...role.permissions, permKey];
    const { error } = await api.PUT('/v1/authz/roles/{id}/permissions', {
      params: { path: { id: roleId } },
      body: { permissions: next },
    });
    if (error) { toast.error('Failed to add permission'); return; }
    invalidate();
  }

  async function removePermission(roleId: string, permKey: string) {
    const role = roles?.find((r) => r.id === roleId);
    if (!role) return;
    const next = role.permissions.filter((p) => p !== permKey);
    const { error } = await api.PUT('/v1/authz/roles/{id}/permissions', {
      params: { path: { id: roleId } },
      body: { permissions: next },
    });
    if (error) { toast.error('Failed to remove permission'); return; }
    invalidate();
  }

  return (
    <>
      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} onSuccess={invalidate} />}
      <SectionCard>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <p className="text-sm font-semibold text-zinc-800">Roles</p>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 h-7 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700">
            <Plus className="h-3.5 w-3.5" /> New role
          </button>
        </div>
        {isLoading && <p className="px-5 py-8 text-center text-sm text-zinc-400">Loading…</p>}
        <div className="divide-y divide-zinc-50">
          {roles?.map((role) => (
            <div key={role.id}>
              <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-zinc-50"
                onClick={() => setExpanded(expanded === role.id ? null : role.id)}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{role.name}</p>
                    <p className="text-xs text-zinc-400 font-mono">{role.key}</p>
                  </div>
                  {role.system && (
                    <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">System</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{role.permissions.length} permissions</span>
                  {!role.system && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRole(role.id); }}
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {expanded === role.id && (
                <div className="border-t border-zinc-50 bg-zinc-50/50 px-5 py-3">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">Permissions</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {role.permissions.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-xs text-zinc-700 font-mono"
                      >
                        {p}
                        {!role.system && (
                          <button
                            onClick={() => removePermission(role.id, p)}
                            className="text-zinc-400 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    {role.permissions.length === 0 && <p className="text-xs text-zinc-400">No permissions assigned</p>}
                  </div>
                  {!role.system && allPerms && (
                    <div className="flex items-center gap-2 mt-2">
                      <select
                        id={`add-perm-${role.id}`}
                        className="h-7 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700"
                        defaultValue=""
                      >
                        <option value="" disabled>Add permission…</option>
                        {allPerms
                          .filter((p) => !role.permissions.includes(p.key))
                          .map((p) => (
                            <option key={p.key} value={p.key}>{p.key}</option>
                          ))}
                      </select>
                      <button
                        onClick={() => {
                          const sel = document.getElementById(`add-perm-${role.id}`) as HTMLSelectElement;
                          if (sel.value) addPermission(role.id, sel.value);
                        }}
                        className="h-7 rounded-md bg-zinc-800 px-2.5 text-xs font-medium text-white hover:bg-zinc-700"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

// ── Tab 2: Assignments ────────────────────────────────────────────────────────

interface AssignRoleModalProps { roles: RoleResponse[]; onClose: () => void; onSuccess: () => void }
function AssignRoleModal({ roles, onClose, onSuccess }: AssignRoleModalProps) {
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim() || !roleId) { setErr('User ID and role are required.'); return; }
    setLoading(true); setErr('');
    const { error } = await api.POST('/v1/authz/assignments', {
      body: { userId: userId.trim(), roleId, scopeType: 'global', scopeId: null },
    });
    setLoading(false);
    if (error) { setErr('Failed to assign role. Assignment may already exist.'); return; }
    toast.success('Role assigned');
    onSuccess(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Assign Role</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">User ID</label>
            <input className={inputClass} placeholder="UUID of the employee" value={userId} onChange={(e) => setUserId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Role</label>
            <select className="h-8 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">Select a role…</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button>
            <button type="submit" disabled={loading} className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Assigning…' : 'Assign'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignmentsTab() {
  const qc = useQueryClient();
  const [lookupUserId, setLookupUserId] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const { data: assignments, isLoading } = useQuery<RoleAssignmentResponse[]>({
    queryKey: ['authz', 'assignments', searchUserId],
    enabled: searchUserId.length > 0,
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/authz/users/{userId}/assignments', {
        params: { path: { userId: searchUserId } },
      });
      if (error || !data) throw new Error();
      return data as RoleAssignmentResponse[];
    },
  });
  const { data: roles } = useRoles();
  const [showAssign, setShowAssign] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['authz', 'assignments', searchUserId] });

  async function revoke(id: string) {
    if (!confirm('Revoke this role assignment?')) return;
    const { error } = await api.DELETE('/v1/authz/assignments/{id}', { params: { path: { id } } });
    if (error) { toast.error('Failed to revoke assignment'); return; }
    toast.success('Assignment revoked');
    invalidate();
  }

  const roleMap = Object.fromEntries(roles?.map((r) => [r.id, r.name]) ?? []);

  return (
    <>
      {showAssign && roles && <AssignRoleModal roles={roles} onClose={() => setShowAssign(false)} onSuccess={invalidate} />}
      <SectionCard>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <p className="text-sm font-semibold text-zinc-800">Role Assignments</p>
          <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 h-7 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700">
            <Plus className="h-3.5 w-3.5" /> Assign role
          </button>
        </div>
        {/* User lookup */}
        <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3">
          <input
            className="h-7 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            placeholder="Enter User ID to look up assignments…"
            value={lookupUserId}
            onChange={(e) => setLookupUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearchUserId(lookupUserId.trim())}
          />
          <button
            onClick={() => setSearchUserId(lookupUserId.trim())}
            className="h-7 rounded-md bg-zinc-800 px-3 text-xs font-medium text-white hover:bg-zinc-700"
          >
            Lookup
          </button>
        </div>
        {isLoading && <p className="px-5 py-8 text-center text-sm text-zinc-400">Loading…</p>}
        {!searchUserId && <p className="px-5 py-8 text-center text-sm text-zinc-400">Enter a User ID above to view their assignments.</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">User ID</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Role</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Scope</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Expires</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {searchUserId && !isLoading && !assignments?.length && (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-zinc-400">No assignments found for this user</td></tr>
            )}
            {assignments?.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-50">
                <td className="px-4 py-2.5 text-xs font-mono text-zinc-600">{a.userId.slice(0, 8)}…</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    <ShieldCheck className="h-3 w-3" />
                    {roleMap[a.roleId] ?? a.roleId}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-zinc-500 capitalize">{a.scopeType}</td>
                <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(a.expiresAt)}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => revoke(a.id)} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </>
  );
}

// ── Tab 3: Delegations ────────────────────────────────────────────────────────

interface CreateDelegationModalProps { onClose: () => void; onSuccess: () => void }
function CreateDelegationModal({ onClose, onSuccess }: CreateDelegationModalProps) {
  const [toUserId, setToUserId] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!toUserId.trim() || !endsAt) { setErr('Delegate user ID and end date are required.'); return; }
    setLoading(true); setErr('');
    const { error } = await api.POST('/v1/authz/delegations', {
      body: {
        toUserId: toUserId.trim(),
        startsAt: new Date().toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reason: reason.trim() || undefined,
      },
    });
    setLoading(false);
    if (error) { setErr('Failed to create delegation.'); return; }
    toast.success('Delegation created');
    onSuccess(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Create Delegation</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Delegate to (User ID)</label>
            <input className={inputClass} placeholder="UUID of the delegate" value={toUserId} onChange={(e) => setToUserId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Ends at</label>
            <input type="datetime-local" className={inputClass} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Reason (optional)</label>
            <input className={inputClass} placeholder="e.g. Parental leave coverage" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-zinc-200 px-3.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button>
            <button type="submit" disabled={loading} className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Creating…' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DelegationsTab() {
  const qc = useQueryClient();
  const { data: delegations, isLoading } = useQuery<DelegationResponse[]>({
    queryKey: ['authz', 'delegations'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/authz/delegations');
      if (error || !data) throw new Error();
      return data as DelegationResponse[];
    },
  });
  const [showCreate, setShowCreate] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['authz', 'delegations'] });

  async function deleteDelegation(id: string) {
    if (!confirm('Delete this delegation?')) return;
    const { error } = await api.DELETE('/v1/authz/delegations/{id}', { params: { path: { id } } });
    if (error) { toast.error('Failed to delete delegation'); return; }
    toast.success('Delegation deleted');
    invalidate();
  }

  const now = new Date();

  return (
    <>
      {showCreate && <CreateDelegationModal onClose={() => setShowCreate(false)} onSuccess={invalidate} />}
      <SectionCard>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-800">Approval Delegations</p>
            <p className="text-xs text-zinc-400">Temporarily delegate approval authority to another user.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 h-7 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700">
            <Plus className="h-3.5 w-3.5" /> New delegation
          </button>
        </div>
        {isLoading && <p className="px-5 py-8 text-center text-sm text-zinc-400">Loading…</p>}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">From</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">To</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Starts</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Ends</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Reason</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {!isLoading && !delegations?.length && (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-zinc-400">No delegations</td></tr>
            )}
            {delegations?.map((d) => {
              const active = new Date(d.startsAt) <= now && new Date(d.endsAt) >= now;
              return (
                <tr key={d.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 text-xs font-mono text-zinc-600">{d.fromUserId.slice(0, 8)}…</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-zinc-600">{d.toUserId.slice(0, 8)}…</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(d.startsAt)}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{formatDate(d.endsAt)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500 truncate max-w-[140px]">{d.reason ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => deleteDelegation(d.id)} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type RbacTab = 'roles' | 'assignments' | 'delegations';

const TABS: { value: RbacTab; label: string; icon: React.ElementType }[] = [
  { value: 'roles', label: 'Roles', icon: ShieldCheck },
  { value: 'assignments', label: 'Assignments', icon: Users },
  { value: 'delegations', label: 'Delegations', icon: UserCheck },
];

export function RbacPage() {
  const [tab, setTab] = useState<RbacTab>('roles');

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Access Control</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Manage roles, user assignments, and approval delegations.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={[
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'roles' && <RolesTab />}
      {tab === 'assignments' && <AssignmentsTab />}
      {tab === 'delegations' && <DelegationsTab />}
    </div>
  );
}
