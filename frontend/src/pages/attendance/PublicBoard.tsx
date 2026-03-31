import { useQuery } from '@tanstack/react-query';
import { Spin, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getPublicTodayDashboard } from '../../api/attendance';

export default function PublicBoard() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['publicBoard'],
    queryFn: getPublicTodayDashboard,
    refetchInterval: 30000, // refresh every 30 seconds
  });

  const filter = (users: any[]) =>
    search ? users.filter((u: any) => (u.displayName || u.username || '').toLowerCase().includes(search.toLowerCase())) : users;

  const today = dayjs();

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fa', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #0d2137 100%)', padding: '32px 40px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 2 }}>
              <span style={{ color: '#ff6b35' }}>A</span>MS
            </div>
            <div style={{ fontSize: 14, letterSpacing: 3, color: '#ff6b35', fontWeight: 600 }}>
              ATTEND<span style={{ color: '#ff6b35' }}>ANCE</span>
            </div>
            <div style={{ fontSize: 14, letterSpacing: 3, color: '#4db8ff', fontWeight: 600 }}>
              MANAGE<span style={{ color: '#4db8ff' }}>MENT</span>
            </div>
            <div style={{ fontSize: 14, letterSpacing: 3, fontWeight: 600 }}>
              SYSTEM
            </div>
          </div>
          <a href="/login" style={{ color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>Sign in</a>
        </div>
      </div>

      {/* Team Member's List */}
      <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 20px' }}>
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0', padding: '20px 24px' }}>
          {/* Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e0e0e0', paddingBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#333' }}>
              — Team Member's List —
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Input prefix={<SearchOutlined />} placeholder="Search..." allowClear
                onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
              <div style={{ fontStyle: 'italic', color: '#555', fontSize: 14 }}>
                {today.format('dddd, MMMM D, YYYY')}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
          ) : data ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#1a2a3a', color: '#fff', padding: '10px 16px', fontWeight: 600, fontSize: 14, textAlign: 'center', width: '33%' }}>
                      Available [{data.available.count}/{data.total}]
                    </th>
                    <th style={{ background: '#1a2a3a', color: '#fff', padding: '10px 16px', fontWeight: 600, fontSize: 14, textAlign: 'center', width: '33%' }}>
                      Not Available [{data.notAvailable.count}/{data.total}]
                    </th>
                    <th style={{ background: '#1a2a3a', color: '#fff', padding: '10px 16px', fontWeight: 600, fontSize: 14, textAlign: 'center', width: '34%' }}>
                      Pending CheckOuts [{data.pendingCheckout.count}/{data.total}]
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const avail = filter(data.available.users);
                    const notAvail = filter(data.notAvailable.users);
                    const pending = filter(data.pendingCheckout.users);
                    const maxLen = Math.max(avail.length, notAvail.length, pending.length, 1);
                    const rows = [];
                    for (let i = 0; i < maxLen; i++) {
                      rows.push(
                        <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '6px 16px', fontSize: 13 }}>
                            {avail[i]?.displayName || avail[i]?.username || ''}
                          </td>
                          <td style={{ padding: '6px 16px', fontSize: 13 }}>
                            {notAvail[i]?.displayName || notAvail[i]?.username || ''}
                          </td>
                          <td style={{ padding: '6px 16px', fontSize: 13 }}>
                            {pending[i]?.displayName || pending[i]?.username || ''}
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
