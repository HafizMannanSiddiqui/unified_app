import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, Tag, Button, Space, Typography, message, Popconfirm } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getLeaves, approveLeave, rejectLeave } from '../../api/leaves';

export default function PendingLeaves() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['pendingLeaves'],
    queryFn: () => getLeaves(undefined, 'pending'),
  });

  const approveMut = useMutation({
    mutationFn: approveLeave,
    onSuccess: () => { message.success('Leave approved'); qc.invalidateQueries({ queryKey: ['pendingLeaves'] }); },
  });
  const rejectMut = useMutation({
    mutationFn: rejectLeave,
    onSuccess: () => { message.success('Leave rejected'); qc.invalidateQueries({ queryKey: ['pendingLeaves'] }); },
  });

  const columns = [
    { title: 'Employee', dataIndex: ['user', 'displayName'] },
    { title: 'From', dataIndex: 'fromDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: 'To', dataIndex: 'toDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: 'Days', dataIndex: 'numberOfDays', width: 60 },
    { title: 'Type', dataIndex: 'leaveType', render: (v: string) => <Tag>{v.replace('_', ' ')}</Tag> },
    { title: 'Reason', dataIndex: 'description', ellipsis: true },
    {
      title: 'Actions',
      width: 180,
      render: (_: any, r: any) => (
        <Space>
          <Popconfirm title="Approve?" onConfirm={() => approveMut.mutate(r.id)}>
            <Button type="primary" size="small" icon={<CheckOutlined />}>Approve</Button>
          </Popconfirm>
          <Popconfirm title="Reject?" onConfirm={() => rejectMut.mutate(r.id)}>
            <Button danger size="small" icon={<CloseOutlined />}>Reject</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Pending Leave Requests ({(data || []).length})</Typography.Title>
      <Table columns={columns} dataSource={data || []} rowKey="id" loading={isLoading} size="small" />
    </div>
  );
}
