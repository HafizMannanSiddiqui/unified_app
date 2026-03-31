import { useAuthStore } from '../store/authStore';

export function usePermission() {
  const user = useAuthStore((s) => s.user);

  const hasPermission = (moduleSlug: string, task: string): boolean => {
    if (!user) return false;
    // Super admin has all permissions
    if (user.roles.some((r) => r.name === 'super admin')) return true;
    return user.permissions.some(
      (p) => p.module === moduleSlug && p.task === task
    );
  };

  return { hasPermission };
}
