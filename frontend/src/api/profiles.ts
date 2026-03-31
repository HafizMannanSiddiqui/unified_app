import apiClient from './client';

export const getBloodGroups = () =>
  apiClient.get('/profiles/blood-groups').then(r => r.data);

export const getProfiles = (search?: string) =>
  apiClient.get('/profiles', { params: { search } }).then(r => r.data);

export const getProfile = (userId: number) =>
  apiClient.get(`/profiles/${userId}`).then(r => r.data);

export const updateProfile = (userId: number, data: any) =>
  apiClient.put(`/profiles/${userId}`, data).then(r => r.data);
