import { useQuery } from '@tanstack/react-query';
import { Tag, Spin } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../../api/client';

const getAuditLogs = (limit: number) => apiClient.get('/attendance/audit-logs', { params: { limit } }).then(r => r.data);

const actionColors: Record<string, string> = {
  approve_timesheet: 'green', reject_timesheet: 'red', assign_wfh: 'blue',
  review_wfh: 'purple', deactivate_user: 'red', change_employee: 'orange',
};

export default function AuditLog() {
  const { data, isLoading } = useQuery({ queryKey: ['auditLogs'], queryFn: () => getAuditLogs(200) });

  return (
    <div>
      <div className="page-heading"><HistoryOutlined style={{ marginRight: 8 }} />Audit Log</div>

      {isLoading ? <Spin /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#154360', color: '#fff' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Time</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Who</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Action</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>No audit logs yet</td></tr>
              ) : (data || []).map((log: any) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '7px 12px', fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>{dayjs(log.created_at).format('DD MMM YY, HH:mm')}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>{log.userName}</td>
                  <td style={{ padding: '7px 12px', fontSize: 13 }}>
                    <Tag color={actionColors[log.action] || 'default'}>{log.action.replace(/_/g, ' ')}</Tag>
                  </td>
                  <td style={{ padding: '7px 12px', fontSize: 12, color: '#666' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
