import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { useAuthStore } from '@/shared/api/auth-store';

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

export function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState("admin@opshub.local");
  const [roles, setRoles] = useState<string[]>(["it-admin"]);
  const [loading, setLoading] = useState(false);

  const toggleRole = (role: string) =>
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await api.POST("/v1/auth/dev-login", {
      body: { email, name: email.split("@")[0], roles },
    });
    setLoading(false);
    if (error || !data) {
      toast.error("Login failed. Is the API running on :3000?");
      return;
    }
    setToken(data.accessToken);
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left: brand panel */}
      <div
        className="hidden w-[400px] shrink-0 flex-col justify-between p-10 lg:flex"
        style={{ background: "var(--bg-sidebar)" }}
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
            {["People", "Devices", "Access", "Compliance", "Workforce"].map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-600">
          Production uses Entra ID SSO. This is a dev scaffold.
        </p>
      </div>

      {/* Right: form panel */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <OpsHubMark size={28} />
          <span className="text-base font-semibold tracking-tight">OpsHub</span>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-7">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Sign in</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Development environment. No password required.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
              <label className="text-xs font-medium text-zinc-700">Roles</label>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PRESETS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={[
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      roles.includes(role)
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-400">
                Actual roles come from the DB. This selector is informational only.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-9 w-full rounded-md bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
