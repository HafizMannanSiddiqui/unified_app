import { useQuery } from '@tanstack/react-query';
import { Select, Button, Spin, Card, Tag, Divider } from 'antd';
import { FilePdfOutlined, PrinterOutlined, UserOutlined } from '@ant-design/icons';
import { useState, useRef } from 'react';
import apiClient from '../../api/client';
import { getUsers } from '../../api/users';

const getProfile = (userId: number) => apiClient.get(`/profiles/${userId}`).then(r => r.data);
const getUserInfo = (userId: number) => apiClient.get(`/users/${userId}`).then(r => r.data);

export default function CvGenerator() {
  const [userId, setUserId] = useState<number | undefined>();
  const cvRef = useRef<HTMLDivElement>(null);

  const { data: users } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 5000) });
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['cvProfile', userId], queryFn: () => getProfile(userId!), enabled: !!userId,
  });
  const { data: userInfo } = useQuery({
    queryKey: ['cvUser', userId], queryFn: () => getUserInfo(userId!), enabled: !!userId,
  });

  const handlePrint = () => {
    const content = cvRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>CV - ${userInfo?.displayName || ''}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #154360; margin-bottom: 4px; } h2 { color: #154360; border-bottom: 2px solid #154360; padding-bottom: 4px; margin-top: 24px; font-size: 16px; }
        .section { margin-bottom: 16px; } .row { display: flex; gap: 32px; margin-bottom: 6px; }
        .label { font-weight: 600; min-width: 140px; color: #666; } .value { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #154360; color: #fff; padding: 6px 10px; text-align: left; font-size: 12px; }
        td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
        @media print { body { margin: 20px; } }
      </style></head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const edu = profile?.education || [];
  const exp = profile?.experience || [];
  const visas = profile?.visas || [];

  return (
    <div>
      <div className="page-heading"><FilePdfOutlined style={{ marginRight: 8 }} />CV Generator</div>

      <div className="filter-bar">
        <Select showSearch optionFilterProp="label" style={{ width: 350 }} placeholder="Select employee..."
          value={userId} onChange={setUserId}
          options={(users?.items || []).filter((u: any) => u.isActive).map((u: any) => ({
            label: `${u.displayName || u.username} — ${u.team?.teamName || ''}`, value: u.id,
          }))} />
        {userId && profile && (
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print / Save PDF</Button>
        )}
      </div>

      {loadingProfile && userId && <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>}

      {profile && userInfo && (
        <Card style={{ borderRadius: 12, marginTop: 16 }}>
          <div ref={cvRef}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--brand-primary, #154360)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 700 }}>
                {(userInfo.displayName || userInfo.username)?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 24 }}>{userInfo.displayName || userInfo.username}</h1>
                <div style={{ fontSize: 15, color: '#666' }}>{userInfo.designation?.name || profile.jobTitle || ''}</div>
                <div style={{ fontSize: 13, color: '#999' }}>{userInfo.team?.teamName || ''} {userInfo.email ? `• ${userInfo.email}` : ''}</div>
              </div>
            </div>

            {/* Personal Info */}
            <h2 style={{ color: 'var(--brand-primary, #154360)', borderBottom: '2px solid var(--brand-primary, #154360)' }}>Personal Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 32px', fontSize: 13 }}>
              {profile.firstName && <div><span style={{ fontWeight: 600, color: '#666' }}>Name:</span> {profile.firstName} {profile.lastName}</div>}
              {profile.fatherName && <div><span style={{ fontWeight: 600, color: '#666' }}>Father:</span> {profile.fatherName}</div>}
              {profile.cnic && <div><span style={{ fontWeight: 600, color: '#666' }}>CNIC:</span> {profile.cnic}</div>}
              {profile.contactNo && <div><span style={{ fontWeight: 600, color: '#666' }}>Phone:</span> {profile.contactNo}</div>}
              {profile.personalEmail && <div><span style={{ fontWeight: 600, color: '#666' }}>Personal Email:</span> {profile.personalEmail}</div>}
              {profile.dob && <div><span style={{ fontWeight: 600, color: '#666' }}>DOB:</span> {new Date(profile.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
              {profile.nationality && <div><span style={{ fontWeight: 600, color: '#666' }}>Nationality:</span> {profile.nationality}</div>}
              {profile.maritalStatus && <div><span style={{ fontWeight: 600, color: '#666' }}>Marital Status:</span> {profile.maritalStatus}</div>}
              {profile.bloodGroup && <div><span style={{ fontWeight: 600, color: '#666' }}>Blood Group:</span> {profile.bloodGroup}</div>}
              {profile.dateOfJoining && <div><span style={{ fontWeight: 600, color: '#666' }}>Date of Joining:</span> {new Date(profile.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
            </div>

            {profile.currentAddress && (
              <div style={{ marginTop: 8, fontSize: 13 }}><span style={{ fontWeight: 600, color: '#666' }}>Address:</span> {profile.currentAddress}</div>
            )}

            {/* Career Objectives */}
            {profile.careerObjectives && (
              <>
                <h2 style={{ color: 'var(--brand-primary, #154360)', borderBottom: '2px solid var(--brand-primary, #154360)' }}>Career Objectives</h2>
                <div style={{ fontSize: 13 }}>{profile.careerObjectives}</div>
              </>
            )}

            {/* Education */}
            {edu.length > 0 && (
              <>
                <h2 style={{ color: 'var(--brand-primary, #154360)', borderBottom: '2px solid var(--brand-primary, #154360)' }}>Education</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: 'var(--brand-primary, #154360)', color: '#fff' }}>
                    <th style={{ padding: '6px 10px', fontSize: 12 }}>Degree</th>
                    <th style={{ padding: '6px 10px', fontSize: 12 }}>Board/University</th>
                    <th style={{ padding: '6px 10px', fontSize: 12 }}>Year</th>
                    <th style={{ padding: '6px 10px', fontSize: 12 }}>Result</th>
                  </tr></thead>
                  <tbody>{edu.map((e: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '5px 10px', fontSize: 12 }}>{e.degree || e.examination || '-'}</td>
                      <td style={{ padding: '5px 10px', fontSize: 12 }}>{e.board || '-'}</td>
                      <td style={{ padding: '5px 10px', fontSize: 12 }}>{e.passingYear || '-'}</td>
                      <td style={{ padding: '5px 10px', fontSize: 12 }}>{e.percentage || '-'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </>
            )}

            {/* Experience */}
            {exp.length > 0 && (
              <>
                <h2 style={{ color: 'var(--brand-primary, #154360)', borderBottom: '2px solid var(--brand-primary, #154360)' }}>Work Experience</h2>
                {exp.map((e: any, i: number) => (
                  <div key={i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: '3px solid var(--brand-primary, #154360)' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.designation || e.jobRole || '-'}</div>
                    <div style={{ fontSize: 13, color: '#666' }}>{e.organization || '-'}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {e.workFrom ? new Date(e.workFrom).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '?'}
                      {' — '}
                      {e.workTo ? new Date(e.workTo).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Present'}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Skills/Languages */}
            {(profile.languages || []).length > 0 && (
              <>
                <h2 style={{ color: 'var(--brand-primary, #154360)', borderBottom: '2px solid var(--brand-primary, #154360)' }}>Languages</h2>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(profile.languages || []).map((l: string, i: number) => <Tag key={i}>{l}</Tag>)}
                </div>
              </>
            )}

            {/* Visa */}
            {visas.length > 0 && (
              <>
                <h2 style={{ color: 'var(--brand-primary, #154360)', borderBottom: '2px solid var(--brand-primary, #154360)' }}>Visa Information</h2>
                {visas.map((v: any, i: number) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                    <strong>{v.visaCountry}</strong>
                    {v.visaExpiry && <span style={{ color: '#666' }}> — Expires: {new Date(v.visaExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
