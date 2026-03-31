import { useQuery } from '@tanstack/react-query';
import { Table, Tag, DatePicker, Typography, Space, Select } from 'antd';
import { useState } from 'react';
import dayjs from 'dayjs';
import { getDailyReport } from '../../api/attendance';
import { getTeams } from '../../api/teams';

export default function DailyReport() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [teamId, setTeamId] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['dailyReport', date, teamId],
    queryFn: () => getDailyReport(date, teamId),
  });

  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  const columns = [
    { title: 'Name', dataIndex: ['user', 'displayName'] },
    { title: 'Username', dataIndex: ['user', 'username'] },
    { title: 'Check In', dataIndex: 'checkinTime', render: (v: string) => v ? String(v).slice(0, 8) : '-' },
    { title: 'Check Out', dataIndex: 'checkoutTime', render: (v: string) => v ? String(v).slice(0, 8) : '-' },
    {
      title: 'State',
      dataIndex: 'checkinState',
      render: (v: string) => <Tag color={v === 'rfid' ? 'blue' : 'default'}>{v}</Tag>,
    },
    {
      title: 'Duration',
      render: (_: any, r: any) => {
        if (!r.checkinTime || !r.checkoutTime) return '-';
        const ci = dayjs(`2000-01-01 ${r.checkinTime}`);
        const co = dayjs(`2000-01-01 ${r.checkoutTime}`);
        const diff = co.diff(ci, 'minute');
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
      },
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Daily Attendance Report</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <DatePicker defaultValue={dayjs(date)} onChange={(_, d) => d && setDate(d as string)} />
        <Select placeholder="All Teams" allowClear style={{ width: 200 }} onChange={setTeamId}
          options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />
      </Space>
      <Table columns={columns} dataSource={data || []} rowKey="id" loading={isLoading} size="small"
        pagination={{ pageSize: 50, showTotal: (t) => `${t} records` }} scroll={{ x: 800 }} />
    </div>
  );
}
