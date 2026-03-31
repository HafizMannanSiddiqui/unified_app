import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Tag, Typography, Modal, Form, Input, Select, Switch, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { getSubProjects, createSubProject, updateSubProject, getPrograms, getProjects } from '../../api/gtl';

export default function SubProjects() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; record?: any }>({ open: false });
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['allSubProjects'], queryFn: () => getSubProjects(undefined, true) });
  const { data: programs } = useQuery({ queryKey: ['programs'], queryFn: () => getPrograms(true) });
  const { data: projects } = useQuery({ queryKey: ['allProjects'], queryFn: () => getProjects(undefined, true) });

  const saveMut = useMutation({
    mutationFn: (v: any) => modal.record ? updateSubProject(modal.record.id, v) : createSubProject(v),
    onSuccess: () => { message.success('Saved'); setModal({ open: false }); qc.invalidateQueries({ queryKey: ['allSubProjects'] }); },
  });

  const openEdit = (r?: any) => { form.setFieldsValue(r || { subProjectName: '', programId: undefined, projectId: undefined, isActive: true }); setModal({ open: true, record: r }); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Sub Projects ({(data || []).length})</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>Add New</Button>
      </div>
      <Table columns={[
        { title: '#', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { title: 'Legacy ID', dataIndex: 'legacySubProjectId', width: 100 },
        { title: 'Sub Project Name', dataIndex: 'subProjectName' },
        { title: 'Program', dataIndex: ['program', 'programName'] },
        { title: 'Project', dataIndex: ['project', 'projectName'] },
        { title: 'Teams', render: (_: any, r: any) => (r.teamAssignments || []).map((ta: any) => <Tag key={ta.id}>{ta.team?.teamName}</Tag>) },
        { title: 'Status', dataIndex: 'isActive', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
        { title: 'Action', width: 80, render: (_: any, r: any) => <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} /> },
      ]} dataSource={data || []} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 20 }} scroll={{ x: 900 }} />
      <Modal title={modal.record ? 'Edit Sub Project' : 'New Sub Project'} open={modal.open} onCancel={() => setModal({ open: false })} onOk={() => form.submit()} confirmLoading={saveMut.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate(v)}>
          <Form.Item name="subProjectName" label="Sub Project Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="programId" label="Program" rules={[{ required: true }]}>
            <Select options={(programs || []).map((p: any) => ({ label: p.programName, value: p.id }))} />
          </Form.Item>
          <Form.Item name="projectId" label="Project">
            <Select allowClear options={(projects || []).map((p: any) => ({ label: p.projectName, value: p.id }))} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
