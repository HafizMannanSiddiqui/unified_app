import { useQuery } from '@tanstack/react-query';
import { Tag, Spin, Avatar, Card, Select, Input, Tabs } from 'antd';
import { TeamOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { getMyTeams } from '../../api/users';
import { getTodayDashboard } from '../../api/attendance';
import { getTeams } from '../../api/teams';
import apiClient from '../../api/client';
import { useState } from 'react';

const getTeamMembers = (teamId: number) =>
  apiClient.get('/users', { params: { pageSize: 500 } }).then(r =>
    (r.data.items || []).filter((u: any) => u.teamId === teamId && u.isActive)
  );

const getAllMemberships = () =>
  apiClient.get('/users', { params: { pageSize: 1000 } }).then(r => r.data.items || []);

export default function MyTeam() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | undefined>(user?.teamId || undefined);

  const { data: myInfo } = useQuery({
    queryKey: ['myTeamsManagers', user?.id],
    queryFn: () => getMyTeams(user!.id),
    enabled: !!user?.id,
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ['allUsersForTeam'],
    queryFn: getAllMemberships,
  });

  const { data: todayDash } = useQuery({
    queryKey: ['todayDashboard'],
    queryFn: getTodayDashboard,
    refetchInterval: 60000,
  });

  const presentIds = new Set((todayDash?.available?.users || []).map((u: any) => u.id));
  const checkinMap = new Map<number, string>();
  for (const u of (todayDash?.available?.users || [])) {
    if (u.checkinTime) checkinMap.set(u.id, u.checkinTime);
  }

  // Group users by team
  const teamGroups = new Map<number, any[]>();
  (allUsers || []).filter((u: any) => u.isActive).forEach((u: any) => {
    if (u.teamId) {
      if (!teamGroups.has(u.teamId)) teamGroups.set(u.teamId, []);
      teamGroups.get(u.teamId)!.push(u);
    }
  });

  // Group by role within selected team
  const selectedMembers = selectedTeam ? (teamGroups.get(selectedTeam) || []) : [];
  const filteredMembers = selectedMembers.filter((u: any) =>
    !search || (u.displayName || u.username || '').toLowerCase().includes(search.toLowerCase())
      || (u.designation?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const roleGroups = new Map<string, any[]>();
  filteredMembers.forEach((u: any) => {
    const role = u.designation?.name || 'Unassigned';
    if (!roleGroups.has(role)) roleGroups.set(role, []);
    roleGroups.get(role)!.push(u);
  });

  const myTeams = myInfo?.teams || [];
  const myManagers = myInfo?.managers || [];
  const selectedTeamName = (teams || []).find((t: any) => t.id === selectedTeam)?.teamName || '';

  return (
    <div>
      <div className="page-heading"><TeamOutlined style={{ marginRight: 8 }} />My Team</div>

      {/* My Info */}
      <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>My Teams</div>
            {myTeams.length === 0 ? <span style={{ color: '#8c8c8c' }}>No teams</span> : myTeams.map((t: any) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Tag color={t.isPrimary ? 'blue' : 'default'} style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedTeam(t.teamId)}>{t.teamName}</Tag>
                {t.roleInTeam && <span style={{ fontSize: 12, color: '#666' }}>({t.roleInTeam})</span>}
                {t.isPrimary && <Tag color="gold" style={{ fontSize: 9 }}>Primary</Tag>}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>I Report To</div>
            {myManagers.length === 0 ? <span style={{ color: '#8c8c8c' }}>No manager</span> : myManagers.map((m: any) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Tag color="geekblue">{m.managerName || m.managerUsername}</Tag>
                {m.isPrimary && <Tag color="gold" style={{ fontSize: 9 }}>Primary</Tag>}
                {presentIds.has(m.managerId) ? <Tag color="green" style={{ fontSize: 9 }}>Online</Tag> : <Tag style={{ fontSize: 9 }}>Away</Tag>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Team selector + search */}
      <div className="page-header" style={{ borderBottom: 'none', marginBottom: 12, paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Select value={selectedTeam} onChange={setSelectedTeam} showSearch optionFilterProp="label"
            style={{ width: 250 }} placeholder="Select team..."
            options={(teams || []).map((t: any) => ({ label: `${t.teamName} (${(teamGroups.get(t.id) || []).length})`, value: t.id }))} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#154360' }}>
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
          </span>
          <Tag color="green">{filteredMembers.filter(u => presentIds.has(u.id)).length} present</Tag>
          <Tag color="red">{filteredMembers.filter(u => !presentIds.has(u.id)).length} absent</Tag>
        </div>
        <div className="page-filters">
          <Input prefix={<SearchOutlined />} placeholder="Search name or role..." allowClear
            onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        </div>
      </div>

      {/* Team members grouped by role */}
      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div>
          {[...roleGroups.entries()].sort((a, b) => b[1].length - a[1].length).map(([role, members]) => (
            <div key={role} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag color="purple" style={{ fontSize: 13, padding: '2px 10px' }}>{role}</Tag>
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {members.sort((a: any, b: any) => (a.displayName || '').localeCompare(b.displayName || '')).map((u: any) => {
                  const isPresent = presentIds.has(u.id);
                  const ciTime = checkinMap.get(u.id);
                  return (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 10, border: `1px solid ${isPresent ? '#d9f7be' : '#f0f0f0'}`,
                      background: isPresent ? '#f6ffed' : '#fff',
                    }}>
                      <Avatar size={36} style={{ background: isPresent ? '#52c41a' : '#bfbfbf', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                        {(u.displayName || u.username)?.[0]?.toUpperCase()}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.displayName || u.username}
                        </div>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>@{u.username}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {isPresent ? (
                          <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>{ciTime}</Tag>
                        ) : (
                          <Tag icon={<CloseCircleOutlined />} style={{ margin: 0 }}>Absent</Tag>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {roleGroups.size === 0 && selectedTeam && (
            <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
              {search ? 'No members match your search' : 'No members in this team'}
            </div>
          )}
          {!selectedTeam && (
            <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
              Select a team to see its members
            </div>
          )}
        </div>
      )}
    </div>
  );
}
