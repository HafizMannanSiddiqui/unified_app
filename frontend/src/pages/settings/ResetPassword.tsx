import { useMutation } from '@tanstack/react-query';
import { Button, Form, Input, message } from 'antd';
import { resetPassword } from '../../api/gtl';

export default function ResetPassword() {
  const [form] = Form.useForm();

  const mutation = useMutation({
    mutationFn: (values: any) => resetPassword(values.newPassword),
    onSuccess: () => { message.success('Password updated successfully!'); form.resetFields(); },
    onError: () => message.error('Failed to update password'),
  });

  const onFinish = (values: any) => {
    if (values.newPassword.length < 6) {
      message.error('Password must be at least 6 characters');
      return;
    }
    mutation.mutate(values);
  };

  const labelStyle = { fontWeight: 600, color: '#1C2833' } as const;
  const req = <span style={{ color: '#e74c3c' }}>*</span>;

  return (
    <div>
      <div className="page-heading">Reset Password</div>

      <div style={{ maxWidth: 900, marginTop: 16 }}>
        <Form form={form} onFinish={onFinish} layout="vertical" className="clean-form">
          <div className="form-grid">
            <Form.Item name="newPassword" label={<span style={labelStyle}>New Password:{req}</span>}
              rules={[{ required: true, min: 6, message: 'Min 6 characters' }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="confirmPassword" label={<span style={labelStyle}>Confirm Password:{req}</span>}
              rules={[{ required: true, message: 'Required' }, ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              })]}>
              <Input.Password />
            </Form.Item>
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={mutation.isPending} className="submit-btn">
              Reset
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
