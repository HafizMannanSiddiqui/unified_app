import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Input, Select, Spin, Modal, Button, message, Switch, Divider } from 'antd';
import { SearchOutlined, EditOutlined, UserOutlined, PlusOutlined, HistoryOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getUsers } from '../../api/users';
import { getTeams } from '../../api/teams';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const getRoles = () => apiClient.get('/roles').then(r => r.data);
const updateUser = (id: number, data: any) => apiClient.put(`/users/${id}`, data).then(r => r.data);
const getEmployeeFullInfo = (userId: number) => apiClient.get('/users/employee-full-info', { params: { userId } }).then(r => r.data);
const addTeamMembership = (data: any) => apiClient.post('/users/team-membership', data).then(r => r.data);
const removeTeamMembership = (id: number) => apiClient.post(`/users/team-membership/${id}/remove`).then(r => r.data);
const addManager = (data: any) => apiClient.post('/users/manager', data).then(r => r.data);
const removeManager = (id: number) => apiClient.post(`/users/manager/${id}/remove`).then(r => r.data);
const createTeam = (data: any) => apiClient.post('/teams', data).then(r => r.data);
const getEmployeeHistory = (userId: number) => apiClient.get('/users/employee-history', { params: { userId } }).then(r => r.data);
// Get people who report to this user (subordinates)
const getSubordinates = (managerId: number) => apiClient.get('/users/my-team-members', { params: { managerId } }).then(r => r.data);
// Add someone as a reportee of this lead = add this lead as their manager
const addReportee = (leadId: number, userId: number) => apiClient.post('/users/manager', { userId, managerId: leadId }).then(r => r.data);
const removeReportee = (userId: number, leadId: number) =>
  apiClient.get('/users/my-teams', { params: { userId } }).then(r => {
    const mgr = (r.data.managers || []).find((m: any) => m.managerId === leadId);
    if (mgr) return apiClient.post(`/users/manager/${mgr.id}/remove`).then(r2 => r2.data);
  });

const SUPER_ADMIN_ROLES = ['super admin'];

export default function UserList() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.roles?.some((r: any) => SUPER_ADMIN_ROLES.includes(r.name));
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [teamFilter, setTeamFilter] = useState<string | undefined>(undefined);
  const [editUser, setEditUser] = useState<any>(null);
  const [sortField, setSortField] = useState<string>('displayName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Edit form state
  const [editRoleIds, setEditRoleIds] = useState<number[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [addTeamId, setAddTeamId] = useState<number | undefined>();
  const [addManagerId, setAddManagerId] = useState<number | undefined>();
  const [addReporteeId, setAddReporteeId] = useState<number | undefined>();
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamParentId, setNewTeamParentId] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['users', activeFilter, search],
    queryFn: () => getUsers(1, 5000, activeFilter !== undefined ? activeFilter === 'true' : undefined, search || undefined),
  });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });
  const { data: roles } = useQuery({ queryKey: ['allRoles'], queryFn: getRoles });

  // Load full info (teams + managers) for selected user
  const { data: fullInfo, refetch: refetchFullInfo } = useQuery({
    queryKey: ['editUserFullInfo', editUser?.id],
    queryFn: () => getEmployeeFullInfo(editUser!.id),
    enabled: !!editUser?.id,
  });

  // People who report to this user (subordinates) — only loaded if they have Team Lead role
  const isEditUserLead = editUser && (roles || []).some((r: any) => r.name === 'Team Lead' && editRoleIds.includes(r.id));
  const { data: subordinates, refetch: refetchSubs } = useQuery({
    queryKey: ['subordinates', editUser?.id],
    queryFn: () => getSubordinates(editUser!.id),
    enabled: !!editUser?.id && !!isEditUserLead,
  });

  // Employee change history
  const { data: history } = useQuery({
    queryKey: ['empHistory', editUser?.id],
    queryFn: () => getEmployeeHistory(editUser!.id),
    enabled: !!editUser?.id,
  });

  // Create team inline
  const createTeamMut = useMutation({
    mutationFn: () => createTeam({ teamName: newTeamName, parentId: newTeamParentId || null, isActive: true }),
    onSuccess: (created: any) => {
      message.success(`Team "${created.teamName}" created`);
      setNewTeamName('');
      setNewTeamParentId(undefined);
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['allTeams'] });
    },
  });

  const updateMut = useMutation({
    mutationFn: (vals: any) => updateUser(editUser.id, vals),
    onSuccess: () => {
      message.success('User updated');
      qc.invalidateQueries({ queryKey: ['users'] });
      refetchFullInfo();
    },
    onError: () => message.error('Failed to update'),
  });

  const addTeamMut = useMutation({
    mutationFn: () => addTeamMembership({ userId: editUser.id, teamId: addTeamId }),
    onSuccess: () => { message.success('Team added'); setAddTeamId(undefined); refetchFullInfo(); qc.invalidateQueries({ queryKey: ['users'] }); },
  });
  const removeTeamMut = useMutation({
    mutationFn: (id: number) => removeTeamMembership(id),
    onSuccess: () => { message.success('Team removed'); refetchFullInfo(); qc.invalidateQueries({ queryKey: ['users'] }); },
  });
  const addManagerMut = useMutation({
    mutationFn: () => addManager({ userId: editUser.id, managerId: addManagerId }),
    onSuccess: () => { message.success('Manager added'); setAddManagerId(undefined); refetchFullInfo(); },
  });
  const removeManagerMut = useMutation({
    mutationFn: (id: number) => removeManager(id),
    onSuccess: () => { message.success('Manager removed'); refetchFullInfo(); },
  });

  const addReporteeMut = useMutation({
    mutationFn: () => addReportee(editUser.id, addReporteeId!),
    onSuccess: () => { message.success('Reportee added'); setAddReporteeId(undefined); refetchSubs(); },
  });
  const removeReporteeMut = useMutation({
    mutationFn: (userId: number) => removeReportee(userId, editUser.id),
    onSuccess: () => { message.success('Reportee removed'); refetchSubs(); },
  });

  const openEdit = (u: any) => {
    setEditUser(u);
    setEditRoleIds(u.roles?.map((r: any) => r.role?.id).filter(Boolean) || []);
    setEditActive(u.isActive);
    setAddTeamId(undefined);
    setAddManagerId(undefined);
    setAddReporteeId(undefined);
  };

  const saveRolesAndStatus = () => {
    updateMut.mutate({ roleIds: editRoleIds, isActive: editActive });
  };

  // Client-side filters + sorting
  let items = data?.items || [];
  if (roleFilter) items = items.filter((u: any) => u.roles?.some((r: any) => r.role?.name === roleFilter));
  if (teamFilter) items = items.filter((u: any) => String(u.teamId) === teamFilter);

  // Sorting
  items = [...items].sort((a: any, b: any) => {
    let va = '', vb = '';
    if (sortField === 'id') return sortDir === 'asc' ? a.id - b.id : b.id - a.id;
    if (sortField === 'displayName') { va = a.displayName || ''; vb = b.displayName || ''; }
    else if (sortField === 'username') { va = a.username || ''; vb = b.username || ''; }
    else if (sortField === 'team') { va = a.team?.teamName || ''; vb = b.team?.teamName || ''; }
    else if (sortField === 'designation') { va = a.designation?.name || ''; vb = b.designation?.name || ''; }
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };
  const sortIcon = (field: string) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const allRoleNames = new Set<string>();
  (data?.items || []).forEach((u: any) => u.roles?.forEach((r: any) => { if (r.role?.name) allRoleNames.add(r.role.name); }));

  const roleColor = (name: string) =>
    name === 'super admin' ? 'red' : name === 'Admin' ? 'volcano' : name === 'Team Lead' ? 'green'
    : name === 'Application Manager' ? 'purple' : name === 'Hr Manager' ? 'magenta' : 'blue';

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><UserOutlined style={{ marginRight: 8 }} />Users ({data?.total || 0})</div>
        <div className="page-filters">
          <Input prefix={<SearchOutlined />} placeholder="Search name, email, username..."
            allowClear onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260 }} />
          <Select placeholder="Role" allowClear style={{ width: 150 }}
            onChange={(v) => setRoleFilter(v)}
            options={[...allRoleNames].sort().map(r => ({ label: r, value: r }))} />
          <Select placeholder="Team" allowClear showSearch optionFilterProp="label" style={{ width: 180 }}
            onChange={(v) => setTeamFilter(v)}
            options={(teams || []).map((t: any) => ({ label: t.teamName, value: String(t.id) }))} />
          <Select placeholder="Status" allowClear style={{ width: 110 }}
            onChange={(v) => { setActiveFilter(v); setPage(1); }}
            options={[{ label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }]} />
        </div>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 50, cursor: 'pointer' }} onClick={() => toggleSort('id')}>ID{sortIcon('id')}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={() => toggleSort('username')}>Username{sortIcon('username')}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={() => toggleSort('displayName')}>Display Name{sortIcon('displayName')}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Email</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={() => toggleSort('team')}>Team{sortIcon('team')}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }} onClick={() => toggleSort('designation')}>Designation{sortIcon('designation')}</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Roles</th>
                {isSuperAdmin && <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Phone</th>}
                {isSuperAdmin && <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>RFID</th>}
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Status</th>
                {isSuperAdmin && <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center', width: 60 }}>Edit</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No users found</td></tr>
              ) : items.map((u: any) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '7px 12px', fontSize: 13, color: '#8c8c8c' }}>{u.id}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{u.username}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>{u.displayName || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{u.team?.teamName || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{u.designation?.name || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>
                    {u.roles?.map((r: any) => (
                      <Tag key={r.role?.id} color={roleColor(r.role?.name)} style={{ fontSize: 11 }}>{r.role?.name}</Tag>
                    ))}
                  </td>
                  {isSuperAdmin && <td style={{ padding: '7px 12px', fontSize: 12 }}>{u.profile?.contactNo || '-'}</td>}
                  {isSuperAdmin && <td style={{ padding: '7px 12px', fontSize: 12 }}>{u.deviceUser?.cardNo || '-'}</td>}
                  <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                    <Tag color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Tag>
                  </td>
                  {isSuperAdmin && <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                    <EditOutlined style={{ color: '#1677ff', cursor: 'pointer', fontSize: 16 }} onClick={() => openEdit(u)} />
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}

      {/* Edit User Modal — full control for super admin */}
      <Modal title={editUser ? `Edit: ${editUser.displayName || editUser.username}` : 'Edit User'}
        open={!!editUser} onCancel={() => setEditUser(null)} footer={null} width={600}>
        {editUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>

            {/* Section 1: Roles & Status */}
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#154360', marginBottom: 12 }}>Roles & Status</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6, fontSize: 13 }}>
                  Roles <span style={{ fontSize: 11, color: '#8c8c8c' }}>(make Lead, Admin, etc.)</span>
                </div>
                <Select mode="multiple" style={{ width: '100%' }} placeholder="Select roles..."
                  value={editRoleIds} onChange={setEditRoleIds}
                  options={(roles || []).map((r: any) => ({ label: r.name, value: r.id }))} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: '#1C2833', fontSize: 13 }}>Active:</div>
                <Switch checked={editActive} onChange={setEditActive} />
                <Tag color={editActive ? 'green' : 'red'}>{editActive ? 'Active' : 'Inactive'}</Tag>
              </div>
              <Button type="primary" size="small" onClick={saveRolesAndStatus} loading={updateMut.isPending}>
                Save Roles & Status
              </Button>
            </div>

            <Divider style={{ margin: '4px 0' }} />

            {/* Section 2: Teams (multi-team) */}
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#154360', marginBottom: 12 }}>
                Teams ({(fullInfo?.allTeams || []).length})
              </div>
              {(fullInfo?.allTeams || []).length === 0 ? (
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 8 }}>No teams assigned</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {(fullInfo?.allTeams || []).map((t: any) => (
                    <Tag key={t.teamId} color={t.isPrimary ? 'blue' : 'default'}
                      closable onClose={(e) => { e.preventDefault(); removeTeamMut.mutate(t.id); }}
                      style={{ fontSize: 13, padding: '2px 10px' }}>
                      {t.teamName} {t.isPrimary ? '★' : ''}
                    </Tag>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Select showSearch optionFilterProp="label" style={{ flex: 1 }} placeholder="Add to existing team..."
                  value={addTeamId} onChange={setAddTeamId}
                  options={(teams || []).map((t: any) => ({
                    label: t.parentId ? `  └ ${t.teamName} (${(teams || []).find((p: any) => p.id === t.parentId)?.teamName || ''})` : t.teamName,
                    value: t.id,
                  }))} />
                <Button type="primary" icon={<PlusOutlined />} disabled={!addTeamId}
                  loading={addTeamMut.isPending} onClick={() => addTeamMut.mutate()}>Add</Button>
              </div>
              {/* Inline create new team/sub-team */}
              <div style={{ background: '#fff', border: '1px dashed #d9d9d9', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Or create a new team / sub-team:</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Input size="small" placeholder="New team name..." value={newTeamName} onChange={e => setNewTeamName(e.target.value)} style={{ width: 160 }} />
                  <Select size="small" placeholder="Parent (optional)" allowClear style={{ width: 160 }}
                    showSearch optionFilterProp="label" value={newTeamParentId} onChange={setNewTeamParentId}
                    options={(teams || []).filter((t: any) => !t.parentId).map((t: any) => ({ label: t.teamName, value: t.id }))} />
                  <Button size="small" type="dashed" icon={<PlusOutlined />} disabled={!newTeamName.trim()}
                    loading={createTeamMut.isPending} onClick={() => createTeamMut.mutate()}>Create</Button>
                </div>
              </div>
            </div>

            {/* Section 3: Lead Configuration — only when Team Lead role is selected */}
            {isEditUserLead && (
              <div style={{ background: '#f0f7ff', border: '1px solid #91caff', borderRadius: 10, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#154360', marginBottom: 4 }}>
                  Lead Configuration
                </div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                  This person is a Team Lead. Configure which team they lead and who reports to them.
                </div>

                {/* Which teams they lead (shown from their team memberships) */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6, fontSize: 13 }}>
                    Leads Team(s):
                  </div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>
                    The teams assigned above are the teams this lead belongs to. Add sub-teams to specify exactly which sub-team they lead.
                  </div>
                  {(fullInfo?.allTeams || []).map((t: any) => (
                    <Tag key={t.teamId} color="blue" style={{ fontSize: 13, padding: '2px 10px', marginBottom: 4 }}>
                      {t.teamName} {t.roleInTeam ? `(${t.roleInTeam})` : ''}
                    </Tag>
                  ))}
                </div>

                {/* Who reports to this lead */}
                <div>
                  <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6, fontSize: 13 }}>
                    People Reporting to This Lead ({(subordinates || []).length}):
                  </div>
                  {(subordinates || []).length === 0 ? (
                    <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 8 }}>No one reports to this lead yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {(subordinates || []).map((s: any) => (
                        <Tag key={s.id} color="green"
                          closable onClose={(e) => { e.preventDefault(); removeReporteeMut.mutate(s.id); }}
                          style={{ fontSize: 12, padding: '2px 8px' }}>
                          {s.displayName || s.username}
                        </Tag>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Select showSearch optionFilterProp="label" style={{ flex: 1 }} placeholder="Add reportee..."
                      value={addReporteeId} onChange={setAddReporteeId}
                      options={(data?.items || []).filter((u: any) =>
                        u.isActive && u.id !== editUser.id && !(subordinates || []).some((s: any) => s.id === u.id)
                      ).map((u: any) => ({
                        label: `${u.displayName || u.username} — ${u.team?.teamName || ''}`, value: u.id,
                      }))} />
                    <Button type="primary" icon={<PlusOutlined />} disabled={!addReporteeId}
                      loading={addReporteeMut.isPending} onClick={() => addReporteeMut.mutate()}>Add</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Managers (multi-manager) */}
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#154360', marginBottom: 12 }}>
                Reports To ({(fullInfo?.allManagers || []).length})
              </div>
              {(fullInfo?.allManagers || []).length === 0 ? (
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 8 }}>No managers assigned</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {(fullInfo?.allManagers || []).map((m: any) => (
                    <Tag key={m.managerId} color={m.isPrimary ? 'geekblue' : 'default'}
                      closable onClose={(e) => { e.preventDefault(); removeManagerMut.mutate(m.id); }}
                      style={{ fontSize: 13, padding: '2px 10px' }}>
                      {m.managerName} {m.isPrimary ? '★' : ''}
                    </Tag>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Select showSearch optionFilterProp="label" style={{ flex: 1 }} placeholder="Add manager..."
                  value={addManagerId} onChange={setAddManagerId}
                  options={(data?.items || []).filter((u: any) => u.isActive && u.id !== editUser.id).map((u: any) => ({
                    label: `${u.displayName || u.username} (${u.username})`, value: u.id,
                  }))} />
                <Button type="primary" icon={<PlusOutlined />} disabled={!addManagerId}
                  loading={addManagerMut.isPending} onClick={() => addManagerMut.mutate()}>Add</Button>
              </div>
            </div>

            <Divider style={{ margin: '4px 0' }} />

            {/* Section 5: Change History */}
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#154360', marginBottom: 12 }}>
                <HistoryOutlined style={{ marginRight: 6 }} />Change History
              </div>
              {(history || []).length === 0 ? (
                <div style={{ color: '#8c8c8c', fontSize: 13 }}>No changes recorded yet</div>
              ) : (
                <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                  {(history || []).map((h: any) => {
                    const colors: Record<string, string> = {
                      roles: 'red', designation: 'purple', team: 'blue', team_added: 'green',
                      team_removed: 'orange', manager_added: 'geekblue', manager_removed: 'volcano',
                      reportTo: 'geekblue', status: 'magenta',
                    };
                    const labels: Record<string, string> = {
                      roles: 'Roles', designation: 'Designation', team: 'Team', team_added: 'Team Added',
                      team_removed: 'Team Removed', manager_added: 'Manager Added', manager_removed: 'Manager Removed',
                      reportTo: 'Manager', status: 'Status',
                    };
                    return (
                      <div key={h.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <Tag color={colors[h.field_name] || 'default'} style={{ fontSize: 11, flexShrink: 0 }}>
                          {labels[h.field_name] || h.field_name}
                        </Tag>
                        <div style={{ flex: 1, fontSize: 12 }}>
                          {h.old_value && <span style={{ color: '#999', textDecoration: 'line-through' }}>{h.old_value}</span>}
                          {h.old_value && h.new_value ? ' → ' : ''}
                          {h.new_value && <span style={{ fontWeight: 600 }}>{h.new_value}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#8c8c8c', whiteSpace: 'nowrap' }}>
                          {dayjs(h.effective_date).format('DD MMM YY')} by {h.changerName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
}
