import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Tag, message, Modal, Form, Select, DatePicker, Popconfirm, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { getWeekendAssignments, createWeekendAssignment, deleteWeekendAssignment } from '../../api/attendance';
import { getUsers } from '../../api/users';
import { useAuthStore } from '../../store/authStore';

dayjs.extend(isoWeek);

export default function WeekendAssignments() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();
  const [year, setYear] = useState(new Date().getFullYear());

  const isLead = user?.roles?.some((r: any) => ['super admin', 'Admin', 'Team Lead', 'Hr Manager'].includes(r.name));

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['weekendAssignments', year],
    queryFn: () => getWeekendAssignments(undefined, year),
  });

  const { data: users } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 1000) });

  const createMut = useMutation({
    mutationFn: createWeekendAssignment,
    onSuccess: () => { message.success('Assignment created'); setShowModal(false); form.resetFields(); qc.invalidateQueries({ queryKey: ['weekendAssignments'] }); },
    onError: () => message.error('Failed to create'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteWeekendAssignment,
    onSuccess: () => { message.success('Deleted'); qc.invalidateQueries({ queryKey: ['weekendAssignments'] }); },
  });

  const handleSubmit = (values: any) => {
    const d = dayjs(values.weekendDate);
    createMut.mutate({
      userId: values.userId,
      weekendDate: d.format('YYYY-MM-DD'),
      weekendNumber: d.isoWeek(),
      year: d.year(),
      attendanceType: values.attendanceType,
    });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Weekend Assignments</div>
        {isLead && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}
            style={{ background: '#e74c3c', borderColor: '#e74c3c', borderRadius: 20 }}>
            Assign Weekend
          </Button>
        )}
      </div>

      <div className="filter-bar" style={{ marginTop: 16 }}>
        <Select value={year} onChange={setYear} style={{ width: 100 }}
          options={[2024, 2025, 2026, 2027].map(y => ({ label: String(y), value: y }))} />
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Employee</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Weekend Date</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Week #</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Type</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Assigned By</th>
                {isLead && <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {(assignments || []).length === 0 ? (
                <tr><td colSpan={isLead ? 7 : 6} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No weekend assignments found</td></tr>
              ) : (assignments || []).map((a: any, i: number) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{a.user?.displayName || a.user?.username}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(a.weekendDate).format('DD MMM, YYYY (ddd)')}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{a.weekendNumber}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>
                    <Tag color={a.attendanceType === 'full_day' ? 'blue' : 'orange'}>{a.attendanceType === 'full_day' ? 'Full Day' : 'Half Day'}</Tag>
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{a.assigner?.displayName || '-'}</td>
                  {isLead && (
                    <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                      <Popconfirm title="Delete this assignment?" onConfirm={() => deleteMut.mutate(a.id)}>
                        <DeleteOutlined className="action-delete" />
                      </Popconfirm>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Assign Weekend Work" open={showModal} onCancel={() => setShowModal(false)}
        onOk={() => form.submit()} confirmLoading={createMut.isPending}>
        <Form form={form} onFinish={handleSubmit} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
          <Form.Item name="userId" label="Employee" rules={[{ required: true }]}>
            <Select placeholder="-- Choose --" showSearch optionFilterProp="label"
              options={(users?.items || []).map((u: any) => ({ label: u.displayName || u.username, value: u.id }))} />
          </Form.Item>
          <div className="form-grid">
            <Form.Item name="weekendDate" label="Weekend Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="attendanceType" label="Type" rules={[{ required: true }]}>
              <Select options={[{ label: 'Full Day', value: 'full_day' }, { label: 'Half Day', value: 'half_day' }]} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
