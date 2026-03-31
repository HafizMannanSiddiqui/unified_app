import { useState } from 'react';
import { Layout, message } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const { Content } = Layout;

// Configure global message
message.config({ top: 60, maxCount: 3 });

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout>
        <Header />
        <Content style={{
          margin: 16,
          padding: 24,
          background: '#fff',
          borderRadius: 12,
          minHeight: 'calc(100vh - 100px)',
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
