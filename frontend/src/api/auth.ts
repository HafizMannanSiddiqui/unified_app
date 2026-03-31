import apiClient from './client';
import type { CurrentUser, LoginRequest, TokenResponse } from '../types';

export const login = async (data: LoginRequest): Promise<TokenResponse> => {
  const res = await apiClient.post<TokenResponse>('/auth/login', data);
  return res.data;
};

export const getMe = async (): Promise<CurrentUser> => {
  const res = await apiClient.get<CurrentUser>('/auth/me');
  return res.data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};
