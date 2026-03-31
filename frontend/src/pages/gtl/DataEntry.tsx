import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Form, Select, Input, message, Tag } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { createTimeEntry, getPrograms, getProjects, getSubProjects, getWbs, quickAddProject, quickAddSubProject } from '../../api/gtl';
import { getMyAttendance } from '../../api/attendance';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';
import dayjs from 'dayjs';

const hoursOptions = Array.from({ length: 24 }, (_, i) => ({
  label: `${(i + 1) * 0.5}`,
  value: (i + 1) * 0.5,
}));

export default function DataEntry() {
  const [form] = Form.useForm();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [programId, setProgramId] = useState<number | undefined>();
  const [projectId, setProjectId] = useState<number | undefined>();
  const [descLength, setDescLength] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newSubProjectName, setNewSubProjectName] = useState('');

  const { data: programs } = useQuery({ queryKey: ['programs'], queryFn: () => getPrograms() });
  const { data: projects } = useQuery({ queryKey: ['projects', programId], queryFn: () => getProjects(programId), enabled: !!programId });
  const { data: subProjects } = useQuery({ queryKey: ['subProjects', projectId], queryFn: () => getSubProjects(projectId), enabled: !!projectId });
  const { data: wbsList } = useQuery({ queryKey: ['wbs'], queryFn: getWbs });

  // Fetch attendance for selected date to auto-fill hours
  const { data: dayAttendance } = useQuery({
    queryKey: ['dayAtt', selectedDate],
    queryFn: () => getMyAttendance(selectedDate!, selectedDate!),
    enabled: !!selectedDate,
  });

  // Fetch holidays for the selected month
  const selMonth = selectedDate ? dayjs(selectedDate).month() + 1 : 0;
  const selYear = selectedDate ? dayjs(selectedDate).year() : 0;
  const { data: holidays } = useQuery({
    queryKey: ['holidaysMonth', selYear, selMonth],
    queryFn: () => import('../../api/attendance').then(m => m.getHolidaysForMonth(selYear, selMonth)),
    enabled: !!selectedDate,
  });

  // Check if selected date is a holiday
  const isHoliday = (() => {
    if (!selectedDate || !holidays) return null;
    const sel = dayjs(selectedDate);
    for (const h of (holidays as any[])) {
      const from = dayjs(h.fromDate);
      const to = dayjs(h.toDate);
      if ((sel.isAfter(from.subtract(1, 'day')) || sel.isSame(from, 'day')) && (sel.isBefore(to.add(1, 'day')) || sel.isSame(to, 'day'))) {
        return h.description;
      }
    }
    // Check weekend
    if (sel.day() === 0 || sel.day() === 6) return 'Weekend';
    return null;
  })();

  // Determine blocking status
  const attRecord = (dayAttendance || [])[0];
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');
  const isStillInOffice = attRecord?.checkinTime && !attRecord?.checkoutTime && !attRecord?.checkoutState;
  const isMissedCheckout = attRecord?.checkoutState === 'auto';
  const isPastNoCheckout = !isToday && attRecord?.checkinTime && !attRecord?.checkoutTime;
  const isAbsent = selectedDate && !attRecord && !isHoliday;

  // Today + still in office → ALLOW (hours will update on checkout)
  // Today + not checked in → BLOCK
  // Past + missed checkout (auto) → BLOCK with request option
  // Past + no checkout yet → BLOCK with request option
  const isBlocked = !!(isHoliday || isAbsent || isMissedCheckout || isPastNoCheckout || (isToday && !attRecord && !isHoliday)) && !(isToday && isStillInOffice);

  let blockReason = '';
  let blockType: 'holiday' | 'absent' | 'missed' | 'notcheckedin' | '' = '';
  if (isHoliday) { blockReason = `This date is a holiday (${isHoliday}). Cannot log time on holidays.`; blockType = 'holiday'; }
  else if (isToday && !attRecord) { blockReason = 'You have not checked in today. Please check in first before logging time.'; blockType = 'notcheckedin'; }
  else if (isToday && isStillInOffice) { /* NOT blocked — allow with message */ }
  else if (isMissedCheckout || isPastNoCheckout) { blockReason = 'You have a missed checkout on this date. Request a checkout correction from your Team Lead.'; blockType = 'missed'; }
  else if (isAbsent) { blockReason = 'You were absent on this date. Cannot log time without attendance.'; blockType = 'absent'; }

  // Calculate worked hours from attendance
  let workedHours = 0;
  let attInfo = '';
  if (attRecord?.durationSeconds) {
    workedHours = Math.round(Number(attRecord.durationSeconds) / 1800) * 0.5; // Round to nearest 0.5
    if (workedHours > 12) workedHours = 8; // Cap suspicious
    if (workedHours < 0.5) workedHours = 0;
    const h = Math.floor(Number(attRecord.durationSeconds) / 3600);
    const m = Math.floor((Number(attRecord.durationSeconds) % 3600) / 60);
    attInfo = `${attRecord.checkinTime?.slice(0, 5)} → ${attRecord.checkoutTime?.slice(0, 5) || 'still in'} (${h}h ${m}m)`;
  } else if (attRecord?.checkinTime) {
    attInfo = `Checked in at ${attRecord.checkinTime?.slice(0, 5)} — no checkout yet`;
  }

  const handleDateChange = (date: any) => {
    if (date) {
      const dateStr = date.format('YYYY-MM-DD');
      setSelectedDate(dateStr);
      // Auto-fill hours after a short delay (data needs to load)
      setTimeout(() => {
        if (workedHours > 0) {
          form.setFieldsValue({ hours: workedHours });
        }
      }, 500);
    } else {
      setSelectedDate(null);
    }
  };

  // Auto-fill hours when attendance data arrives
  const prevWorkedRef = useState(0);
  if (workedHours > 0 && workedHours !== prevWorkedRef[0]) {
    prevWorkedRef[1](workedHours);
    form.setFieldsValue({ hours: workedHours });
  }
  // For today (still in office), set 8h as default
  const isToday2 = selectedDate === dayjs().format('YYYY-MM-DD');
  const isStillInOffice2 = attRecord?.checkinTime && !attRecord?.checkoutTime && !attRecord?.checkoutState;
  if (isToday2 && isStillInOffice2 && !form.getFieldValue('hours')) {
    form.setFieldsValue({ hours: 8 });
  }

  const mutation = useMutation({
    mutationFn: createTimeEntry,
    onSuccess: () => {
      message.success('Time entry saved successfully!');
      form.resetFields();
      setProgramId(undefined);
      setProjectId(undefined);
      setDescLength(0);
      setSelectedDate(null);
      qc.invalidateQueries({ queryKey: ['timesheetGrouped'] });
    },
    onError: () => message.error('Failed to save entry'),
  });

  const onFinish = (values: any) => {
    if (isBlocked) {
      message.error(blockReason);
      return;
    }
    mutation.mutate({
      ...values,
      userId: user?.id,
      teamId: user?.teamId,
      entryDate: values.entryDate.format('YYYY-MM-DD'),
    });
  };

  const L = (text: string, required = false) => (
    <span style={{ fontWeight: 600, color: '#1C2833' }}>
      {text}{required && <span style={{ color: '#e74c3c' }}>*</span>}
    </span>
  );

  return (
    <div>
      <div className="page-heading">Data Entry</div>

      {/* Still in office today — info banner */}
      {selectedDate && isToday && isStillInOffice && (
        <div style={{
          padding: '12px 18px', borderRadius: 8, marginBottom: 16,
          background: '#f6ffed', border: '1px solid #b7eb8f',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18, color: '#52c41a' }}>●</span>
          <div>
            <div style={{ fontWeight: 600, color: '#1C2833', fontSize: 14 }}>You're currently in the office (checked in at {attRecord?.checkinTime?.slice(0, 5)})</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              Hours will be automatically calculated when you check out. You can submit now and the hours will reflect your full day.
            </div>
          </div>
        </div>
      )}

      {/* Block banner */}
      {selectedDate && isBlocked && (
        <div style={{
          padding: '12px 18px', borderRadius: 8, marginBottom: 16,
          background: blockType === 'holiday' ? '#f0f7ff' : blockType === 'absent' || blockType === 'notcheckedin' ? '#fff2f0' : '#fff7e6',
          border: `1px solid ${blockType === 'holiday' ? '#91caff' : blockType === 'absent' || blockType === 'notcheckedin' ? '#ffccc7' : '#ffe58f'}`,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 20, marginTop: 2 }}>
            {blockType === 'holiday' ? '📅' : blockType === 'notcheckedin' ? '🔴' : blockType === 'absent' ? '🚫' : '⚠️'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#1C2833', fontSize: 14 }}>{blockReason}</div>
            {blockType === 'missed' && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  Your checkout was auto-closed. Request a correction so your Team Lead can fix it.
                </div>
                <a href="/my/attendance-requests" style={{
                  display: 'inline-block', padding: '6px 16px', borderRadius: 6,
                  background: '#154360', color: '#fff', fontSize: 13, fontWeight: 500,
                  textDecoration: 'none',
                }}>
                  Request Checkout Correction →
                </a>
              </div>
            )}
            {blockType === 'absent' && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  If you were present but forgot to mark attendance, request a correction.
                </div>
                <a href="/my/attendance-requests" style={{
                  display: 'inline-block', padding: '6px 16px', borderRadius: 6,
                  background: '#154360', color: '#fff', fontSize: 13, fontWeight: 500,
                  textDecoration: 'none',
                }}>
                  Request Attendance Correction →
                </a>
              </div>
            )}
            {blockType === 'notcheckedin' && (
              <div style={{ marginTop: 8 }}>
                <a href="/my/check-in-out" style={{
                  display: 'inline-block', padding: '6px 16px', borderRadius: 6,
                  background: '#52c41a', color: '#fff', fontSize: 13, fontWeight: 500,
                  textDecoration: 'none',
                }}>
                  Go to Check In →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <Form form={form} onFinish={onFinish} layout="vertical" className="clean-form" initialValues={{ workType: 1 }}>
        <div className="form-grid">

          {/* Row 1 */}
          <Form.Item name="workType" label={L('Work Type:')}>
            <Select options={[{ label: 'Billable', value: 1 }, { label: 'Not Billable', value: 0 }]} />
          </Form.Item>
          <Form.Item name="programId" label={L('Program Name:', true)} rules={[{ required: true, message: 'Required' }]}>
            <Select placeholder="-- Choose --" showSearch optionFilterProp="label"
              options={(programs || []).map((p: any) => ({ label: p.programName, value: p.id }))}
              onChange={(v) => { setProgramId(v); setProjectId(undefined); form.setFieldsValue({ projectId: undefined, subProjectId: undefined }); }} />
          </Form.Item>

          {/* Row 2 */}
          <Form.Item name="productPhase" label={L('Product Phase:', true)} rules={[{ required: true, message: 'Required' }]}>
            <Select placeholder="-- Choose --"
              options={[{ label: 'RnD / Prototyping', value: 'rnd' }, { label: 'Production', value: 'production' }]} />
          </Form.Item>
          <Form.Item name="projectId" label={L('Project Name:', true)} rules={[{ required: true, message: 'Required' }]}>
            <Select placeholder="-- Choose --" showSearch optionFilterProp="label"
              options={(projects || []).map((p: any) => ({ label: p.projectName, value: p.id }))}
              onChange={(v) => { setProjectId(v); form.setFieldsValue({ subProjectId: undefined }); }}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  {programId && (
                    <div style={{ padding: '6px 10px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6 }}>
                      <Input size="small" placeholder="Add new project..." value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)} style={{ flex: 1 }} />
                      <Button size="small" type="primary" disabled={!newProjectName}
                        onClick={async () => {
                          const p = await quickAddProject({ projectName: newProjectName, programId });
                          setNewProjectName('');
                          setProjectId(p.id);
                          form.setFieldsValue({ projectId: p.id, subProjectId: undefined });
                          qc.invalidateQueries({ queryKey: ['projects'] });
                        }}>Add</Button>
                    </div>
                  )}
                </>
              )}
            />
          </Form.Item>

          {/* Row 3 */}
          <Form.Item name="subProjectId" label={L('Sub Project Name:', true)} rules={[{ required: true, message: 'Required' }]}>
            <Select placeholder="-- Choose --" showSearch optionFilterProp="label"
              options={(subProjects || []).map((p: any) => ({ label: p.subProjectName, value: p.id }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  {projectId && programId && (
                    <div style={{ padding: '6px 10px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6 }}>
                      <Input size="small" placeholder="Add new sub-project..." value={newSubProjectName}
                        onChange={e => setNewSubProjectName(e.target.value)} style={{ flex: 1 }} />
                      <Button size="small" type="primary" disabled={!newSubProjectName}
                        onClick={async () => {
                          const sp = await quickAddSubProject({ subProjectName: newSubProjectName, programId, projectId });
                          setNewSubProjectName('');
                          form.setFieldsValue({ subProjectId: sp.id });
                          qc.invalidateQueries({ queryKey: ['subProjects'] });
                        }}>Add</Button>
                    </div>
                  )}
                </>
              )}
            />
          </Form.Item>
          <Form.Item name="entryDate" label={L('Date:', true)} rules={[{ required: true, message: 'Required' }]}>
            <DatePicker style={{ width: '100%' }} format="DD MMMM, YYYY - (dddd)" onChange={handleDateChange}
              disabledDate={(current) => current && current.isAfter(dayjs(), 'day')} />
          </Form.Item>

          {/* Full width: Description */}
          <div className="full-width">
            <Form.Item name="description" rules={[{ required: true, message: 'Required' }]}
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 600, color: '#1C2833' }}>
                    Description:<span style={{ color: '#e74c3c' }}>*</span>
                  </span>
                  <span style={{ fontSize: 13, color: '#888', fontWeight: 400 }}>{descLength}/500</span>
                </div>
              }
              labelCol={{ style: { width: '100%' } }}>
              <Input.TextArea rows={4} maxLength={500} placeholder="Aa"
                onChange={(e) => setDescLength(e.target.value.length)}
                style={{ resize: 'none' }} />
            </Form.Item>
          </div>

          {/* Row 4 */}
          <Form.Item name="wbsId" label={L('WBS:', true)} rules={[{ required: true, message: 'Required' }]}>
            <Select placeholder="-- Choose --" showSearch optionFilterProp="label"
              options={(wbsList || []).map((w: any) => ({ label: w.description, value: w.id }))} />
          </Form.Item>
          <div>
            <Form.Item name="hours" label={L('Hours:', true)} rules={[{ required: true, message: 'Required' }]}>
              <Input readOnly style={{ background: '#f5f5f5', fontWeight: 700, fontSize: 16, cursor: 'not-allowed' }}
                suffix={<span style={{ color: '#8c8c8c', fontSize: 12 }}>from attendance</span>}
                placeholder={!selectedDate ? 'Select a date first' : isToday && isStillInOffice ? 'Will update on checkout' : 'No attendance data'} />
            </Form.Item>
            {selectedDate && !isBlocked && attInfo && (
              <div style={{ marginTop: -8, fontSize: 12, color: '#52c41a' }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {attInfo}
              </div>
            )}
            {selectedDate && !isBlocked && !attInfo && !isToday && (
              <div style={{ marginTop: -8, fontSize: 12, color: '#fa8c16' }}>
                No attendance found — hours cannot be determined
              </div>
            )}
            {isToday && isStillInOffice && (
              <div style={{ marginTop: -8, fontSize: 12, color: '#52c41a' }}>
                Currently in office — hours will auto-calculate on checkout
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={isBlocked} className="submit-btn"
            style={isBlocked ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>
            Submit
          </Button>
        </div>
      </Form>
    </div>
  );
}
