import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  clear: () => void;
}

/** Persisted auth token store (localStorage). The client reads from here. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clear: () => set({ token: null }),
    }),
    { name: 'opshub.auth' },
  ),
);

export function getToken(): string | null {
  return useAuthStore.getState().token;
}
