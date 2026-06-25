import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Laptop,
  ShieldCheck,
  ScanLine,
  CalendarClock,
  Users,
  LogOut,
  ChevronRight,
  Webhook,
  Inbox,
  BarChart2,
  ShieldAlert,
  UserCog,
  BellRing,
  UserCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/shared/api/auth-store';
import { isSsoConfigured, msalInstance } from '@/app/auth/msal';
import { cn } from '@/shared/lib/utils';
import { NotificationBell } from '@/widgets/notifications/notification-bell';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/api';

type MeDto = components['schemas']['MeResponseDto'];

function useMe() {
  return useQuery<MeDto>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/auth/me');
      if (error || !data) throw new Error();
      return data as MeDto;
    },
    staleTime: 5 * 60 * 1000,
  });
}

interface NavGroup {
  label?: string;
  items: Array<{ to: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }>;
}

const navGroups: NavGroup[] = [
  {
    items: [{ to: '/', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    label: 'Directory',
    items: [{ to: '/people', label: 'People', icon: Users }],
  },
  {
    label: 'IT Operations',
    items: [
      { to: '/assets', label: 'Assets', icon: Laptop },
      { to: '/access', label: 'Access Requests', icon: ShieldCheck },
      { to: '/compliance', label: 'Compliance', icon: ScanLine },
      { to: '/requests', label: 'Inbox', icon: Inbox },
    ],
  },
  {
    label: 'Workforce',
    items: [{ to: '/workforce', label: 'Workforce', icon: CalendarClock }],
  },
  {
    label: 'Analytics',
    items: [{ to: '/reports', label: 'Reports', icon: BarChart2 }],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
      { to: '/settings/access-control', label: 'Access Control', icon: UserCog },
      { to: '/settings/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
      { to: '/settings/notification-preferences', label: 'Notifications', icon: BellRing },
    ],
  },
];

function OpsHubMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect width="22" height="22" rx="5" fill="#2563eb" />
      <path
        d="M11 5.5C7.96 5.5 5.5 7.96 5.5 11s2.46 5.5 5.5 5.5 5.5-2.46 5.5-5.5S14.04 5.5 11 5.5Zm0 8.25a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5Z"
        fill="white"
      />
    </svg>
  );
}

/** Avatar initials circle for the sidebar user footer. */
function AvatarChip({ name, email }: { name: string; email: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const idx = [...email].reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors[idx]} text-[10px] font-semibold text-white`}>
      {initials || '?'}
    </span>
  );
}

/** Sidebar bottom — link to My Profile, shows current user name. */
function UserFooter() {
  const { data: me } = useMe();
  return (
    <Link
      to="/profile"
      className={cn(
        'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
      )}
      activeProps={{ className: 'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm bg-zinc-800 text-white' }}
    >
      {me ? (
        <AvatarChip name={me.name} email={me.email} />
      ) : (
        <UserCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      )}
      <span className="flex-1 truncate text-xs">{me?.name ?? 'My profile'}</span>
    </Link>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);
  const { data: me } = useMe();

  async function handleLogout() {
    try {
      await fetch('/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // best-effort
    }
    clear();
    if (isSsoConfigured) {
      // Sign out from Microsoft so the user isn't silently re-authenticated
      await msalInstance.initialize();
      await msalInstance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
      return;
    }
    navigate({ to: '/login' });
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className="flex w-56 shrink-0 flex-col"
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 px-4 shrink-0">
          <OpsHubMark />
          <span className="text-sm font-semibold tracking-tight text-white">OpsHub</span>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-zinc-800" />

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-3">
          {navGroups.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-0.5">
              {group.label && (
                <span className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                  {group.label}
                </span>
              )}
              {group.items.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: to === '/' }}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                    'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                  )}
                  activeProps={{
                    className:
                      'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm bg-zinc-800 text-white',
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="flex-1">{label}</span>
                  <ChevronRight
                    className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-40"
                    strokeWidth={2}
                  />
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom: user footer */}
        <div className="mx-4 h-px bg-zinc-800" />
        <div className="p-2 flex flex-col gap-0.5">
          {/* Profile link */}
          <UserFooter />
          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex min-w-0 flex-1 flex-col overflow-auto"
        style={{ background: 'var(--bg-page)' }}
      >
        {/* Top bar */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-6">
          <div />{/* spacer — breadcrumb can go here later */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            {/* divider */}
            <div className="h-5 w-px bg-zinc-200" />
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              <UserCircle2 className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-xs font-medium text-zinc-700 hidden sm:block">{me?.name ?? ''}</span>
            </Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-5xl px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

