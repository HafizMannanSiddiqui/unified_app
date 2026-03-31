import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Tag, Typography, Space, Modal, Form, Input, Switch, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getTeams } from '../../api/teams';
import apiClient from '../../api/client';

export default function Teams() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; record?: any }>({ open: false });
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['allTeams'], queryFn: () => getTeams() });

  const saveMut = useMutation({
    mutationFn: (values: any) => modal.record
      ? apiClient.put(`/teams/${modal.record.id}`, values).then(r => r.data)
      : apiClient.post('/teams', values).then(r => r.data),
    onSuccess: () => { message.success(modal.record ? 'Team updated' : 'Team created'); setModal({ open: false }); qc.invalidateQueries({ queryKey: ['allTeams'] }); },
    onError: () => message.error('Failed to save'),
  });

  const openEdit = (record?: any) => {
    form.setFieldsValue(record || { teamName: '', displayOrder: 0, isActive: true });
    setModal({ open: true, record });
  };

  const columns = [
    { title: '#', render: (_: any, __: any, i: number) => i + 1, width: 50 },
    { title: 'Legacy ID', dataIndex: 'legacyTeamId', width: 100 },
    { title: 'Team Name', dataIndex: 'teamName', sorter: (a: any, b: any) => a.teamName.localeCompare(b.teamName) },
    { title: 'Order', dataIndex: 'displayOrder', width: 70 },
    { title: 'Status', dataIndex: 'isActive', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Action', width: 80, render: (_: any, r: any) => <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} /> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Teams ({(data || []).length})</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>Add New</Button>
      </div>
      <Table columns={columns} dataSource={data || []} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 30 }} />
      <Modal title={modal.record ? 'Edit Team' : 'New Team'} open={modal.open} onCancel={() => setModal({ open: false })} onOk={() => form.submit()} confirmLoading={saveMut.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)}>
          <Form.Item name="teamName" label="Team Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="displayOrder" label="Display Order"><Input type="number" /></Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
