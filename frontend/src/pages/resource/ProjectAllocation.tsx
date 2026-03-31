import { useQuery } from '@tanstack/react-query';
import { Select, Collapse, Spin, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getProjectAllocation } from '../../api/gtl';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function HeatCell({ value }: { value: number }) {
  const bg = value === 0 ? '#f5f5f5' : value >= 10 ? '#ff4d4f' : value >= 9 ? '#ff7a45' : value >= 8 ? '#fa8c16' : value >= 6 ? '#fadb14' : value >= 3 ? '#b7eb8f' : '#d9f7be';
  const color = value >= 9 ? '#fff' : '#262626';
  return (
    <td style={{ background: bg, color, textAlign: 'center', padding: '2px 3px', fontSize: 11, fontWeight: value > 0 ? 600 : 400, minWidth: 26, border: '1px solid #f0f0f0' }}>
      {value || ''}
    </td>
  );
}

export default function ProjectAllocation() {
  const now = dayjs();
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projectAllocation', year, month],
    queryFn: () => getProjectAllocation(year, month),
  });

  const days = Array.from({ length: data?.daysInMonth || 31 }, (_, i) => i + 1);
  const projects = (data?.projects || []).filter((p: any) =>
    !search || p.projectName.toLowerCase().includes(search.toLowerCase()) ||
    p.users.some((u: any) => u.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Resource Allocation — Project Wise</div>
        <div className="page-filters">
          <Select value={year} onChange={setYear} style={{ width: 100 }}
            options={[2024, 2025, 2026, 2027].map(y => ({ label: String(y), value: y }))} />
          <Select value={month} onChange={setMonth} style={{ width: 140 }}
            options={months.map((m, i) => ({ label: m, value: i + 1 }))} />
          <Input prefix={<SearchOutlined />} placeholder="Search project or employee..."
            allowClear onChange={e => setSearch(e.target.value)} style={{ width: 250 }} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 15, fontWeight: 600, color: '#154360' }}>
        {months[month - 1]} {year} — {projects.length} projects
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <Collapse accordion>
          {projects.map((proj: any) => (
            <Collapse.Panel key={proj.projectName}
              header={<span><strong>{proj.projectName}</strong> <span style={{ color: '#888' }}>({proj.totalHours} hrs, {proj.users.length} people)</span></span>}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#154360', color: '#fff' }}>
                      <th style={{ padding: '4px 8px', textAlign: 'left', minWidth: 150, position: 'sticky', left: 0, background: '#154360' }}>Employee</th>
                      {days.map(d => <th key={d} style={{ padding: '3px 3px', textAlign: 'center', fontSize: 11, minWidth: 26 }}>{String(d).padStart(2, '0')}</th>)}
                      <th style={{ padding: '4px 8px', textAlign: 'center' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proj.users.map((u: any) => (
                      <tr key={u.name}>
                        <td style={{ padding: '2px 8px', fontSize: 12, border: '1px solid #f0f0f0', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#fff' }}>{u.name}</td>
                        {u.dailyHours.map((h: number, i: number) => <HeatCell key={i} value={h} />)}
                        <td style={{ padding: '2px 8px', fontWeight: 700, textAlign: 'center', border: '1px solid #f0f0f0' }}>{u.total}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#EBF5FB', fontWeight: 700 }}>
                      <td style={{ padding: '4px 8px', border: '1px solid #f0f0f0', position: 'sticky', left: 0, background: '#EBF5FB' }}>Total</td>
                      {days.map((_, i) => {
                        const dayTotal = proj.users.reduce((s: number, u: any) => s + (u.dailyHours[i] || 0), 0);
                        return <td key={i} style={{ textAlign: 'center', border: '1px solid #f0f0f0', fontSize: 11 }}>{dayTotal || ''}</td>;
                      })}
                      <td style={{ textAlign: 'center', border: '1px solid #f0f0f0' }}>{proj.totalHours}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Collapse.Panel>
          ))}
        </Collapse>
      )}
    </div>
  );
}
