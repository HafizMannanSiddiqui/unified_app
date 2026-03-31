import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Tag, Typography, Modal, Form, Input, Select, Switch, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getProjects, createProject, updateProject, getPrograms } from '../../api/gtl';

export default function Projects() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; record?: any }>({ open: false });
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['allProjects'], queryFn: () => getProjects(undefined, true) });
  const { data: programs } = useQuery({ queryKey: ['programs'], queryFn: () => getPrograms(true) });

  const saveMut = useMutation({
    mutationFn: (v: any) => modal.record ? updateProject(modal.record.id, v) : createProject(v),
    onSuccess: () => { message.success('Saved'); setModal({ open: false }); qc.invalidateQueries({ queryKey: ['allProjects'] }); },
  });

  const openEdit = (r?: any) => { form.setFieldsValue(r || { projectName: '', programId: undefined, isActive: true }); setModal({ open: true, record: r }); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Projects ({(data || []).length})</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>Add New</Button>
      </div>
      <Table columns={[
        { title: '#', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { title: 'Legacy ID', dataIndex: 'legacyProjectId', width: 100 },
        { title: 'Project Name', dataIndex: 'projectName' },
        { title: 'Program', dataIndex: ['program', 'programName'] },
        { title: 'Status', dataIndex: 'isActive', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
        { title: 'Action', width: 80, render: (_: any, r: any) => <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} /> },
      ]} dataSource={data || []} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 20 }} />
      <Modal title={modal.record ? 'Edit Project' : 'New Project'} open={modal.open} onCancel={() => setModal({ open: false })} onOk={() => form.submit()} confirmLoading={saveMut.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)}>
          <Form.Item name="projectName" label="Project Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="programId" label="Program" rules={[{ required: true }]}>
            <Select options={(programs || []).map((p: any) => ({ label: p.programName, value: p.id }))} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
