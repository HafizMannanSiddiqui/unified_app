import { useQuery } from '@tanstack/react-query';
import { Select, DatePicker, Spin, Card, Row, Col, Statistic, Tag, Avatar } from 'antd';
import {
  WarningOutlined, ClockCircleOutlined, ExclamationCircleOutlined, UserOutlined,
  FileTextOutlined, AlertOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import apiClient from '../../api/client';
import { getTeams } from '../../api/teams';
import { useAuthStore } from '../../store/authStore';

const { RangePicker } = DatePicker;
const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager'];

const getLeadInsights = (from: string, to: string, teamId?: number, managerId?: number) =>
  apiClient.get('/attendance/lead-insights', { params: { from, to, teamId, managerId } }).then(r => r.data);
const getMyTeamAttendance = () => apiClient.get('/attendance/my-team').then(r => r.data);
const getEmployeesReport = (from: string, to: string, managerId?: number) =>
  apiClient.get('/attendance/employees-report', { params: { from, to, managerId } }).then(r => r.data);

export default function LeadInsights() {
  const navigate = useNavigate();
  const now = dayjs();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));
  const goToPerson = (userId: number) => navigate(`/admin/person-detail?user=${userId}&from=${range[0]}&to=${range[1]}`);
  const [range, setRange] = useState<[string, string]>([now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]);
  const [teamId, setTeamId] = useState<number | undefined>();

  const managerId = isAdmin ? undefined : user?.id;

  // Insights data
  const { data, isLoading } = useQuery({
    queryKey: ['leadInsights', range, teamId, isAdmin ? 'admin' : user?.id],
    queryFn: () => getLeadInsights(range[0], range[1], isAdmin ? teamId : undefined, managerId),
  });

  // Today's attendance for team
  const { data: teamToday } = useQuery({
    queryKey: ['myTeamAttendance', user?.id],
    queryFn: getMyTeamAttendance,
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  // Employees attendance summary for the period
  const { data: empReport } = useQuery({
    queryKey: ['empReportDashboard', range, isAdmin ? 'admin' : user?.id],
    queryFn: () => getEmployeesReport(range[0], range[1], managerId),
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams(), enabled: !!isAdmin });

  const presentCount = (teamToday || []).filter((m: any) => m.isPresent).length;
  const absentCount = (teamToday || []).length - presentCount;
  const checkedOutCount = (teamToday || []).filter((m: any) => m.todayCheckout).length;

  return (
    <div>
      <div className="page-heading">
        {isAdmin ? 'Team Lead Insights' : 'My Team Dashboard'}
      </div>

      {/* ═══ TODAY'S TEAM STATUS ═══ */}
      {(teamToday || []).length > 0 && (
        <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#154360' }}>Today — {now.format('DD MMM YYYY (dddd)')}</div>
            <Tag color="green">{presentCount} Present</Tag>
            <Tag color="red">{absentCount} Absent</Tag>
            <Tag color="blue">{checkedOutCount} Checked Out</Tag>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
            {(teamToday || []).sort((a: any, b: any) => (a.isPresent === b.isPresent ? 0 : a.isPresent ? -1 : 1)).map((m: any) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                borderRadius: 8, border: `1px solid ${m.isPresent ? '#d9f7be' : '#ffd8d8'}`,
                background: m.isPresent ? '#f6ffed' : '#fff2f0', cursor: 'pointer',
              }} onClick={() => goToPerson(m.id)}>
                <Avatar size={32} style={{ background: m.isPresent ? '#52c41a' : '#ff4d4f', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                  {(m.displayName || m.username)?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.displayName || m.username}
                  </div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>{m.designation || m.teamName || ''}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  {m.isPresent ? (
                    <div>
                      <div style={{ color: '#52c41a', fontWeight: 600 }}>In: {m.todayCheckin}</div>
                      {m.todayCheckout ? (
                        <div style={{ color: '#1677ff' }}>Out: {m.todayCheckout}</div>
                      ) : (
                        <div style={{ color: '#fa8c16', fontSize: 11 }}>Still working...</div>
                      )}
                    </div>
                  ) : (
                    <Tag color="red" style={{ margin: 0 }}>Absent</Tag>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ═══ DATE RANGE FILTER ═══ */}
      <div className="form-grid clean-form" style={{ maxWidth: 900, marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Period:</div>
          <RangePicker style={{ width: '100%' }} value={[dayjs(range[0]), dayjs(range[1])]}
            onChange={(_, d) => { if (d[0]) setRange([d[0], d[1]]); }} />
        </div>
        {isAdmin ? (
          <div>
            <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Team:</div>
            <Select placeholder="All Teams" allowClear style={{ width: '100%' }}
              showSearch optionFilterProp="label" onChange={(v) => setTeamId(v)}
              options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Scope:</div>
            <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>My Reportees Only</Tag>
          </div>
        )}
      </div>

      {/* ═══ ATTENDANCE SUMMARY TABLE ═══ */}
      {(empReport || []).length > 0 && (
        <Card title="Attendance Summary — This Period" size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>Team</th>
                  <th style={{ padding: '6px 12px', fontSize: 12, textAlign: 'center' }}>Days Present</th>
                  <th style={{ padding: '6px 12px', fontSize: 12, textAlign: 'center' }}>Total Hours</th>
                  <th style={{ padding: '6px 12px', fontSize: 12, textAlign: 'center' }}>Avg/Day</th>
                  <th style={{ padding: '6px 12px', fontSize: 12, textAlign: 'center' }}>Missed Checkouts</th>
                </tr>
              </thead>
              <tbody>
                {(empReport || []).filter((r: any) => r.totalDays > 0 || managerId).map((r: any, i: number) => {
                  const avg = r.totalDays > 0 ? (Number(r.totalHours) / r.totalDays).toFixed(1) : '0';
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => goToPerson(r.id)}>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, color: '#1677ff' }}>{r.displayName}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{r.teamName || '-'}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12, textAlign: 'center' }}>
                        <Tag color={r.totalDays > 0 ? 'green' : 'red'}>{r.totalDays}</Tag>
                      </td>
                      <td style={{ padding: '5px 12px', fontSize: 12, textAlign: 'center' }}>{r.totalHours}h</td>
                      <td style={{ padding: '5px 12px', fontSize: 12, textAlign: 'center' }}>
                        <Tag color={Number(avg) < 6 ? 'red' : Number(avg) < 8 ? 'orange' : 'green'}>{avg}h</Tag>
                      </td>
                      <td style={{ padding: '5px 12px', fontSize: 12, textAlign: 'center' }}>
                        {r.missedCheckouts > 0 ? <Tag color="error">{r.missedCheckouts}</Tag> : <span style={{ color: '#d9d9d9' }}>0</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ═══ ISSUE CARDS ═══ */}
      {isLoading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div> : data ? (
        <>
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #ff4d4f' }}>
                <Statistic title="No GTL Logged" value={data.noGtl.count} prefix={<FileTextOutlined />} valueStyle={{ color: '#ff4d4f' }} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #fa8c16' }}>
                <Statistic title="Missed Checkouts" value={data.missedCheckouts.count} prefix={<WarningOutlined />} valueStyle={{ color: '#fa8c16' }} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #722ed1' }}>
                <Statistic title="Low Hours" value={data.lowHours.count} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#722ed1' }} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #eb2f96' }}>
                <Statistic title="Suspicious (>12h)" value={data.suspicious.count} prefix={<AlertOutlined />} valueStyle={{ color: '#eb2f96' }} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #1677ff' }}>
                <Statistic title="Pending Approvals" value={data.pendingApprovals.count} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#1677ff' }} />
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card size="small" style={{ borderRadius: 10, borderLeft: '4px solid #f5222d' }}>
                <Statistic title="Late Arrivals" value={data.lateArrivals.count} prefix={<UserOutlined />} valueStyle={{ color: '#f5222d' }} />
              </Card>
            </Col>
          </Row>

          {data.noGtl.count === 0 && data.missedCheckouts.count === 0 && data.lowHours.count === 0 && data.pendingApprovals.count === 0 && data.suspicious.count === 0 && (
            <Card size="small" style={{ borderRadius: 10, marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f', textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 24 }}>&#10003;</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#52c41a' }}>No Issues Found</div>
              <div style={{ fontSize: 12, color: '#666' }}>Your team is on track for this period.</div>
            </Card>
          )}

          {/* Detail tables for each issue category */}
          {data.noGtl.users.length > 0 && (
            <Card title={<><FileTextOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />Present But No GTL ({data.noGtl.count})</>}
              size="small" style={{ borderRadius: 10, marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th><th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>Team</th><th style={{ padding: '6px 12px', fontSize: 12 }}>Days Present</th>
                </tr></thead>
                <tbody>{data.noGtl.users.map((u: any, i: number) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => goToPerson(u.id)}>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, color: '#1677ff' }}>{u.displayName}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.teamName || '-'}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color="green">{u.daysPresent}</Tag></td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          )}

          {data.missedCheckouts.users.length > 0 && (
            <Card title={<><WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />Missed Checkouts ({data.missedCheckouts.users.length})</>}
              size="small" style={{ borderRadius: 10, marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th><th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>Team</th><th style={{ padding: '6px 12px', fontSize: 12 }}>Count</th>
                </tr></thead>
                <tbody>{data.missedCheckouts.users.map((u: any, i: number) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => goToPerson(u.id)}>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, color: '#1677ff' }}>{u.displayName}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.teamName || '-'}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color="error">{u.missedCount}</Tag></td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          )}

          {data.lowHours.users.length > 0 && (
            <Card title={<><ClockCircleOutlined style={{ color: '#722ed1', marginRight: 8 }} />Low Hours ({data.lowHours.count})</>}
              size="small" style={{ borderRadius: 10, marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th><th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>Total Hours</th><th style={{ padding: '6px 12px', fontSize: 12 }}>Days</th>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>Avg/Day</th>
                </tr></thead>
                <tbody>{data.lowHours.users.map((u: any, i: number) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => goToPerson(u.id)}>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, color: '#1677ff' }}>{u.displayName}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.totalHours}h</td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.daysLogged}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color={Number(u.avgPerDay) < 4 ? 'red' : 'orange'}>{u.avgPerDay}h</Tag></td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          )}

          {data.pendingApprovals.users.length > 0 && (
            <Card title={<><ExclamationCircleOutlined style={{ color: '#1677ff', marginRight: 8 }} />Pending Approvals ({data.pendingApprovals.count})</>}
              size="small" style={{ borderRadius: 10, marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th><th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                  <th style={{ padding: '6px 12px', fontSize: 12, textAlign: 'center' }}>Pending</th>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>Oldest</th>
                </tr></thead>
                <tbody>{data.pendingApprovals.users.map((u: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => navigate('/admin/approvals')}>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, color: '#1677ff' }}>{u.displayName}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12, textAlign: 'center' }}><Tag color="blue">{u.pendingCount}</Tag></td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{dayjs(u.oldestEntry).format('DD MMM YY')}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          )}

          {data.lateArrivals.users.length > 0 && (
            <Card title={<><UserOutlined style={{ color: '#f5222d', marginRight: 8 }} />Late Arrivals ({data.lateArrivals.count})</>}
              size="small" style={{ borderRadius: 10, marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th><th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                  <th style={{ padding: '6px 12px', fontSize: 12 }}>Team</th><th style={{ padding: '6px 12px', fontSize: 12 }}>Count</th>
                </tr></thead>
                <tbody>{data.lateArrivals.users.map((u: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500 }}>{u.displayName}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.teamName || '-'}</td>
                    <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color="red">{u.lateCount}</Tag></td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
