import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Tag, Button, message, Empty, Spin, Tabs } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../../api/client';

const getRequests = (status?: number) =>
  apiClient.get('/users/team-change-requests', { params: { status } }).then(r => r.data);

const typeLabels: Record<string, string> = {
  add_to_team: 'Add to Team',
  remove_from_team: 'Remove from Team',
  add_manager: 'Add Manager',
  remove_manager: 'Remove Manager',
};

const statusColors: Record<number, string> = { 0: 'orange', 1: 'green', 2: 'red' };
const statusLabels: Record<number, string> = { 0: 'Pending', 1: 'Approved', 2: 'Rejected' };

export default function TeamChangeRequests() {
  const qc = useQueryClient();
  const { data: pending, isLoading: loadingPending } = useQuery({ queryKey: ['teamChangeRequests', 0], queryFn: () => getRequests(0) });
  const { data: processed, isLoading: loadingProcessed } = useQuery({ queryKey: ['teamChangeRequests', 'all'], queryFn: () => getRequests() });

  const approveMut = useMutation({
    mutationFn: (id: number) => apiClient.post(`/users/team-change-requests/${id}/approve`).then(r => r.data),
    onSuccess: () => { message.success('Request approved & applied!'); qc.invalidateQueries({ queryKey: ['teamChangeRequests'] }); },
    onError: () => message.error('Failed'),
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => apiClient.post(`/users/team-change-requests/${id}/reject`).then(r => r.data),
    onSuccess: () => { message.success('Request rejected'); qc.invalidateQueries({ queryKey: ['teamChangeRequests'] }); },
    onError: () => message.error('Failed'),
  });

  const renderRequest = (req: any, showActions: boolean) => (
    <div key={req.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
          <Tag color="blue">{typeLabels[req.request_type] || req.request_type}</Tag>
          {req.targetName} <span style={{ color: '#999', fontSize: 12 }}>@{req.targetUsername}</span>
        </div>
        <div style={{ fontSize: 13, color: '#333' }}>
          {req.request_type?.includes('team') && req.teamName && <>Team: <strong>{req.teamName}</strong></>}
          {req.request_type?.includes('manager') && req.managerName && <>Manager: <strong>{req.managerName}</strong></>}
        </div>
        {req.reason && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Reason: {req.reason}</div>}
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          Requested by <strong>{req.requesterName}</strong> on {dayjs(req.created_at).format('DD MMM YYYY HH:mm')}
          {req.reviewerName && <> — Reviewed by <strong>{req.reviewerName}</strong> on {dayjs(req.reviewed_at).format('DD MMM YYYY')}</>}
        </div>
      </div>
      <div>
        <Tag color={statusColors[req.status]}>{statusLabels[req.status]}</Tag>
      </div>
      {showActions && req.status === 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />}
            loading={approveMut.isPending} onClick={() => approveMut.mutate(req.id)}>
            Approve
          </Button>
          <Button danger size="small" icon={<CloseCircleOutlined />}
            loading={rejectMut.isPending} onClick={() => rejectMut.mutate(req.id)}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-heading"><SendOutlined style={{ marginRight: 8 }} />Team Change Requests</div>

      <Tabs defaultActiveKey="pending" items={[
        {
          key: 'pending', label: <>Pending <Tag color="orange">{(pending || []).length}</Tag></>,
          children: loadingPending ? <Spin /> : (pending || []).length === 0
            ? <Empty description="No pending requests" />
            : <Card size="small" style={{ borderRadius: 10 }}>{(pending || []).map((r: any) => renderRequest(r, true))}</Card>,
        },
        {
          key: 'all', label: 'All Requests',
          children: loadingProcessed ? <Spin /> : (processed || []).length === 0
            ? <Empty description="No requests yet" />
            : <Card size="small" style={{ borderRadius: 10 }}>{(processed || []).map((r: any) => renderRequest(r, false))}</Card>,
        },
      ]} />
    </div>
  );
}
