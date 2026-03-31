import { ConfigProvider } from 'antd';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';

// Employee pages (my/*)
import DataEntry from './pages/gtl/DataEntry';
import TimeEntryList from './pages/gtl/TimeEntryList';
import CheckInOut from './pages/attendance/CheckInOut';
import MyAttendance from './pages/attendance/MyAttendance';
import MyLeaves from './pages/leaves/MyLeaves';
import ApplyLeave from './pages/leaves/ApplyLeave';
import ResetPassword from './pages/settings/ResetPassword';
import MyProfile from './pages/profiles/MyProfile';
import AttendanceRequests from './pages/attendance/AttendanceRequests';
import BloodGroup from './pages/profiles/BloodGroup';
import Holidays from './pages/attendance/Holidays';
import MyTeam from './pages/attendance/MyTeam';
// LateArrivals removed
import ContactDirectory from './pages/profiles/ContactDirectory';
import LeadInsights from './pages/reports/LeadInsights';
import PersonDetail from './pages/reports/PersonDetail';
import GhostEmployees from './pages/reports/GhostEmployees';
import DeviceManagement from './pages/manage/DeviceManagement';
import ChangeRequests from './pages/manage/ChangeRequests';
import EmployeeManagement from './pages/manage/EmployeeManagement';
import WeekendAssignments from './pages/attendance/WeekendAssignments';
import EmployeesReport from './pages/attendance/EmployeesReport';

// Admin pages (admin/*)
import Approvals from './pages/gtl/Approvals';
import DailyReport from './pages/attendance/DailyReport';
import PendingLeaves from './pages/leaves/PendingLeaves';
import UserList from './pages/users/UserList';
import EmployeeList from './pages/profiles/EmployeeList';
import Teams from './pages/manage/Teams';
import Programs from './pages/manage/Programs';
import Projects from './pages/manage/Projects';
import SubProjects from './pages/manage/SubProjects';
import Workstreams from './pages/manage/Workstreams';
import TeamReport from './pages/reports/TeamReport';
import GeneralReport from './pages/reports/GeneralReport';
import ResourceAllocation from './pages/resource/ResourceAllocation';
import ProjectAllocation from './pages/resource/ProjectAllocation';

// Public pages (no auth)
import PublicBoard from './pages/attendance/PublicBoard';
import Kiosk from './pages/attendance/Kiosk';

import { useAuthStore } from './store/authStore';
import { getThemeForCompany } from './theme/companyThemes';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/board" element={<PublicBoard />} />
      <Route path="/ams" element={<Kiosk />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />

        {/* Employee Portal — every user sees these */}
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
        <Route path="reset-password" element={<ResetPassword />} />

        {/* Admin Portal — admin/lead/manager roles */}
        <Route path="admin/timesheet" element={<TimeEntryList />} />
        <Route path="admin/approvals" element={<Approvals />} />
        <Route path="admin/attendance-requests" element={<AttendanceRequests />} />
        <Route path="admin/employees-report" element={<EmployeesReport />} />
        {/* late-arrivals removed */}
        <Route path="admin/lead-insights" element={<LeadInsights />} />
        <Route path="admin/ghost-employees" element={<GhostEmployees />} />
        <Route path="admin/person-detail" element={<PersonDetail />} />
        <Route path="admin/attendance-requests" element={<AttendanceRequests />} />
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
      </Route>
    </Routes>
  );
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const theme = getThemeForCompany(user?.payrollCompany);

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
