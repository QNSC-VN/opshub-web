import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { getToken } from '@/shared/api/auth-store';
import { AppShell } from '@/widgets/app-shell/app-shell';
import { LoginPage } from '@/pages/login/login-page';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { AssetsPage } from '@/pages/assets/assets-page';
import { PlaceholderPage } from '@/pages/placeholder/placeholder-page';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

/** Authenticated layout — redirects to /login when no token is present. */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_shell',
  component: AppShell,
  beforeLoad: () => {
    if (!getToken()) throw redirect({ to: '/login' });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  component: DashboardPage,
});

const assetsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/assets',
  component: AssetsPage,
});

const accessRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/access',
  component: () => (
    <PlaceholderPage title="Access Requests" description="Temporary privileged access workflow." />
  ),
});

const complianceRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/compliance',
  component: () => (
    <PlaceholderPage title="Compliance" description="Software catalog and endpoint findings." />
  ),
});

const workforceRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/workforce',
  component: () => (
    <PlaceholderPage title="Workforce" description="Timesheets, leave, overtime and shifts." />
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  shellRoute.addChildren([
    dashboardRoute,
    assetsRoute,
    accessRoute,
    complianceRoute,
    workforceRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
