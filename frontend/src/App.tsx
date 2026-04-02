import React, { Suspense } from 'react';
import { ConfigProvider, Spin } from 'antd';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/dashboard/Dashboard';

// Core pages — loaded eagerly (used by everyone immediately)
import DataEntry from './pages/gtl/DataEntry';
import TimeEntryList from './pages/gtl/TimeEntryList';
import MyAttendance from './pages/attendance/MyAttendance';
import MyProfile from './pages/profiles/MyProfile';

// Lazy-loaded pages — loaded on demand
const CheckInOut = React.lazy(() => import('./pages/attendance/CheckInOut'));
const MyLeaves = React.lazy(() => import('./pages/leaves/MyLeaves'));
const ApplyLeave = React.lazy(() => import('./pages/leaves/ApplyLeave'));
const ResetPassword = React.lazy(() => import('./pages/settings/ResetPassword'));
const AttendanceRequests = React.lazy(() => import('./pages/attendance/AttendanceRequests'));
const BloodGroup = React.lazy(() => import('./pages/profiles/BloodGroup'));
const Holidays = React.lazy(() => import('./pages/attendance/Holidays'));
const MyTeam = React.lazy(() => import('./pages/attendance/MyTeam'));
const ContactDirectory = React.lazy(() => import('./pages/profiles/ContactDirectory'));
const WfhManagement = React.lazy(() => import('./pages/attendance/WfhManagement'));
const WeekendAssignments = React.lazy(() => import('./pages/attendance/WeekendAssignments'));
const UserGuide = React.lazy(() => import('./pages/help/UserGuide'));

// Lead pages
const Approvals = React.lazy(() => import('./pages/gtl/Approvals'));
const LeadInsights = React.lazy(() => import('./pages/reports/LeadInsights'));
const PersonDetail = React.lazy(() => import('./pages/reports/PersonDetail'));
const EmployeeManagement = React.lazy(() => import('./pages/manage/EmployeeManagement'));
const PendingLeaves = React.lazy(() => import('./pages/leaves/PendingLeaves'));
const EmployeesReport = React.lazy(() => import('./pages/attendance/EmployeesReport'));

// Admin pages
const TeamChangeRequests = React.lazy(() => import('./pages/manage/TeamChangeRequests'));
const GhostEmployees = React.lazy(() => import('./pages/reports/GhostEmployees'));
const DailyReport = React.lazy(() => import('./pages/attendance/DailyReport'));
const UserList = React.lazy(() => import('./pages/users/UserList'));
const EmployeeList = React.lazy(() => import('./pages/profiles/EmployeeList'));
const Teams = React.lazy(() => import('./pages/manage/Teams'));
const Programs = React.lazy(() => import('./pages/manage/Programs'));
const Projects = React.lazy(() => import('./pages/manage/Projects'));
const SubProjects = React.lazy(() => import('./pages/manage/SubProjects'));
const Workstreams = React.lazy(() => import('./pages/manage/Workstreams'));
const TeamReport = React.lazy(() => import('./pages/reports/TeamReport'));
const GeneralReport = React.lazy(() => import('./pages/reports/GeneralReport'));
const ResourceAllocation = React.lazy(() => import('./pages/resource/ResourceAllocation'));
const ProjectAllocation = React.lazy(() => import('./pages/resource/ProjectAllocation'));
const DeviceManagement = React.lazy(() => import('./pages/manage/DeviceManagement'));
const ChangeRequests = React.lazy(() => import('./pages/manage/ChangeRequests'));
const AuditLog = React.lazy(() => import('./pages/manage/AuditLog'));
const OrgChart = React.lazy(() => import('./pages/reports/OrgChart'));
const CvGenerator = React.lazy(() => import('./pages/profiles/CvGenerator'));

// Public pages
const PublicBoard = React.lazy(() => import('./pages/attendance/PublicBoard'));
const Kiosk = React.lazy(() => import('./pages/attendance/Kiosk'));

import { useAuthStore } from './store/authStore';
import { getThemeForCompany, getCssVarsForCompany } from './theme/companyThemes';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const Loading = () => <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/board" element={<PublicBoard />} />
        <Route path="/ams" element={<Kiosk />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

          {/* Employee Portal */}
          <Route path="my/timesheet" element={<TimeEntryList />} />
          <Route path="my/data-entry" element={<DataEntry />} />
          <Route path="my/check-in-out" element={<CheckInOut />} />
          <Route path="my/attendance" element={<MyAttendance />} />
          <Route path="my/leaves" element={<MyLeaves />} />
          <Route path="my/apply-leave" element={<ApplyLeave />} />
          <Route path="my/profile" element={<MyProfile />} />
          <Route path="my/attendance-requests" element={<AttendanceRequests />} />
          <Route path="my/blood-groups" element={<BloodGroup />} />
          <Route path="my/holidays" element={<Holidays />} />
          <Route path="my/team" element={<MyTeam />} />
          <Route path="my/directory" element={<ContactDirectory />} />
          <Route path="my/weekend-assignments" element={<WeekendAssignments />} />
          <Route path="my/wfh" element={<WfhManagement />} />
          <Route path="my/help" element={<UserGuide />} />
          <Route path="reset-password" element={<ResetPassword />} />

          {/* Lead + Admin Portal */}
          <Route path="admin/timesheet" element={<TimeEntryList />} />
          <Route path="admin/approvals" element={<Approvals />} />
          <Route path="admin/attendance-requests" element={<AttendanceRequests />} />
          <Route path="admin/employees-report" element={<EmployeesReport />} />
          <Route path="admin/lead-insights" element={<LeadInsights />} />
          <Route path="admin/ghost-employees" element={<GhostEmployees />} />
          <Route path="admin/person-detail" element={<PersonDetail />} />
          <Route path="admin/reports/team" element={<TeamReport />} />
          <Route path="admin/reports/general" element={<GeneralReport />} />
          <Route path="admin/attendance/daily" element={<DailyReport />} />
          <Route path="admin/resource/resource-wise" element={<ResourceAllocation />} />
          <Route path="admin/resource/project-wise" element={<ProjectAllocation />} />
          <Route path="admin/users" element={<UserList />} />
          <Route path="admin/profiles" element={<EmployeeList />} />
          <Route path="admin/leaves/pending" element={<PendingLeaves />} />
          <Route path="admin/teams" element={<Teams />} />
          <Route path="admin/programs" element={<Programs />} />
          <Route path="admin/projects" element={<Projects />} />
          <Route path="admin/subprojects" element={<SubProjects />} />
          <Route path="admin/workstreams" element={<Workstreams />} />
          <Route path="admin/devices" element={<DeviceManagement />} />
          <Route path="admin/change-requests" element={<ChangeRequests />} />
          <Route path="admin/employee-management" element={<EmployeeManagement />} />
          <Route path="admin/audit-log" element={<AuditLog />} />
          <Route path="admin/team-change-requests" element={<TeamChangeRequests />} />
        <Route path="admin/org-chart" element={<OrgChart />} />
        <Route path="admin/cv-generator" element={<CvGenerator />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const theme = getThemeForCompany(user?.payrollCompany);
  const cssVars = getCssVarsForCompany(user?.payrollCompany);

  React.useEffect(() => {
    Object.entries(cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [user?.payrollCompany]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
