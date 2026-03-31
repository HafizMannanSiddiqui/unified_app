import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Tag, Typography, Modal, Form, Input, Switch, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getPrograms, createProgram, updateProgram } from '../../api/gtl';

export default function Programs() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; record?: any }>({ open: false });
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['allPrograms'], queryFn: () => getPrograms(true) });

  const saveMut = useMutation({
    mutationFn: (v: any) => modal.record ? updateProgram(modal.record.id, v) : createProgram(v),
    onSuccess: () => { message.success('Saved'); setModal({ open: false }); qc.invalidateQueries({ queryKey: ['allPrograms'] }); },
  });

  const openEdit = (r?: any) => { form.setFieldsValue(r || { programName: '', isActive: true }); setModal({ open: true, record: r }); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Programs ({(data || []).length})</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>Add New</Button>
      </div>
      <Table columns={[
        { title: '#', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { title: 'Legacy ID', dataIndex: 'legacyProgramId', width: 100 },
        { title: 'Program Name', dataIndex: 'programName' },
        { title: 'Status', dataIndex: 'isActive', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
        { title: 'Action', width: 80, render: (_: any, r: any) => <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} /> },
      ]} dataSource={data || []} rowKey="id" loading={isLoading} size="small" />
      <Modal title={modal.record ? 'Edit Program' : 'New Program'} open={modal.open} onCancel={() => setModal({ open: false })} onOk={() => form.submit()} confirmLoading={saveMut.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)}>
          <Form.Item name="programName" label="Program Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
