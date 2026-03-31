import apiClient from './client';

export const getLeaves = (userId?: number, status?: string) =>
  apiClient.get('/leaves', { params: { userId, status } }).then(r => r.data);

export const createLeave = (data: any) =>
  apiClient.post('/leaves', data).then(r => r.data);

export const approveLeave = (id: number) =>
  apiClient.post(`/leaves/${id}/approve`).then(r => r.data);

export const rejectLeave = (id: number) =>
  apiClient.post(`/leaves/${id}/reject`).then(r => r.data);

export const getLeaveBalance = (userId: number) =>
  apiClient.get(`/leaves/balance/${userId}`).then(r => r.data);
