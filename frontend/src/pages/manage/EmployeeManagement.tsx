import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, Button, message, Card, Tag, Input, Spin, Row, Col, Popconfirm } from 'antd';
import { EditOutlined, HistoryOutlined, UserOutlined, PlusOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import apiClient from '../../api/client';
import { getUsers } from '../../api/users';
import { getTeams } from '../../api/teams';
import { useAuthStore } from '../../store/authStore';

const ADMIN_ROLES = ['super admin', 'Admin', 'Hr Manager'];

const adminChange = (data: any) => apiClient.post('/users/admin-change-employee', data).then(r => r.data);
const getHistory = (userId: number) => apiClient.get('/users/employee-history', { params: { userId } }).then(r => r.data);
const getDesignations = () => apiClient.get('/users/all-designations').then(r => r.data);
const getEmployeeFullInfo = (userId: number) => apiClient.get('/users/employee-full-info', { params: { userId } }).then(r => r.data);
const getMyReportees = (managerId: number) => apiClient.get('/users/my-team-members', { params: { managerId } }).then(r => r.data);
const submitTeamChangeRequest = (data: any) => apiClient.post('/users/team-change-request', data).then(r => r.data);

export default function EmployeeManagement() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));
  const [userId, setUserId] = useState<number | undefined>();
  const [field, setField] = useState<'designation' | 'team' | 'reportTo'>('designation');
  const [newValue, setNewValue] = useState('');

  // For lead request flow
  const [requestReason, setRequestReason] = useState('');

  const { data: users } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 1000) });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });
  const { data: designations } = useQuery({ queryKey: ['allDesignations'], queryFn: getDesignations });
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['empHistory', userId],
    queryFn: () => getHistory(userId!),
    enabled: !!userId,
  });

  // Get full employee info (teams + managers from junction tables)
  const { data: fullInfo } = useQuery({
    queryKey: ['empFullInfo', userId],
    queryFn: () => getEmployeeFullInfo(userId!),
    enabled: !!userId,
  });

  // For leads: only show their reportees
  const { data: reportees } = useQuery({
    queryKey: ['myReportees', currentUser?.id],
    queryFn: () => getMyReportees(currentUser!.id),
    enabled: !isSuperAdmin && !!currentUser?.id,
  });

  // Employee list based on role
  const employeeList = isSuperAdmin
    ? (users?.items || []).filter((u: any) => u.isActive)
    : (reportees || []);

  const changeMut = useMutation({
    mutationFn: () => adminChange({ userId, fieldName: field, newValue }),
    onSuccess: (res: any) => {
      if (res.error) { message.error(res.error); return; }
      if (res.requestCreated) {
        message.success(res.message || 'Request submitted for admin approval!');
      } else {
        message.success(`Updated! ${field}: "${res.oldValue}" → "${res.newValue}"`);
      }
      setNewValue('');
      setRequestReason('');
      qc.invalidateQueries({ queryKey: ['empHistory'] });
      qc.invalidateQueries({ queryKey: ['empFullInfo'] });
      qc.invalidateQueries({ queryKey: ['usersAll'] });
      qc.invalidateQueries({ queryKey: ['teamChangeRequests'] });
    },
    onError: () => message.error('Failed'),
  });

  // Lead request mutation (for team/manager changes)
  const requestMut = useMutation({
    mutationFn: (data: any) => submitTeamChangeRequest(data),
    onSuccess: (res: any) => {
      if (res.error) { message.error(res.error); return; }
      message.success(res.message || 'Request submitted!');
      setNewValue('');
      setRequestReason('');
      qc.invalidateQueries({ queryKey: ['teamChangeRequests'] });
    },
    onError: () => message.error('Failed'),
  });

  // Admin: direct add team/manager
  const addTeamMut = useMutation({
    mutationFn: (data: { userId: number; teamId: number }) => apiClient.post('/users/team-membership', data).then(r => r.data),
    onSuccess: () => { message.success('Team added'); qc.invalidateQueries({ queryKey: ['empFullInfo'] }); },
  });
  const removeTeamMut = useMutation({
    mutationFn: (id: number) => apiClient.post(`/users/team-membership/${id}/remove`).then(r => r.data),
    onSuccess: () => { message.success('Team removed'); qc.invalidateQueries({ queryKey: ['empFullInfo'] }); },
  });
  const addManagerMut = useMutation({
    mutationFn: (data: { userId: number; managerId: number }) => apiClient.post('/users/manager', data).then(r => r.data),
    onSuccess: () => { message.success('Manager added'); qc.invalidateQueries({ queryKey: ['empFullInfo'] }); },
  });
  const removeManagerMut = useMutation({
    mutationFn: (id: number) => apiClient.post(`/users/manager/${id}/remove`).then(r => r.data),
    onSuccess: () => { message.success('Manager removed'); qc.invalidateQueries({ queryKey: ['empFullInfo'] }); },
  });

  // Add team/manager state
  const [addTeamId, setAddTeamId] = useState<number | undefined>();
  const [addManagerId, setAddManagerId] = useState<number | undefined>();

  // Calculate duration for each history entry
  const historyWithDuration = (history || []).map((h: any, i: number, arr: any[]) => {
    const nextChange = arr[i - 1];
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
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>
            Select Employee {!isSuperAdmin && <Tag color="orange" style={{ fontSize: 11 }}>Showing your reportees only</Tag>}:
          </div>
          <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Search by name..."
            value={userId} onChange={(v) => { setUserId(v); setNewValue(''); }}
            options={employeeList.map((u: any) => ({
              label: isSuperAdmin
                ? `${u.displayName || u.username} — ${u.team?.teamName || u.teamName || 'No Team'} — ${u.designation?.name || u.designation || 'No Designation'}`
                : `${u.displayName || u.username} — ${u.teamName || 'No Team'} — ${u.designation || 'No Designation'}`,
              value: u.id,
            }))} />
        </div>
      </div>

      {fullInfo && (
        <>
          {/* Current info — multi-team & multi-manager */}
          <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Name</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{fullInfo.displayName}</div>
                <div style={{ fontSize: 12, color: '#666' }}>@{fullInfo.username}</div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Teams ({(fullInfo.allTeams || []).length})</div>
                <div style={{ marginTop: 4 }}>
                  {(fullInfo.allTeams || []).length === 0 ? <Tag>None</Tag> :
                    (fullInfo.allTeams || []).map((t: any) => (
                      <div key={t.teamId} style={{ marginBottom: 4 }}>
                        <Tag color={t.isPrimary ? 'blue' : 'default'} style={{ fontSize: 13, padding: '2px 8px' }}>
                          {t.teamName} {t.isPrimary && '★'}
                        </Tag>
                        {isSuperAdmin && (
                          <Popconfirm title="Remove from this team?" onConfirm={() => removeTeamMut.mutate(t.id)}>
                            <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 11, marginLeft: 4 }} />
                          </Popconfirm>
                        )}
                      </div>
                    ))}
                </div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Managers ({(fullInfo.allManagers || []).length})</div>
                <div style={{ marginTop: 4 }}>
                  {(fullInfo.allManagers || []).length === 0 ? <Tag>None</Tag> :
                    (fullInfo.allManagers || []).map((m: any) => (
                      <div key={m.managerId} style={{ marginBottom: 4 }}>
                        <Tag color={m.isPrimary ? 'geekblue' : 'default'} style={{ fontSize: 13, padding: '2px 8px' }}>
                          {m.managerName} {m.isPrimary && '★'}
                        </Tag>
                        {isSuperAdmin && (
                          <Popconfirm title="Remove this manager?" onConfirm={() => removeManagerMut.mutate(m.id)}>
                            <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 11, marginLeft: 4 }} />
                          </Popconfirm>
                        )}
                      </div>
                    ))}
                </div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Designation</div>
                <Tag color="purple" style={{ fontSize: 14, padding: '2px 10px', marginTop: 4 }}>{fullInfo.designation?.name || 'None'}</Tag>
              </Col>
            </Row>
          </Card>

          {/* Admin: Quick add team/manager */}
          {isSuperAdmin && (
            <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}><PlusOutlined /> Add to Team</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Select showSearch optionFilterProp="label" style={{ flex: 1 }} placeholder="Select team..."
                      value={addTeamId} onChange={setAddTeamId}
                      options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />
                    <Button type="primary" disabled={!addTeamId}
                      onClick={() => { addTeamMut.mutate({ userId: userId!, teamId: addTeamId! }); setAddTeamId(undefined); }}>
                      Add
                    </Button>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}><PlusOutlined /> Add Manager</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Select showSearch optionFilterProp="label" style={{ flex: 1 }} placeholder="Select manager..."
                      value={addManagerId} onChange={setAddManagerId}
                      options={(users?.items || []).filter((u: any) => u.isActive && u.id !== userId).map((u: any) => ({
                        label: `${u.displayName || u.username} (${u.username})`, value: u.id,
                      }))} />
                    <Button type="primary" disabled={!addManagerId}
                      onClick={() => { addManagerMut.mutate({ userId: userId!, managerId: addManagerId! }); setAddManagerId(undefined); }}>
                      Add
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          {/* Change form */}
          <Card title={<><EditOutlined style={{ marginRight: 8 }} />{isSuperAdmin ? 'Make a Change' : 'Change Designation / Request Changes'}</>} size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
            <div className="form-grid clean-form">
              <div>
                <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>What to change:</div>
                <Select value={field} onChange={(v: any) => { setField(v); setNewValue(''); }} style={{ width: '100%' }}
                  options={[
                    { label: 'Designation / Role', value: 'designation' },
                    // Leads can also request team/manager changes (goes through approval)
                    { label: isSuperAdmin ? 'Team (direct)' : 'Team (request)', value: 'team' },
                    { label: isSuperAdmin ? 'Reports To (direct)' : 'Reports To (request)', value: 'reportTo' },
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
                  <Select showSearch allowClear optionFilterProp="label" style={{ width: '100%' }} placeholder="Select team..."
                    value={newValue || undefined} onChange={(v) => setNewValue(v)}
                    options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.teamName }))} />
                ) : (
                  <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Select manager..."
                    value={newValue || undefined} onChange={(v) => setNewValue(v)}
                    options={(users?.items || []).filter((u: any) => u.isActive && u.id !== userId).map((u: any) => ({
                      label: `${u.displayName || u.username} (${u.username})`, value: u.displayName || u.username,
                    }))} />
                )}
              </div>
            </div>

            {/* Reason field for lead requests */}
            {!isSuperAdmin && (field === 'team' || field === 'reportTo') && (
              <div style={{ marginTop: 12 }}>
                <Tag color="orange" style={{ marginBottom: 8 }}>This will create a request for admin approval</Tag>
                <Input.TextArea rows={2} placeholder="Reason for this change (optional)..."
                  value={requestReason} onChange={(e) => setRequestReason(e.target.value)} />
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              {!isSuperAdmin && (field === 'team' || field === 'reportTo') ? (
                <Button type="primary" className="submit-btn" disabled={!newValue} loading={requestMut.isPending}
                  icon={<SendOutlined />}
                  onClick={() => requestMut.mutate({
                    requestType: field === 'team' ? 'add_to_team' : 'add_manager',
                    targetUserId: userId,
                    teamName: field === 'team' ? newValue : undefined,
                    managerName: field === 'reportTo' ? newValue : undefined,
                    reason: requestReason || undefined,
                  })}>
                  Submit Request
                </Button>
              ) : (
                <Button type="primary" className="submit-btn" disabled={!newValue} loading={changeMut.isPending}
                  onClick={() => changeMut.mutate()}>
                  Apply Change
                </Button>
              )}
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
                    {historyWithDuration.map((h: any) => (
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
