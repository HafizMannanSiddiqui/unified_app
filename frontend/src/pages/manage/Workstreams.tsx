import { useQuery } from '@tanstack/react-query';
import { Table, Typography, Select, Space, Tag } from 'antd';
import { useState } from 'react';
import { getWorkstreams } from '../../api/gtl';
import { getTeams } from '../../api/teams';

export default function Workstreams() {
  const [teamId, setTeamId] = useState<number | undefined>();
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });
  const { data, isLoading } = useQuery({
    queryKey: ['workstreams', teamId],
    queryFn: () => getWorkstreams(teamId),
  });

  return (
    <div>
      <Typography.Title level={4}>Teamwise Workstreams</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Select Team" allowClear style={{ width: 250 }} onChange={setTeamId}
          options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />
      </Space>
      <Table columns={[
        { title: '#', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { title: 'Team Name', dataIndex: ['team', 'teamName'] },
        { title: 'Workstream', dataIndex: ['subProject', 'subProjectName'] },
        { title: 'Active', dataIndex: 'isActive', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Tag> },
      ]} dataSource={data || []} rowKey="id" loading={isLoading} size="small" pagination={{ pageSize: 30 }} />
    </div>
  );
}
