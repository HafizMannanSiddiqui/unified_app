import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Form, Input, Select, Card, Row, Col, Statistic, Tag, message } from 'antd';
import { CalendarOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createLeave, getLeaveBalance } from '../../api/leaves';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';

const { RangePicker } = DatePicker;

export default function ApplyLeave() {
  const [form] = Form.useForm();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [days, setDays] = useState(0);

  const { data: balance } = useQuery({
    queryKey: ['leaveBalance', user?.id],
    queryFn: () => getLeaveBalance(user!.id),
    enabled: !!user?.id,
  });

  const mutation = useMutation({
    mutationFn: createLeave,
    onSuccess: () => { message.success('Leave request submitted! Your lead will review it.'); form.resetFields(); setDays(0); qc.invalidateQueries({ queryKey: ['myLeaves'] }); },
    onError: () => message.error('Failed to apply leave'),
  });

  const onFinish = (values: any) => {
    const [from, to] = values.dateRange;
    mutation.mutate({
      userId: user?.id,
      fromDate: from.format('YYYY-MM-DD'),
      toDate: to.format('YYYY-MM-DD'),
      numberOfDays: to.diff(from, 'day') + 1,
      leaveType: values.leaveType,
      description: values.description,
    });
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-heading"><CalendarOutlined style={{ marginRight: 8 }} />Apply for Leave</div>

      {/* Balance Card */}
      {balance && (
        <Card size="small" style={{ borderRadius: 12, marginBottom: 16, border: '2px solid var(--brand-primary, #154360)' }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <Statistic title="Allowed" value={balance.allowed} suffix="days" valueStyle={{ color: 'var(--brand-primary)', fontSize: 20 }} />
            </Col>
            <Col span={8}>
              <Statistic title="Used" value={balance.used} suffix="days" valueStyle={{ color: '#fa8c16', fontSize: 20 }} />
            </Col>
            <Col span={8}>
              <Statistic title="Remaining" value={balance.remaining} suffix="days"
                valueStyle={{ color: balance.remaining > 5 ? '#52c41a' : '#ff4d4f', fontSize: 20 }} />
            </Col>
          </Row>
        </Card>
      )}

      <Card style={{ borderRadius: 12 }} className="clean-form">
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="dateRange" label={<span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Date Range</span>}
            rules={[{ required: true, message: 'Select dates' }]}>
            <RangePicker style={{ width: '100%' }}
              disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) setDays(dates[1].diff(dates[0], 'day') + 1);
                else setDays(0);
              }} />
          </Form.Item>

          {days > 0 && (
            <div style={{ marginTop: -8, marginBottom: 12, fontSize: 13, color: 'var(--brand-primary)', fontWeight: 600 }}>
              {days} day{days > 1 ? 's' : ''} selected
              {balance && days > balance.remaining && <Tag color="red" style={{ marginLeft: 8 }}>Exceeds remaining balance!</Tag>}
            </div>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="leaveType" label={<span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Leave Type</span>}
                rules={[{ required: true, message: 'Select type' }]}>
                <Select placeholder="Select type..." options={[
                  { label: 'Casual Leave', value: 'casual_leave' },
                  { label: 'Earned Leave', value: 'earned_leave' },
                  { label: 'Sick Leave', value: 'sick_leave' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <div style={{ paddingTop: 30, fontSize: 13, color: '#8c8c8c' }}>
                Your Team Lead will approve or reject this request
              </div>
            </Col>
          </Row>

          <Form.Item name="description" label={<span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Reason</span>}>
            <Input.TextArea rows={3} placeholder="Why do you need this leave?" showCount maxLength={300} style={{ resize: 'none' }} />
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={mutation.isPending} icon={<SendOutlined />}
              size="large" style={{ borderRadius: 24, padding: '0 48px', height: 44, fontWeight: 600 }}>
              Submit Leave Request
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
