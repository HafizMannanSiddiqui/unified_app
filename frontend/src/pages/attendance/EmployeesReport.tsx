import { useQuery } from '@tanstack/react-query';
import { Select, DatePicker, Button, Spin, Tag } from 'antd';
import { DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getEmployeesReport } from '../../api/attendance';
import { getTeams } from '../../api/teams';

const { RangePicker } = DatePicker;

export default function EmployeesReport() {
  const now = dayjs();
  const [range, setRange] = useState<[string, string]>([now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]);
  const [teamId, setTeamId] = useState<number | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['empReport', range, teamId],
    queryFn: () => getEmployeesReport(range[0], range[1], teamId),
    enabled: submitted,
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  const handleDownload = () => {
    if (!data?.length) return;
    const header = 'Sr.No,Name,Team,Total Days,Total Hours,Avg Hours/Day,Missed Checkouts';
    const rows = data.map((r: any, i: number) => {
      const avg = r.totalDays > 0 ? (Number(r.totalHours) / r.totalDays).toFixed(1) : '0';
      return `${i + 1},"${r.displayName}","${r.teamName || ''}",${r.totalDays},${r.totalHours},${avg},${r.missedCheckouts}`;
    });
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees_report.csv';
    a.click();
  };

  return (
    <div>
      <div className="page-heading">Employees Report</div>

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
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <Button icon={<DownloadOutlined />} className="download-btn" onClick={handleDownload}>Download</Button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Name</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Team</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Total Days</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Total Hours</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Avg Hrs/Day</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Missed C/O</th>
                </tr>
              </thead>
              <tbody>
                {data.filter((r: any) => r.totalDays > 0).map((r: any, i: number) => {
                  const avg = r.totalDays > 0 ? (Number(r.totalHours) / r.totalDays).toFixed(1) : '0';
                  const isLowAvg = Number(avg) > 0 && Number(avg) < 8;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0', background: isLowAvg ? '#fff2f0' : undefined }}>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: isLowAvg ? 600 : 400 }}>
                        {r.displayName || r.username}
                        {isLowAvg && <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>Below 8h</Tag>}
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.teamName || '-'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.totalDays}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600 }}>{Number(r.totalHours).toFixed(1)}</td>
                      <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600, color: Number(avg) < 8 ? '#ff4d4f' : '#52c41a' }}>
                        {avg}
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 13 }}>
                        {r.missedCheckouts > 0 ? <Tag color="error" icon={<WarningOutlined />}>{r.missedCheckouts}</Tag> : '0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
