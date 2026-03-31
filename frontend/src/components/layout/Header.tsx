import { LogoutOutlined, UserOutlined, BellOutlined } from '@ant-design/icons';
import { Avatar, Badge, Dropdown, Layout, Space, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '../../hooks/useAuth';

const { Header: AntHeader } = Layout;

const companies: { key: string; name: string; color: string; domains: string[] }[] = [
  { key: 'Powersoft19', name: 'Powersoft19', color: '#FC9C10', domains: ['powersoft19'] },
  { key: 'Venturetronics', name: 'Venturetronics', color: '#fc3b27', domains: ['venturetronics'] },
  { key: 'Raythorne', name: 'Raythorne', color: '#2b3750', domains: ['raythorne'] },
  { key: 'AngularSpring', name: 'AngularSpring', color: '#B32B48', domains: ['angularspring'] },
];

export function detectCompany(payrollCompany?: string | null, email?: string | null) {
  // Try payrollCompany first
  if (payrollCompany) {
    const found = companies.find(c => payrollCompany.toLowerCase().includes(c.key.toLowerCase().replace(/\d+/g, '')));
    if (found) return found;
  }
  // Fallback: detect from email domain
  if (email) {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    const found = companies.find(c => c.domains.some(d => domain.includes(d)));
    if (found) return found;
  }
  return null;
}

export default function Header() {
  const { user, logout } = useAuth();

  const company = detectCompany(user?.payrollCompany, user?.email);
  const companyColor = company?.color || '#154360';

  const items: MenuProps['items'] = [
    {
      key: 'user',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{user?.displayName || user?.username}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{user?.email || user?.username}</div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: logout,
      danger: true,
    },
  ];

  return (
    <AntHeader style={{
      background: '#fff',
      padding: '0 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #f0f0f0',
      height: 56,
      lineHeight: '56px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Left: Company tag */}
      <div>
        {company && (
          <Tag color={companyColor} style={{ borderRadius: 6, fontWeight: 600, fontSize: 13, padding: '2px 12px' }}>
            {company.name}
          </Tag>
        )}
      </div>

      {/* Right: Bell + Avatar + Name */}
      <Space size={16}>
        <Badge count={0} size="small">
          <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#595959' }} />
        </Badge>
        <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size={32} style={{ background: companyColor, fontWeight: 600 }}>
              {user?.displayName?.[0]?.toUpperCase() || <UserOutlined />}
            </Avatar>
            <span style={{ fontWeight: 500, color: '#262626' }}>
              {user?.displayName || user?.username}
            </span>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}
