import { useQuery } from '@tanstack/react-query';
import { Input, Select, Spin, Avatar, Tag, Segmented } from 'antd';
import { SearchOutlined, MailOutlined, PhoneOutlined, AppstoreOutlined, UnorderedListOutlined, IdcardOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getDirectory } from '../../api/users';
import { getTeams } from '../../api/teams';
import { useAuthStore } from '../../store/authStore';

export default function ContactDirectory() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.some((r: any) => ['super admin', 'Admin', 'Hr Manager'].includes(r.name));
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState<number | undefined>();
  const [subTeamId, setSubTeamId] = useState<number | undefined>();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const { data, isLoading } = useQuery({
    queryKey: ['directory', search, subTeamId || teamId],
    queryFn: () => getDirectory(search || undefined, subTeamId || teamId),
  });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  // Parent teams and sub-teams
  const parentTeams = (teams || []).filter((t: any) => !t.parentId);
  const subTeams = teamId ? (teams || []).filter((t: any) => t.parentId === teamId) : [];

  return (
    <div>
      <div className="page-heading">Employee Directory</div>
      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <Input prefix={<SearchOutlined />} placeholder="Search name, email, username..." allowClear
          onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
        <Select placeholder="All Teams" allowClear showSearch optionFilterProp="label" style={{ width: 200 }}
          onChange={(v) => { setTeamId(v); setSubTeamId(undefined); }}
          options={parentTeams.map((t: any) => ({ label: t.teamName, value: t.id }))} />
        {subTeams.length > 0 && (
          <Select placeholder="All Sub-teams" allowClear showSearch optionFilterProp="label" style={{ width: 180 }}
            value={subTeamId} onChange={setSubTeamId}
            options={subTeams.map((t: any) => ({ label: t.teamName, value: t.id }))} />
        )}
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>{(data || []).length} employees</span>
        <Segmented value={viewMode} onChange={(v) => setViewMode(v as any)}
          options={[
            { value: 'card', icon: <AppstoreOutlined /> },
            { value: 'list', icon: <UnorderedListOutlined /> },
          ]} />
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : viewMode === 'card' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {(data || []).map((u: any) => (
            <div key={u.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
              <Avatar size={44} style={{ background: 'var(--brand-primary, #1677ff)', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
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
                {isAdmin && u.profile?.contactNo && <div style={{ fontSize: 12, color: '#666' }}><PhoneOutlined style={{ marginRight: 4 }} />{u.profile.contactNo}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--brand-primary, #154360)', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>#</th>
                <th style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>Name</th>
                <th style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>Designation</th>
                <th style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>Team</th>
                <th style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>Email</th>
                {isAdmin && <th style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>Phone</th>}
                {isAdmin && <th style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>RFID</th>}
                <th style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>Blood</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((u: any, i: number) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 12px', fontSize: 13, color: '#8c8c8c' }}>{i + 1}</td>
                  <td style={{ padding: '6px 12px', fontSize: 13, fontWeight: 500 }}>
                    <div>{u.displayName || u.username}</div>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>@{u.username}</div>
                  </td>
                  <td style={{ padding: '6px 12px', fontSize: 13 }}>{u.designation?.name || '-'}</td>
                  <td style={{ padding: '6px 12px', fontSize: 13 }}><Tag color="blue" style={{ fontSize: 11 }}>{u.team?.teamName || '-'}</Tag></td>
                  <td style={{ padding: '6px 12px', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '-'}</td>
                  {isAdmin && <td style={{ padding: '6px 12px', fontSize: 12 }}>{u.profile?.contactNo || '-'}</td>}
                  {isAdmin && <td style={{ padding: '6px 12px', fontSize: 12 }}>
                    {u.deviceUser?.cardNo ? <Tag icon={<IdcardOutlined />} style={{ fontSize: 11 }}>{u.deviceUser.cardNo}</Tag> : '-'}
                  </td>}
                  <td style={{ padding: '6px 12px', fontSize: 12 }}>
                    {u.profile?.bloodGroup ? <Tag color="red" style={{ fontSize: 11 }}>{u.profile.bloodGroup}</Tag> : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
