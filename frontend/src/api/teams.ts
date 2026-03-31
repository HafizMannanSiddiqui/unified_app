import apiClient from './client';

export const getTeams = (isActive?: boolean) =>
  apiClient.get('/teams', { params: { isActive } }).then(r => r.data);
