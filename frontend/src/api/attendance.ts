import apiClient from './client';

export const checkin = (data?: any) =>
  apiClient.post('/attendance/checkin', data || {}).then(r => r.data);

export const checkout = (data?: any) =>
  apiClient.post('/attendance/checkout', data || {}).then(r => r.data);

export const getMyAttendance = (from: string, to: string) =>
  apiClient.get('/attendance/my', { params: { from, to } }).then(r => r.data);

export const getHolidaysForMonth = (year: number, month: number) =>
  apiClient.get('/attendance/holidays-month', { params: { year, month } }).then(r => r.data);

export const getTodayDashboard = () =>
  apiClient.get('/attendance/today-dashboard').then(r => r.data);

// Public (no auth) — for the AMS-style board
export const getPublicTodayDashboard = () =>
  apiClient.get('/public/attendance/today').then(r => r.data);

export const getDailyReport = (date: string, teamId?: number) =>
  apiClient.get('/attendance/daily-report', { params: { date, teamId } }).then(r => r.data);

export const getMonthlyReport = (userId: number, year: number, month: number) =>
  apiClient.get('/attendance/monthly-report', { params: { userId, year, month } }).then(r => r.data);

export const getAttendanceRequests = (params?: any) =>
  apiClient.get('/attendance/requests', { params }).then(r => r.data);

export const getAllAttendanceRequests = (status?: number, managerId?: number) =>
  apiClient.get('/attendance/requests/all', { params: { status, managerId } }).then(r => r.data);

export const createAttendanceRequest = (data: any) =>
  apiClient.post('/attendance/requests', data).then(r => r.data);

export const approveRequest = (id: number) =>
  apiClient.post(`/attendance/requests/${id}/approve`).then(r => r.data);

export const rejectRequest = (id: number) =>
  apiClient.post(`/attendance/requests/${id}/reject`).then(r => r.data);

// Weekend Assignments
export const getWeekendAssignments = (userId?: number, year?: number) =>
  apiClient.get('/attendance/weekend-assignments', { params: { userId, year } }).then(r => r.data);

export const createWeekendAssignment = (data: any) =>
  apiClient.post('/attendance/weekend-assignments', data).then(r => r.data);

export const deleteWeekendAssignment = (id: number) =>
  apiClient.post(`/attendance/weekend-assignments/${id}/delete`).then(r => r.data);

// Late Arrivals
export const getLateArrivals = (from: string, to: string, teamId?: number) =>
  apiClient.get('/attendance/late-arrivals', { params: { from, to, teamId } }).then(r => r.data);

// My Team
export const getMyTeam = () =>
  apiClient.get('/attendance/my-team').then(r => r.data);

// Employees Report
export const getEmployeesReport = (from: string, to: string, teamId?: number, managerId?: number) =>
  apiClient.get('/attendance/employees-report', { params: { from, to, teamId, managerId } }).then(r => r.data);
