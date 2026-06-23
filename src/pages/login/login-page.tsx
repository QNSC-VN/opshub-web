import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/shared/api/auth-store';
import { msalInstance, loginRequest, isSsoConfigured } from '@/app/auth/msal';

const ROLE_PRESETS = ['it-admin', 'security', 'hr', 'manager', 'employee'];

function OpsHubMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#2563eb" />
      <path
        d="M16 7C11.03 7 7 11.03 7 16s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9Zm0 13.5A4.5 4.5 0 1 1 16 11.5a4.5 4.5 0 0 1 0 9Z"
        fill="white"
      />
    </svg>
  );
}

/** Microsoft "M" logo — matches the official colour mark. */
function MicrosoftLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);

  const [ssoLoading, setSsoLoading] = useState(false);
  const [showDevForm, setShowDevForm] = useState(false);
  const [email, setEmail] = useState('admin@opshub.local');
  const [roles, setRoles] = useState<string[]>(['it-admin']);
  const [devLoading, setDevLoading] = useState(false);

  const toggleRole = (role: string) =>
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );

  async function onSsoLogin() {
    setSsoLoading(true);
    try {
      await msalInstance.initialize();
      const result = await msalInstance.loginPopup(loginRequest);
      const { data, error } = await api.POST('/v1/auth/entra-login', {
        body: { idToken: result.idToken },
      });
      if (error || !data) {
        toast.error('Sign-in failed. Your account may not be provisioned yet.');
        return;
      }
      setToken(data.accessToken);
      navigate({ to: '/' });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'BrowserAuthError') {
        toast.error('Sign-in failed. Please try again.');
      }
    } finally {
      setSsoLoading(false);
    }
  }

  async function onDevLogin(e: React.FormEvent) {
    e.preventDefault();
    setDevLoading(true);
    const { data, error } = await api.POST('/v1/auth/dev-login', {
      body: { email },
    });
    setDevLoading(false);
    if (error || !data) {
      toast.error('Login failed. Is the API running on :3000?');
      return;
    }
    setToken(data.accessToken);
    navigate({ to: '/' });
  }

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left: brand panel */}
      <div
        className="hidden w-[400px] shrink-0 flex-col justify-between p-10 lg:flex"
        style={{ background: 'var(--bg-sidebar)' }}
      >
        <div className="flex items-center gap-3">
          <OpsHubMark size={32} />
          <span className="text-base font-semibold tracking-tight text-white">OpsHub</span>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight text-white">
              Internal Ops Platform
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              One portal for IT and HR to manage the full lifecycle of employees,
              devices, software, access, and time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['People', 'Devices', 'Access', 'Compliance', 'Workforce'].map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-600">Sign in with your company Microsoft account.</p>
      </div>

      {/* Right: sign-in panel */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <OpsHubMark size={28} />
          <span className="text-base font-semibold tracking-tight">OpsHub</span>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-7">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Sign in</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Use your company Microsoft account to continue.
            </p>
          </div>

          {/* Primary: SSO button */}
          <button
            type="button"
            onClick={onSsoLogin}
            disabled={ssoLoading || !isSsoConfigured}
            title={
              !isSsoConfigured
                ? 'Set VITE_ENTRA_TENANT_ID and VITE_ENTRA_CLIENT_ID to enable SSO'
                : undefined
            }
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1"
          >
            <MicrosoftLogo size={18} />
            {ssoLoading ? 'Redirecting to Microsoft…' : 'Sign in with Microsoft'}
          </button>

          {!isSsoConfigured && (
            <p className="mt-2 text-center text-[11px] text-amber-600">
              SSO not configured — set{' '}
              <code className="font-mono">VITE_ENTRA_TENANT_ID</code> &{' '}
              <code className="font-mono">VITE_ENTRA_CLIENT_ID</code>
            </p>
          )}

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-100" />
            <span className="text-[11px] text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-100" />
          </div>

          {/* Dev login toggle */}
          <button
            type="button"
            onClick={() => setShowDevForm((v) => !v)}
            className="w-full text-center text-xs text-zinc-400 transition-colors hover:text-zinc-600"
          >
            {showDevForm ? 'Hide dev login ↑' : 'Dev login (local only) ↓'}
          </button>

          {showDevForm && (
            <form
              onSubmit={onDevLogin}
              className="mt-4 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
            >
              <p className="text-[11px] text-zinc-500">
                Development scaffold — no password, uses seeded employees.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="user@opshub.local"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-700">Roles (informational)</label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_PRESETS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={[
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        roles.includes(role)
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50',
                      ].join(' ')}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={devLoading}
                className="h-9 w-full rounded-md bg-zinc-800 text-sm font-medium text-white transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-zinc-500/40 focus:ring-offset-1"
              >
                {devLoading ? 'Signing in…' : 'Sign in (dev)'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
