import { useQuery } from '@tanstack/react-query';
import { Spin, Avatar, Tag, Input, Card, Segmented, Select } from 'antd';
import { ApartmentOutlined, SearchOutlined, UserOutlined, TeamOutlined, UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useState } from 'react';
import apiClient from '../../api/client';

const getOrgData = () => apiClient.get('/users', { params: { pageSize: 5000 } }).then(r => r.data.items || []);

interface OrgNode {
  id: number; username: string; displayName: string; email?: string;
  designation?: string; teamName?: string; roles?: string[]; children: OrgNode[];
}

function buildTree(users: any[]): OrgNode[] {
  const userMap = new Map<number, OrgNode>();
  const childIds = new Set<number>();

  for (const u of users) {
    if (!u.isActive) continue;
    userMap.set(u.id, {
      id: u.id, username: u.username, displayName: u.displayName || u.username,
      email: u.email, designation: u.designation?.name || '',
      teamName: u.team?.teamName || '',
      roles: u.roles?.map((r: any) => r.role?.name).filter(Boolean) || [],
      children: [],
    });
  }

  for (const u of users) {
    if (!u.isActive || !u.reportTo || !userMap.has(u.reportTo)) continue;
    userMap.get(u.reportTo)!.children.push(userMap.get(u.id)!);
    childIds.add(u.id);
  }

  for (const node of userMap.values()) {
    node.children.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  return [...userMap.values()].filter(n => !childIds.has(n.id) && n.children.length > 0)
    .sort((a, b) => b.children.length - a.children.length);
}

// ── Tree View ──
function TreeNode({ node, level, search }: { node: OrgNode; level: number; search: string }) {
  const [expanded, setExpanded] = useState(level < 2);
  const colors = ['var(--brand-primary, #154360)', '#1677ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96'];
  const bg = colors[Math.min(level, colors.length - 1)];
  const matchesSearch = !search || node.displayName.toLowerCase().includes(search.toLowerCase()) || (node.designation || '').toLowerCase().includes(search.toLowerCase());

  if (search && !matchesSearch && !node.children.some(function check(c: OrgNode): boolean { return c.displayName.toLowerCase().includes(search.toLowerCase()) || c.children.some(check); })) return null;

  return (
    <div>
      <div onClick={() => node.children.length > 0 && setExpanded(!expanded)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          borderRadius: 10, background: '#fff', border: `2px solid ${bg}`,
          cursor: node.children.length > 0 ? 'pointer' : 'default', minWidth: 200,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative',
          opacity: search && !matchesSearch ? 0.4 : 1,
        }}>
        <Avatar size={32} style={{ background: bg, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
          {node.displayName[0]?.toUpperCase()}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{node.displayName}</div>
          <div style={{ fontSize: 10, color: '#8c8c8c' }}>{node.designation || node.teamName}</div>
        </div>
        {node.children.length > 0 && (
          <Tag style={{ position: 'absolute', top: -6, right: -6, fontSize: 9, borderRadius: 10 }} color={bg}>
            {expanded ? '▼' : '▶'} {node.children.length}
          </Tag>
        )}
      </div>
      {expanded && node.children.length > 0 && (
        <div style={{ marginLeft: 28, paddingLeft: 20, borderLeft: `2px solid ${bg}22`, marginTop: 2 }}>
          {node.children.map(child => (
            <div key={child.id} style={{ marginTop: 4, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -21, top: 14, width: 18, borderTop: `2px solid ${bg}22` }} />
              <TreeNode node={child} level={level + 1} search={search} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── List View ──
function ListView({ tree, search }: { tree: OrgNode[]; search: string }) {
  const flatList: { node: OrgNode; level: number }[] = [];
  function flatten(nodes: OrgNode[], level: number) {
    for (const n of nodes) {
      if (!search || n.displayName.toLowerCase().includes(search.toLowerCase()) || n.designation?.toLowerCase().includes(search.toLowerCase())) {
        flatList.push({ node: n, level });
      }
      flatten(n.children, level + 1);
    }
  }
  flatten(tree, 0);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: 'var(--brand-primary, #154360)', color: '#fff' }}>
          <th style={{ padding: '6px 12px', fontSize: 12 }}>#</th>
          <th style={{ padding: '6px 12px', fontSize: 12 }}>Name</th>
          <th style={{ padding: '6px 12px', fontSize: 12 }}>Designation</th>
          <th style={{ padding: '6px 12px', fontSize: 12 }}>Team</th>
          <th style={{ padding: '6px 12px', fontSize: 12 }}>Reports</th>
        </tr></thead>
        <tbody>{flatList.map((item, i) => (
          <tr key={item.node.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ padding: '5px 12px', fontSize: 12, color: '#8c8c8c' }}>{i + 1}</td>
            <td style={{ padding: '5px 12px', fontSize: 12 }}>
              <span style={{ marginLeft: item.level * 20 }}>
                {item.level > 0 && <span style={{ color: '#d9d9d9', marginRight: 4 }}>{'└'.repeat(1)}</span>}
                <strong>{item.node.displayName}</strong>
              </span>
            </td>
            <td style={{ padding: '5px 12px', fontSize: 12 }}>{item.node.designation || '-'}</td>
            <td style={{ padding: '5px 12px', fontSize: 12 }}><Tag color="blue" style={{ fontSize: 10 }}>{item.node.teamName || '-'}</Tag></td>
            <td style={{ padding: '5px 12px', fontSize: 12 }}>
              {item.node.children.length > 0 && <Tag color="green" style={{ fontSize: 10 }}>{item.node.children.length} people</Tag>}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ── Department View ──
function DepartmentView({ users, search }: { users: any[]; search: string }) {
  const teamMap = new Map<string, any[]>();
  for (const u of users) {
    if (!u.isActive) continue;
    if (search && !(u.displayName || '').toLowerCase().includes(search.toLowerCase())) continue;
    const team = u.team?.teamName || 'No Team';
    if (!teamMap.has(team)) teamMap.set(team, []);
    teamMap.get(team)!.push(u);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[...teamMap.entries()].sort((a, b) => b[1].length - a[1].length).map(([team, members]) => (
        <Card key={team} size="small" style={{ borderRadius: 10 }}
          title={<><TeamOutlined style={{ marginRight: 6 }} />{team} <Tag color="blue">{members.length}</Tag></>}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {members.sort((a: any, b: any) => (a.displayName || '').localeCompare(b.displayName || '')).map((u: any) => {
              const isLead = u.roles?.some((r: any) => ['Team Lead', 'super admin', 'Admin'].includes(r.role?.name));
              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                  borderRadius: 8, border: `1px solid ${isLead ? 'var(--brand-primary)' : '#f0f0f0'}`,
                  background: isLead ? 'var(--brand-primary-bg, #f0f7ff)' : '#fff', fontSize: 12,
                }}>
                  <Avatar size={22} style={{ background: isLead ? 'var(--brand-primary)' : '#bfbfbf', fontSize: 10 }}>
                    {(u.displayName || u.username)?.[0]?.toUpperCase()}
                  </Avatar>
                  <div>
                    <div style={{ fontWeight: isLead ? 700 : 400 }}>{u.displayName || u.username}</div>
                    <div style={{ fontSize: 10, color: '#8c8c8c' }}>{u.designation?.name || '-'}</div>
                  </div>
                  {isLead && <Tag color="var(--brand-primary)" style={{ fontSize: 9, marginLeft: 4 }}>Lead</Tag>}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function OrgChart() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'tree' | 'list' | 'department'>('tree');
  const [rootFilter, setRootFilter] = useState<number | undefined>();
  const { data: users, isLoading } = useQuery({ queryKey: ['orgChartUsers'], queryFn: getOrgData });

  const tree = users ? buildTree(users) : [];
  const filteredTree = rootFilter ? tree.filter(r => r.id === rootFilter) : tree;

  const countNodes = (nodes: OrgNode[]): number => nodes.reduce((s, n) => s + 1 + countNodes(n.children), 0);

  // Get all managers for filter
  const managers = tree.map(r => ({ label: `${r.displayName} (${r.children.length} reports)`, value: r.id }));

  return (
    <div>
      <div className="page-heading"><ApartmentOutlined style={{ marginRight: 8 }} />Organization Chart</div>

      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <Segmented value={view} onChange={(v) => setView(v as any)} options={[
          { value: 'tree', icon: <ApartmentOutlined />, label: 'Tree' },
          { value: 'list', icon: <UnorderedListOutlined />, label: 'List' },
          { value: 'department', icon: <AppstoreOutlined />, label: 'By Department' },
        ]} />
        <Input prefix={<SearchOutlined />} placeholder="Search name or designation..." allowClear
          onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
        {view !== 'department' && (
          <Select placeholder="All Hierarchies" allowClear showSearch optionFilterProp="label" style={{ width: 250 }}
            onChange={setRootFilter} options={managers} />
        )}
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>{countNodes(tree)} people</span>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div style={{ padding: '12px 0' }}>
          {view === 'tree' && (
            filteredTree.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: 40 }}>
                <UserOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
                <div style={{ marginTop: 12, color: '#8c8c8c' }}>
                  {search ? 'No matches' : 'No reporting structure. Assign managers in Users page.'}
                </div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowX: 'auto' }}>
                {filteredTree.map(root => <TreeNode key={root.id} node={root} level={0} search={search} />)}
              </div>
            )
          )}
          {view === 'list' && <ListView tree={filteredTree} search={search} />}
          {view === 'department' && users && <DepartmentView users={users} search={search} />}
        </div>
      )}
    </div>
  );
}
