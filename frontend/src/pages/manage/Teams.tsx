import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Button, Modal, Form, Input, Switch, Select, message, Avatar, Spin } from 'antd';
import { PlusOutlined, EditOutlined, TeamOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getTeams } from '../../api/teams';
import apiClient from '../../api/client';

const getTeamMembers = (teamId: number) =>
  apiClient.get('/users/directory', { params: { teamId } }).then(r => r.data);

export default function Teams() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; record?: any }>({ open: false });
  const [form] = Form.useForm();
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);

  const { data: allTeams, isLoading } = useQuery({ queryKey: ['allTeams'], queryFn: () => getTeams() });

  // Load members for expanded team
  const { data: teamMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ['teamMembers', expandedTeam],
    queryFn: () => getTeamMembers(expandedTeam!),
    enabled: !!expandedTeam,
  });

  const saveMut = useMutation({
    mutationFn: (values: any) => modal.record
      ? apiClient.put(`/teams/${modal.record.id}`, values).then(r => r.data)
      : apiClient.post('/teams', values).then(r => r.data),
    onSuccess: () => { message.success(modal.record ? 'Updated' : 'Created'); setModal({ open: false }); qc.invalidateQueries({ queryKey: ['allTeams'] }); },
    onError: () => message.error('Failed'),
  });

  const openEdit = (record?: any) => {
    form.setFieldsValue(record ? { teamName: record.teamName, parentId: record.parentId, displayOrder: record.displayOrder, isActive: record.isActive } : { teamName: '', parentId: null, displayOrder: 0, isActive: true });
    setModal({ open: true, record });
  };

  const toggleExpand = (teamId: number) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  const parentTeams = (allTeams || []).filter((t: any) => !t.parentId);
  const subTeamMap = new Map<number, any[]>();
  (allTeams || []).filter((t: any) => t.parentId).forEach((t: any) => {
    if (!subTeamMap.has(t.parentId)) subTeamMap.set(t.parentId, []);
    subTeamMap.get(t.parentId)!.push(t);
  });

  const renderMembersList = (tId: number) => {
    if (expandedTeam !== tId) return null;
    return (
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px', background: '#fff' }}>
        {loadingMembers ? <Spin size="small" /> : (teamMembers || []).length === 0 ? (
          <div style={{ color: '#8c8c8c', fontSize: 13 }}>No members in this team</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(teamMembers || []).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, border: '1px solid #f0f0f0', fontSize: 12 }}>
                <Avatar size={22} style={{ background: 'var(--brand-primary, #1677ff)', fontSize: 10 }}>
                  {(m.displayName || m.username)?.[0]?.toUpperCase()}
                </Avatar>
                <span style={{ fontWeight: 500 }}>{m.displayName || m.username}</span>
                <span style={{ color: '#8c8c8c' }}>— {m.designation?.name || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><TeamOutlined style={{ marginRight: 8 }} />Teams ({(allTeams || []).length})</div>
        <div className="page-filters">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>Add Team</Button>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 16 }}>
        {parentTeams.length} top-level teams, {(allTeams || []).length - parentTeams.length} sub-teams. Click any team to see its members.
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {parentTeams.map((team: any) => {
            const subs = subTeamMap.get(team.id) || [];
            const isExpanded = expandedTeam === team.id;
            return (
              <div key={team.id} style={{ border: '1px solid #f0f0f0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fafafa', cursor: 'pointer' }}
                  onClick={() => toggleExpand(team.id)}>
                  {isExpanded ? <DownOutlined style={{ fontSize: 12, color: '#8c8c8c' }} /> : <RightOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />}
                  <TeamOutlined style={{ fontSize: 18, color: 'var(--brand-primary, #154360)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--brand-primary, #154360)' }}>{team.teamName}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                      {team._count?.memberships || 0} members
                      {subs.length > 0 && <> · {subs.length} sub-team{subs.length > 1 ? 's' : ''}</>}
                    </div>
                  </div>
                  <Tag color={team.isActive ? 'green' : 'red'}>{team.isActive ? 'Active' : 'Inactive'}</Tag>
                  <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(team); }} />
                  <Button size="small" icon={<PlusOutlined />}
                    onClick={(e) => { e.stopPropagation(); form.setFieldsValue({ teamName: '', parentId: team.id, displayOrder: 0, isActive: true }); setModal({ open: true }); }}>
                    Sub-team
                  </Button>
                </div>

                {renderMembersList(team.id)}

                {subs.length > 0 && (
                  <div style={{ borderTop: isExpanded ? '1px solid #f0f0f0' : 'none' }}>
                    {subs.map((sub: any) => {
                      const isSubExpanded = expandedTeam === sub.id;
                      return (
                        <div key={sub.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 8px 48px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
                            onClick={() => toggleExpand(sub.id)}>
                            {isSubExpanded ? <DownOutlined style={{ fontSize: 10, color: '#8c8c8c' }} /> : <RightOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />}
                            <div style={{ width: 16, textAlign: 'center', color: '#d9d9d9' }}>└</div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 500, fontSize: 14 }}>{sub.teamName}</span>
                              <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 8 }}>{sub._count?.memberships || 0} members</span>
                            </div>
                            <Tag color={sub.isActive ? 'green' : 'red'} style={{ fontSize: 11 }}>{sub.isActive ? 'Active' : 'Inactive'}</Tag>
                            <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(sub); }} />
                          </div>
                          {renderMembersList(sub.id)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal title={modal.record ? `Edit: ${modal.record.teamName}` : 'New Team'}
        open={modal.open} onCancel={() => setModal({ open: false })}
        onOk={() => form.submit()} confirmLoading={saveMut.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="teamName" label="Team Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. AI/ML, Backend, ODOO..." />
          </Form.Item>
          <Form.Item name="parentId" label="Parent Team (leave empty for top-level)">
            <Select placeholder="None (top-level team)" allowClear showSearch optionFilterProp="label"
              options={parentTeams.filter((t: any) => t.id !== modal.record?.id).map((t: any) => ({ label: t.teamName, value: t.id }))} />
          </Form.Item>
          <Form.Item name="displayOrder" label="Display Order">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
