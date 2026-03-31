import { useQuery } from '@tanstack/react-query';
import { Card, Tag, Spin, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getBloodGroups } from '../../api/profiles';

const bgColors: Record<string, string> = {
  'A+': '#e74c3c', 'A-': '#c0392b', 'B+': '#2980b9', 'B-': '#2471a3',
  'AB+': '#8e44ad', 'AB-': '#7d3c98', 'O+': '#27ae60', 'O-': '#229954',
};

export default function BloodGroup() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['bloodGroups'], queryFn: getBloodGroups });

  if (isLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  const groups = data || {};
  const bloodTypes = Object.keys(groups).sort();

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Blood Group Report</div>
        <div className="page-filters">
          <Input prefix={<SearchOutlined />} placeholder="Search name..." allowClear
            onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16, marginTop: 16 }}>
        {bloodTypes.map(bg => {
          const people = (groups[bg] || []).filter((p: any) =>
            search ? p.name.toLowerCase().includes(search.toLowerCase()) : true
          );
          if (search && people.length === 0) return null;
          return (
            <Card key={bg} title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tag color={bgColors[bg] || '#666'} style={{ fontSize: 16, padding: '4px 12px', fontWeight: 700 }}>{bg}</Tag>
                <span style={{ fontSize: 13, color: '#8c8c8c' }}>{people.length} employees</span>
              </div>
            } style={{ borderRadius: 12 }} size="small">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontSize: 12, color: '#8c8c8c' }}>Name</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontSize: 12, color: '#8c8c8c' }}>Team</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontSize: 12, color: '#8c8c8c' }}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '5px 8px', fontSize: 13 }}>{p.name}</td>
                      <td style={{ padding: '5px 8px', fontSize: 13, color: '#666' }}>{p.team}</td>
                      <td style={{ padding: '5px 8px', fontSize: 13, color: '#666' }}>{p.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
