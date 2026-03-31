import { useQuery } from '@tanstack/react-query';
import { Select, DatePicker, Button, Spin } from 'antd';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getTeamReport } from '../../api/gtl';
import { getTeams } from '../../api/teams';

const { RangePicker } = DatePicker;

export default function TeamReport() {
  const now = dayjs();
  const [range, setRange] = useState<[string, string]>([now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]);
  const [teamId, setTeamId] = useState<number | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['teamReport', range, teamId],
    queryFn: () => getTeamReport(range[0], range[1], teamId),
    enabled: submitted,
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  const handleView = () => setSubmitted(true);

  return (
    <div>
      <div className="page-heading">Team Reports</div>

      {/* Filter form - two column */}
      <div className="form-grid clean-form" style={{ maxWidth: 900, marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Date:<span style={{ color: '#e74c3c' }}>*</span></div>
          <RangePicker
            style={{ width: '100%' }}
            value={[dayjs(range[0]), dayjs(range[1])]}
            onChange={(_, d) => { if (d[0]) { setRange([d[0], d[1]]); setSubmitted(false); } }}
            format="MM/DD/YYYY"
          />
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Team:<span style={{ color: '#e74c3c' }}>*</span></div>
          <Select
            placeholder="-- Choose --"
            allowClear
            style={{ width: '100%' }}
            onChange={(v) => { setTeamId(v); setSubmitted(false); }}
            options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Button type="primary" className="submit-btn" onClick={handleView}>View</Button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : submitted && data ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ width: 50, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Sr.No</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Team Name</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Urdu Name</th>
                <th style={{ width: 120, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>User ID</th>
                <th style={{ width: 100, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No Record Found</td></tr>
              ) : (
                <>
                  {(data || []).map((row: any, i: number) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{row.teamName}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{row.displayName}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{row.username}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: row.totalHours > 0 ? 600 : 400, color: row.totalHours === 0 ? '#bfbfbf' : undefined }}>{row.totalHours}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#EBF5FB' }}>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700, fontSize: 13 }}>Total:</td>
                    <td style={{ padding: '6px 12px', fontWeight: 700, fontSize: 13 }}>
                      {Math.round((data || []).reduce((s: number, r: any) => s + r.totalHours, 0) * 10) / 10}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
