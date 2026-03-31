import { useQuery } from '@tanstack/react-query';
import { Select, DatePicker, Button, Spin, Card, Row, Col, Statistic, Tag } from 'antd';
import { WarningOutlined, ClockCircleOutlined, ExclamationCircleOutlined, UserOutlined, FileTextOutlined, AlertOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import apiClient from '../../api/client';
import { getTeams } from '../../api/teams';

const { RangePicker } = DatePicker;

const getLeadInsights = (from: string, to: string, teamId?: number) =>
  apiClient.get('/attendance/lead-insights', { params: { from, to, teamId } }).then(r => r.data);

export default function LeadInsights() {
  const now = dayjs();
  const [range, setRange] = useState<[string, string]>([now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]);
  const [teamId, setTeamId] = useState<number | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leadInsights', range, teamId],
    queryFn: () => getLeadInsights(range[0], range[1], teamId),
    enabled: submitted,
  });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  return (
    <div>
      <div className="page-heading">Team Lead Insights</div>

      <div className="form-grid clean-form" style={{ maxWidth: 900, marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Date Range:</div>
          <RangePicker style={{ width: '100%' }} value={[dayjs(range[0]), dayjs(range[1])]}
            onChange={(_, d) => { if (d[0]) { setRange([d[0], d[1]]); setSubmitted(false); } }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Team:</div>
          <Select placeholder="All Teams" allowClear style={{ width: '100%' }}
            showSearch optionFilterProp="label"
            onChange={(v) => { setTeamId(v); setSubmitted(false); }}
            options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Button type="primary" className="submit-btn" onClick={() => setSubmitted(true)}>Analyze</Button>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : data ? (
        <>
          {/* Summary Cards */}
          <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
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
                <Statistic title="Below 9h Avg" value={data.lowHours.count} prefix={<UserOutlined />} valueStyle={{ color: '#f5222d' }} />
              </Card>
            </Col>
          </Row>

          {/* Detail Tables */}
          {data.noGtl.users.length > 0 && (
            <Card title={<><FileTextOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />Present But No GTL Logged ({data.noGtl.count})</>}
              size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#154360', color: '#fff' }}>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Team</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Days Present</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>GTL Entries</th>
                  </tr></thead>
                  <tbody>{data.noGtl.users.map((u: any, i: number) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500 }}>{u.displayName}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.teamName || '-'}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color="green">{u.daysPresent}</Tag></td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color="red">0</Tag></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}

          {data.missedCheckouts.users.length > 0 && (
            <Card title={<><WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />Frequent Missed Checkouts ({data.missedCheckouts.users.length} people)</>}
              size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#154360', color: '#fff' }}>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Team</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Missed Count</th>
                  </tr></thead>
                  <tbody>{data.missedCheckouts.users.map((u: any, i: number) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500 }}>{u.displayName}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.teamName || '-'}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color="error">{u.missedCount}</Tag></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}

          {data.lowHours.users.length > 0 && (
            <Card title={<><ClockCircleOutlined style={{ color: '#722ed1', marginRight: 8 }} />Below 9h Average ({data.lowHours.count} people)</>}
              size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#154360', color: '#fff' }}>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Team</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Total Hours</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Days Logged</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Avg/Day</th>
                  </tr></thead>
                  <tbody>{data.lowHours.users.map((u: any, i: number) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500 }}>{u.displayName}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.teamName || '-'}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.totalHours}h</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.daysLogged}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color={Number(u.avgPerDay) < 4 ? 'red' : 'orange'}>{u.avgPerDay}h</Tag></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}

          {data.pendingApprovals.users.length > 0 && (
            <Card title={<><ExclamationCircleOutlined style={{ color: '#1677ff', marginRight: 8 }} />Pending GTL Approvals ({data.pendingApprovals.count} entries)</>}
              size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#154360', color: '#fff' }}>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Team</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Pending</th>
                    <th style={{ padding: '6px 12px', fontSize: 12 }}>Oldest Entry</th>
                  </tr></thead>
                  <tbody>{data.pendingApprovals.users.slice(0, 30).map((u: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500 }}>{u.displayName}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{u.teamName || '-'}</td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color="blue">{u.pendingCount}</Tag></td>
                      <td style={{ padding: '5px 12px', fontSize: 12 }}>{dayjs(u.oldestEntry).format('DD MMM YY')}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
