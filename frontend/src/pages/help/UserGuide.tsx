import { Card, Collapse, Tag, Table } from 'antd';
import { QuestionCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const LEAD_ROLES = ['super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager'];
const ADMIN_ROLES = ['super admin', 'Admin', 'Hr Manager'];

export default function UserGuide() {
  const user = useAuthStore((s) => s.user);
  const isLead = user?.roles?.some((r: any) => LEAD_ROLES.includes(r.name));
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));

  const employeeGuide = [
    { key: '1', label: 'How do I log my daily work hours?', children: (
      <div>
        <p>Go to <strong>Data Entry</strong> from the sidebar.</p>
        <ol>
          <li>Select <strong>Work Type</strong> (Billable/Not Billable)</li>
          <li>Select <strong>Program</strong> → Project → Sub Project</li>
          <li>Pick the <strong>Date</strong> — hours auto-fill from your attendance</li>
          <li>Write a <strong>Description</strong> of what you did</li>
          <li>Select <strong>WBS</strong> and click <strong>Submit</strong></li>
        </ol>
        <Tag color="blue">Note: You can only log time for days you were present. Hours are fetched automatically from attendance.</Tag>
      </div>
    )},
    { key: '2', label: 'How do I view my timesheet?', children: (
      <div>
        <p>Go to <strong>Time Sheet</strong> from the sidebar. Select the year and month. Your entries are grouped by week.</p>
        <p>You can <strong>edit</strong> or <strong>delete</strong> pending entries (pencil/trash icons). Approved entries cannot be modified.</p>
        <p>Click <strong>Download</strong> to export as CSV.</p>
      </div>
    )},
    { key: '3', label: 'How do I mark my attendance?', children: (
      <div>
        <p>Attendance is marked through the <strong>AMS Kiosk</strong> at the office entrance.</p>
        <ol>
          <li>Go to the kiosk screen</li>
          <li>Enter your <strong>username</strong> and <strong>password</strong></li>
          <li>Click <strong>Mark Attendance</strong></li>
          <li>First scan = Check In, second scan = Check Out</li>
        </ol>
        <Tag color="orange">Important: If you forget to check out, the system auto-closes your session after 12 hours. Submit an Attendance Request to fix it.</Tag>
      </div>
    )},
    { key: '4', label: 'What if I missed my checkout?', children: (
      <div>
        <p>Go to <strong>My Attendance</strong> → find the day with "Missed Checkout" → click the blue <strong>Fix</strong> button.</p>
        <p>Enter the correct checkout time → Submit. Your Team Lead will approve it and the record will be corrected.</p>
      </div>
    )},
    { key: '5', label: 'How do I apply for leave?', children: (
      <div>
        <p>Go to <strong>Leaves</strong> → <strong>Apply Leave</strong> from the sidebar.</p>
        <p>Select date range, leave type (Casual/Earned/Sick), and description. Your manager will approve or reject.</p>
        <Tag color="red">You can only apply for future dates, not past dates.</Tag>
      </div>
    )},
    { key: '6', label: 'How do I update my profile?', children: (
      <div>
        <p>Go to <strong>Personal</strong> from the sidebar. You can edit:</p>
        <ul>
          <li>Personal info (name, CNIC, contact, blood group, etc.)</li>
          <li>Education (add/delete degrees)</li>
          <li>Experience (add/delete work history)</li>
          <li>Visas (add/delete)</li>
          <li>Password (Reset Password tab)</li>
        </ul>
        <Tag color="blue">Date of Joining is set by HR and cannot be changed by employees.</Tag>
      </div>
    )},
    { key: '7', label: 'What is Work From Home (WFH)?', children: (
      <div>
        <p>Your Team Lead assigns WFH days. When assigned:</p>
        <ol>
          <li>You'll see it on the <strong>Work From Home</strong> page</li>
          <li>Complete the tasks assigned to you</li>
          <li>At end of day: click <strong>Submit Work</strong> → list your deliverables</li>
          <li>Your lead will review your work</li>
        </ol>
        <Tag color="orange">Employees cannot self-assign WFH. Only leads/admins can assign it.</Tag>
      </div>
    )},
  ];

  const leadGuide = [
    { key: 'l1', label: 'How do I approve timesheets?', children: (
      <div>
        <p>Go to <strong>Time Sheet Approval</strong>. Select an employee from the dropdown → see their pending entries grouped by week.</p>
        <p>Click ✓ to approve or ✗ to reject individual entries. Or click <strong>Approve All</strong> to batch-approve.</p>
        <Tag color="red">You cannot approve your own entries — another lead must approve them.</Tag>
      </div>
    )},
    { key: 'l2', label: 'How do I change an employee\'s designation?', children: (
      <div>
        <p>Go to <strong>Employee Mgmt</strong> under Administration. Select the employee → choose "Designation / Role" → type or select the new designation → Apply.</p>
        <Tag color="blue">You can only edit employees in your own team. Super admins can edit anyone.</Tag>
      </div>
    )},
    { key: 'l3', label: 'How do I assign Work From Home?', children: (
      <div>
        <p>Go to <strong>Work From Home</strong> → click <strong>Assign WFH</strong>. Select employee, date, and write specific tasks they should complete.</p>
        <p>After the employee submits their deliverables, click <strong>Review</strong> to assess their work.</p>
      </div>
    )},
    { key: 'l4', label: 'How do I find employees who are not logging GTL?', children: (
      <div>
        <p>Go to <strong>Lead Insights</strong>. It automatically shows:</p>
        <ul>
          <li><strong>Present but No GTL</strong> — employees who come to office but don't log time</li>
          <li><strong>Missed Checkouts</strong> — frequent offenders</li>
          <li><strong>Below 8h Average</strong> — low productivity</li>
          <li><strong>Pending Approvals</strong> — entries waiting for your action</li>
        </ul>
        <p>Click any name to drill down into their full attendance and GTL details.</p>
      </div>
    )},
  ];

  const adminGuide = [
    { key: 'a1', label: 'How do I add/remove employees from teams?', children: (
      <div>
        <p>Go to <strong>Employee Mgmt</strong>. Select employee → choose "Team" → select new team → Apply.</p>
        <p>Only super admins can change team assignments and reporting structure.</p>
      </div>
    )},
    { key: 'a2', label: 'How do I deactivate an employee who left?', children: (
      <div>
        <p>Go to <strong>Ghost Employees</strong>. It shows employees with no activity. Click the trash icon to deactivate.</p>
        <p>Or go to <strong>Users</strong> list and search for the employee.</p>
      </div>
    )},
    { key: 'a3', label: 'How do I add a holiday?', children: (
      <div>
        <p>Go to <strong>Holidays</strong> → click <strong>Add Holiday</strong>. Enter name, from date, to date. It auto-calculates days and applies to all employees' attendance calendars.</p>
      </div>
    )},
    { key: 'a4', label: 'How do I see what admins have done?', children: (
      <div>
        <p>Go to <strong>Audit Log</strong> under Administration. Shows every admin action: approvals, rejections, employee changes, WFH assignments, deactivations — with timestamps and who did it.</p>
      </div>
    )},
  ];

  // Feature comparison
  const comparisonData = [
    { feature: 'Time Sheet (weekly groups)', gtl: true, hrms: false, unified: true, improvement: 'Edit/delete inline, CSV download' },
    { feature: 'Data Entry', gtl: true, hrms: false, unified: true, improvement: 'Auto-fill hours from attendance, block holidays' },
    { feature: 'Time Sheet Approval', gtl: true, hrms: false, unified: true, improvement: 'Per-entry + batch, self-approval blocked' },
    { feature: 'Team Report', gtl: true, hrms: false, unified: true, improvement: 'Server-side filtering' },
    { feature: 'General Report', gtl: true, hrms: false, unified: true, improvement: 'Download Approved/Unapproved/Both' },
    { feature: 'Resource Allocation', gtl: true, hrms: false, unified: true, improvement: 'Search by employee/project' },
    { feature: 'AMS Dashboard', gtl: false, hrms: true, unified: true, improvement: 'Tabbed view, team filter, auto-refresh' },
    { feature: 'AMS Kiosk (attendance marking)', gtl: false, hrms: true, unified: true, improvement: 'Video background, modern UI' },
    { feature: 'Public Board', gtl: false, hrms: true, unified: true, improvement: 'No login required' },
    { feature: 'My Attendance', gtl: false, hrms: true, unified: true, improvement: 'Seconds, cross-midnight fix, live timer' },
    { feature: 'Attendance Requests', gtl: false, hrms: true, unified: true, improvement: 'Auto-fix on approval' },
    { feature: 'Weekend Assignments', gtl: false, hrms: true, unified: true, improvement: '' },
    { feature: 'Holidays Calendar', gtl: false, hrms: true, unified: true, improvement: 'Admin CRUD, auto-blocks GTL' },
    { feature: 'Profile (editable)', gtl: false, hrms: true, unified: true, improvement: 'Completion %, CNIC/phone formatting' },
    { feature: 'Education/Experience/Visa', gtl: false, hrms: true, unified: true, improvement: 'Add/delete CRUD from profile' },
    { feature: 'Leaves + Apply', gtl: false, hrms: true, unified: true, improvement: 'Future dates only' },
    { feature: 'Blood Group Report', gtl: false, hrms: true, unified: true, improvement: 'Card layout with search' },
    { feature: 'Employee Directory', gtl: false, hrms: false, unified: true, improvement: 'NEW — searchable, team filter' },
    { feature: 'My Team (by role)', gtl: false, hrms: false, unified: true, improvement: 'NEW — live attendance per member' },
    { feature: 'Work From Home', gtl: false, hrms: false, unified: true, improvement: 'NEW — assign, deliver, review cycle' },
    { feature: 'Anti-gaming (12h cap)', gtl: false, hrms: false, unified: true, improvement: 'NEW — suspicious detection' },
    { feature: 'Lead Insights', gtl: false, hrms: false, unified: true, improvement: 'NEW — culprit detection dashboard' },
    { feature: 'Employee Detail drill-down', gtl: false, hrms: false, unified: true, improvement: 'NEW — full history per person' },
    { feature: 'Ghost Employee detection', gtl: false, hrms: false, unified: true, improvement: 'NEW — find inactive accounts' },
    { feature: 'Employee Management', gtl: false, hrms: false, unified: true, improvement: 'NEW — role-based editing with history' },
    { feature: 'Audit Log', gtl: false, hrms: false, unified: true, improvement: 'NEW — tracks all admin actions' },
    { feature: 'Forgot Password', gtl: false, hrms: false, unified: true, improvement: 'NEW — token-based reset' },
    { feature: 'ZKTeco Integration', gtl: false, hrms: true, unified: true, improvement: 'Node.js native, no PHP' },
    { feature: 'Argon2id Password Hashing', gtl: false, hrms: false, unified: true, improvement: 'NEW — auto-upgrade from MD5' },
  ];

  const comparisonColumns = [
    { title: 'Feature', dataIndex: 'feature', width: '35%' },
    { title: 'Old GTL', dataIndex: 'gtl', width: 80, align: 'center' as const, render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#d9d9d9' }} /> },
    { title: 'Old HRMS', dataIndex: 'hrms', width: 80, align: 'center' as const, render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#d9d9d9' }} /> },
    { title: 'Current System', dataIndex: 'unified', width: 100, align: 'center' as const, render: (v: boolean) => v ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag> },
    { title: 'Improvement', dataIndex: 'improvement', render: (v: string) => v ? <span style={{ fontSize: 12, color: '#1677ff' }}>{v}</span> : '-' },
  ];

  return (
    <div>
      <div className="page-heading"><QuestionCircleOutlined style={{ marginRight: 8 }} />User Guide</div>

      {/* Role-specific welcome */}
      <Card style={{ borderRadius: 12, marginBottom: 20, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1C2833', marginBottom: 4 }}>
          Welcome, {user?.displayName || user?.username}
        </div>
        <div style={{ fontSize: 13, color: '#666' }}>
          You are logged in as: {user?.roles?.map((r: any) => <Tag key={r.id} color="blue" style={{ marginRight: 4 }}>{r.name}</Tag>)}
        </div>
      </Card>

      {/* Employee Guide — everyone sees */}
      <Card title="Employee Guide" size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Collapse items={employeeGuide} bordered={false} />
      </Card>

      {/* Lead Guide */}
      {isLead && (
        <Card title="Team Lead Guide" size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
          <Collapse items={leadGuide} bordered={false} />
        </Card>
      )}

      {/* Admin Guide */}
      {isAdmin && (
        <Card title="Admin Guide" size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
          <Collapse items={adminGuide} bordered={false} />
        </Card>
      )}

      {/* Feature Comparison */}
      <Card title="Old System vs Current System — Feature Comparison" size="small" style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 12, fontSize: 13, color: '#666' }}>
          <Tag color="green">{comparisonData.filter(d => d.unified).length}</Tag> features in Current System |
          <Tag color="default">{comparisonData.filter(d => d.gtl).length}</Tag> were in old GTL |
          <Tag color="default">{comparisonData.filter(d => d.hrms).length}</Tag> were in old HRMS |
          <Tag color="blue">{comparisonData.filter(d => !d.gtl && !d.hrms && d.unified).length}</Tag> are brand new
        </div>
        <Table dataSource={comparisonData} columns={comparisonColumns} rowKey="feature" pagination={false} size="small"
          rowClassName={(r) => !r.gtl && !r.hrms ? 'row-new-feature' : ''} />
      </Card>

      <style>{`.row-new-feature td { background: #f0f7ff !important; }`}</style>
    </div>
  );
}
