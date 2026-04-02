import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Form, Input, Select, Tag, message, Modal, Popconfirm, Spin, Tabs, Row, Col, Statistic } from 'antd';
import { SettingOutlined, PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined, WifiOutlined, UserOutlined } from '@ant-design/icons';
import { useState } from 'react';
import apiClient from '../../api/client';
import { getUsers } from '../../api/users';

// API calls
const getDevices = () => apiClient.get('/users/devices').then(r => r.data);
const testConnection = (ip: string) => apiClient.post('/attendance/zkteco/test-connection', { ip }).then(r => r.data);
const syncDevice = (deviceId: number) => apiClient.post('/attendance/zkteco/sync', { deviceId }).then(r => r.data);
const syncAllDevices = () => apiClient.post('/attendance/zkteco/sync-all').then(r => r.data);
const getDeviceInfo = (ip: string) => apiClient.get('/attendance/zkteco/device-info', { params: { ip } }).then(r => r.data);
const createDevice = (data: any) => apiClient.post('/users/devices', data).then(r => r.data);
const updateDevice = (id: number, data: any) => apiClient.put(`/users/devices/${id}`, data).then(r => r.data);
const getDeviceUsers = (search?: string) => apiClient.get('/users/device-users', { params: { search } }).then(r => r.data);
const createDeviceUser = (data: any) => apiClient.post('/users/device-users', data).then(r => r.data);
const updateDeviceUser = (id: number, data: any) => apiClient.put(`/users/device-users/${id}`, data).then(r => r.data);
const deleteDeviceUser = (id: number) => apiClient.post(`/users/device-users/${id}/delete`).then(r => r.data);

export default function DeviceManagement() {
  const qc = useQueryClient();
  const [editDevice, setEditDevice] = useState<any>(null);
  const [deviceForm] = Form.useForm();
  const [addDeviceModal, setAddDeviceModal] = useState(false);
  const [addDeviceForm] = Form.useForm();
  const [addUserModal, setAddUserModal] = useState(false);
  const [addUserForm] = Form.useForm();
  const [search, setSearch] = useState('');

  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: getDevices });
  const { data: deviceUsers, isLoading } = useQuery({ queryKey: ['deviceUsers', search], queryFn: () => getDeviceUsers(search || undefined) });
  const { data: allUsers } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 5000) });

  const createDeviceMut = useMutation({
    mutationFn: (data: any) => createDevice({ name: `device${(devices || []).length + 1}`, displayName: data.displayName, value: { ip: data.ip }, description: data.description }),
    onSuccess: () => { message.success('Device added'); setAddDeviceModal(false); addDeviceForm.resetFields(); qc.invalidateQueries({ queryKey: ['devices'] }); },
  });

  const updateDeviceMut = useMutation({
    mutationFn: ({ id, ...data }: any) => updateDevice(id, data),
    onSuccess: () => { message.success('Device updated'); setEditDevice(null); qc.invalidateQueries({ queryKey: ['devices'] }); },
  });

  const createUserMut = useMutation({
    mutationFn: createDeviceUser,
    onSuccess: () => { message.success('Device user added'); setAddUserModal(false); addUserForm.resetFields(); qc.invalidateQueries({ queryKey: ['deviceUsers'] }); },
  });

  const deleteUserMut = useMutation({
    mutationFn: deleteDeviceUser,
    onSuccess: () => { message.success('Deleted'); qc.invalidateQueries({ queryKey: ['deviceUsers'] }); },
  });

  const openEditDevice = (d: any) => {
    setEditDevice(d);
    deviceForm.setFieldsValue({ displayName: d.displayName, description: d.description, ip: d.value?.ip, isActive: d.isActive });
  };

  return (
    <div>
      <div className="page-heading"><SettingOutlined style={{ marginRight: 8 }} />ZKTeco Device Configuration</div>

      <Tabs items={[
        {
          key: 'devices', label: 'Devices', icon: <WifiOutlined />,
          children: (
            <>
              <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddDeviceModal(true)}>
                  Add Device
                </Button>
                <Button style={{ borderRadius: 20 }}
                  onClick={async () => { message.loading('Syncing all devices...', 0); try { const r = await syncAllDevices(); message.destroy(); message.success(`Synced ${r.length} devices`); } catch { message.destroy(); message.error('Sync failed'); } }}>
                  Sync All Devices
                </Button>
              </div>

              <Row gutter={16} style={{ marginBottom: 20 }}>
                {(devices || []).map((d: any) => (
                  <Col key={d.id} xs={24} md={8}>
                    <Card style={{ borderRadius: 12, borderLeft: `4px solid ${d.isActive ? '#52c41a' : '#ff4d4f'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: '#1C2833' }}>{d.displayName}</div>
                          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{d.description || 'No description'}</div>
                          <Tag color="blue" style={{ marginTop: 8, fontSize: 14, fontFamily: 'monospace' }}>{d.value?.ip || 'No IP'}</Tag>
                          <div style={{ marginTop: 6 }}>
                            <Tag color={d.isActive ? 'green' : 'red'}>{d.isActive ? 'Active' : 'Inactive'}</Tag>
                          </div>
                        </div>
                        <Button icon={<EditOutlined />} size="small" onClick={() => openEditDevice(d)} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                        <Button size="small" onClick={async () => {
                          message.loading('Testing...', 0);
                          try {
                            const r = await testConnection(d.value?.ip);
                            message.destroy();
                            r.status === 'success' ? message.success(r.message) : message.error(r.message);
                          } catch { message.destroy(); message.error('Connection failed'); }
                        }}>Test Connection</Button>
                        <Button size="small" type="primary" onClick={async () => {
                          message.loading('Syncing...', 0);
                          try {
                            const r = await syncDevice(d.id);
                            message.destroy();
                            message.success(`Synced: ${r.created} new records from ${r.logsFromDevice} logs`);
                          } catch (e: any) { message.destroy(); message.error(e.message || 'Sync failed'); }
                        }}>Sync Now</Button>
                        <Button size="small" onClick={async () => {
                          try {
                            const info = await getDeviceInfo(d.value?.ip);
                            Modal.info({ title: `${d.displayName} Info`, content: <pre style={{ fontSize: 12 }}>{JSON.stringify(info, null, 2)}</pre> });
                          } catch { message.error('Cannot get device info'); }
                        }}>Info</Button>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Modal title="Edit Device" open={!!editDevice} onCancel={() => setEditDevice(null)}
                onOk={() => deviceForm.submit()} confirmLoading={updateDeviceMut.isPending}>
                <Form form={deviceForm} layout="vertical" className="clean-form" style={{ marginTop: 16 }}
                  onFinish={(v) => updateDeviceMut.mutate({ id: editDevice.id, displayName: v.displayName, description: v.description, value: { ip: v.ip }, isActive: v.isActive })}>
                  <Form.Item name="displayName" label="Device Name"><Input /></Form.Item>
                  <Form.Item name="ip" label="IP Address"><Input placeholder="10.10.17.112" /></Form.Item>
                  <Form.Item name="description" label="Description"><Input /></Form.Item>
                  <Form.Item name="isActive" label="Status">
                    <Select options={[{ label: 'Active', value: true }, { label: 'Inactive', value: false }]} />
                  </Form.Item>
                </Form>
              </Modal>
            </>
          ),
        },
        {
          key: 'users', label: `Device Users (${(deviceUsers || []).length})`, icon: <UserOutlined />,
          children: (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Input prefix={<SearchOutlined />} placeholder="Search name, card number..."
                  allowClear onChange={e => setSearch(e.target.value)} style={{ width: 300 }} />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserModal(true)}
                  style={{ background: '#e74c3c', borderColor: '#e74c3c', borderRadius: 20 }}>
                  Add Device User
                </Button>
              </div>

              {isLoading ? <Spin /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#154360', color: '#fff' }}>
                        <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>UID</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Device Name</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Mapped User</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Team</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Card Number</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Role</th>
                        <th style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(deviceUsers || []).map((du: any) => (
                        <tr key={du.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '7px 12px', fontSize: 13 }}>{du.uid}</td>
                          <td style={{ padding: '7px 12px', fontSize: 13 }}>{du.name || '-'}</td>
                          <td style={{ padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>{du.user?.displayName || du.user?.username || '-'}</td>
                          <td style={{ padding: '7px 12px', fontSize: 13 }}>{du.user?.team?.teamName || '-'}</td>
                          <td style={{ padding: '7px 12px', fontSize: 13, fontFamily: 'monospace' }}>{du.cardNo || '-'}</td>
                          <td style={{ padding: '7px 12px', fontSize: 13 }}>
                            <Tag color={du.role === 0 ? 'default' : 'blue'}>{du.role === 0 ? 'User' : 'Admin'}</Tag>
                          </td>
                          <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'center' }}>
                            <Popconfirm title="Delete this device user?" onConfirm={() => deleteUserMut.mutate(du.id)}>
                              <DeleteOutlined className="action-delete" />
                            </Popconfirm>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Modal title="Add Device User" open={addUserModal} onCancel={() => setAddUserModal(false)}
                onOk={() => addUserForm.submit()} confirmLoading={createUserMut.isPending}>
                <Form form={addUserForm} onFinish={createUserMut.mutate} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
                  <div className="form-grid">
                    <Form.Item name="uid" label="Device UID" rules={[{ required: true }]}>
                      <Input type="number" />
                    </Form.Item>
                    <Form.Item name="userId" label="Map to Employee" rules={[{ required: true }]}>
                      <Select showSearch optionFilterProp="label" placeholder="-- Choose --"
                        options={(allUsers?.items || []).map((u: any) => ({ label: u.displayName || u.username, value: u.id }))} />
                    </Form.Item>
                    <Form.Item name="name" label="Name on Device">
                      <Input placeholder="Name stored on device" />
                    </Form.Item>
                    <Form.Item name="cardNo" label="Card Number">
                      <Input placeholder="RFID card number" />
                    </Form.Item>
                  </div>
                </Form>
              </Modal>
            </>
          ),
        },
      ]} />

      {/* Add Device Modal */}
      <Modal title="Add ZKTeco Device" open={addDeviceModal} onCancel={() => setAddDeviceModal(false)}
        onOk={() => addDeviceForm.submit()} confirmLoading={createDeviceMut.isPending}>
        <Form form={addDeviceForm} layout="vertical" onFinish={(v) => createDeviceMut.mutate(v)} style={{ marginTop: 16 }}>
          <Form.Item name="displayName" label="Device Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Main Entrance, Back Door..." />
          </Form.Item>
          <Form.Item name="ip" label="Device IP Address" rules={[{ required: true }]}>
            <Input placeholder="e.g. 192.168.1.201" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Location or notes about this device" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
