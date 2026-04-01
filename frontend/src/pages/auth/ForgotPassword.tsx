import { useState } from 'react';
import { Button, Input, message } from 'antd';
import { LockOutlined, UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'username' | 'reset'>('username');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!username) { message.error('Enter your username'); return; }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { username }).then(r => r.data);
      if (res.success) {
        setToken(res.token);
        setStep('reset');
        message.success('Identity verified. Set your new password.');
      } else {
        message.error(res.message || 'Username not found');
      }
    } catch { message.error('Username not found or inactive'); }
    setLoading(false);
  };

  const handleReset = async () => {
    if (newPassword.length < 6) { message.error('Min 6 characters'); return; }
    if (newPassword !== confirmPassword) { message.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password-reset', { token, newPassword }).then(r => r.data);
      message.success('Password reset successfully! Please login.');
      navigate('/login');
    } catch { message.error('Reset failed'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <div style={{ width: 400, background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <LockOutlined style={{ fontSize: 40, color: '#154360', marginBottom: 12 }} />
          <h2 style={{ color: '#1C2833', margin: 0 }}>Reset Password</h2>
          <p style={{ color: '#8c8c8c', fontSize: 13 }}>
            {step === 'username' ? 'Enter your username to verify your identity' : 'Set your new password'}
          </p>
        </div>

        {step === 'username' ? (
          <>
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" value={username}
              onChange={e => setUsername(e.target.value)} onPressEnter={handleVerify}
              style={{ marginBottom: 16, borderRadius: 8 }} />
            <Button type="primary" block size="large" loading={loading} onClick={handleVerify}
              style={{ borderRadius: 8, height: 44, background: '#154360', borderColor: '#154360' }}>
              Verify Identity
            </Button>
          </>
        ) : (
          <>
            <Input.Password prefix={<LockOutlined />} placeholder="New Password" size="large" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} style={{ marginBottom: 12, borderRadius: 8 }} />
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} onPressEnter={handleReset}
              style={{ marginBottom: 16, borderRadius: 8 }} />
            <Button type="primary" block size="large" loading={loading} onClick={handleReset}
              style={{ borderRadius: 8, height: 44, background: '#154360', borderColor: '#154360' }}>
              Reset Password
            </Button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a onClick={() => navigate('/login')} style={{ color: '#1677ff', cursor: 'pointer' }}>
            <ArrowLeftOutlined /> Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
