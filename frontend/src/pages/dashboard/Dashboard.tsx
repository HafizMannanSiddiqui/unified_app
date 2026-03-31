import { Card, Col, Row, Typography, Statistic, Tag, Spin, Progress, Avatar, Input, Tabs } from 'antd';
import {
  ClockCircleOutlined, IdcardOutlined, ScheduleOutlined,
  CheckCircleOutlined, FieldTimeOutlined,
  TeamOutlined, LoginOutlined, CalendarOutlined,
  RiseOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getTimeEntries } from '../../api/gtl';
import { getMyAttendance, getTodayDashboard } from '../../api/attendance';
import { getLeaves, getLeaveBalance } from '../../api/leaves';
import { getTeams } from '../../api/teams';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function StatCard({ title, value, icon, color, suffix, loading }: any) {
  return (
    <Card style={{ borderRadius: 12, borderLeft: `4px solid ${color}` }} styles={{ body: { padding: '16px 20px' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>{title}</Typography.Text>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3, color: '#262626' }}>
            {loading ? <Spin size="small" /> : value}{suffix && <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}> {suffix}</span>}
          </div>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const now = dayjs();
  const monthStart = now.startOf('month').format('YYYY-MM-DD');
  const monthEnd = now.endOf('month').format('YYYY-MM-DD');
  const [search, setSearch] = useState('');

  const isLead = user?.roles?.some((r: any) => ['super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager'].includes(r.name));

  const { data: myEntries, isLoading: le } = useQuery({
    queryKey: ['dashMyEntries', user?.id, monthStart],
    queryFn: () => getTimeEntries({ userId: user?.id, from: monthStart, to: monthEnd, pageSize: 200 }),
    enabled: !!user?.id,
  });
  const { data: myAttendance, isLoading: la } = useQuery({
    queryKey: ['dashMyAtt', monthStart, monthEnd],
    queryFn: () => getMyAttendance(monthStart, monthEnd),
  });
  const { data: balance } = useQuery({
    queryKey: ['dashBal', user?.id],
    queryFn: () => getLeaveBalance(user!.id),
    enabled: !!user?.id,
  });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });
  const { data: todayDash, isLoading: ld } = useQuery({
    queryKey: ['todayDashboard'],
    queryFn: getTodayDashboard,
    refetchInterval: 60000, // refresh every minute
  });

  const teamName = (teams || []).find((t: any) => t.id === user?.teamId)?.teamName || '-';
  const myTotalHours = (myEntries?.items || []).reduce((s: number, e: any) => s + Number(e.hours), 0);
  const daysPresent = (myAttendance || []).length;
  // Calculate working days (weekdays only, exclude Sat/Sun)
  const totalWorkDays = (() => {
    let count = 0;
    for (let d = 1; d <= now.date(); d++) {
      const day = dayjs(`${now.year()}-${String(now.month() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`).day();
      if (day !== 0 && day !== 6) count++; // Skip Sunday(0) and Saturday(6)
    }
    return count;
  })();
  const attendancePct = totalWorkDays > 0 ? Math.round((daysPresent / totalWorkDays) * 100) : 0;

  const attWithCheckout = (myAttendance || []).filter((a: any) => a.checkinTime && a.checkoutTime);
  const totalMinutes = attWithCheckout.reduce((s: number, a: any) => {
    const ci = dayjs(`2000-01-01 ${a.checkinTime}`);
    const co = dayjs(`2000-01-01 ${a.checkoutTime}`);
    return s + co.diff(ci, 'minute');
  }, 0);
  const avgHours = attWithCheckout.length > 0 ? Math.round((totalMinutes / attWithCheckout.length / 60) * 10) / 10 : 0;

  const todayAtt = (myAttendance || []).find((a: any) => dayjs(a.checkinDate).format('YYYY-MM-DD') === now.format('YYYY-MM-DD'));

  // Filter team members by search
  // Employees see only their team, leads/admins see everyone
  const filterUsers = (users: any[]) => {
    let filtered = users;
    if (!isLead && user?.teamId) {
      filtered = filtered.filter((u: any) => u.teamId === user.teamId);
    }
    if (search) {
      filtered = filtered.filter((u: any) => (u.displayName || u.username || '').toLowerCase().includes(search.toLowerCase()));
    }
    return filtered;
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Good {now.hour() < 12 ? 'Morning' : now.hour() < 17 ? 'Afternoon' : 'Evening'}, {user?.displayName?.split(' ')[0] || user?.username}
          </Typography.Title>
          <Typography.Text type="secondary">{now.format('dddd, MMMM D, YYYY')}</Typography.Text>
        </div>
        <Card size="small" style={{ borderRadius: 10 }}>
          {todayAtt ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Checked in at {todayAtt.checkinTime?.slice(0, 5)}</div>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>{todayAtt.checkoutTime ? `Out: ${todayAtt.checkoutTime.slice(0, 5)}` : 'Still working'}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/my/check-in-out')}>
              <LoginOutlined style={{ color: '#fa8c16', fontSize: 18 }} />
              <div style={{ fontWeight: 600, fontSize: 13 }}>Not checked in today</div>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} lg={6}>
          <StatCard title="Days Present" value={daysPresent} suffix={`/ ${totalWorkDays}`} icon={<CheckCircleOutlined />} color="#52c41a" loading={la} />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard title="Hours Logged" value={Math.round(myTotalHours * 10) / 10} suffix="hrs" icon={<ClockCircleOutlined />} color="#1677ff" loading={le} />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard title="Avg Work Hours" value={avgHours} suffix="hrs/day" icon={<FieldTimeOutlined />} color="#722ed1" loading={la} />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard title="Leaves Balance" value={balance?.remaining ?? '-'} suffix={`/ ${balance?.allowed ?? '-'}`} icon={<ScheduleOutlined />} color="#fa8c16" />
        </Col>
      </Row>

      {/* ── Team Member's List ── */}
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} />Today's Attendance
          </Typography.Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Input prefix={<SearchOutlined />} placeholder="Search..." allowClear
              onChange={e => setSearch(e.target.value)} style={{ width: 200 }} size="small" />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{now.format('ddd, MMM D, YYYY')}</Typography.Text>
          </div>
        </div>

        {ld ? <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div> : todayDash ? (
          <Tabs items={[
            {
              key: 'available',
              label: <span style={{ color: '#52c41a' }}>Available <Tag color="green">{todayDash.available.count}</Tag></span>,
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {filterUsers(todayDash.available.users).map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#f6ffed', border: '1px solid #d9f7be' }}>
                      <Avatar size={32} style={{ background: '#52c41a', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                        {(u.displayName || u.username)?.[0]?.toUpperCase()}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.displayName || u.username}
                        </div>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>{u.team?.teamName || ''}</div>
                      </div>
                      <Tag color="green" style={{ fontSize: 11, margin: 0 }}>{u.checkinTime}</Tag>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'notavailable',
              label: <span style={{ color: '#ff4d4f' }}>Not Available <Tag color="red">{todayDash.notAvailable.count}</Tag></span>,
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {filterUsers(todayDash.notAvailable.users).map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#fff2f0', border: '1px solid #ffccc7' }}>
                      <Avatar size={32} style={{ background: '#ff4d4f', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                        {(u.displayName || u.username)?.[0]?.toUpperCase()}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.displayName || u.username}
                        </div>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>{u.team?.teamName || ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'pending',
              label: <span style={{ color: '#fa8c16' }}>Pending Checkout <Tag color="orange">{todayDash.pendingCheckout.count}</Tag></span>,
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {filterUsers(todayDash.pendingCheckout.users).map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#fff7e6', border: '1px solid #ffe58f' }}>
                      <Avatar size={32} style={{ background: '#fa8c16', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                        {(u.displayName || u.username)?.[0]?.toUpperCase()}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.displayName || u.username}
                        </div>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>{u.team?.teamName || ''}</div>
                      </div>
                      <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>{u.checkinTime}</Tag>
                    </div>
                  ))}
                </div>
              ),
            },
          ]} />
        ) : null}
      </Card>

      {/* Quick Actions + Profile Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 12, height: '100%' }} styles={{ body: { padding: 24 } }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Avatar size={72} style={{ background: '#1677ff', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
                {user?.displayName?.[0]?.toUpperCase()}
              </Avatar>
              <Typography.Title level={4} style={{ margin: 0 }}>{user?.displayName}</Typography.Title>
              <Typography.Text type="secondary">@{user?.username}</Typography.Text>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Email', user?.email || '-'],
                ['Team', teamName],
                ['Role', user?.roles?.map((r: any) => r.name).join(', ') || '-'],
                ['Company', user?.payrollCompany || '-'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography.Text type="secondary">{label}</Typography.Text>
                  <Typography.Text>{value}</Typography.Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<><CalendarOutlined /> Attendance — {now.format('MMMM')}</>} style={{ borderRadius: 12, height: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Progress type="dashboard" percent={attendancePct} size={130}
                strokeColor={attendancePct >= 80 ? '#52c41a' : attendancePct >= 60 ? '#fa8c16' : '#ff4d4f'}
                format={(pct) => <div><div style={{ fontSize: 22, fontWeight: 700 }}>{pct}%</div><div style={{ fontSize: 11, color: '#8c8c8c' }}>Present</div></div>}
              />
            </div>
            <Row gutter={8}>
              <Col span={8} style={{ textAlign: 'center' }}><Statistic title="Present" value={daysPresent} valueStyle={{ fontSize: 18, color: '#52c41a' }} /></Col>
              <Col span={8} style={{ textAlign: 'center' }}><Statistic title="Absent" value={Math.max(0, totalWorkDays - daysPresent - (balance?.used || 0))} valueStyle={{ fontSize: 18, color: '#ff4d4f' }} /></Col>
              <Col span={8} style={{ textAlign: 'center' }}><Statistic title="On Leave" value={balance?.used || 0} valueStyle={{ fontSize: 18, color: '#fa8c16' }} /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<><RiseOutlined /> Quick Actions</>} style={{ borderRadius: 12, height: '100%' }}>
            {[
              { title: 'Log Time Entry', desc: 'Record your daily work hours', icon: <ClockCircleOutlined />, color: '#1677ff', path: '/my/data-entry' },
              { title: 'Check In / Out', desc: todayAtt ? 'Already checked in' : 'Mark your attendance', icon: <IdcardOutlined />, color: '#52c41a', path: '/my/check-in-out' },
              { title: 'Apply for Leave', desc: `${balance?.remaining || 0} leaves remaining`, icon: <ScheduleOutlined />, color: '#fa8c16', path: '/my/apply-leave' },
              { title: 'My Profile', desc: 'View & edit your info', icon: <CalendarOutlined />, color: '#722ed1', path: '/my/profile' },
            ].map((item) => (
              <div key={item.title} onClick={() => navigate(item.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${item.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: 16 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
