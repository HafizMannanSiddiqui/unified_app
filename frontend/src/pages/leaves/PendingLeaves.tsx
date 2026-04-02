import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Button, Space, message, Popconfirm } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getLeaves, approveLeave, rejectLeave } from '../../api/leaves';
import { useAuthStore } from '../../store/authStore';

const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager'];

export default function PendingLeaves() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));

  // Leads see only their reportees' leaves; admins see all
  const { data, isLoading } = useQuery({
    queryKey: ['pendingLeaves', isAdmin ? 'all' : user?.id],
    queryFn: () => getLeaves(undefined, 'pending', isAdmin ? undefined : user?.id),
  });

  const approveMut = useMutation({
    mutationFn: approveLeave,
    onSuccess: () => { message.success('Leave approved'); qc.invalidateQueries({ queryKey: ['pendingLeaves'] }); },
  });
  const rejectMut = useMutation({
    mutationFn: rejectLeave,
    onSuccess: () => { message.success('Leave rejected'); qc.invalidateQueries({ queryKey: ['pendingLeaves'] }); },
  });

  return (
    <div>
      <div className="page-heading">Pending Leave Requests ({(data || []).length})</div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#154360', color: '#fff' }}>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Employee</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>From</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>To</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Days</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Type</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Reason</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>
                {isLoading ? 'Loading...' : 'No pending leave requests'}
              </td></tr>
            ) : (data || []).map((r: any, i: number) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>{r.user?.displayName || r.user?.username}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(r.fromDate).format('DD MMM YY')}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(r.toDate).format('DD MMM YY')}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}>{r.numberOfDays}</td>
                <td style={{ padding: '7px 12px', fontSize: 13 }}><Tag>{(r.leaveType || '').replace('_', ' ')}</Tag></td>
                <td style={{ padding: '7px 12px', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '-'}</td>
                <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                  <Space>
                    <Popconfirm title="Approve this leave?" onConfirm={() => approveMut.mutate(r.id)}>
                      <Button type="primary" size="small" icon={<CheckOutlined />}>Approve</Button>
                    </Popconfirm>
                    <Popconfirm title="Reject this leave?" onConfirm={() => rejectMut.mutate(r.id)}>
                      <Button danger size="small" icon={<CloseOutlined />}>Reject</Button>
                    </Popconfirm>
                  </Space>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
