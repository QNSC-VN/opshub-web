import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './generated/api';
import { getToken, useAuthStore } from './auth-store';

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      useAuthStore.getState().clear();
    }
    return response;
  },
};

/** Typed API client. Requests are proxied to the API at `/v1` (see vite.config). */
export const api = createClient<paths>({ baseUrl: '' });
api.use(authMiddleware);
