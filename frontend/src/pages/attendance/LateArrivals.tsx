import { useQuery } from '@tanstack/react-query';
import { Select, DatePicker, Button, Spin, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getLateArrivals } from '../../api/attendance';
import { getTeams } from '../../api/teams';

const { RangePicker } = DatePicker;

export default function LateArrivals() {
  const now = dayjs();
  const [range, setRange] = useState<[string, string]>([now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]);
  const [teamId, setTeamId] = useState<number | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['lateArrivals', range, teamId],
    queryFn: () => getLateArrivals(range[0], range[1], teamId),
    enabled: submitted,
  });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  return (
    <div>
      <div className="page-heading">Late Arrival Report</div>
      <div className="form-grid clean-form" style={{ maxWidth: 900, marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Date Range:</div>
          <RangePicker style={{ width: '100%' }} value={[dayjs(range[0]), dayjs(range[1])]}
            onChange={(_, d) => { if (d[0]) { setRange([d[0], d[1]]); setSubmitted(false); } }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Team:</div>
          <Select placeholder="All Teams" allowClear style={{ width: '100%' }}
            onChange={(v) => { setTeamId(v); setSubmitted(false); }}
            options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Button type="primary" className="submit-btn" onClick={() => setSubmitted(true)}>View</Button>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : submitted && data ? (
        <>
          <div style={{ marginBottom: 12, fontSize: 14 }}><Tag color="red">{data.length} late arrivals</Tag></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Name</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Team</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Date</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Check-In Time</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.displayName || r.username}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.teamName || '-'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(r.checkinDate).format('DD MMM, YYYY (ddd)')}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}><Tag color="red">{r.checkinTime?.slice(0, 8)}</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
