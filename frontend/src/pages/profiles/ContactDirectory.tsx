import { useQuery } from '@tanstack/react-query';
import { Input, Select, Spin, Avatar, Tag } from 'antd';
import { SearchOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getDirectory } from '../../api/users';
import { getTeams } from '../../api/teams';
import { useAuthStore } from '../../store/authStore';

export default function ContactDirectory() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.some((r: any) => ['super admin', 'Admin', 'Hr Manager'].includes(r.name));
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['directory', search, teamId],
    queryFn: () => getDirectory(search || undefined, teamId),
  });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  return (
    <div>
      <div className="page-heading">Employee Directory</div>
      <div className="filter-bar">
        <Input prefix={<SearchOutlined />} placeholder="Search name, email, username..." allowClear
          onChange={e => setSearch(e.target.value)} style={{ width: 300 }} />
        <Select placeholder="All Teams" allowClear style={{ width: 200 }} onChange={setTeamId}
          options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>{(data || []).length} employees</span>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {(data || []).map((u: any) => (
            <div key={u.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
              <Avatar size={44} style={{ background: '#1677ff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                {u.displayName?.[0]?.toUpperCase() || '?'}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.displayName || u.username}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>{u.designation?.name || '-'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {u.team?.teamName && <Tag color="blue" style={{ fontSize: 11 }}>{u.team.teamName}</Tag>}
                  {u.profile?.bloodGroup && <Tag color="red" style={{ fontSize: 11 }}>{u.profile.bloodGroup}</Tag>}
                </div>
                {u.email && <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}><MailOutlined style={{ marginRight: 4 }} />{u.email}</div>}
                {isAdmin && u.profile?.personalEmail && u.profile.personalEmail !== u.email && (
                  <div style={{ fontSize: 12, color: '#999' }}><MailOutlined style={{ marginRight: 4 }} />{u.profile.personalEmail}</div>
                )}
                {isAdmin && u.profile?.contactNo && <div style={{ fontSize: 12, color: '#666' }}><PhoneOutlined style={{ marginRight: 4 }} />{u.profile.contactNo}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
