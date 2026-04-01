import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, DatePicker, Button, message, Card, Tag, Input, Spin, Modal, Form, Row, Col } from 'antd';
import { HomeOutlined, CheckOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import apiClient from '../../api/client';
import { getUsers } from '../../api/users';
import { getTeams } from '../../api/teams';
import { useAuthStore } from '../../store/authStore';

const { RangePicker } = DatePicker;
const assignWfh = (data: any) => apiClient.post('/attendance/wfh/assign', data).then(r => r.data);
const getWfhRecords = (params: any) => apiClient.get('/attendance/wfh/records', { params }).then(r => r.data);
const submitDeliverables = (data: any) => apiClient.post('/attendance/wfh/submit-deliverables', data).then(r => r.data);
const reviewWfh = (data: any) => apiClient.post('/attendance/wfh/review', data).then(r => r.data);

const LEAD_ROLES = ['super admin', 'Admin', 'Application Manager', 'Team Lead', 'Hr Manager'];

export default function WfhManagement() {
  const user = useAuthStore((s) => s.user);
  const isLead = user?.roles?.some((r: any) => LEAD_ROLES.includes(r.name));
  const qc = useQueryClient();
  const now = dayjs();

  const [assignModal, setAssignModal] = useState(false);
  const [assignForm] = Form.useForm();
  const [deliverModal, setDeliverModal] = useState<any>(null);
  const [deliverForm] = Form.useForm();
  const [reviewModal, setReviewModal] = useState<any>(null);
  const [reviewForm] = Form.useForm();
  const [teamFilter, setTeamFilter] = useState<number | undefined>();

  const { data: users } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 1000) });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });
  const { data: records, isLoading } = useQuery({
    queryKey: ['wfhRecords', teamFilter, user?.id],
    queryFn: () => getWfhRecords({ from: now.startOf('month').format('YYYY-MM-DD'), to: now.endOf('month').format('YYYY-MM-DD'), teamId: teamFilter, userId: isLead ? undefined : user?.id }),
  });

  const assignMut = useMutation({
    mutationFn: (v: any) => assignWfh({ userId: v.userId, date: v.date.format('YYYY-MM-DD'), tasks: v.tasks }),
    onSuccess: (res: any) => { res.error ? message.error(res.error) : message.success(res.message); setAssignModal(false); assignForm.resetFields(); qc.invalidateQueries({ queryKey: ['wfhRecords'] }); },
  });

  const deliverMut = useMutation({
    mutationFn: (v: any) => submitDeliverables({ id: deliverModal.id, deliverables: v.deliverables, hoursLogged: v.hoursLogged }),
    onSuccess: () => { message.success('Deliverables submitted'); setDeliverModal(null); qc.invalidateQueries({ queryKey: ['wfhRecords'] }); },
  });

  const reviewMut = useMutation({
    mutationFn: (v: any) => reviewWfh({ id: reviewModal.id, reviewNote: v.reviewNote }),
    onSuccess: () => { message.success('Review submitted'); setReviewModal(null); qc.invalidateQueries({ queryKey: ['wfhRecords'] }); },
  });

  const statusColors: Record<number, { label: string; color: string }> = {
    1: { label: 'Assigned', color: 'blue' },
    2: { label: 'Completed', color: 'green' },
    3: { label: 'Cancelled', color: 'red' },
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><HomeOutlined style={{ marginRight: 8 }} />Work From Home</div>
        <div className="page-filters">
          {isLead && <Select placeholder="All Teams" allowClear style={{ width: 180 }} onChange={setTeamFilter}
            options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />}
          {isLead && <Button type="primary" icon={<HomeOutlined />} onClick={() => setAssignModal(true)}
            style={{ background: '#154360', borderColor: '#154360', borderRadius: 20 }}>Assign WFH</Button>}
        </div>
      </div>

      {isLoading ? <Spin /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Employee</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Team</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Date</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Tasks Assigned</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Deliverables</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Hours</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Status</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Review</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(records || []).length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No WFH records this month</td></tr>
              ) : (records || []).map((r: any, i: number) => {
                const st = statusColors[r.status] || { label: '?', color: 'default' };
                const canDeliver = r.status === 1 && r.user_id === user?.id;
                const canReview = r.status === 2 && isLead && !r.review_note;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>{r.displayName || r.username}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.teamName || '-'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(r.date).format('DD MMM YYYY (ddd)')}</td>
                    <td style={{ padding: '7px 12px', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tasks || '-'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.deliverables || <span style={{ color: '#fa8c16' }}>Not submitted</span>}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.hours_logged ? `${r.hours_logged}h` : '-'}</td>
                    <td style={{ padding: '7px 12px', fontSize: 13 }}><Tag color={st.color}>{st.label}</Tag></td>
                    <td style={{ padding: '7px 12px', fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.review_note || <span style={{ color: '#8c8c8c' }}>Pending review</span>}
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                      {canDeliver && <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => { setDeliverModal(r); deliverForm.resetFields(); }}>Submit Work</Button>}
                      {canReview && <Button size="small" icon={<CheckOutlined />} onClick={() => { setReviewModal(r); reviewForm.resetFields(); }}>Review</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign WFH Modal */}
      <Modal title="Assign Work From Home" open={assignModal} onCancel={() => setAssignModal(false)}
        onOk={() => assignForm.submit()} confirmLoading={assignMut.isPending}>
        <Form form={assignForm} onFinish={(v: any) => assignMut.mutate(v)} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
          <Form.Item name="userId" label="Employee" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" placeholder="Select employee..."
              options={(users?.items || []).filter((u: any) => u.isActive).map((u: any) => ({ label: `${u.displayName || u.username} (${u.team?.teamName || ''})`, value: u.id }))} />
          </Form.Item>
          <Form.Item name="date" label="WFH Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} disabledDate={(c) => c && c.isBefore(dayjs(), 'day')} />
          </Form.Item>
          <Form.Item name="tasks" label="Tasks to Complete" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="What should the employee deliver by end of day?" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Submit Deliverables Modal */}
      <Modal title="Submit WFH Deliverables" open={!!deliverModal} onCancel={() => setDeliverModal(null)}
        onOk={() => deliverForm.submit()} confirmLoading={deliverMut.isPending}>
        {deliverModal && (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <strong>Tasks assigned to you:</strong><br/>{deliverModal.tasks}
          </div>
        )}
        <Form form={deliverForm} onFinish={(v: any) => deliverMut.mutate(v)} layout="vertical" className="clean-form">
          <Form.Item name="deliverables" label="What did you accomplish today?" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="List your deliverables, PRs merged, tasks completed..." />
          </Form.Item>
          <Form.Item name="hoursLogged" label="Hours Worked" rules={[{ required: true }]} initialValue={8}>
            <Select options={Array.from({ length: 24 }, (_, i) => ({ label: `${(i + 1) * 0.5}`, value: (i + 1) * 0.5 }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Review Modal */}
      <Modal title="Review WFH Deliverables" open={!!reviewModal} onCancel={() => setReviewModal(null)}
        onOk={() => reviewForm.submit()} confirmLoading={reviewMut.isPending}>
        {reviewModal && (
          <>
            <div style={{ background: '#f0f7ff', border: '1px solid #91caff', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13 }}>
              <strong>Tasks assigned:</strong><br/>{reviewModal.tasks}
            </div>
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <strong>Deliverables submitted:</strong><br/>{reviewModal.deliverables || 'None'}
              <br/><strong>Hours:</strong> {reviewModal.hours_logged || '-'}
            </div>
          </>
        )}
        <Form form={reviewForm} onFinish={(v: any) => reviewMut.mutate(v)} layout="vertical" className="clean-form">
          <Form.Item name="reviewNote" label="Your Review" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Quality of work, completeness, any issues..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
