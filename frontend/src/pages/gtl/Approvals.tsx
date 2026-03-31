import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Select, message, Popconfirm, Spin } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import { getPendingUsers, getPendingEntriesGrouped, approveEntry, rejectEntry, batchApprove } from '../../api/gtl';

export default function Approvals() {
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();

  const { data: pendingUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: getPendingUsers,
  });

  const { data: grouped, isLoading: loadingEntries } = useQuery({
    queryKey: ['pendingGrouped', selectedUserId],
    queryFn: () => getPendingEntriesGrouped(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const approveMut = useMutation({
    mutationFn: approveEntry,
    onSuccess: () => { message.success('Approved'); invalidate(); },
  });

  const rejectMut = useMutation({
    mutationFn: rejectEntry,
    onSuccess: () => { message.success('Rejected'); invalidate(); },
  });

  const batchMut = useMutation({
    mutationFn: () => batchApprove(selectedUserId!),
    onSuccess: (data: any) => {
      message.success(`Approved ${data.updated} entries`);
      setSelectedUserId(undefined);
      invalidate();
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pendingGrouped'] });
    qc.invalidateQueries({ queryKey: ['pendingUsers'] });
  };

  const totalPending = (grouped?.weeks || []).reduce((s: number, w: any) => s + w.entries.length, 0);

  return (
    <div>
      <div className="page-heading">Time Sheet Approval</div>

      {/* Employee selector */}
      <div className="clean-form" style={{ maxWidth: 500, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>First Name:<span style={{ color: '#e74c3c' }}>*</span></div>
        <Select
          placeholder="-- Choose --"
          style={{ width: '100%' }}
          allowClear
          showSearch
          optionFilterProp="label"
          loading={loadingUsers}
          value={selectedUserId}
          onChange={setSelectedUserId}
          options={(pendingUsers || []).map((u: any) => ({
            label: u.displayName || u.username,
            value: u.id,
          }))}
        />
      </div>

      {/* Approve All button */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Popconfirm
          title="Approve All?"
          description={`This will approve all ${totalPending} pending entries for this user.`}
          onConfirm={() => batchMut.mutate()}
          disabled={!selectedUserId || totalPending === 0}
        >
          <Button type="primary" className="submit-btn" loading={batchMut.isPending}
            disabled={!selectedUserId || totalPending === 0}>
            Approved
          </Button>
        </Popconfirm>
      </div>

      {/* Content */}
      {loadingEntries ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : selectedUserId && (grouped?.weeks || []).length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(grouped?.weeks || []).map((week: any) => (
            <div key={week.weekNumber} style={{ marginBottom: 4 }}>
              {/* Week header */}
              <div className="week-header">
                <span className="week-label">Week# {String(week.weekNumber).padStart(2, '0')}:</span>
                <span className="week-range">
                  {dayjs(week.weekStart).format('DD MMM, YYYY')} - ({dayjs(week.weekStart).format('ddd')})
                  <strong> To </strong>
                  {dayjs(week.weekEnd).format('DD MMM, YYYY')} - ({dayjs(week.weekEnd).format('ddd')})
                </span>
              </div>

              {/* Week table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#154360', color: '#fff' }}>
                      <th style={{ width: 50, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Sr. No</th>
                      <th style={{ width: 100, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Username</th>
                      <th style={{ width: 120, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Date</th>
                      <th style={{ width: 120, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Project</th>
                      <th style={{ width: 150, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Sub Project</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>WBS Description</th>
                      <th style={{ width: 76, padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Hours</th>
                      <th style={{ width: 120, padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.entries.map((entry: any, i: number) => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{i + 1}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{entry.user?.username}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{dayjs(entry.entryDate).format('DD-MM-YYYY (ddd)')}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{entry.project?.projectName}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{entry.subProject?.subProjectName}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>
                          {entry.wbs?.description && <strong>{entry.wbs.description}</strong>}
                          {entry.wbs?.description && entry.description ? ' - ' : ''}
                          {entry.description}
                        </td>
                        <td style={{ padding: '7px 12px', fontSize: 13 }}>{Number(entry.hours)}</td>
                        <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                          <Popconfirm title="Approve this entry?" onConfirm={() => approveMut.mutate(entry.id)} okText="Yes">
                            <CheckOutlined style={{ color: '#27ae60', cursor: 'pointer', fontSize: 15, marginRight: 12 }} />
                          </Popconfirm>
                          <Popconfirm title="Reject this entry?" onConfirm={() => rejectMut.mutate(entry.id)} okText="Yes" okType="danger">
                            <CloseOutlined style={{ color: '#e74c3c', cursor: 'pointer', fontSize: 15 }} />
                          </Popconfirm>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#EBF5FB' }}>
                      <td colSpan={6} style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 700, fontSize: 13 }}>Total:</td>
                      <td colSpan={2} style={{ padding: '6px 12px', fontWeight: 700, fontSize: 13 }}>{week.totalHours}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Grand total */}
          <div className="grand-total-row" style={{ display: 'flex' }}>
            <div style={{ flex: 1, textAlign: 'right', paddingRight: 20 }}><strong>Total Hours:</strong></div>
            <div style={{ minWidth: 76 }}><strong>{grouped?.grandTotal}</strong></div>
          </div>
        </div>
      ) : selectedUserId ? (
        <div className="no-record-found">No pending entries for this employee</div>
      ) : null}
    </div>
  );
}
