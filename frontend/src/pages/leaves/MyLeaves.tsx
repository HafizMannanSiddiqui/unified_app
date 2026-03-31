import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Typography, Card, Row, Col, Statistic, Button, Descriptions } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getLeaves, getLeaveBalance } from '../../api/leaves';
import { useAuthStore } from '../../store/authStore';

export default function MyLeaves() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: leaves, isLoading } = useQuery({
    queryKey: ['myLeaves', user?.id],
    queryFn: () => getLeaves(user?.id),
    enabled: !!user?.id,
  });

  const { data: balance } = useQuery({
    queryKey: ['leaveBalance', user?.id],
    queryFn: () => getLeaveBalance(user!.id),
    enabled: !!user?.id,
  });

  const columns = [
    { title: '#', render: (_: any, __: any, i: number) => i + 1, width: 50 },
    { title: 'User', dataIndex: ['user', 'displayName'], render: (v: string) => v || user?.displayName },
    { title: 'Number of Days', dataIndex: 'numberOfDays', width: 120 },
    { title: 'From Date', dataIndex: 'fromDate', render: (v: string) => dayjs(v).format('DD-MMM-YYYY') },
    { title: 'To Date', dataIndex: 'toDate', render: (v: string) => dayjs(v).format('DD-MMM-YYYY') },
    {
      title: 'Leave Type', dataIndex: 'leaveType', width: 120,
      render: (v: string) => {
        const colors: Record<string, string> = { casual_leave: 'blue', earned_leave: 'green', sick_leave: 'orange' };
        return <Tag color={colors[v] || 'default'}>{v?.replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Status', dataIndex: 'status', width: 100,
      render: (v: string) => {
        const colors: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red' };
        return <Tag color={colors[v]}>{v}</Tag>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>My Leaves</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/my/apply-leave')}
          style={{ borderRadius: 8 }}>
          Apply Leave
        </Button>
      </div>

      {/* Leave Balance Summary */}
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small">
          <Descriptions.Item label={<strong>Record's Year</strong>}>{dayjs().year()}</Descriptions.Item>
          <Descriptions.Item label={<strong>Allowed Leaves (in year)</strong>}>{balance?.allowed || 20}</Descriptions.Item>
          <Descriptions.Item label={<strong>Used Leaves</strong>}>
            <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{balance?.used || 0}</span>
          </Descriptions.Item>
          <Descriptions.Item label={<strong>Pending Leaves</strong>}>
            <span style={{ color: '#52c41a', fontWeight: 600 }}>{balance?.remaining ?? 20}</span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Leave History Table */}
      <Table columns={columns} dataSource={leaves || []} rowKey="id" loading={isLoading} size="small"
        pagination={{ pageSize: 20, showTotal: (t) => `Showing ${t} entries` }}
        locale={{ emptyText: 'No leaves applied yet' }} />
    </div>
  );
}
