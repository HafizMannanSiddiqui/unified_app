import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Tag, message, Popconfirm, Spin, Avatar, Card } from 'antd';
import { CheckOutlined, CloseOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import { getPendingUsers, getPendingEntriesGrouped, approveEntry, rejectEntry, batchApprove } from '../../api/gtl';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../api/client';

const ADMIN_ROLES = ['super admin', 'Admin', 'Application Manager'];
const getMyTeamAttendance = () => apiClient.get('/attendance/my-team').then(r => r.data);

export default function Approvals() {
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.some((r: any) => ADMIN_ROLES.includes(r.name));

  // Leads see only their reportees' pending entries; admins see all
  const { data: pendingUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['pendingUsers', isAdmin ? 'all' : user?.id],
    queryFn: () => getPendingUsers(isAdmin ? undefined : user?.id),
  });

  // Get team members with today's attendance (for leads)
  const { data: teamMembers } = useQuery({
    queryKey: ['myTeamAttendance', user?.id],
    queryFn: getMyTeamAttendance,
    enabled: !!user?.id,
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

  // Build a set of user IDs with pending entries for highlighting
  const pendingUserIds = new Set((pendingUsers || []).map((u: any) => u.id));

  return (
    <div>
      <div className="page-heading">Time Sheet Approval</div>

      {/* Team members with attendance + pending status */}
      {(teamMembers || []).length > 0 && (
        <Card size="small" style={{ borderRadius: 10, marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: '#154360', marginBottom: 10, fontSize: 14 }}>
            My Team — Today's Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {(teamMembers || []).map((m: any) => {
              const hasPending = pendingUserIds.has(m.id);
              return (
                <div key={m.id}
                  onClick={() => hasPending ? setSelectedUserId(m.id) : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${hasPending ? '#ffc53d' : m.isPresent ? '#d9f7be' : '#f0f0f0'}`,
                    background: hasPending ? '#fffbe6' : m.isPresent ? '#f6ffed' : '#fff',
                    cursor: hasPending ? 'pointer' : 'default',
                    transition: 'box-shadow 0.2s',
                    ...(selectedUserId === m.id ? { boxShadow: '0 0 0 2px #1677ff' } : {}),
                  }}>
                  <Avatar size={36} style={{ background: m.isPresent ? '#52c41a' : '#bfbfbf', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                    {(m.displayName || m.username)?.[0]?.toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.displayName || m.username}
                    </div>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>{m.teamName || ''}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    {m.isPresent ? (
                      <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0, fontSize: 11 }}>
                        {m.todayCheckin}{m.todayCheckout ? ` — ${m.todayCheckout}` : ''}
                      </Tag>
                    ) : (
                      <Tag icon={<CloseCircleOutlined />} style={{ margin: 0, fontSize: 11 }}>Absent</Tag>
                    )}
                    {hasPending && (
                      <Tag color="orange" icon={<FileTextOutlined />} style={{ margin: 0, fontSize: 11 }}>Pending GTL</Tag>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {pendingUserIds.size > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#fa8c16' }}>
              Click on highlighted members to see their pending entries
            </div>
          )}
        </Card>
      )}

      {/* Fallback selector for admins or if team data isn't loaded */}
      {(isAdmin || (teamMembers || []).length === 0) && (
        <div className="clean-form" style={{ maxWidth: 500, marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>Select Employee:</div>
          <select
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }}
            value={selectedUserId || ''}
            onChange={(e) => setSelectedUserId(e.target.value ? +e.target.value : undefined)}>
            <option value="">-- Choose --</option>
            {(pendingUsers || []).map((u: any) => (
              <option key={u.id} value={u.id}>{u.displayName || u.username}</option>
            ))}
          </select>
        </div>
      )}

      {/* Approve All button */}
      {selectedUserId && totalPending > 0 && (
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Popconfirm
            title="Approve All?"
            description={`This will approve all ${totalPending} pending entries for this user.`}
            onConfirm={() => batchMut.mutate()}
          >
            <Button type="primary" className="submit-btn" loading={batchMut.isPending}>
              Approve All ({totalPending} entries)
            </Button>
          </Popconfirm>
        </div>
      )}

      {/* Content */}
      {loadingEntries ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : selectedUserId && (grouped?.weeks || []).length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(grouped?.weeks || []).map((week: any) => (
            <div key={week.weekNumber} style={{ marginBottom: 4 }}>
              <div className="week-header">
                <span className="week-label">Week# {String(week.weekNumber).padStart(2, '0')}:</span>
                <span className="week-range">
                  {dayjs(week.weekStart).format('DD MMM, YYYY')} - ({dayjs(week.weekStart).format('ddd')})
                  <strong> To </strong>
                  {dayjs(week.weekEnd).format('DD MMM, YYYY')} - ({dayjs(week.weekEnd).format('ddd')})
                </span>
              </div>

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

          <div className="grand-total-row" style={{ display: 'flex' }}>
            <div style={{ flex: 1, textAlign: 'right', paddingRight: 20 }}><strong>Total Hours:</strong></div>
            <div style={{ minWidth: 76 }}><strong>{grouped?.grandTotal}</strong></div>
          </div>
        </div>
      ) : selectedUserId ? (
        <div className="no-record-found">No pending entries for this employee</div>
      ) : !selectedUserId && pendingUserIds.size === 0 ? (
        <Card size="small" style={{ borderRadius: 10, background: '#f6ffed', border: '1px solid #b7eb8f', textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 32 }}>&#10003;</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>All Caught Up!</div>
          <div style={{ fontSize: 13, color: '#666' }}>No pending time entries from your team.</div>
        </Card>
      ) : null}
    </div>
  );
}
