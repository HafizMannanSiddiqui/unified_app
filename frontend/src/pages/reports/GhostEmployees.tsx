import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, Tag, Spin, Popconfirm, message, Statistic, Card, Row, Col } from 'antd';
import { WarningOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import apiClient from '../../api/client';

const getGhosts = (months: number) => apiClient.get('/attendance/ghost-employees', { params: { months } }).then(r => r.data);
const deactivate = (userId: number) => apiClient.post('/attendance/deactivate-user', { userId }).then(r => r.data);

export default function GhostEmployees() {
  const [months, setMonths] = useState(6);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['ghosts', months],
    queryFn: () => getGhosts(months),
  });

  const deactMut = useMutation({
    mutationFn: deactivate,
    onSuccess: () => { message.success('Employee deactivated'); qc.invalidateQueries({ queryKey: ['ghosts'] }); },
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><WarningOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />Ghost Employees</div>
        <div className="page-filters">
          <span style={{ fontSize: 13, color: '#666' }}>No activity in last</span>
          <Select value={months} onChange={setMonths} style={{ width: 130 }}
            options={[{ label: '3 months', value: 3 }, { label: '6 months', value: 6 }, { label: '12 months', value: 12 }]} />
        </div>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #ff4d4f' }}>
            <Statistic title="Ghost Accounts" value={(data || []).length} prefix={<UserOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #fa8c16' }}>
            <Statistic title="Likely Left Company" value={(data || []).filter((u: any) => !u.lastAttendance && !u.lastGtl).length} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #1677ff' }}>
            <Statistic title="Had Past Activity" value={(data || []).filter((u: any) => u.lastAttendance || u.lastGtl).length} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
      </Row>

      <div style={{ background: '#fff7e6', border: '1px solid #ffe58f', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13 }}>
        <WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
        These employees are marked <strong>active</strong> but have no attendance and no GTL entries in the last {months} months.
        Review and deactivate accounts of employees who have left.
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Name</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Email</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Team</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Designation</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Last Attendance</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Last GTL</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((u: any, i: number) => {
                const neverActive = !u.lastAttendance && !u.lastGtl;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0', background: neverActive ? '#fff2f0' : undefined }}>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>
                      {u.displayName || u.username}
                      {neverActive && <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>Never Active</Tag>}
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 12, color: '#666' }}>{u.email || '-'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{u.teamName || '-'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{u.designation || '-'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>
                      {u.lastAttendance ? dayjs(u.lastAttendance).format('DD MMM YY') : <Tag color="red">Never</Tag>}
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>
                      {u.lastGtl ? dayjs(u.lastGtl).format('DD MMM YY') : <Tag color="red">Never</Tag>}
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                      <Popconfirm title="Deactivate this employee?" description="This will mark them as inactive. They won't appear in reports or directory."
                        onConfirm={() => deactMut.mutate(u.id)} okText="Deactivate" okType="danger">
                        <DeleteOutlined className="action-delete" />
                      </Popconfirm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
