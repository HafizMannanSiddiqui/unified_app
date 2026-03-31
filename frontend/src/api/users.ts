import apiClient from './client';

export const getUsers = (page = 1, pageSize = 50, isActive?: boolean, search?: string) =>
  apiClient.get('/users', { params: { page, pageSize, isActive, search } }).then(r => r.data);

export const getUser = (id: number) =>
  apiClient.get(`/users/${id}`).then(r => r.data);

export const createUser = (data: any) =>
  apiClient.post('/users', data).then(r => r.data);

export const updateUser = (id: number, data: any) =>
  apiClient.put(`/users/${id}`, data).then(r => r.data);

// Team & Manager memberships
export const getMyTeams = (userId: number) =>
  apiClient.get('/users/my-teams', { params: { userId } }).then(r => r.data);

export const addTeamMembership = (data: { userId: number; teamId: number; roleInTeam?: string; isPrimary?: boolean }) =>
  apiClient.post('/users/team-membership', data).then(r => r.data);

export const removeTeamMembership = (id: number) =>
  apiClient.post(`/users/team-membership/${id}/remove`).then(r => r.data);

export const addManager = (data: { userId: number; managerId: number; isPrimary?: boolean }) =>
  apiClient.post('/users/manager', data).then(r => r.data);

export const removeManager = (id: number) =>
  apiClient.post(`/users/manager/${id}/remove`).then(r => r.data);

export const getMyTeamMembers = (managerId: number) =>
  apiClient.get('/users/my-team-members', { params: { managerId } }).then(r => r.data);

export const getDirectory = (search?: string, teamId?: number) =>
  apiClient.get('/users/directory', { params: { search, teamId } }).then(r => r.data);

export const getHolidays = (year?: number) =>
  apiClient.get('/users/holidays', { params: { year } }).then(r => r.data);

export const getNotifications = (userId: number) =>
  apiClient.get('/users/notifications', { params: { userId } }).then(r => r.data);
