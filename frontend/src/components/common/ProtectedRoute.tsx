import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getMe } from '../../api/auth';

interface Props {
  children: React.ReactNode;
  moduleSlug?: string;
  task?: string;
}

export default function ProtectedRoute({ children, moduleSlug, task }: Props) {
  const { token, user, setAuth } = useAuthStore();

  // Silently refresh user profile (roles, permissions) on every app load
  useEffect(() => {
    if (token) {
      getMe().then((freshUser) => {
        setAuth(token, freshUser);
      }).catch(() => {
        // Token expired or invalid — will be caught by 401 interceptor
      });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (moduleSlug && task && user) {
    const isSuperAdmin = user.roles.some((r) => r.name === 'super admin');
    if (!isSuperAdmin) {
      const hasPerm = user.permissions.some(
        (p) => p.module === moduleSlug && p.task === task
      );
      if (!hasPerm) {
        return <Navigate to="/" replace />;
      }
    }
  }

  return <>{children}</>;
}
