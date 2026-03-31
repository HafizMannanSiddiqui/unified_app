import { useQuery } from '@tanstack/react-query';
import { Input, Tag, Select, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getProfiles } from '../../api/profiles';
import dayjs from 'dayjs';

export default function EmployeeList() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['profiles', search],
    queryFn: () => getProfiles(search || undefined),
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Employee Profiles ({(data || []).length})</div>
        <div className="page-filters">
          <Input prefix={<SearchOutlined />} placeholder="Search name, username, CNIC, contact..."
            allowClear onChange={e => setSearch(e.target.value)} style={{ width: 350 }} />
        </div>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Name</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Username</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Team</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>CNIC</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Contact</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Job Title</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Blood</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>DOJ</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No profiles found</td></tr>
              ) : (data || []).map((p: any, i: number) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>{`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.user?.displayName || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{p.user?.username || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{p.user?.team?.teamName || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{p.cnic || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{p.contactNo || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{p.jobTitle || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{p.bloodGroup ? <Tag color="red">{p.bloodGroup}</Tag> : '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{p.dateOfJoining ? dayjs(p.dateOfJoining).format('DD MMM YY') : '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>
                    <Tag color={p.user?.isActive ? 'green' : 'red'}>{p.user?.isActive ? 'Active' : 'Inactive'}</Tag>
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
