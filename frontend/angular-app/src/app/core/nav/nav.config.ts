export type NavItem = {
  label: string;
  path: string;
  /** Permission codes from /me; empty = always shown when authenticated. */
  permissions?: readonly string[];
  /** Group heading in the sidebar. */
  group?: 'main' | 'admin';
};

/**
 * Permission-aware shell nav — Profile hub covers self-service settings.
 */
export const SHELL_NAV: readonly NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', group: 'main' },
  { label: 'Profile', path: '/profile', group: 'main' },
  { label: 'Users', path: '/users', permissions: ['USER_READ'], group: 'admin' },
  { label: 'Roles', path: '/roles', permissions: ['ROLE_READ'], group: 'admin' },
  {
    label: 'Access catalog',
    path: '/permissions',
    permissions: ['PERMISSION_READ'],
    group: 'admin',
  },
  { label: 'Activity log', path: '/audit', permissions: ['AUDIT_READ'], group: 'admin' },
];

export const NAV_GROUPS: readonly { id: NavItem['group']; label: string }[] = [
  { id: 'main', label: 'Workspace' },
  { id: 'admin', label: 'Admin' },
];
