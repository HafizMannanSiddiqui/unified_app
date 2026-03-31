export interface User {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  teamId: number | null;
  designationId: number | null;
  reportTo: number | null;
  payrollCompany: string | null;
  isActive: boolean;
  roles: RoleSummary[];
}

export interface RoleSummary {
  id: number;
  name: string;
}

export interface Permission {
  module: string;
  task: string;
}

export interface CurrentUser extends User {
  permissions: Permission[];
}

export interface Team {
  id: number;
  teamName: string;
  legacyTeamId: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface Module {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface TimeEntry {
  id: number;
  userId: number;
  programId: number;
  teamId: number | null;
  projectId: number | null;
  subProjectId: number | null;
  workType: number;
  productPhase: string | null;
  entryDate: string;
  description: string | null;
  wbsId: number | null;
  hours: number;
  approverId: number | null;
  status: number;
}

export interface Attendance {
  id: number;
  userId: number;
  checkinDate: string | null;
  checkinTime: string | null;
  checkoutDate: string | null;
  checkoutTime: string | null;
  status: number;
  checkinState: string;
  checkoutState: string | null;
}

export interface Leave {
  id: number;
  userId: number;
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  leaveType: string;
  description: string | null;
  confirmedBy: number | null;
  status: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
