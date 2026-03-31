import {
  ClockCircleOutlined, DashboardOutlined, FileTextOutlined, IdcardOutlined,
  ScheduleOutlined, SettingOutlined, TeamOutlined, CheckCircleOutlined,
  CalendarOutlined, UserOutlined, ProjectOutlined, BarChartOutlined,
  AppstoreOutlined, FundProjectionScreenOutlined, LockOutlined,
  ApartmentOutlined, HeatMapOutlined, PieChartOutlined, ProfileOutlined,
  EditOutlined, HeartOutlined,
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { detectCompany } from './Header';

const { Sider } = Layout;

// Roles that can see Time Sheet Approval + Reports (leads, admins, etc.)
const LEAD_ROLES = ['super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager', 'Report Viewer'];
// Roles that can see full admin features (Users, Manage, Resource Allocation, etc.)
const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager'];

interface Props { collapsed: boolean; onCollapse: (c: boolean) => void; }

export default function Sidebar({ collapsed, onCollapse }: Props) {
  const navigate = useNavigate();
  const loc = useLocation();
  const user = useAuthStore((s) => s.user);

  const isLead = user?.roles?.some((r: any) => LEAD_ROLES.includes(r.name));
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));

  // Build menu matching old GTL structure
  const items: MenuProps['items'] = [
    { key: '/', icon: <DashboardOutlined />, label: 'Home' },
    // === GTL Section ===
    { key: '/my/timesheet', icon: <FileTextOutlined />, label: 'Time Sheet' },
    { key: '/my/data-entry', icon: <EditOutlined />, label: 'Data Entry' },

    // Time Sheet Approval — visible to leads + admins (like old GTL)
    ...(isLead ? [
      { key: '/admin/approvals', icon: <CheckCircleOutlined />, label: 'Time Sheet Approval' },
    ] : []),

    // Reports — visible to leads + admins (like old GTL)
    ...(isLead ? [{
      key: 'reports', icon: <BarChartOutlined />, label: 'Reports',
      children: [
        { key: '/admin/reports/team', icon: <TeamOutlined />, label: 'Team wise' },
        { key: '/admin/reports/general', icon: <PieChartOutlined />, label: 'General' },
      ],
    }] : []),

    // === HRMS Section ===
    { type: 'divider' as const },
    { key: 'hrms-label', type: 'group' as const, label: 'HRMS' },
    { key: '/my/profile', icon: <ProfileOutlined />, label: 'Personal' },
    { key: '/my/attendance', icon: <CalendarOutlined />, label: 'My Attendance' },
    {
      key: 'my-leaves', icon: <ScheduleOutlined />, label: 'Leaves',
      children: [
        { key: '/my/leaves', icon: <ScheduleOutlined />, label: 'My Leaves' },
        { key: '/my/apply-leave', icon: <ScheduleOutlined />, label: 'Apply Leave' },
      ],
    },
    { key: '/my/attendance-requests', icon: <CalendarOutlined />, label: 'Attendance Requests' },
    { key: '/my/weekend-assignments', icon: <CalendarOutlined />, label: 'Weekend Assignments' },
    { key: '/my/holidays', icon: <CalendarOutlined />, label: 'Holidays' },
    { key: '/my/team', icon: <TeamOutlined />, label: 'My Team' },
    { key: '/my/directory', icon: <UserOutlined />, label: 'Directory' },
    { key: '/my/blood-groups', icon: <HeartOutlined />, label: 'Blood Group' },

    // Reports — leads + admins
    ...(isLead ? [
      { key: '/admin/lead-insights', icon: <BarChartOutlined />, label: 'Lead Insights' },
      { key: '/admin/person-detail', icon: <UserOutlined />, label: 'Employee Detail' },
      { key: '/admin/employees-report', icon: <BarChartOutlined />, label: 'Employees Report' },
      { key: '/admin/ghost-employees', icon: <UserOutlined />, label: 'Ghost Employees' },
      { key: '/admin/attendance-requests', icon: <CheckCircleOutlined />, label: 'Att. Requests (Admin)' },
      { key: '/admin/change-requests', icon: <CheckCircleOutlined />, label: 'Profile Changes' },
    ] : []),

    // === Administration — only for super admin / admin ===
    ...(isAdmin ? [
      { type: 'divider' as const },
      { key: 'admin-label', type: 'group' as const, label: 'ADMINISTRATION' },
      { key: '/admin/timesheet', icon: <FileTextOutlined />, label: 'All Timesheets' },
      ...(isLead ? [{
        key: 'resource', icon: <HeatMapOutlined />, label: 'Resource Allocation',
        children: [
          { key: '/admin/resource/resource-wise', icon: <UserOutlined />, label: 'Resource wise' },
          { key: '/admin/resource/project-wise', icon: <FundProjectionScreenOutlined />, label: 'Project wise' },
        ],
      }] : []),
      {
        key: 'hr-admin', icon: <TeamOutlined />, label: 'People',
        children: [
          { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
          { key: '/admin/profiles', icon: <IdcardOutlined />, label: 'Profiles' },
          { key: '/admin/leaves/pending', icon: <CheckCircleOutlined />, label: 'Leave Approvals' },
          { key: '/admin/attendance/daily', icon: <BarChartOutlined />, label: 'Daily Attendance' },
        ],
      },
      { key: '/admin/devices', icon: <SettingOutlined />, label: 'ZKTeco Devices' },
      {
        key: 'manage', icon: <SettingOutlined />, label: 'Manage',
        children: [
          { key: '/admin/teams', icon: <TeamOutlined />, label: 'Teams' },
          { key: '/admin/programs', icon: <AppstoreOutlined />, label: 'Programs' },
          { key: '/admin/projects', icon: <ProjectOutlined />, label: 'Projects' },
          { key: '/admin/subprojects', icon: <ApartmentOutlined />, label: 'Sub Projects' },
          { key: '/admin/workstreams', icon: <ApartmentOutlined />, label: 'Workstreams' },
        ],
      },
    ] : []),
  ];

  const path = loc.pathname;
  const openKeys = path.startsWith('/admin/reports') ? ['reports']
    : path.startsWith('/my/check') || path.startsWith('/my/attendance') ? ['my-attendance']
    : path.startsWith('/my/leaves') || path.startsWith('/my/apply') ? ['my-leaves']
    : path.startsWith('/admin/resource') ? ['resource']
    : path.startsWith('/admin/users') || path.startsWith('/admin/profiles') || path.startsWith('/admin/leaves') || path.startsWith('/admin/attendance') ? ['hr-admin']
    : path.startsWith('/admin/team') || path.startsWith('/admin/program') || path.startsWith('/admin/project') || path.startsWith('/admin/sub') || path.startsWith('/admin/work') ? ['manage']
    : [];

  // Company logo — detect from payrollCompany OR email domain
  const iconMap: Record<string, string> = {
    Powersoft19: '/logos/ps-icon.png',
    Venturetronics: '/logos/vt-icon.png',
    Raythorne: '/logos/rt-icon.png',
    AngularSpring: '/logos/as-icon.png',
  };
  const company = detectCompany(user?.payrollCompany, user?.email);
  const logoSrc = company ? iconMap[company.key] : null;

  return (
    <Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={250}
      style={{ overflow: 'auto', height: '100vh', position: 'sticky', top: 0, left: 0, background: '#001529' }}>
      <div style={{ height: 60, margin: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {logoSrc ? (
          <img src={logoSrc} alt="Logo"
            style={{ maxHeight: collapsed ? 36 : 44, maxWidth: collapsed ? 36 : 180, objectFit: 'contain' }} />
        ) : !collapsed ? (
          <img src="/logos/gtl-logo.png" alt="Logo" style={{ maxHeight: 40, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <img src="/logos/gtl-logo.png" alt="Logo" style={{ maxHeight: 32, objectFit: 'contain' }}
            onError={(e) => {
              const el = (e.target as HTMLImageElement);
              el.style.display = 'none';
              el.parentElement!.innerHTML = '<div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#154360,#1a5276);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px">UP</div>';
            }} />
        )}
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[loc.pathname]} defaultOpenKeys={openKeys}
        items={items} onClick={({ key }) => navigate(key)} style={{ borderRight: 0 }} />
    </Sider>
  );
}
