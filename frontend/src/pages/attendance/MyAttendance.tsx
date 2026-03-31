import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Typography, Select, Space, Tag, Card, Row, Col, Statistic, Tooltip, Modal, Form, TimePicker, Input, Button, message } from 'antd';
import { WarningOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getMyAttendance, getHolidaysForMonth, createAttendanceRequest } from '../../api/attendance';
import { getLeaves } from '../../api/leaves';
import { useAuthStore } from '../../store/authStore';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const MAX_WORK_SECONDS = 43200; // 12h cap

function isWeekend(date: dayjs.Dayjs) { return date.day() === 0 || date.day() === 6; }

function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null || totalSeconds === undefined) return null;
  const secs = Math.round(totalSeconds);
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function LiveTimer({ checkinTime }: { checkinTime: string }) {
  const [now, setNow] = useState(dayjs());
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);
  const ci = dayjs(`${dayjs().format('YYYY-MM-DD')} ${checkinTime}`);
  const diffSecs = now.diff(ci, 'second');
  return (
    <span style={{ color: '#52c41a', fontWeight: 600 }}>
      <ClockCircleOutlined style={{ marginRight: 4 }} />
      {formatDuration(diffSecs)}
    </span>
  );
}

export default function MyAttendance() {
  const now = dayjs();
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);

  const from = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const to = from.endOf('month');
  const daysInMonth = to.date();
  const isCurrentMonth = year === now.year() && month === now.month() + 1;

  const qc = useQueryClient();
  const [fixModal, setFixModal] = useState<any>(null); // { date, checkinTime, type: 'missed'|'absent' }
  const [fixForm] = Form.useForm();

  const fixMut = useMutation({
    mutationFn: createAttendanceRequest,
    onSuccess: () => {
      message.success('Request submitted! Your Team Lead will review it.');
      setFixModal(null);
      fixForm.resetFields();
      qc.invalidateQueries({ queryKey: ['myAttendance'] });
    },
    onError: (err: any) => {
      console.error('Fix request error:', err?.response?.data || err);
      message.error('Failed: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    },
  });

  const openFixModal = (record: any, type: 'missed' | 'absent') => {
    const dateStr = record.date; // "05 Mar, 2026 - Wednesday"
    // Extract the actual date from calendarData key
    const d = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(record.key).padStart(2, '0')}`);
    setFixModal({ date: d.format('YYYY-MM-DD'), checkinTime: record.checkinTimeRaw, type });
    fixForm.setFieldsValue({
      checkinDate: d,
      checkinTime: record.checkinTimeRaw ? dayjs(`2000-01-01 ${record.checkinTimeRaw}`) : undefined,
      attendanceType: 'full_day',
      description: type === 'missed'
        ? `Missed checkout on ${d.format('DD MMM YYYY')}. Requesting correction.`
        : `Was present on ${d.format('DD MMM YYYY')} but forgot to mark attendance.`,
    });
  };

  const handleFixSubmit = (values: any) => {
    fixMut.mutate({
      attendanceType: 'full_day',
      checkinDate: fixModal.date,
      checkinTime: values.checkinTime?.format('HH:mm:ss') || fixModal.checkinTime?.slice(0, 8) || null,
      checkoutDate: fixModal.date,
      checkoutTime: values.checkoutTime?.format('HH:mm:ss') || null,
      description: values.description || `Fix request for ${fixModal.date}`,
    });
  };

  const user = useAuthStore((s) => s.user);

  // Fetch leaves for this user
  const { data: leaves } = useQuery({
    queryKey: ['myLeaves', user?.id],
    queryFn: () => getLeaves(user?.id),
    enabled: !!user?.id,
  });

  // Build leave date map: 'YYYY-MM-DD' → { type, status }
  const leaveDates = new Map<string, { type: string; status: string }>();
  (leaves || []).forEach((l: any) => {
    const lFrom = dayjs(l.fromDate);
    const lTo = dayjs(l.toDate);
    let d = lFrom;
    while (d.isBefore(lTo) || d.isSame(lTo, 'day')) {
      leaveDates.set(d.format('YYYY-MM-DD'), { type: l.leaveType?.replace('_', ' ') || 'leave', status: l.status });
      d = d.add(1, 'day');
    }
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ['myAttendance', from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')],
    queryFn: () => getMyAttendance(from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')),
  });

  // Fetch holidays from DB
  const { data: holidays } = useQuery({
    queryKey: ['holidaysMonth', year, month],
    queryFn: () => getHolidaysForMonth(year, month),
  });

  // Build set of holiday dates for this month
  const holidayDates = new Map<string, string>(); // 'YYYY-MM-DD' → holiday name
  (holidays || []).forEach((h: any) => {
    const hFrom = dayjs(h.fromDate);
    const hTo = dayjs(h.toDate);
    let d = hFrom;
    while (d.isBefore(hTo) || d.isSame(hTo, 'day')) {
      if (d.month() + 1 === month && d.year() === year) {
        holidayDates.set(d.format('YYYY-MM-DD'), h.description);
      }
      d = d.add(1, 'day');
    }
  });

  const recordMap = new Map<string, any>();
  (records || []).forEach((r: any) => {
    const key = dayjs(r.checkinDate).format('YYYY-MM-DD');
    recordMap.set(key, r);
  });

  const calendarData: any[] = [];
  let totalSeconds = 0;
  let presentDays = 0;
  let absentDays = 0;
  let holidayDays = 0;
  let suspiciousCount = 0;
  let missedCheckouts = 0;
  let leaveDayCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    const key = date.format('YYYY-MM-DD');
    const record = recordMap.get(key);
    const weekend = isWeekend(date);
    const isFuture = date.isAfter(now, 'day');
    const isToday = date.isSame(now, 'day');

    const holidayName = holidayDates.get(key);
    const isHoliday = weekend || !!holidayName;

    const leaveInfo = leaveDates.get(key);

    let duration = '';
    let durSecs = 0;
    let isSuspicious = false;
    let isMissedCheckout = false;
    let isLive = false;
    let holidayLabel = '';
    let isOnLeave = false;
    let leaveType = '';
    let leaveStatus = '';
    let status: 'present' | 'absent' | 'holiday' | 'future' | 'leave' = 'absent';

    if (isHoliday) {
      status = 'holiday';
      holidayDays++;
      holidayLabel = holidayName || (weekend ? 'Weekend' : 'Holiday');
    } else if (isFuture) {
      status = 'future';
    } else if (record) {
      status = 'present';
      presentDays++;

      // Detect missed checkout (auto-closed at 23:59:59)
      isMissedCheckout = record.checkoutState === 'auto';
      if (isMissedCheckout) missedCheckouts++;

      // Live timer for today if no checkout
      if (isToday && record.checkinTime && !record.checkoutTime) {
        isLive = true;
      }

      if (record.durationSeconds !== null && record.durationSeconds !== undefined && !isLive) {
        durSecs = Math.round(Number(record.durationSeconds));
        isSuspicious = record.suspicious || durSecs > MAX_WORK_SECONDS;
        if (isSuspicious) suspiciousCount++;
        const cappedSecs = Math.min(Math.max(0, durSecs), MAX_WORK_SECONDS);
        totalSeconds += isMissedCheckout ? 0 : cappedSecs; // Don't count missed checkouts in total
        duration = formatDuration(durSecs) || '';
      }
    } else if (!isFuture) {
      if (leaveInfo) {
        status = 'leave';
        isOnLeave = true;
        leaveType = leaveInfo.type;
        leaveStatus = leaveInfo.status;
        leaveDayCount++;
      } else {
        absentDays++;
      }
    }

    let checkinStr = '';
    let checkoutStr = '';
    if (record?.checkinTime) {
      const ciDate = dayjs(record.checkinDate);
      checkinStr = `${ciDate.format('DD-MMM-YY')} ${record.checkinTime.slice(0, 8)}`;
    }
    if (record?.checkoutTime && !isLive) {
      const coDate = record.checkoutDate ? dayjs(record.checkoutDate) : date;
      checkoutStr = `${coDate.format('DD-MMM-YY')} ${record.checkoutTime.slice(0, 8)}`;
    }

    calendarData.push({
      key: d, date: `${String(d).padStart(2, '0')} ${months[month - 1].slice(0, 3)}, ${year} - ${dayNames[date.day()]}`,
      duration, durationSeconds: durSecs, isSuspicious, isMissedCheckout, isLive,
      checkin: checkinStr, checkout: checkoutStr, checkinTimeRaw: record?.checkinTime,
      status, checkinState: record?.checkinState, holidayLabel,
      isOnLeave, leaveType, leaveStatus,
    });
  }

  const totalH = Math.floor(totalSeconds / 3600);
  const totalM = Math.floor((totalSeconds % 3600) / 60);
  const totalS = totalSeconds % 60;
  const countableDays = presentDays - missedCheckouts;
  const avgSecs = countableDays > 0 ? Math.round(totalSeconds / countableDays) : 0;
  const avgH = Math.floor(avgSecs / 3600);
  const avgM = Math.floor((avgSecs % 3600) / 60);
  const avgS = avgSecs % 60;
  const workingDays = daysInMonth - holidayDays;

  const columns = [
    {
      title: 'Date', dataIndex: 'date', width: 220,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: 'Duration', dataIndex: 'duration', width: 150,
      render: (v: string, r: any) => {
        if (r.status === 'holiday') return (
          <Tooltip title={r.holidayLabel}>
            <span style={{ color: '#1677ff', fontWeight: 500 }}>{r.holidayLabel || 'Holiday'}</span>
          </Tooltip>
        );
        if (r.status === 'leave') return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag color={r.leaveStatus === 'approved' ? 'green' : r.leaveStatus === 'pending' ? 'gold' : 'red'}>
              {r.leaveType}{r.leaveStatus === 'pending' ? ' (pending)' : ''}
            </Tag>
          </span>
        );
        if (r.status === 'absent') return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ color: '#ff4d4f', fontWeight: 500 }}>Absent</span>
            <Tooltip title="Were you present but forgot to check in? Request a correction">
              <Tag color="blue" style={{ cursor: 'pointer', fontSize: 10 }} onClick={() => openFixModal(r, 'absent')}>
                <EditOutlined /> Forgot Check-in
              </Tag>
            </Tooltip>
            <Tooltip title="Apply for leave for this date">
              <Tag color="orange" style={{ cursor: 'pointer', fontSize: 10 }} onClick={() => window.location.href = '/my/apply-leave'}>
                Apply Leave
              </Tag>
            </Tooltip>
          </span>
        );
        if (r.status === 'future') return <span style={{ color: '#d9d9d9' }}>—</span>;

        if (r.isLive) return <LiveTimer checkinTime={r.checkinTimeRaw?.slice(0, 8)} />;

        if (r.isMissedCheckout) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag color="error" icon={<WarningOutlined />}>Missed Checkout</Tag>
              <Tooltip title="Submit a request to fix this checkout — your Team Lead will approve it">
                <Tag color="blue" style={{ cursor: 'pointer', fontSize: 11 }} onClick={() => openFixModal(r, 'missed')}>
                  <EditOutlined /> Fix
                </Tag>
              </Tooltip>
            </span>
          );
        }

        if (r.isSuspicious) {
          return (
            <Tooltip title={`Exceeded 12h. Actual: ${v}. Capped at 12:00:00 in averages.`}>
              <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                <WarningOutlined style={{ marginRight: 4 }} />{v}
              </span>
            </Tooltip>
          );
        }

        if (!v) return <span style={{ color: '#fa8c16' }}>00:00:00</span>;
        // < 7h = red, 7-9h = orange, 9h = normal, 9-12h = overtime (blue)
        const secs = r.durationSeconds;
        // < 8h = red (incomplete), 8-9h = normal (full day + break), 9h+ = overtime (after break)
        const color = secs < 28800 ? '#ff4d4f' : secs <= 43200 ? '#262626' : '#ff4d4f';
        const isOvertime = secs > 32400 && secs <= 43200; // 9h+ = overtime (1h break excluded)
        return (
          <span style={{ color, fontWeight: 500 }}>
            {v}
            {isOvertime && <Tag color="blue" style={{ marginLeft: 6, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>OT</Tag>}
          </span>
        );
      },
    },
    { title: 'Check-In', dataIndex: 'checkin', width: 200 },
    {
      title: 'Check-Out', dataIndex: 'checkout', width: 200,
      render: (v: string, r: any) => {
        if (r.isLive) return <Tag color="green">In Office</Tag>;
        if (r.isMissedCheckout) return <Tag color="orange">Auto: 23:59:59</Tag>;
        return v;
      },
    },
    {
      title: 'Via', dataIndex: 'checkinState', width: 70,
      render: (v: string) => v ? <Tag color={v === 'rfid' ? 'blue' : v === 'auto' ? 'purple' : 'default'}>{v}</Tag> : null,
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>My Attendance</Typography.Title>

      <Space style={{ marginBottom: 16 }}>
        <Select value={month} onChange={setMonth} style={{ width: 140 }}
          options={months.map((m, i) => ({ label: m, value: i + 1 }))} />
        <Select value={year} onChange={setYear} style={{ width: 100 }}
          options={[2024, 2025, 2026, 2027].map((y) => ({ label: String(y), value: y }))} />
      </Space>

      {(suspiciousCount > 0 || missedCheckouts > 0) && (
        <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 18, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#1C2833', fontSize: 14, marginBottom: 6 }}>
                Attendance Issues Detected
              </div>
              {missedCheckouts > 0 && (
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <Tag color="error">{missedCheckouts} missed checkout{missedCheckouts > 1 ? 's' : ''}</Tag>
                  <strong>Excluded</strong> from your total and average calculations. These days show as "Missed Checkout" and do not count toward your working hours.
                </div>
              )}
              {suspiciousCount > 0 && (
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <Tag color="warning">{suspiciousCount} suspicious entr{suspiciousCount > 1 ? 'ies' : 'y'}</Tag>
                  Sessions exceeding 12 hours are <strong>capped at 12h</strong> in averages.
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <strong>How to fix:</strong> Go to{' '}
                <a href="/my/attendance-requests" style={{ color: '#1677ff', fontWeight: 600 }}>Attendance Requests</a>
                {' '}→ New Request → enter the correct checkout time → your Team Lead will approve it and your records will be updated.
              </div>
            </div>
          </div>
        </div>
      )}

      <Table columns={columns} dataSource={calendarData} loading={isLoading} pagination={false}
        size="small" bordered scroll={{ x: 800 }}
        rowClassName={(r) => r.status === 'holiday' ? 'row-holiday' : r.status === 'leave' ? 'row-leave' : r.status === 'absent' ? 'row-absent' : r.isMissedCheckout ? 'row-suspicious' : r.isSuspicious ? 'row-suspicious' : ''}
        style={{ marginBottom: 24 }} />

      <Card style={{ borderRadius: 12 }}>
        <Row gutter={[16, 12]}>
          <Col xs={12} sm={8} md={4}>
            <Statistic title={<span>Total Work Time {missedCheckouts > 0 ? <Tag color="blue" style={{ fontSize: 10 }}>excl. missed</Tag> : ''}</span>}
              value={`${totalH}:${String(totalM).padStart(2, '0')}:${String(totalS).padStart(2, '0')}`} valueStyle={{ fontSize: 18, fontWeight: 600 }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title={<span>Avg Work Time {missedCheckouts > 0 ? <Tag color="blue" style={{ fontSize: 10 }}>excl. missed</Tag> : ''}</span>}
              value={`${avgH}:${String(avgM).padStart(2, '0')}:${String(avgS).padStart(2, '0')}`}
              valueStyle={{ fontSize: 18, fontWeight: 600 }} />
            {countableDays > 0 && <div style={{ fontSize: 11, color: '#8c8c8c' }}>Based on {countableDays} valid day{countableDays !== 1 ? 's' : ''}</div>}
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="Presents" value={presentDays} valueStyle={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="Absents" value={absentDays} valueStyle={{ fontSize: 18, fontWeight: 600, color: '#ff4d4f' }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="On Leave" value={leaveDayCount} valueStyle={{ fontSize: 18, fontWeight: 600, color: '#fa8c16' }} />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="Missed C/O" value={missedCheckouts}
              prefix={missedCheckouts > 0 ? <WarningOutlined /> : undefined}
              valueStyle={{ fontSize: 18, fontWeight: 600, color: missedCheckouts > 0 ? '#fa8c16' : '#52c41a' }} />
            {missedCheckouts > 0 && <div style={{ fontSize: 11, color: '#fa8c16' }}>Not counted in avg</div>}
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Statistic title="Working Days" value={workingDays} valueStyle={{ fontSize: 18, fontWeight: 600 }} />
          </Col>
        </Row>
      </Card>

      {/* Fix Request Modal */}
      <Modal title={fixModal?.type === 'missed' ? 'Fix Missed Checkout' : 'Request Attendance Correction'}
        open={!!fixModal} onCancel={() => setFixModal(null)}
        onOk={() => fixForm.submit()} confirmLoading={fixMut.isPending} okText="Submit Request">
        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {fixModal?.type === 'missed' ? (
            <>Your checkout on <strong>{fixModal?.date}</strong> was auto-closed. Enter the correct checkout time below — your Team Lead will review and approve.</>
          ) : (
            <>You were marked absent on <strong>{fixModal?.date}</strong>. If you were present, enter your check-in and check-out times — your Team Lead will review.</>
          )}
        </div>
        <Form form={fixForm} onFinish={handleFixSubmit} layout="vertical" className="clean-form">
          <div className="form-grid">
            {fixModal?.type === 'absent' && (
              <Form.Item name="checkinTime" label="Check-In Time" rules={[{ required: true, message: 'Required' }]}>
                <TimePicker style={{ width: '100%' }} format="HH:mm:ss" />
              </Form.Item>
            )}
            {fixModal?.type === 'missed' && (
              <Form.Item label="Check-In Time">
                <Input value={fixModal?.checkinTime?.slice(0, 8) || '-'} disabled style={{ background: '#fafafa' }} />
              </Form.Item>
            )}
            <Form.Item name="checkoutTime" label="Correct Check-Out Time" rules={[{ required: true, message: 'Required' }]}>
              <TimePicker style={{ width: '100%' }} format="HH:mm:ss" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Reason">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-holiday td { background: #f0f7ff !important; }
        .row-leave td { background: #fff7e6 !important; }
        .row-absent td { background: #fff2f0 !important; }
        .row-suspicious td { background: #fffbe6 !important; }
      `}</style>
    </div>
  );
}
