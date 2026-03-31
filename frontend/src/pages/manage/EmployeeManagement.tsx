import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, Button, message, Card, Tag, Input, Spin, Row, Col, Statistic } from 'antd';
import { EditOutlined, HistoryOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import apiClient from '../../api/client';
import { getUsers } from '../../api/users';
import { getTeams } from '../../api/teams';

const adminChange = (data: any) => apiClient.post('/users/admin-change-employee', data).then(r => r.data);
const getHistory = (userId: number) => apiClient.get('/users/employee-history', { params: { userId } }).then(r => r.data);
const getDesignations = () => apiClient.get('/users/all-designations').then(r => r.data);

export default function EmployeeManagement() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<number | undefined>();
  const [field, setField] = useState<'designation' | 'team' | 'reportTo'>('designation');
  const [newValue, setNewValue] = useState('');

  const { data: users } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 1000) });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });
  const { data: designations } = useQuery({ queryKey: ['allDesignations'], queryFn: getDesignations });
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['empHistory', userId],
    queryFn: () => getHistory(userId!),
    enabled: !!userId,
  });

  // Get selected user info
  const selectedUser = (users?.items || []).find((u: any) => u.id === userId);

  const changeMut = useMutation({
    mutationFn: () => adminChange({ userId, fieldName: field, newValue }),
    onSuccess: (res: any) => {
      if (res.error) { message.error(res.error); return; }
      message.success(`Updated! ${field}: "${res.oldValue}" → "${res.newValue}"`);
      setNewValue('');
      qc.invalidateQueries({ queryKey: ['empHistory'] });
      qc.invalidateQueries({ queryKey: ['usersAll'] });
    },
    onError: () => message.error('Failed'),
  });

  // Calculate duration for each history entry
  const historyWithDuration = (history || []).map((h: any, i: number, arr: any[]) => {
    const nextChange = arr[i - 1]; // previous in array = next in time (sorted DESC)
    const fromDate = dayjs(h.effective_date);
    const toDate = nextChange ? dayjs(nextChange.effective_date) : dayjs();
    const months = toDate.diff(fromDate, 'month');
    const years = Math.floor(months / 12);
    const rem = months % 12;
    const duration = years > 0 ? `${years}y ${rem}m` : `${months}m`;
    return { ...h, duration, fromDate: fromDate.format('DD MMM YYYY'), toDate: nextChange ? dayjs(nextChange.effective_date).format('DD MMM YYYY') : 'Present' };
  });

  return (
    <div>
      <div className="page-heading"><UserOutlined style={{ marginRight: 8 }} />Employee Management</div>

      {/* Employee selector */}
      <div className="form-grid clean-form" style={{ maxWidth: 900, marginBottom: 20 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Select Employee:</div>
          <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Search by name..."
            value={userId} onChange={(v) => { setUserId(v); setNewValue(''); }}
            options={(users?.items || []).filter((u: any) => u.isActive).map((u: any) => ({
              label: `${u.displayName || u.username} — ${u.team?.teamName || 'No Team'} — ${u.designation?.name || 'No Designation'}`,
              value: u.id,
            }))} />
        </div>
      </div>

      {selectedUser && (
        <>
          {/* Current info */}
          <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Name</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedUser.displayName}</div>
                <div style={{ fontSize: 12, color: '#666' }}>@{selectedUser.username}</div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Current Team</div>
                <Tag color="blue" style={{ fontSize: 14, padding: '2px 10px', marginTop: 4 }}>{selectedUser.team?.teamName || 'None'}</Tag>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Current Designation</div>
                <Tag color="purple" style={{ fontSize: 14, padding: '2px 10px', marginTop: 4 }}>{selectedUser.designation?.name || 'None'}</Tag>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Reports To</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
                  {(users?.items || []).find((u: any) => u.id === selectedUser.reportTo)?.displayName || 'None'}
                </div>
              </Col>
            </Row>
          </Card>

          {/* Change form */}
          <Card title={<><EditOutlined style={{ marginRight: 8 }} />Make a Change</>} size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
            <div className="form-grid clean-form">
              <div>
                <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>What to change:</div>
                <Select value={field} onChange={(v: any) => { setField(v); setNewValue(''); }} style={{ width: '100%' }}
                  options={[
                    { label: 'Designation / Role', value: 'designation' },
                    { label: 'Team', value: 'team' },
                    { label: 'Reports To (Manager)', value: 'reportTo' },
                  ]} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>New Value:</div>
                {field === 'designation' ? (
                  <Select showSearch allowClear style={{ width: '100%' }} placeholder="Select or type..."
                    value={newValue || undefined} onChange={(v) => setNewValue(v)}
                    options={(designations || []).map((d: string) => ({ label: d, value: d }))}
                    dropdownRender={(menu) => (
                      <>{menu}<div style={{ padding: '6px 10px', borderTop: '1px solid #f0f0f0' }}>
                        <Input size="small" placeholder="Type new designation..."
                          onPressEnter={(e) => setNewValue((e.target as HTMLInputElement).value)} />
                      </div></>
                    )} />
                ) : field === 'team' ? (
                  <Select showSearch allowClear optionFilterProp="label" style={{ width: '100%' }} placeholder="Select or type..."
                    value={newValue || undefined} onChange={(v) => setNewValue(v)}
                    options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.teamName }))}
                    dropdownRender={(menu) => (
                      <>{menu}<div style={{ padding: '6px 10px', borderTop: '1px solid #f0f0f0' }}>
                        <Input size="small" placeholder="Type new team name..."
                          onPressEnter={(e) => setNewValue((e.target as HTMLInputElement).value)} />
                      </div></>
                    )} />
                ) : (
                  <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Select manager..."
                    value={newValue || undefined} onChange={(v) => setNewValue(v)}
                    options={(users?.items || []).filter((u: any) => u.isActive && u.id !== userId).map((u: any) => ({
                      label: `${u.displayName || u.username} (${u.username})`, value: u.displayName || u.username,
                    }))} />
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button type="primary" className="submit-btn" disabled={!newValue} loading={changeMut.isPending}
                onClick={() => changeMut.mutate()}>
                Apply Change
              </Button>
            </div>
          </Card>

          {/* History */}
          <Card title={<><HistoryOutlined style={{ marginRight: 8 }} />Change History — How long in each role/team</>}
            size="small" style={{ borderRadius: 10 }}>
            {loadingHistory ? <Spin /> : (historyWithDuration || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#8c8c8c' }}>No change history yet. Changes made here will be tracked.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#154360', color: '#fff' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Field</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>From</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>To</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Period</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Duration</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyWithDuration.map((h: any, i: number) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>
                          <Tag color={h.field_name === 'designation' ? 'purple' : h.field_name === 'team' ? 'blue' : 'geekblue'}>
                            {h.field_name === 'designation' ? 'Designation' : h.field_name === 'team' ? 'Team' : 'Manager'}
                          </Tag>
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 13, color: '#999', textDecoration: 'line-through' }}>{h.old_value || '-'}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600 }}>{h.new_value}</td>
                        <td style={{ padding: '7px 12px', fontSize: 12, color: '#666' }}>{h.fromDate} → {h.toDate}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>
                          <Tag color={h.toDate === 'Present' ? 'green' : 'default'}>{h.duration}</Tag>
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{h.changerName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
