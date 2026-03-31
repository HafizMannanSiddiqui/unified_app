import { useQuery } from '@tanstack/react-query';
import { Tag, Input, Select, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getUsers } from '../../api/users';
import { getTeams } from '../../api/teams';

export default function UserList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [teamFilter, setTeamFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, activeFilter, search],
    queryFn: () => getUsers(page, 100, activeFilter !== undefined ? activeFilter === 'true' : undefined, search || undefined),
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  // Client-side role/team filter (server handles search + active)
  let items = data?.items || [];
  if (roleFilter) items = items.filter((u: any) => u.roles?.some((r: any) => r.role?.name === roleFilter));
  if (teamFilter) items = items.filter((u: any) => String(u.teamId) === teamFilter);

  // Extract unique roles for the filter
  const allRoles = new Set<string>();
  (data?.items || []).forEach((u: any) => u.roles?.forEach((r: any) => { if (r.role?.name) allRoles.add(r.role.name); }));

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Users ({data?.total || 0})</div>
        <div className="page-filters">
          <Input prefix={<SearchOutlined />} placeholder="Search name, email, username..."
            allowClear onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260 }} />
          <Select placeholder="Role" allowClear style={{ width: 150 }}
            onChange={(v) => setRoleFilter(v)}
            options={[...allRoles].sort().map(r => ({ label: r, value: r }))} />
          <Select placeholder="Team" allowClear showSearch optionFilterProp="label" style={{ width: 180 }}
            onChange={(v) => setTeamFilter(v)}
            options={(teams || []).map((t: any) => ({ label: t.teamName, value: String(t.id) }))} />
          <Select placeholder="Status" allowClear style={{ width: 110 }}
            onChange={(v) => { setActiveFilter(v); setPage(1); }}
            options={[{ label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }]} />
        </div>
      </div>

      <div style={{ marginBottom: 10, fontSize: 13, color: '#8c8c8c' }}>
        Showing {items.length}{roleFilter || teamFilter ? ' (filtered)' : ''} of {data?.total || 0}
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 50 }}>ID</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Username</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Display Name</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Email</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Team</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Designation</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Roles</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No users found</td></tr>
              ) : items.map((u: any) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '7px 12px', fontSize: 13, color: '#8c8c8c' }}>{u.id}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{u.username}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>{u.displayName || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{u.team?.teamName || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{u.designation?.name || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>
                    {u.roles?.map((r: any) => {
                      const name = r.role?.name;
                      const color = name === 'super admin' ? 'red' : name === 'Admin' ? 'volcano' : name === 'Team Lead' ? 'green' : name === 'Application Manager' ? 'purple' : name === 'Hr Manager' ? 'magenta' : 'blue';
                      return <Tag key={r.role?.id} color={color} style={{ fontSize: 11 }}>{name}</Tag>;
                    })}
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                    <Tag color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.total > 100 && (
            <div style={{ textAlign: 'center', padding: 16, display: 'flex', justifyContent: 'center', gap: 6 }}>
              {Array.from({ length: Math.ceil(data.total / 100) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  style={{ padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: 4, background: page === i + 1 ? '#154360' : '#fff', color: page === i + 1 ? '#fff' : '#333', cursor: 'pointer', fontSize: 13 }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
