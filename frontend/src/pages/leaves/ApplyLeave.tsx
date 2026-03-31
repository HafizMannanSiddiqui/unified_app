import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, DatePicker, Form, Input, Select, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { createLeave } from '../../api/leaves';
import { useAuthStore } from '../../store/authStore';

const { RangePicker } = DatePicker;

export default function ApplyLeave() {
  const [form] = Form.useForm();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: createLeave,
    onSuccess: () => { message.success('Leave applied'); form.resetFields(); qc.invalidateQueries({ queryKey: ['myLeaves'] }); },
    onError: () => message.error('Failed to apply leave'),
  });

  const onFinish = (values: any) => {
    const [from, to] = values.dateRange;
    const days = to.diff(from, 'day') + 1;
    mutation.mutate({
      userId: user?.id,
      fromDate: from.format('YYYY-MM-DD'),
      toDate: to.format('YYYY-MM-DD'),
      numberOfDays: days,
      leaveType: values.leaveType,
      description: values.description,
    });
  };

  return (
    <div>
      <Typography.Title level={4}>Apply for Leave</Typography.Title>
      <Card style={{ maxWidth: 500 }}>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="dateRange" label="Date Range" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} disabledDate={(current) => current && current.isBefore(dayjs(), 'day')} />
          </Form.Item>
          <Form.Item name="leaveType" label="Leave Type" rules={[{ required: true }]}>
            <Select options={[
              { label: 'Casual Leave', value: 'casual_leave' },
              { label: 'Earned Leave', value: 'earned_leave' },
              { label: 'Sick Leave', value: 'sick_leave' },
            ]} />
          </Form.Item>
          <Form.Item name="description" label="Reason">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} block>Submit Leave Request</Button>
        </Form>
      </Card>
    </div>
  );
}
