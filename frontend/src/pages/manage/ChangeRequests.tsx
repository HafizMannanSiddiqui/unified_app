import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Popconfirm, message, Spin } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';

const getPending = () => apiClient.get('/users/pending-change-requests').then(r => r.data);
const approve = (id: number) => apiClient.post(`/users/change-requests/${id}/approve`).then(r => r.data);
const reject = (id: number) => apiClient.post(`/users/change-requests/${id}/reject`).then(r => r.data);

export default function ChangeRequests() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['pendingChanges'], queryFn: getPending });

  const approveMut = useMutation({ mutationFn: approve, onSuccess: () => { message.success('Approved & applied'); qc.invalidateQueries({ queryKey: ['pendingChanges'] }); } });
  const rejectMut = useMutation({ mutationFn: reject, onSuccess: () => { message.success('Rejected'); qc.invalidateQueries({ queryKey: ['pendingChanges'] }); } });

  return (
    <div>
      <div className="page-heading">Profile Change Requests ({(data || []).length} pending)</div>

      {isLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, width: 40 }}>#</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Employee</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Field</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Current Value</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Requested Value</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No pending requests</td></tr>
              ) : (data || []).map((r: any, i: number) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>{r.userName} <span style={{ color: '#999', fontSize: 11 }}>({r.username})</span></td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>
                    <Tag color={r.field_name === 'designation' ? 'blue' : r.field_name === 'reportTo' ? 'purple' : 'cyan'}>
                      {r.field_name === 'designation' ? 'Designation' : r.field_name === 'reportTo' ? 'Manager' : 'Team'}
                    </Tag>
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 13, color: '#999' }}>{r.old_value || '-'}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 600 }}>{r.new_value}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                    <Popconfirm title="Approve this change?" description={`Change ${r.field_name} to "${r.new_value}"`}
                      onConfirm={() => approveMut.mutate(r.id)}>
                      <CheckOutlined style={{ color: '#27ae60', cursor: 'pointer', fontSize: 16, marginRight: 14 }} />
                    </Popconfirm>
                    <Popconfirm title="Reject this change?" onConfirm={() => rejectMut.mutate(r.id)}>
                      <CloseOutlined style={{ color: '#e74c3c', cursor: 'pointer', fontSize: 16 }} />
                    </Popconfirm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
