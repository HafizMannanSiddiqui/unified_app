import { useQuery } from '@tanstack/react-query';
import { Select, Collapse, Progress, Spin, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getResourceAllocation } from '../../api/gtl';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getBarColor(pct: number) {
  if (pct >= 100) return '#ff4d4f';
  if (pct >= 80) return '#fa8c16';
  if (pct >= 50) return '#52c41a';
  return '#1677ff';
}

function HeatCell({ value }: { value: number }) {
  const bg = value === 0 ? '#f5f5f5' : value >= 9 ? '#ff4d4f' : value >= 8 ? '#fa8c16' : value >= 6 ? '#fadb14' : '#b7eb8f';
  const color = value >= 8 ? '#fff' : '#262626';
  return (
    <td style={{ background: bg, color, textAlign: 'center', padding: '2px 4px', fontSize: 12, fontWeight: value > 0 ? 600 : 400, minWidth: 28, border: '1px solid #f0f0f0' }}>
      {value || ''}
    </td>
  );
}

export default function ResourceAllocation() {
  const now = dayjs();
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['resourceAllocation', year, month],
    queryFn: () => getResourceAllocation(year, month),
  });

  const days = Array.from({ length: data?.daysInMonth || 31 }, (_, i) => i + 1);
  const users = (data?.users || []).filter((u: any) =>
    !search || (u.displayName || u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Resource Allocation</div>
        <div className="page-filters">
          <Select value={year} onChange={setYear} style={{ width: 100 }}
            options={[2024, 2025, 2026, 2027].map(y => ({ label: String(y), value: y }))} />
          <Select value={month} onChange={setMonth} style={{ width: 140 }}
            options={months.map((m, i) => ({ label: m, value: i + 1 }))} />
          <Input prefix={<SearchOutlined />} placeholder="Search employee..."
            allowClear onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 15, fontWeight: 600, color: '#154360' }}>
        {months[month - 1]} {year} — {users.length} employees
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <Collapse accordion>
          {users.map((u: any) => (
            <Collapse.Panel key={u.id}
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                  <span style={{ fontWeight: 600, minWidth: 180 }}>{u.displayName || u.username}</span>
                  <span style={{ minWidth: 120 }}>{u.totalHours} hrs — {u.percentage}%</span>
                  <Progress percent={Math.min(u.percentage, 100)} size="small" strokeColor={getBarColor(u.percentage)} style={{ flex: 1, maxWidth: 400 }} showInfo={false} />
                </div>
              }>
              {(u.projects || []).map((p: any) => (
                <div key={p.projectName} style={{ marginBottom: 12 }}>
                  <strong>{p.projectName}</strong>
                  <span style={{ color: '#888', marginLeft: 8 }}>{p.team || ''}</span>
                  <div style={{ overflowX: 'auto', marginTop: 4 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <thead>
                        <tr style={{ background: '#154360', color: '#fff' }}>
                          <th style={{ padding: '4px 8px', textAlign: 'left', minWidth: 100 }}>Team</th>
                          {days.map(d => <th key={d} style={{ padding: '4px 4px', textAlign: 'center', fontSize: 11, minWidth: 28 }}>{String(d).padStart(2, '0')}</th>)}
                          <th style={{ padding: '4px 8px', textAlign: 'center' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '2px 8px', fontSize: 12, border: '1px solid #f0f0f0' }}>{p.team || '---'}</td>
                          {p.dailyHours.map((h: number, i: number) => <HeatCell key={i} value={h} />)}
                          <td style={{ padding: '2px 8px', fontWeight: 700, textAlign: 'center', border: '1px solid #f0f0f0' }}>{p.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </Collapse.Panel>
          ))}
        </Collapse>
      )}
    </div>
  );
}
