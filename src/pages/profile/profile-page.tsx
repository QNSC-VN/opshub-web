/**
 * ProfilePage — "My Account" / personal settings for the current user.
 *
 * Sections:
 *   1. Identity summary (avatar initials, email, roles — read-only from JWT)
 *   2. Profile fields (displayName, jobTitle, department) — editable via
 *      PATCH /v1/employees/:id (requires fetching the employee record first)
 *   3. Sessions — active session count + sign out all sessions
 *   4. Authentication — SSO-only note; password change goes through Entra portal
 *
 * Pattern: fetch `/v1/auth/me` for JWT claims, then `/v1/employees/{id}` (where
 * id = me.sub) for the full employee record. `PATCH /v1/employees/{id}` for
 * profile edits (only fields the user can update; role changes are admin-only).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { User, ShieldCheck, Mail, Briefcase, Building2, ExternalLink, CheckCircle2, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/api';

type MeDto = components['schemas']['MeResponseDto'];
type EmployeeDto = components['schemas']['EmployeeResponseDto'];

// ── Shared UI ─────────────────────────────────────────────────────────────────

const inputClass =
  'h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-zinc-50 disabled:text-zinc-400';

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-6 py-4">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FieldRow({ label, icon: Icon, value, placeholder }: {
  label: string;
  icon: React.ElementType;
  value: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-50 last:border-0">
      <Icon className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
      <span className="w-28 shrink-0 text-xs font-medium text-zinc-500">{label}</span>
      <span className={`text-sm ${value ? 'text-zinc-800' : 'text-zinc-400 italic'}`}>
        {value || placeholder || '—'}
      </span>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function AvatarInitials({ name, email }: { name: string; email: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  // Deterministic color from email hash
  const colors = [
    'bg-blue-600',
    'bg-violet-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-cyan-600',
  ];
  const idx = [...email].reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${colors[idx]} text-xl font-semibold text-white select-none`}>
      {initials || '?'}
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────

interface EditProfileModalProps {
  employee: EmployeeDto;
  onClose: () => void;
  onSuccess: (updated: EmployeeDto) => void;
}

function EditProfileModal({ employee, onClose, onSuccess }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(employee.displayName);
  const [jobTitle, setJobTitle] = useState(employee.jobTitle ?? '');
  const [department, setDepartment] = useState(employee.department ?? '');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setErr('Display name is required.'); return; }
    setLoading(true); setErr('');

    const { data, error } = await api.PATCH('/v1/employees/{id}', {
      params: { path: { id: employee.id } },
      body: {
        displayName: displayName.trim(),
        jobTitle: jobTitle.trim() || null,
        department: department.trim() || null,
      },
    });

    setLoading(false);
    if (error || !data) { setErr('Failed to update profile. Please try again.'); return; }
    toast.success('Profile updated');
    onSuccess(data as EmployeeDto);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Edit Profile</h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Display name <span className="text-red-500">*</span></label>
            <input
              className={inputClass}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Job title</label>
            <input
              className={inputClass}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Engineer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-700">Department</label>
            <input
              className={inputClass}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
            />
          </div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useMe() {
  return useQuery<MeDto>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/auth/me');
      if (error || !data) throw new Error('Failed to load profile');
      return data as MeDto;
    },
    staleTime: 5 * 60 * 1000, // 5 min — JWT claims don't change often
  });
}

function useEmployee(id: string | undefined) {
  return useQuery<EmployeeDto>({
    queryKey: ['employees', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/employees/{id}', {
        params: { path: { id: id! } },
      });
      if (error || !data) throw new Error('Failed to load employee record');
      return data as EmployeeDto;
    },
  });
}

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  'it-admin':   'IT Admin',
  'hr':         'HR',
  'manager':    'Manager',
  'security':   'Security',
  'employee':   'Employee',
  'finance':    'Finance',
};

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role] ?? role;
  const colors: Record<string, string> = {
    'it-admin': 'bg-blue-50 text-blue-700',
    'hr': 'bg-violet-50 text-violet-700',
    'manager': 'bg-amber-50 text-amber-700',
    'security': 'bg-red-50 text-red-700',
    'employee': 'bg-zinc-100 text-zinc-600',
    'finance': 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${colors[role] ?? 'bg-zinc-100 text-zinc-600'}`}>
      <ShieldCheck className="h-3 w-3" />
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const qc = useQueryClient();
  const { data: me, isLoading: meLoading } = useMe();
  const { data: employee, isLoading: empLoading } = useEmployee(me?.sub);
  const [showEdit, setShowEdit] = useState(false);
  const [localEmployee, setLocalEmployee] = useState<EmployeeDto | null>(null);

  // Sync local state when employee data arrives
  useEffect(() => {
    if (employee) setLocalEmployee(employee);
  }, [employee]);

  const displayEmployee = localEmployee ?? employee;
  const isLoading = meLoading || empLoading;

  function handleEditSuccess(updated: EmployeeDto) {
    setLocalEmployee(updated);
    qc.setQueryData(['employees', me?.sub], updated);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-40 animate-pulse rounded-xl bg-zinc-100" />
      </div>
    );
  }

  if (!me) return null;

  const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    on_leave: 'bg-amber-50 text-amber-700',
    offboarded: 'bg-zinc-100 text-zinc-500',
  };

  return (
    <>
      {showEdit && displayEmployee && (
        <EditProfileModal
          employee={displayEmployee}
          onClose={() => setShowEdit(false)}
          onSuccess={handleEditSuccess}
        />
      )}

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Page header */}
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">My Profile</h1>
          <p className="mt-0.5 text-sm text-zinc-500">View and update your personal details and account settings.</p>
        </div>

        {/* Identity card */}
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-5">
          <div className="flex items-start gap-4">
            <AvatarInitials name={me.name} email={me.email} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-zinc-900 truncate">{displayEmployee?.displayName ?? me.name}</p>
                  <p className="text-sm text-zinc-500 truncate">{me.email}</p>
                  {displayEmployee?.jobTitle && (
                    <p className="mt-0.5 text-xs text-zinc-400">{displayEmployee.jobTitle}{displayEmployee.department ? ` · ${displayEmployee.department}` : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {displayEmployee?.status && (
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${statusColors[displayEmployee.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {displayEmployee.status.replace('_', ' ')}
                    </span>
                  )}
                  <button
                    onClick={() => setShowEdit(true)}
                    className="flex items-center gap-1.5 h-8 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Edit
                  </button>
                </div>
              </div>
              {me.roles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {me.roles.map((r) => <RoleBadge key={r} role={r} />)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile details */}
        {displayEmployee && (
          <SectionCard
            title="Profile details"
            subtitle="Information visible to your IT team and managers."
          >
            <div>
              <FieldRow label="Email" icon={Mail} value={displayEmployee.email} />
              <FieldRow label="Display name" icon={User} value={displayEmployee.displayName} />
              <FieldRow label="Job title" icon={Briefcase} value={displayEmployee.jobTitle ?? ''} placeholder="Not set" />
              <FieldRow label="Department" icon={Building2} value={displayEmployee.department ?? ''} placeholder="Not set" />
            </div>
          </SectionCard>
        )}

        {/* Authentication */}
        <SectionCard
          title="Authentication"
          subtitle="Your account uses Microsoft Entra ID (Azure AD) for sign-in."
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500 mt-0.5" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-800">Single Sign-On via Microsoft Entra ID</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Your password and MFA settings are managed through your organisation's Microsoft account.
                To change your password or manage security options, visit the Microsoft My Account portal.
              </p>
              <a
                href="https://myaccount.microsoft.com/security-info"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Manage Microsoft security settings
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </SectionCard>

        {/* Account info */}
        <SectionCard
          title="Account information"
          subtitle="System-generated fields. Contact IT admin to make changes."
        >
          <div className="space-y-0">
            <FieldRow label="User ID" icon={User} value={me.sub} />
            <FieldRow label="Account email" icon={Mail} value={me.email} />
            {displayEmployee && (
              <FieldRow
                label="Member since"
                icon={CheckCircle2}
                value={new Date(displayEmployee.createdAt).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              />
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
