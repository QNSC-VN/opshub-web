/**
 * usePermissions — role-to-capability mapping for UI gating.
 *
 * Design:
 *  - Source of truth is the backend (PolicyGuard).
 *  - This hook provides frontend visibility gates ONLY — it hides UI elements
 *    that the user cannot use. It is NOT a security boundary.
 *  - Capabilities are derived from the roles array in the /me response, cached
 *    in TanStack Query. No extra API call is needed.
 *
 * Role hierarchy (additive):
 *  employee < manager < it-admin | hr | security | helpdesk | auditor
 *
 * Usage:
 *   const { can, hasRole, primaryRole } = usePermissions();
 *   if (can('asset.manage')) { ... }
 *   if (hasRole('it-admin'))  { ... }
 */
import { useMemo } from 'react';
import { useCurrentUser } from './use-current-user';

// ── Capability catalogue ──────────────────────────────────────────────────────

/**
 * Map role → set of UI capability keys.
 * Kept small and explicit — YAGNI, add only when a real gate is needed.
 */
const ROLE_CAPS: Record<string, readonly string[]> = {
  'employee': [
    'requests.submit',
    'requests.view.own',
    'workforce.self',
    'assets.view.own',
    'profile.view',
  ],
  'manager': [
    'requests.submit',
    'requests.view.own',
    'requests.approve',
    'workforce.self',
    'workforce.team',
    'workforce.approve',
    'assets.view.own',
    'people.view',
    'reports.view',
    'profile.view',
  ],
  'helpdesk': [
    'requests.submit',
    'requests.view',
    'requests.manage',
    'assets.view',
    'people.view',
    'profile.view',
  ],
  'hr': [
    'requests.submit',
    'requests.view.own',
    'workforce.manage',
    'workforce.approve',
    'people.view',
    'reports.view',
    'profile.view',
  ],
  'security': [
    'requests.view',
    'compliance.view',
    'access.view',
    'reports.view',
    'audit.view',
    'people.view',
    'security.view',
    'profile.view',
  ],
  'auditor': [
    'reports.view',
    'audit.view',
    'compliance.view',
    'access.view',
    'people.view',
    'assets.view',
    'profile.view',
  ],
  'it-admin': [
    'requests.submit',
    'requests.view',
    'requests.approve',
    'requests.manage',
    'asset.manage',
    'assets.view',
    'access.view',
    'access.manage',
    'compliance.view',
    'compliance.manage',
    'security.view',
    'people.view',
    'people.manage',
    'workforce.view',
    'workforce.self',
    'reports.view',
    'audit.view',
    'settings.view',
    'settings.manage',
    'rbac.manage',
    'webhooks.manage',
    'profile.view',
  ],
};

// ── Role priority (for primaryRole detection) ─────────────────────────────────

const ROLE_PRIORITY: Record<string, number> = {
  'it-admin': 10,
  'security':  9,
  'hr':        8,
  'helpdesk':  7,
  'auditor':   6,
  'manager':   5,
  'employee':  1,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppRole =
  | 'it-admin'
  | 'security'
  | 'hr'
  | 'helpdesk'
  | 'auditor'
  | 'manager'
  | 'employee';

export interface PermissionHelpers {
  /** Check a UI capability key. Returns false while user data is loading. */
  can: (capability: string) => boolean;
  /** Check if the user has a specific role. */
  hasRole: (role: AppRole | string) => boolean;
  /**
   * The user's highest-priority role — drives persona-aware dashboard widgets.
   * Returns 'employee' as a safe default while loading.
   */
  primaryRole: AppRole;
  /** All roles the user holds. */
  roles: string[];
  /** True while /me is still loading. */
  isLoading: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePermissions(): PermissionHelpers {
  const { data: me, isLoading } = useCurrentUser();

  return useMemo<PermissionHelpers>(() => {
    const roles: string[] = (me as { roles?: string[] })?.roles ?? [];

    // Flatten all capabilities from all held roles
    const caps = new Set<string>();
    for (const role of roles) {
      for (const cap of ROLE_CAPS[role] ?? []) {
        caps.add(cap);
      }
    }

    // Primary role = highest priority role the user holds
    const primaryRole = (
      roles.reduce<string>((best, r) => {
        return (ROLE_PRIORITY[r] ?? 0) > (ROLE_PRIORITY[best] ?? 0) ? r : best;
      }, 'employee')
    ) as AppRole;

    return {
      can:     (cap) => caps.has(cap),
      hasRole: (role) => roles.includes(role),
      primaryRole,
      roles,
      isLoading,
    };
  }, [me, isLoading]);
}
