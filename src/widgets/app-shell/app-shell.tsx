import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { LayoutDashboard, Laptop, ShieldCheck, ScanLine, CalendarClock, LogOut } from 'lucide-react';
import { useAuthStore } from '@/shared/api/auth-store';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/assets', label: 'Assets', icon: Laptop },
  { to: '/access', label: 'Access Requests', icon: ShieldCheck },
  { to: '/compliance', label: 'Compliance', icon: ScanLine },
  { to: '/workforce', label: 'Workforce', icon: CalendarClock },
] as const;

export function AppShell() {
  const navigate = useNavigate();
  const clear = useAuthStore((s) => s.clear);

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
        <div className="flex h-14 items-center px-5 text-base font-semibold tracking-tight">
          OpsHub
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-200/60',
              )}
              activeProps={{ className: 'bg-neutral-200 font-medium text-neutral-900' }}
              activeOptions={{ exact: to === '/' }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-neutral-600"
            onClick={() => {
              clear();
              navigate({ to: '/login' });
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
