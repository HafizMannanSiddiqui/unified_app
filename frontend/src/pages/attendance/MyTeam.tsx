import { useQuery } from '@tanstack/react-query';
import { Tag, Spin, Avatar, Card, Input } from 'antd';
import { TeamOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { getMyTeams, getDirectory } from '../../api/users';
import apiClient from '../../api/client';
import { useState } from 'react';

const getMyTeamAttendance = () => apiClient.get('/attendance/my-team').then(r => r.data);
const getTodayDashboard = () => apiClient.get('/attendance/today').then(r => r.data);

const LEAD_ROLES = ['super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager'];

export default function MyTeam() {
  const user = useAuthStore((s) => s.user);
  const isLead = user?.roles?.some((r: any) => LEAD_ROLES.includes(r.name));
  const [search, setSearch] = useState('');

  const { data: myInfo } = useQuery({
    queryKey: ['myTeamsManagers', user?.id],
    queryFn: () => getMyTeams(user!.id),
    enabled: !!user?.id,
  });

  // For leads: get reportees with today's attendance
  const { data: reporteeData, isLoading: loadingReportees } = useQuery({
    queryKey: ['myTeamAttendance', user?.id],
    queryFn: getMyTeamAttendance,
    enabled: isLead && !!user?.id,
    refetchInterval: 60000,
  });

  // For employees: get teammates from their primary team
  const primaryTeamId = (myInfo?.teams || []).find((t: any) => t.isPrimary)?.teamId || user?.teamId;
  const { data: teammates, isLoading: loadingTeammates } = useQuery({
    queryKey: ['myTeammates', primaryTeamId],
    queryFn: () => getDirectory(undefined, primaryTeamId),
    enabled: !isLead && !!primaryTeamId,
  });

  // Get today's attendance to show present/absent for teammates
  const { data: todayDash } = useQuery({
    queryKey: ['todayDashboard'],
    queryFn: getTodayDashboard,
    enabled: !isLead,
    refetchInterval: 60000,
  });

  const presentIds = new Set((todayDash?.available?.users || []).map((u: any) => u.id));
  const checkinMap = new Map<number, string>();
  for (const u of (todayDash?.available?.users || [])) {
    if (u.checkinTime) checkinMap.set(u.id, u.checkinTime);
  }

  const myTeams = myInfo?.teams || [];
  const myManagers = myInfo?.managers || [];

  // Build member list based on role
  const members = isLead
    ? (reporteeData || []).map((m: any) => ({ ...m, isPresent: m.isPresent, checkinTime: m.todayCheckin }))
    : (teammates || []).filter((u: any) => u.id !== user?.id).map((u: any) => ({
        id: u.id, displayName: u.displayName, username: u.username,
        designation: u.designation?.name || '', teamName: u.team?.teamName || '',
        isPresent: presentIds.has(u.id), checkinTime: checkinMap.get(u.id) || null,
      }));

  const filtered = members.filter((u: any) =>
    !search || (u.displayName || u.username || '').toLowerCase().includes(search.toLowerCase())
      || (u.designation || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group by designation
  const roleGroups = new Map<string, any[]>();
  filtered.forEach((u: any) => {
    const role = u.designation || 'Unassigned';
    if (!roleGroups.has(role)) roleGroups.set(role, []);
    roleGroups.get(role)!.push(u);
  });

  const presentCount = filtered.filter((u: any) => u.isPresent).length;
  const absentCount = filtered.length - presentCount;
  const loading = isLead ? loadingReportees : loadingTeammates;

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
                <Tag color={t.isPrimary ? 'blue' : 'default'}>{t.teamName}</Tag>
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
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Team members section — leads see reportees, employees see teammates */}
      <div className="page-header" style={{ borderBottom: 'none', marginBottom: 12, paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>
            {isLead ? 'People Reporting to Me' : 'My Teammates'}
          </Tag>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#154360' }}>
            {filtered.length} member{filtered.length !== 1 ? 's' : ''}
          </span>
          <Tag color="green">{presentCount} present</Tag>
          <Tag color="red">{absentCount} absent</Tag>
        </div>
        <div className="page-filters">
          <Input prefix={<SearchOutlined />} placeholder="Search name or role..." allowClear
            onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div>
          {[...roleGroups.entries()].sort((a, b) => b[1].length - a[1].length).map(([role, grpMembers]) => (
            <div key={role} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag color="purple" style={{ fontSize: 13, padding: '2px 10px' }}>{role}</Tag>
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>{grpMembers.length} member{grpMembers.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {grpMembers.sort((a: any, b: any) => (a.displayName || '').localeCompare(b.displayName || '')).map((u: any) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 10, border: `1px solid ${u.isPresent ? '#d9f7be' : '#f0f0f0'}`,
                    background: u.isPresent ? '#f6ffed' : '#fff',
                  }}>
                    <Avatar size={36} style={{ background: u.isPresent ? '#52c41a' : '#bfbfbf', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                      {(u.displayName || u.username)?.[0]?.toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.displayName || u.username}
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>@{u.username}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {u.isPresent ? (
                        <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>{u.checkinTime}</Tag>
                      ) : (
                        <Tag icon={<CloseCircleOutlined />} style={{ margin: 0 }}>Absent</Tag>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
              {search ? 'No members match your search' : isLead ? 'No one reports to you yet' : 'No teammates found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
