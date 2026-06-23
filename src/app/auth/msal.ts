import { PublicClientApplication, type Configuration } from '@azure/msal-browser';

/**
 * Entra ID (Azure AD) MSAL configuration.
 *
 * Set VITE_ENTRA_TENANT_ID and VITE_ENTRA_CLIENT_ID in your .env.local file:
 *
 *   VITE_ENTRA_TENANT_ID=<your-tenant-id>
 *   VITE_ENTRA_CLIENT_ID=<your-app-registration-client-id>
 *
 * Both values are non-secret (safe to embed in SPA bundles).
 */
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined;
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined;

const msalConfig: Configuration = {
  auth: {
    clientId: clientId ?? 'not-configured',
    authority: tenantId
      ? `https://login.microsoftonline.com/${tenantId}`
      : 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    // sessionStorage: cleared on tab close, not accessible by XSS on other tabs.
    cacheLocation: 'sessionStorage',
  },
};

/**
 * Singleton MSAL instance — initialised once at app boot.
 * `bootstrapAuth` calls `initialize()` + `handleRedirectPromise()` before the
 * router mounts, so the app never shows a login page when SSO is configured.
 */
export const msalInstance = new PublicClientApplication(msalConfig);

/** True when Entra SSO is configured via env vars. */
export const isSsoConfigured = !!(tenantId && clientId);

/**
 * Trigger a full-page redirect to Microsoft.
 * Called by the router's `beforeLoad` when the user is unauthenticated and SSO
 * is configured — the user never sees an OpsHub login page.
 */
export async function triggerLogin(): Promise<void> {
  await msalInstance.initialize();
  await msalInstance.loginRedirect({ scopes: ['openid', 'profile', 'email'] });
  // loginRedirect navigates away — code after this line never runs.
}
