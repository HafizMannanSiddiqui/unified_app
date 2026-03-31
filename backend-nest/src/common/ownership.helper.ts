/**
 * Helper to check if the requesting user has admin/lead role.
 * Used in services to restrict data access.
 */
export const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager'];
export const LEAD_ROLES = ['super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager'];

export function isAdminRole(roleNames: string[]): boolean {
  return roleNames.some(r => ADMIN_ROLES.includes(r));
}

export function isLeadRole(roleNames: string[]): boolean {
  return roleNames.some(r => LEAD_ROLES.includes(r));
}
