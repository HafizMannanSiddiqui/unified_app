import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, DatePicker, Button, Spin, Card, Row, Col, Statistic, Tag, Modal, Form, message } from 'antd';
import { WarningOutlined, ClockCircleOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import apiClient from '../../api/client';
import { getUsers } from '../../api/users';

const { RangePicker } = DatePicker;
const getPersonDetail = (userId: number, from: string, to: string) =>
  apiClient.get('/attendance/person-detail', { params: { userId, from, to } }).then(r => r.data);
const markWfh = (userId: number, date: string) =>
  apiClient.post('/attendance/mark-wfh', { userId, date }).then(r => r.data);

export default function PersonDetail() {
  const now = dayjs();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<number | undefined>();
  const [range, setRange] = useState<[string, string]>([now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')]);
  const [submitted, setSubmitted] = useState(false);

  // Auto-fill from URL params (when clicking from Lead Insights)
  useEffect(() => {
    const urlUser = searchParams.get('user');
    const urlFrom = searchParams.get('from');
    const urlTo = searchParams.get('to');
    if (urlUser) {
      setUserId(+urlUser);
      if (urlFrom && urlTo) setRange([urlFrom, urlTo]);
      setSubmitted(true);
    }
  }, [searchParams]);
  const [wfhModal, setWfhModal] = useState(false);
  const [wfhForm] = Form.useForm();

  const { data: users } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 1000) });

  // Extra info when person selected
  const { data: allEmails } = useQuery({
    queryKey: ['userEmails', userId],
    queryFn: () => apiClient.get('/users/all-emails', { params: { userId } }).then(r => r.data),
    enabled: submitted && !!userId,
  });
  const { data: managerHistory } = useQuery({
    queryKey: ['mgrHistory', userId],
    queryFn: () => apiClient.get('/users/manager-history', { params: { userId } }).then(r => r.data),
    enabled: submitted && !!userId,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['personDetail', userId, range],
    queryFn: () => getPersonDetail(userId!, range[0], range[1]),
    enabled: submitted && !!userId,
  });

  const wfhMut = useMutation({
    mutationFn: (values: any) => markWfh(userId!, values.date.format('YYYY-MM-DD')),
    onSuccess: (res: any) => {
      if (res.error) message.error(res.error);
      else { message.success(res.message); setWfhModal(false); wfhForm.resetFields(); qc.invalidateQueries({ queryKey: ['personDetail'] }); }
    },
  });

  return (
    <div>
      <div className="page-heading">Employee Detail Report</div>

      <div className="form-grid clean-form" style={{ maxWidth: 900, marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Employee:</div>
          <Select placeholder="-- Choose --" showSearch optionFilterProp="label" style={{ width: '100%' }}
            onChange={(v) => { setUserId(v); setSubmitted(false); }}
            options={(users?.items || []).map((u: any) => ({ label: `${u.displayName || u.username} (${u.username})`, value: u.id }))} />
        </div>
        <div>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Date Range:</div>
          <RangePicker style={{ width: '100%' }} value={[dayjs(range[0]), dayjs(range[1])]}
            onChange={(_, d) => { if (d[0]) { setRange([d[0], d[1]]); setSubmitted(false); } }} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24, display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Button type="primary" className="submit-btn" onClick={() => setSubmitted(true)} disabled={!userId}>View</Button>
        {userId && <Button icon={<HomeOutlined />} onClick={() => setWfhModal(true)}>Mark WFH</Button>}
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : data ? (
        <>
          {/* Person info */}
          <Card size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
            <Row gutter={24}>
              <Col flex="auto">
                <div style={{ fontSize: 18, fontWeight: 700 }}>{data.user?.displayName}</div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                  @{data.user?.username} | {data.user?.team?.teamName || '-'} | {data.user?.designation?.name || '-'}
                </div>
                {/* All emails */}
                {allEmails?.allEmails?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    {allEmails.allEmails.map((e: string, i: number) => (
                      <Tag key={i} color={e?.includes('angularspring') ? 'red' : e?.includes('venturetronics') ? 'orange' : e?.includes('raythorne') ? 'geekblue' : e?.includes('powersoft') ? 'gold' : 'default'}
                        style={{ fontSize: 11 }}>
                        {e}
                      </Tag>
                    ))}
                  </div>
                )}
                {allEmails?.allUsernames?.length > 1 && (
                  <div style={{ fontSize: 11, color: '#999' }}>
                    Also known as: {allEmails.allUsernames.filter((u: string) => u !== data.user?.username).join(', ')}
                  </div>
                )}
              </Col>
              {/* Manager tenure */}
              <Col>
                {(managerHistory || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Reports To:</div>
                    {(managerHistory || []).map((m: any) => {
                      const months = Math.floor(m.daysSince / 30);
                      const years = Math.floor(months / 12);
                      const rem = months % 12;
                      const tenure = years > 0 ? `${years}y ${rem}m` : `${months}m`;
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Tag color={m.is_primary ? 'blue' : 'default'}>{m.managerName}</Tag>
                          <span style={{ fontSize: 11, color: '#999' }}>since {tenure}</span>
                          {m.is_primary && <Tag color="gold" style={{ fontSize: 9 }}>Primary</Tag>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Col>
            </Row>
          </Card>

          {/* Summary */}
          <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={4}><Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #52c41a' }}><Statistic title="Days Present" value={data.summary.totalDays} valueStyle={{ fontSize: 18 }} /></Card></Col>
            <Col xs={12} md={4}><Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #1677ff' }}><Statistic title="Total Hours" value={data.summary.totalHours} suffix="h" valueStyle={{ fontSize: 18 }} /></Card></Col>
            <Col xs={12} md={4}><Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #722ed1' }}><Statistic title="Avg Hours" value={data.summary.avgHours} suffix="h/day" valueStyle={{ fontSize: 18 }} /></Card></Col>
            <Col xs={12} md={4}><Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #fa8c16' }}><Statistic title="GTL Hours" value={data.summary.gtlHours} suffix="h" valueStyle={{ fontSize: 18 }} /></Card></Col>
            <Col xs={12} md={4}><Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #ff4d4f' }}><Statistic title="Missed C/O" value={data.summary.missedCount} valueStyle={{ fontSize: 18, color: data.summary.missedCount > 0 ? '#ff4d4f' : undefined }} /></Card></Col>
            <Col xs={12} md={4}><Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #e67e22' }}><Statistic title="No GTL Days" value={data.summary.noGtlDays} valueStyle={{ fontSize: 18, color: data.summary.noGtlDays > 5 ? '#ff4d4f' : undefined }} /></Card></Col>
          </Row>

          {/* Attendance detail */}
          <Card title="Attendance Detail" size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#154360', color: '#fff' }}>
                  <th style={{ padding: '6px 10px', fontSize: 12 }}>Date</th>
                  <th style={{ padding: '6px 10px', fontSize: 12 }}>Check In</th>
                  <th style={{ padding: '6px 10px', fontSize: 12 }}>Check Out</th>
                  <th style={{ padding: '6px 10px', fontSize: 12 }}>Hours</th>
                  <th style={{ padding: '6px 10px', fontSize: 12 }}>Via</th>
                  <th style={{ padding: '6px 10px', fontSize: 12 }}>Issues</th>
                </tr></thead>
                <tbody>
                  {(data.attendance || []).map((a: any, i: number) => {
                    const isMissed = a.checkoutState === 'auto';
                    const isWfh = a.checkinState === 'manual' && a.checkoutState === 'manual' && a.checkinTime === '09:00:00';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: isMissed ? '#fff7e6' : isWfh ? '#f0fff4' : undefined }}>
                        <td style={{ padding: '5px 10px', fontSize: 12 }}>{dayjs(a.date).format('DD MMM (ddd)')}</td>
                        <td style={{ padding: '5px 10px', fontSize: 12 }}>{a.checkinTime?.slice(0, 8)}</td>
                        <td style={{ padding: '5px 10px', fontSize: 12 }}>{a.checkoutTime?.slice(0, 8) || '-'}</td>
                        <td style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600 }}>{a.hours || '-'}</td>
                        <td style={{ padding: '5px 10px', fontSize: 12 }}><Tag style={{ fontSize: 10 }}>{isWfh ? 'WFH' : a.checkinState}</Tag></td>
                        <td style={{ padding: '5px 10px', fontSize: 12 }}>
                          {isMissed && <Tag color="orange" style={{ fontSize: 10 }}>Missed C/O</Tag>}
                          {isWfh && <Tag color="green" style={{ fontSize: 10 }}>WFH</Tag>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Late arrivals removed */}

          {/* Attendance Images */}
          {(data.images || []).length > 0 && (
            <Card title={<>Attendance Photos ({data.images.length})</>}
              size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {data.images.map((img: any, i: number) => (
                  <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                    <img src={img.file} alt="" style={{ width: '100%', height: 120, objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div style={{ padding: '4px 8px', fontSize: 11, background: '#fafafa', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{img.date}</span>
                      <Tag color={img.action === 'checkin' ? 'green' : 'red'} style={{ fontSize: 10, margin: 0 }}>{img.action}</Tag>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* No GTL days */}
          {data.noGtlDays.length > 0 && (
            <Card title={<><ClockCircleOutlined style={{ color: '#e67e22', marginRight: 6 }} />Days Present But No GTL ({data.noGtlDays.length})</>}
              size="small" style={{ borderRadius: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.noGtlDays.map((d: string, i: number) => (
                  <Tag key={i} color="orange">{dayjs(d).format('DD MMM (ddd)')}</Tag>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : null}

      {/* WFH Modal */}
      <Modal title="Mark Work From Home" open={wfhModal} onCancel={() => setWfhModal(false)} onOk={() => wfhForm.submit()} confirmLoading={wfhMut.isPending}>
        <Form form={wfhForm} onFinish={(v: any) => wfhMut.mutate(v)} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
          <Form.Item name="date" label="WFH Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ fontSize: 12, color: '#666' }}>This will create an attendance record (09:00–18:00) marked as WFH for the selected employee.</div>
        </Form>
      </Modal>
    </div>
  );
}
