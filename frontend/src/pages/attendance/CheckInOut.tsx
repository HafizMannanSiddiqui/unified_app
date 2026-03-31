import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Typography, message, Tag, Row, Col, Statistic, Divider, Result } from 'antd';
import { LoginOutlined, LogoutOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { checkin, checkout, getMyAttendance } from '../../api/attendance';

export default function CheckInOut() {
  const qc = useQueryClient();
  const [time, setTime] = useState(dayjs());
  const [lastAction, setLastAction] = useState<string | null>(null);
  const today = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    const timer = setInterval(() => setTime(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get today's attendance to show status
  const { data: todayAtt } = useQuery({
    queryKey: ['todayAttendance', today],
    queryFn: () => getMyAttendance(today, today),
  });

  const todayRecord = (todayAtt || [])[0];
  const isCheckedIn = todayRecord && !todayRecord.checkoutTime;

  const checkinMut = useMutation({
    mutationFn: () => checkin({ state: 'manual' }),
    onSuccess: (data: any) => {
      if (data?.alreadyCheckedIn) {
        message.warning('Already checked in today. Please check out first.');
        return;
      }
      message.success({ content: 'Checked in successfully!', icon: <CheckCircleOutlined style={{ color: '#52c41a' }} /> });
      setLastAction('checkin');
      qc.invalidateQueries({ queryKey: ['todayAttendance'] });
      qc.invalidateQueries({ queryKey: ['myAttendance'] });
    },
    onError: () => message.error('Check-in failed. Please try again.'),
  });

  const checkoutMut = useMutation({
    mutationFn: () => checkout({ state: 'manual' }),
    onSuccess: (data: any) => {
      if (data?.missedCheckout || data?.autoClosedAt12h) {
        message.error(data.error, 8);
        qc.invalidateQueries({ queryKey: ['todayAttendance'] });
        return;
      }
      if (data) {
        message.success({ content: 'Checked out successfully!', icon: <CheckCircleOutlined style={{ color: '#52c41a' }} /> });
        setLastAction('checkout');
      } else {
        message.warning('No active check-in found for today.');
      }
      qc.invalidateQueries({ queryKey: ['todayAttendance'] });
      qc.invalidateQueries({ queryKey: ['myAttendance'] });
    },
    onError: () => message.error('Check-out failed. Please try again.'),
  });

  // Calculate today's working hours
  let workingHours = '-';
  if (todayRecord?.checkinTime) {
    const ci = dayjs(`${today} ${todayRecord.checkinTime}`);
    const end = todayRecord.checkoutTime ? dayjs(`${today} ${todayRecord.checkoutTime}`) : time;
    const diff = end.diff(ci, 'minute');
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    workingHours = `${h}h ${m}m`;
  }

  return (
    <div>
      <Typography.Title level={4}>Check In / Out</Typography.Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }} styles={{ body: { padding: 40 } }}>
            {/* Live Clock */}
            <Typography.Title level={1} style={{ margin: 0, fontWeight: 300, fontSize: 56, fontFamily: 'monospace' }}>
              {time.format('HH:mm:ss')}
            </Typography.Title>
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 16px', marginTop: 8, marginBottom: 32 }}>
              {time.format('dddd, MMMM D, YYYY')}
            </Tag>

            <Divider />

            {/* Status */}
            {isCheckedIn ? (
              <div style={{ marginBottom: 24 }}>
                <Tag color="green" style={{ fontSize: 14, padding: '6px 16px' }}>
                  <CheckCircleOutlined /> Checked in at {String(todayRecord.checkinTime).slice(0, 5)}
                </Tag>
              </div>
            ) : todayRecord?.checkoutTime ? (
              <div style={{ marginBottom: 24 }}>
                <Tag color="default" style={{ fontSize: 14, padding: '6px 16px' }}>
                  Completed for today ({String(todayRecord.checkinTime).slice(0, 5)} - {String(todayRecord.checkoutTime).slice(0, 5)})
                </Tag>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <Button
                type="primary"
                size="large"
                icon={<LoginOutlined />}
                onClick={() => checkinMut.mutate()}
                loading={checkinMut.isPending}
                style={{ height: 52, paddingInline: 32, borderRadius: 12, fontWeight: 600, fontSize: 16 }}
                disabled={isCheckedIn}
              >
                Check In
              </Button>
              <Button
                danger
                size="large"
                icon={<LogoutOutlined />}
                onClick={() => checkoutMut.mutate()}
                loading={checkoutMut.isPending}
                style={{ height: 52, paddingInline: 32, borderRadius: 12, fontWeight: 600, fontSize: 16 }}
                disabled={!isCheckedIn}
              >
                Check Out
              </Button>
            </div>

            {/* Success feedback */}
            {lastAction && (
              <div style={{ marginTop: 24 }}>
                <Result
                  status="success"
                  title={lastAction === 'checkin' ? 'Checked In!' : 'Checked Out!'}
                  subTitle={`at ${time.format('hh:mm A')}`}
                  style={{ padding: '16px 0 0' }}
                />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Today's Summary" style={{ borderRadius: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Check In"
                  value={todayRecord?.checkinTime ? String(todayRecord.checkinTime).slice(0, 5) : '--:--'}
                  prefix={<LoginOutlined style={{ color: '#52c41a' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Check Out"
                  value={todayRecord?.checkoutTime ? String(todayRecord.checkoutTime).slice(0, 5) : '--:--'}
                  prefix={<LogoutOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Working Hours"
                  value={workingHours}
                  prefix={<ClockCircleOutlined style={{ color: '#1677ff' }} />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Method"
                  value={todayRecord?.checkinState || '-'}
                  prefix={<CheckCircleOutlined style={{ color: '#722ed1' }} />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
