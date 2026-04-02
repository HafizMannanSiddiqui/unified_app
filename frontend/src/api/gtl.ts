import apiClient from './client';

// --- Time Entries ---
export const getTimeEntries = (params: any) => apiClient.get('/time-entries', { params }).then(r => r.data);
export const createTimeEntry = (data: any) => apiClient.post('/time-entries', data).then(r => r.data);
export const updateTimeEntry = (id: number, data: any) => apiClient.put(`/time-entries/${id}`, data).then(r => r.data);
export const deleteTimeEntry = (id: number) => apiClient.delete(`/time-entries/${id}`).then(r => r.data);

// --- Timesheet Grouped ---
export const getTimesheetGrouped = (userId: number, year: number, month: number, programId?: number) =>
  apiClient.get('/timesheet/grouped', { params: { userId, year, month, programId } }).then(r => r.data);

export const downloadTimesheetCsv = (userId: number, year: number, month: number) =>
  apiClient.get('/timesheet/download', { params: { userId, year, month }, responseType: 'blob' }).then(r => {
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const link = document.createElement('a');
    link.href = url;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    link.setAttribute('download', `timesheet_${year}_${monthNames[month - 1]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

// --- Approvals ---
export const approveEntry = (id: number) => apiClient.post(`/approvals/${id}/approve`).then(r => r.data);
export const rejectEntry = (id: number) => apiClient.post(`/approvals/${id}/reject`).then(r => r.data);
export const batchApprove = (userId: number) => apiClient.post('/approvals/batch-approve', { userId }).then(r => r.data);
export const getPendingUsers = (managerId?: number) => apiClient.get('/approvals/pending-users', { params: { managerId } }).then(r => r.data);
export const getPendingEntriesGrouped = (userId: number) => apiClient.get('/approvals/pending-grouped', { params: { userId } }).then(r => r.data);

// --- Resource Allocation ---
export const getResourceAllocation = (year: number, month: number) => apiClient.get('/resource-allocation', { params: { year, month } }).then(r => r.data);
export const getProjectAllocation = (year: number, month: number) => apiClient.get('/project-allocation', { params: { year, month } }).then(r => r.data);

// --- Reports ---
export const getTeamReport = (from: string, to: string, teamId?: number, managerId?: number) => apiClient.get('/reports/team', { params: { from, to, teamId, managerId } }).then(r => r.data);
export const getGeneralReport = (params: any) => apiClient.get('/reports/general', { params }).then(r => r.data);

// --- Programs CRUD ---
export const getPrograms = (all?: boolean) => apiClient.get('/programs', { params: { all } }).then(r => r.data);
export const createProgram = (data: any) => apiClient.post('/programs', data).then(r => r.data);
export const updateProgram = (id: number, data: any) => apiClient.put(`/programs/${id}`, data).then(r => r.data);

// --- Projects CRUD ---
export const getProjects = (programId?: number, all?: boolean) => apiClient.get('/projects', { params: { programId, all } }).then(r => r.data);
export const createProject = (data: any) => apiClient.post('/projects', data).then(r => r.data);
export const updateProject = (id: number, data: any) => apiClient.put(`/projects/${id}`, data).then(r => r.data);

// --- Sub Projects CRUD ---
export const getSubProjects = (projectId?: number, all?: boolean) => apiClient.get('/sub-projects', { params: { projectId, all } }).then(r => r.data);
export const createSubProject = (data: any) => apiClient.post('/sub-projects', data).then(r => r.data);
export const updateSubProject = (id: number, data: any) => apiClient.put(`/sub-projects/${id}`, data).then(r => r.data);

// --- WBS ---
export const getWbs = () => apiClient.get('/wbs').then(r => r.data);
export const quickAddProject = (data: { projectName: string; programId: number }) => apiClient.post('/projects/quick-add', data).then(r => r.data);
export const quickAddSubProject = (data: { subProjectName: string; programId: number; projectId: number }) => apiClient.post('/sub-projects/quick-add', data).then(r => r.data);
export const getWorkstreams = (teamId?: number) => apiClient.get('/workstreams', { params: { teamId } }).then(r => r.data);

// --- Auth ---
export const resetPassword = (newPassword: string) => apiClient.post('/auth/reset-password', { newPassword }).then(r => r.data);
