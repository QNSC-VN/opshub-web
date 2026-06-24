import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { getToken } from '@/shared/api/auth-store';
import { isSsoConfigured, triggerLogin } from '@/app/auth/msal';
import { AppShell } from '@/widgets/app-shell/app-shell';
import { LoginPage } from '@/pages/login/login-page';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { AssetsPage } from '@/pages/assets/assets-page';
import { PeoplePage } from '@/pages/people/people-page';
import { AccessPage } from '@/pages/access/access-page';
import { CompliancePage } from '@/pages/compliance/compliance-page';
import { WorkforcePage } from '@/pages/workforce/workforce-page';
import { WebhooksPage } from '@/pages/settings/webhooks-page';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

/**
 * Dev-only login route — only used when SSO env vars are not set.
 * In production the user never sees this page; `beforeLoad` sends them
 * straight to Microsoft via loginRedirect().
 */
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

/** Authenticated layout shell. */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_shell',
  component: AppShell,
  beforeLoad: async () => {
    if (getToken()) return; // already authenticated — proceed

    if (isSsoConfigured) {
      // Full-page redirect to Microsoft — no OpsHub login page shown.
      await triggerLogin();
      // triggerLogin() navigates away; this line never executes.
      return;
    }

    // SSO not configured (dev mode) — fall back to the dev login page.
    throw redirect({ to: '/login' });
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

const peopleRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/people',
  component: PeoplePage,
});

const accessRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/access',
  component: AccessPage,
});;

const complianceRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/compliance',
  component: CompliancePage,
});;

const workforceRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/workforce',
  component: WorkforcePage,
});;

const webhooksRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings/webhooks',
  component: WebhooksPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  shellRoute.addChildren([
    dashboardRoute,
    assetsRoute,
    peopleRoute,
    accessRoute,
    complianceRoute,
    workforceRoute,
    webhooksRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
