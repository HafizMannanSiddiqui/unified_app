import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { login as loginApi, getMe } from '../api/auth';
import type { LoginRequest } from '../types';

export function useAuth() {
  const { token, user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(
    async (data: LoginRequest) => {
      const tokenRes = await loginApi(data);
      // Temporarily set token so getMe can use it
      useAuthStore.setState({ token: tokenRes.access_token });
      const me = await getMe();
      setAuth(tokenRes.access_token, me);
      navigate('/');
    },
    [setAuth, navigate]
  );

  const logout = useCallback(() => {
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  return {
    isAuthenticated: !!token,
    user,
    token,
    login,
    logout,
  };
}
