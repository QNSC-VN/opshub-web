import { msalInstance, isSsoConfigured } from '@/app/auth/msal';
import { api } from './client';
import { useAuthStore } from './auth-store';

/**
 * Called once before the router mounts (in AppProviders).
 *
 * Order of operations:
 * 1. Try silent session restore from the HttpOnly refresh cookie.
 * 2. If that fails AND we're coming back from a Microsoft redirect,
 *    handle the redirect result and exchange the id_token for an internal JWT.
 *
 * After this resolves, `getToken()` is either set or null.
 * The router's `beforeLoad` then decides what to do with an unauthenticated user.
 */
export async function bootstrapAuth(): Promise<void> {
  // 1. Silent restore from refresh cookie (fastest path — works on every reload)
  try {
    const res = await fetch('/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = (await res.json()) as { accessToken: string };
      useAuthStore.getState().setToken(data.accessToken);
      return;
    }
  } catch {
    // API down or no cookie — fall through
  }

  // 2. If SSO is configured, check if we're returning from a Microsoft redirect
  if (!isSsoConfigured) return;

  try {
    await msalInstance.initialize();
    const result = await msalInstance.handleRedirectPromise();
    if (!result?.idToken) return;

    const { data } = await api.POST('/v1/auth/entra-login', {
      body: { idToken: result.idToken },
    });
    if (data?.accessToken) {
      useAuthStore.getState().setToken(data.accessToken);
    }
  } catch {
    // Redirect handling failed — user will be sent to Microsoft again
  }
}
