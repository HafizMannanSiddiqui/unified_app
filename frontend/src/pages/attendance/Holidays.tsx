import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, Tag, Spin, Button, Modal, Form, DatePicker, Input, InputNumber, Popconfirm, message } from 'antd';
import { CalendarOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getHolidays } from '../../api/users';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const createHoliday = (data: any) => apiClient.post('/users/holidays', data).then(r => r.data);
const deleteHoliday = (id: number) => apiClient.post(`/users/holidays/${id}/delete`).then(r => r.data);

const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager', 'Hr Manager'];

export default function Holidays() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));

  const { data, isLoading } = useQuery({ queryKey: ['holidays', year], queryFn: () => getHolidays(year) });

  const addMut = useMutation({
    mutationFn: createHoliday,
    onSuccess: () => { message.success('Holiday added'); setShowAdd(false); form.resetFields(); qc.invalidateQueries({ queryKey: ['holidays'] }); },
  });

  const delMut = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => { message.success('Deleted'); qc.invalidateQueries({ queryKey: ['holidays'] }); },
  });

  const handleAdd = (values: any) => {
    const from = values.fromDate.format('YYYY-MM-DD');
    const to = values.toDate.format('YYYY-MM-DD');
    const days = values.toDate.diff(values.fromDate, 'day') + 1;
    addMut.mutate({ year: values.fromDate.year(), fromDate: from, toDate: to, numberOfDays: days, description: values.description });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><CalendarOutlined style={{ marginRight: 8 }} />Holidays Calendar</div>
        <div className="page-filters">
          <Select value={year} onChange={setYear} style={{ width: 100 }}
            options={[2024, 2025, 2026, 2027].map(y => ({ label: String(y), value: y }))} />
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAdd(true)}
              style={{ background: '#e74c3c', borderColor: '#e74c3c', borderRadius: 20 }}>
              Add Holiday
            </Button>
          )}
        </div>
      </div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Holiday</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>From</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>To</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Days</th>
                {isAdmin && <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {(data || []).length === 0 ? (
                <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No holidays for {year}</td></tr>
              ) : (data || []).map((h: any, i: number) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>{h.description}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>{dayjs(h.fromDate).format('ddd, DD MMM YYYY')}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>{dayjs(h.toDate).format('ddd, DD MMM YYYY')}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}><Tag color="blue">{h.numberOfDays} day{h.numberOfDays > 1 ? 's' : ''}</Tag></td>
                  {isAdmin && (
                    <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'center' }}>
                      <Popconfirm title="Delete this holiday?" onConfirm={() => delMut.mutate(h.id)}>
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

      <Modal title="Add Holiday" open={showAdd} onCancel={() => setShowAdd(false)} onOk={() => form.submit()} confirmLoading={addMut.isPending}>
        <Form form={form} onFinish={handleAdd} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
          <Form.Item name="description" label="Holiday Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Eid ul-Adha" />
          </Form.Item>
          <div className="form-grid">
            <Form.Item name="fromDate" label="From Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="toDate" label="To Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
