import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Form, Select, Input, message, Card, Row, Col, Tag, Alert } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, CalendarOutlined, ProjectOutlined, FileTextOutlined } from '@ant-design/icons';
import { createTimeEntry, getPrograms, getProjects, getSubProjects, getWbs, quickAddProject, quickAddSubProject } from '../../api/gtl';
import { getMyAttendance } from '../../api/attendance';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

export default function DataEntry() {
  const [form] = Form.useForm();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [programId, setProgramId] = useState<number | undefined>();
  const [projectId, setProjectId] = useState<number | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newSubProjectName, setNewSubProjectName] = useState('');

  const { data: programs } = useQuery({ queryKey: ['programs'], queryFn: () => getPrograms() });
  const { data: projects } = useQuery({ queryKey: ['projects', programId], queryFn: () => getProjects(programId), enabled: !!programId });
  const { data: subProjects } = useQuery({ queryKey: ['subProjects', projectId], queryFn: () => getSubProjects(projectId), enabled: !!projectId });
  const { data: wbsList } = useQuery({ queryKey: ['wbs'], queryFn: getWbs });

  // Fetch attendance for selected date
  const { data: dayAttendance, isLoading: loadingAtt } = useQuery({
    queryKey: ['dayAtt', selectedDate],
    queryFn: () => getMyAttendance(selectedDate!, selectedDate!),
    enabled: !!selectedDate,
  });

  // Fetch holidays
  const selMonth = selectedDate ? dayjs(selectedDate).month() + 1 : 0;
  const selYear = selectedDate ? dayjs(selectedDate).year() : 0;
  const { data: holidays } = useQuery({
    queryKey: ['holidaysMonth', selYear, selMonth],
    queryFn: () => import('../../api/attendance').then(m => m.getHolidaysForMonth(selYear, selMonth)),
    enabled: !!selectedDate,
  });

  // Determine date status
  const sel = selectedDate ? dayjs(selectedDate) : null;
  const isWeekend = sel && (sel.day() === 0 || sel.day() === 6);

  const holidayName = (() => {
    if (!sel || !holidays) return null;
    for (const h of (holidays as any[])) {
      const from = dayjs(h.fromDate);
      const to = dayjs(h.toDate);
      if (sel.diff(from, 'day') >= 0 && to.diff(sel, 'day') >= 0) return h.description;
    }
    return null;
  })();

  const isHoliday = isWeekend ? 'Weekend' : holidayName;
  const attRecord = (dayAttendance || [])[0];
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
  const isStillInOffice = !!(attRecord?.checkinTime && !attRecord?.checkoutTime && !attRecord?.checkoutState);
  const isMissedCheckout = attRecord?.checkoutState === 'auto';
  const isPastNoCheckout = !isToday && !!(attRecord?.checkinTime && !attRecord?.checkoutTime);
  const isAbsent = !!(selectedDate && !loadingAtt && !attRecord && !isHoliday);

  // Block logic
  const isBlocked = !!(isHoliday || isAbsent || isMissedCheckout || isPastNoCheckout || (isToday && !attRecord && !isHoliday)) && !isStillInOffice;

  // Determine block message
  let blockMsg = '';
  let blockType: 'warning' | 'error' | 'info' = 'error';
  if (isHoliday === 'Weekend') {
    blockMsg = `This is a weekend (${sel?.format('dddd')}). Cannot log time on weekends.`;
    blockType = 'info';
  } else if (isHoliday) {
    blockMsg = `Public holiday: "${isHoliday}". Cannot log time on holidays.`;
    blockType = 'info';
  } else if (isToday && !attRecord && !loadingAtt) {
    blockMsg = 'You have not checked in today. Please mark your attendance first.';
  } else if (isMissedCheckout) {
    blockMsg = 'Missed checkout on this date. Your checkout was auto-closed. Submit an Attendance Request to correct your checkout time, then your hours will be available.';
    blockType = 'warning';
  } else if (isPastNoCheckout) {
    blockMsg = 'No checkout on this date. Submit an Attendance Request to fix it first.';
    blockType = 'warning';
  } else if (isAbsent) {
    blockMsg = `You were absent on ${sel?.format('DD MMM YYYY (dddd)')}. No attendance record found.`;
  }

  // Calculate hours strictly from attendance
  let workedHours = 0;
  let attSummary = '';
  let hoursDisplay = '—';
  if (attRecord?.durationSeconds) {
    const totalSec = Number(attRecord.durationSeconds);
    workedHours = Math.round(totalSec / 1800) * 0.5;
    if (workedHours > 12) workedHours = 12;
    if (workedHours < 0.5) workedHours = 0.5;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    hoursDisplay = m > 0 ? `${h}h ${m}m` : `${h}h`;
    attSummary = `${attRecord.checkinTime?.slice(0, 5)} → ${attRecord.checkoutTime?.slice(0, 5)} (${h}h ${m}m worked)`;
  } else if (isStillInOffice) {
    const checkinStr = attRecord.checkinTime?.slice(0, 5);
    const nowH = dayjs().hour();
    const nowM = dayjs().minute();
    const [ciH, ciM] = (checkinStr || '0:0').split(':').map(Number);
    const diffMin = (nowH * 60 + nowM) - (ciH * 60 + ciM);
    workedHours = Math.round(Math.max(diffMin, 0) / 30) * 0.5;
    if (workedHours < 0.5) workedHours = 0.5;
    const sh = Math.floor(diffMin / 60);
    const sm = diffMin % 60;
    hoursDisplay = sm > 0 ? `${sh}h ${sm}m` : `${sh}h`;
    attSummary = `Checked in at ${checkinStr} — still working (${sh}h ${sm}m so far)`;
  }

  // Auto-set hours when attendance loads
  useEffect(() => {
    if (workedHours > 0) {
      form.setFieldsValue({ hours: workedHours });
    }
  }, [workedHours, selectedDate]);

  const mutation = useMutation({
    mutationFn: createTimeEntry,
    onSuccess: () => {
      message.success('Time entry saved!');
      form.resetFields();
      setProgramId(undefined);
      setProjectId(undefined);
      setSelectedDate(null);
      qc.invalidateQueries({ queryKey: ['timesheetGrouped'] });
    },
    onError: () => message.error('Failed to save'),
  });

  const onFinish = (values: any) => {
    if (isBlocked) { message.error(blockMsg); return; }
    if (!selectedDate) { message.error('Select a date'); return; }
    mutation.mutate({
      ...values,
      userId: user?.id,
      teamId: user?.teamId,
      entryDate: selectedDate,
      hours: workedHours, // Always use calculated hours, not user input
    });
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-heading"><FileTextOutlined style={{ marginRight: 8 }} />Log Work</div>

      {/* Date + Attendance Status */}
      <Card size="small" style={{ borderRadius: 12, marginBottom: 16, border: `2px solid var(--brand-primary, #154360)` }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8}>
            <div style={{ fontWeight: 600, color: 'var(--brand-primary, #154360)', marginBottom: 4, fontSize: 13 }}>
              <CalendarOutlined style={{ marginRight: 6 }} />Select Date
            </div>
            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY (ddd)"
              value={selectedDate ? dayjs(selectedDate) : null}
              onChange={(d) => setSelectedDate(d ? d.format('YYYY-MM-DD') : null)}
              disabledDate={(c) => c && c.isAfter(dayjs(), 'day')} />
          </Col>
          <Col xs={24} sm={10}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 4 }}>
              <ClockCircleOutlined style={{ marginRight: 6 }} />Attendance
            </div>
            {!selectedDate ? (
              <span style={{ color: '#bfbfbf', fontSize: 13 }}>Pick a date to see attendance</span>
            ) : loadingAtt ? (
              <span style={{ color: '#bfbfbf', fontSize: 13 }}>Checking attendance...</span>
            ) : isBlocked ? (
              <span style={{ color: '#ff4d4f', fontSize: 12, fontWeight: 500 }}>{blockMsg.split('.')[0]}</span>
            ) : isStillInOffice ? (
              <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 12 }}>{attSummary}</Tag>
            ) : attSummary ? (
              <Tag color="blue" style={{ fontSize: 12 }}>{attSummary}</Tag>
            ) : null}
          </Col>
          <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 4 }}>Hours</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: isBlocked ? '#ff4d4f' : 'var(--brand-primary, #154360)' }}>
              {isBlocked || !selectedDate ? '—' : hoursDisplay}
            </div>
            {selectedDate && !isBlocked && workedHours > 0 && (
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>From attendance (read-only)</div>
            )}
          </Col>
        </Row>
      </Card>

      {/* Block alert with action link */}
      {selectedDate && isBlocked && (
        <Alert type={blockType} showIcon message={blockMsg} style={{ marginBottom: 16, borderRadius: 8 }}
          description={
            (isMissedCheckout || isPastNoCheckout || isAbsent) ? (
              <a href="/my/attendance-requests" style={{ fontWeight: 600 }}>Go to Attendance Requests to fix this →</a>
            ) : isToday && !attRecord ? (
              <a href="/my/check-in-out" style={{ fontWeight: 600 }}>Go to Check In →</a>
            ) : null
          } />
      )}

      {/* Main form */}
      <Form form={form} onFinish={onFinish} layout="vertical" className="clean-form" initialValues={{ workType: 1 }}
        style={{ opacity: isBlocked ? 0.4 : 1, pointerEvents: isBlocked ? 'none' : 'auto' }}>

        <Card size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--brand-primary, #154360)', marginBottom: 12 }}>
            <ProjectOutlined style={{ marginRight: 6 }} />Project Details
          </div>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="programId" label="Program" rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder="Select program..." showSearch optionFilterProp="label"
                  options={(programs || []).map((p: any) => ({ label: p.programName, value: p.id }))}
                  onChange={(v) => { setProgramId(v); setProjectId(undefined); form.setFieldsValue({ projectId: undefined, subProjectId: undefined }); }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="projectId" label="Project" rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder={programId ? 'Select project...' : 'Select program first'} showSearch optionFilterProp="label" disabled={!programId}
                  options={(projects || []).map((p: any) => ({ label: p.projectName, value: p.id }))}
                  onChange={(v) => { setProjectId(v); form.setFieldsValue({ subProjectId: undefined }); }}
                  dropdownRender={(menu) => (
                    <>{menu}{programId && (
                      <div style={{ padding: '6px 10px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6 }}>
                        <Input size="small" placeholder="New project..." value={newProjectName} onChange={e => setNewProjectName(e.target.value)} style={{ flex: 1 }} />
                        <Button size="small" type="primary" disabled={!newProjectName} onClick={async () => {
                          const p = await quickAddProject({ projectName: newProjectName, programId });
                          setNewProjectName(''); setProjectId(p.id); form.setFieldsValue({ projectId: p.id, subProjectId: undefined });
                          qc.invalidateQueries({ queryKey: ['projects'] });
                        }}>+</Button>
                      </div>
                    )}</>
                  )} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="subProjectId" label="Sub Project" rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder={projectId ? 'Select sub-project...' : 'Select project first'} showSearch optionFilterProp="label" disabled={!projectId}
                  options={(subProjects || []).map((p: any) => ({ label: p.subProjectName, value: p.id }))}
                  dropdownRender={(menu) => (
                    <>{menu}{projectId && programId && (
                      <div style={{ padding: '6px 10px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6 }}>
                        <Input size="small" placeholder="New sub-project..." value={newSubProjectName} onChange={e => setNewSubProjectName(e.target.value)} style={{ flex: 1 }} />
                        <Button size="small" type="primary" disabled={!newSubProjectName} onClick={async () => {
                          const sp = await quickAddSubProject({ subProjectName: newSubProjectName, programId, projectId });
                          setNewSubProjectName(''); form.setFieldsValue({ subProjectId: sp.id }); qc.invalidateQueries({ queryKey: ['subProjects'] });
                        }}>+</Button>
                      </div>
                    )}</>
                  )} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="wbsId" label="WBS" rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder="Select WBS..." showSearch optionFilterProp="label"
                  options={(wbsList || []).map((w: any) => ({ label: w.description, value: w.id }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="workType" label="Work Type">
                <Select options={[{ label: 'Billable', value: 1 }, { label: 'Not Billable', value: 0 }]} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="productPhase" label="Phase" rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder="Select phase..." options={[{ label: 'RnD / Prototyping', value: 'rnd' }, { label: 'Production', value: 'production' }]} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card size="small" style={{ borderRadius: 12, marginBottom: 16 }}>
          <Form.Item name="description" label={<span style={{ fontWeight: 600, color: 'var(--brand-primary, #154360)' }}>What did you work on?</span>}
            rules={[{ required: true, message: 'Describe what you did' }]}>
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="Describe your tasks, deliverables..." style={{ resize: 'none' }} />
          </Form.Item>
        </Card>

        <div style={{ textAlign: 'center' }}>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={isBlocked || !selectedDate || workedHours === 0}
            size="large" style={{ borderRadius: 24, padding: '0 48px', height: 44, fontWeight: 600, fontSize: 15 }}>
            Submit Entry
          </Button>
        </div>
      </Form>
    </div>
  );
}
