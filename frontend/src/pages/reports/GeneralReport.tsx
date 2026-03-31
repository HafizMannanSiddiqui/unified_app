import { useQuery } from '@tanstack/react-query';
import { Select, DatePicker, Button, Spin, message, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getGeneralReport, getPrograms, getProjects, getSubProjects } from '../../api/gtl';
import { getUsers } from '../../api/users';

const { RangePicker } = DatePicker;

function downloadCsv(entries: any[], filename: string) {
  if (!entries.length) { message.warning('No data to download'); return; }
  const header = 'Sr.No,Date,User,Program,Project,Sub Project,WBS,Description,Hours,Status';
  const rows = entries.map((e: any, i: number) => {
    const status = e.status === 1 ? 'Approved' : e.status === 0 ? 'Pending' : 'Rejected';
    const desc = (e.description || '').replace(/"/g, '""');
    return `${i + 1},"${dayjs(e.entryDate).format('YYYY-MM-DD')}","${e.user?.displayName || ''}","${e.program?.programName || ''}","${e.project?.projectName || ''}","${e.subProject?.subProjectName || ''}","${e.wbs?.description || ''}","${desc}",${e.hours},${status}`;
  });
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  message.success('Download started');
}

export default function GeneralReport() {
  const now = dayjs();
  const [filters, setFilters] = useState<any>({ from: now.startOf('month').format('YYYY-MM-DD'), to: now.format('YYYY-MM-DD') });
  const [reportType, setReportType] = useState<'summary' | 'detail'>('summary');
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['generalReport', filters],
    queryFn: () => getGeneralReport(filters),
    enabled: submitted,
  });

  const { data: programs } = useQuery({ queryKey: ['programs'], queryFn: () => getPrograms(true) });
  const { data: projects } = useQuery({ queryKey: ['projectsAll'], queryFn: () => getProjects(undefined, true) });
  const { data: subProjects } = useQuery({ queryKey: ['subProjectsAll'], queryFn: () => getSubProjects(undefined, true) });
  const { data: users } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 1000) });

  const entries = data?.entries || [];
  const set = (key: string, value: any) => { setFilters((f: any) => ({ ...f, [key]: value })); setSubmitted(false); };

  const labelStyle = { fontWeight: 600, color: '#1C2833', marginBottom: 6 } as const;
  const req = <span style={{ color: '#e74c3c' }}>*</span>;

  return (
    <div>
      <div className="page-heading">General Reports</div>

      {/* Filter form */}
      <div className="form-grid clean-form" style={{ maxWidth: 900, marginBottom: 20 }}>
        <div>
          <div style={labelStyle}>Work Type:</div>
          <Select style={{ width: '100%' }} defaultValue={1}
            onChange={(v) => set('workType', v)}
            options={[{ label: 'Billable', value: 1 }, { label: 'Not Billable', value: 0 }]} />
        </div>
        <div>
          <div style={labelStyle}>Program:{req}</div>
          <Select placeholder="-- Choose --" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
            onChange={(v) => set('programId', v)}
            options={(programs || []).map((p: any) => ({ label: p.programName, value: p.id }))} />
        </div>
        <div>
          <div style={labelStyle}>Product Phase:{req}</div>
          <Select placeholder="-- Choose --" allowClear style={{ width: '100%' }}
            onChange={(v) => set('productPhase', v)}
            options={[{ label: 'RnD', value: 'rnd' }, { label: 'Production', value: 'production' }]} />
        </div>
        <div>
          <div style={labelStyle}>Project:{req}</div>
          <Select placeholder="-- Choose --" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
            onChange={(v) => set('projectId', v)}
            options={(projects || []).map((p: any) => ({ label: p.projectName, value: p.id }))} />
        </div>
        <div>
          <div style={labelStyle}>Sub Project:{req}</div>
          <Select placeholder="-- Choose --" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
            onChange={(v) => set('subProjectId', v)}
            options={(subProjects || []).map((p: any) => ({ label: p.subProjectName, value: p.id }))} />
        </div>
        <div>
          <div style={labelStyle}>User:{req}</div>
          <Select placeholder="-- Choose --" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
            onChange={(v) => set('userId', v)}
            options={(users?.items || []).map((u: any) => ({ label: u.displayName || u.username, value: u.id }))} />
        </div>
        <div>
          <div style={labelStyle}>Date:{req}</div>
          <RangePicker style={{ width: '100%' }}
            value={[dayjs(filters.from), dayjs(filters.to)]}
            onChange={(_, d) => { if (d[0]) { setFilters((f: any) => ({ ...f, from: d[0], to: d[1] })); setSubmitted(false); } }}
            format="MM/DD/YYYY" />
        </div>
        <div>
          <div style={labelStyle}>Report Type:</div>
          <Select style={{ width: '100%' }} value={reportType}
            onChange={setReportType}
            options={[{ label: 'Summary', value: 'summary' }, { label: 'Detail', value: 'detail' }]} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Button type="primary" className="submit-btn" onClick={() => setSubmitted(true)}>View</Button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : submitted && data ? (
        <>
          {/* Download buttons */}
          {entries.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <Button icon={<DownloadOutlined />} className="download-btn"
                onClick={() => downloadCsv(entries.filter((e: any) => e.status === 1), 'report_approved.csv')}>
                Download Approved
              </Button>
              <Button icon={<DownloadOutlined />} className="download-btn"
                onClick={() => downloadCsv(entries.filter((e: any) => e.status === 0), 'report_unapproved.csv')}>
                Download Unapproved
              </Button>
              <Button icon={<DownloadOutlined />} className="download-btn"
                onClick={() => downloadCsv(entries, 'report_all.csv')}>
                Both
              </Button>
            </div>
          )}

          {/* Summary stats */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 14 }}>
            <span>Total: <strong style={{ color: '#1677ff' }}>{data.totalHours} hrs</strong></span>
            <span>Approved: <strong style={{ color: '#52c41a' }}>{data.approvedHours} hrs</strong></span>
            <span>Unapproved: <strong style={{ color: '#fa8c16' }}>{data.unapprovedHours} hrs</strong></span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ width: 40, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>#</th>
                  <th style={{ width: 100, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Date</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>User</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Program</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Project</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Sub Project</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>WBS</th>
                  <th style={{ width: 70, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Hours</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Description</th>
                  <th style={{ width: 90, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No Record Found</td></tr>
                ) : entries.map((e: any, i: number) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(e.entryDate).format('YYYY-MM-DD')}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.user?.displayName}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.program?.programName}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.project?.projectName}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.subProject?.subProjectName}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{e.wbs?.description}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{Number(e.hours).toFixed(1)}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>
                      <Tag color={e.status === 1 ? 'green' : e.status === 0 ? 'gold' : 'red'}>
                        {e.status === 1 ? 'Approved' : e.status === 0 ? 'Pending' : 'Rejected'}
                      </Tag>
                    </td>
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
