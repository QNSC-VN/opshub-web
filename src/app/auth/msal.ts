import {
  PublicClientApplication,
  type Configuration,
  type PopupRequest,
} from '@azure/msal-browser';

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
    // sessionStorage is safer than localStorage for SPAs (cleared on tab close).
    cacheLocation: 'sessionStorage',
  },
};

/**
 * Singleton MSAL instance — initialised once and reused across the app.
 * Call `await msalInstance.initialize()` before using it.
 */
export const msalInstance = new PublicClientApplication(msalConfig);

/** Scopes requested during sign-in. We only need the id_token claims. */
export const loginRequest: PopupRequest = {
  scopes: ['openid', 'profile', 'email'],
};

/** True when Entra SSO is configured via env vars. */
export const isSsoConfigured = !!(tenantId && clientId);
