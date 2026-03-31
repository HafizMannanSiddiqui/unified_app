import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Typography, Tag, Spin, Tabs, Row, Col, Avatar, Form, Input, Select, DatePicker, Button, message, Progress, Modal, Table, Popconfirm } from 'antd';
import { UserOutlined, TeamOutlined, BookOutlined, BankOutlined, GlobalOutlined, LockOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, ApartmentOutlined, SwapOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { getProfile, updateProfile } from '../../api/profiles';
import { resetPassword } from '../../api/gtl';
import { getTeams } from '../../api/teams';
import { getMyTeams, addTeamMembership, removeTeamMembership, addManager, removeManager, getUsers } from '../../api/users';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

export default function MyProfile() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [personalForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [eduForm] = Form.useForm();
  const [expForm] = Form.useForm();
  const [visaForm] = Form.useForm();
  const [eduModal, setEduModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [visaModal, setVisaModal] = useState(false);
  const [teamModal, setTeamModal] = useState(false);
  const [mgrModal, setMgrModal] = useState(false);
  const [teamForm] = Form.useForm();
  const [mgrForm] = Form.useForm();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile', user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });
  const teamName = (teams || []).find((t: any) => t.id === user?.teamId)?.teamName;
  const { data: myTeamsData } = useQuery({ queryKey: ['myTeamsProfile', user?.id], queryFn: () => getMyTeams(user!.id), enabled: !!user?.id });
  const { data: allUsers } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 1000) });

  useEffect(() => {
    if (profile) {
      personalForm.setFieldsValue({
        firstName: profile.firstName, lastName: profile.lastName, cnic: profile.cnic,
        contactNo: profile.contactNo, personalEmail: profile.personalEmail,
        dob: profile.dob ? dayjs(profile.dob) : null, maritalStatus: profile.maritalStatus,
        bloodGroup: profile.bloodGroup, fatherName: profile.fatherName,
        fatherOccupation: profile.fatherOccupation, nationality: profile.nationality,
        currentAddress: profile.currentAddress, permanentAddress: profile.permanentAddress,
        dateOfJoining: profile.dateOfJoining ? dayjs(profile.dateOfJoining) : null,
        jobTitle: profile.jobTitle, passportStatus: profile.passportStatus || 'no',
        passportNo: profile.passportNo,
        passportExpiry: profile.passportExpiry ? dayjs(profile.passportExpiry) : null,
        languages: (profile.languages || []).join(', '), hobbies: (profile.hobbies || []).join(', '),
        careerObjectives: profile.careerObjectives,
      });
    }
  }, [profile]);

  const saveMut = useMutation({
    mutationFn: (data: any) => updateProfile(user!.id, data),
    onSuccess: () => { message.success('Saved!'); qc.invalidateQueries({ queryKey: ['myProfile'] }); },
    onError: (err: any) => {
      console.error('Save failed:', err?.response?.data || err?.message || err);
      message.error('Save failed: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    },
  });

  const pwdMut = useMutation({
    mutationFn: (v: any) => resetPassword(v.newPassword),
    onSuccess: () => { message.success('Password updated!'); passwordForm.resetFields(); },
    onError: () => message.error('Failed'),
  });

  const handleSaveProfile = (values: any) => {
    const data: any = { ...values };
    if (data.dob) data.dob = data.dob.format('YYYY-MM-DD');
    if (data.dateOfJoining) data.dateOfJoining = data.dateOfJoining.format('YYYY-MM-DD');
    if (data.passportExpiry) data.passportExpiry = data.passportExpiry.format('YYYY-MM-DD');
    if (typeof data.languages === 'string') data.languages = data.languages.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (typeof data.hobbies === 'string') data.hobbies = data.hobbies.split(',').map((s: string) => s.trim()).filter(Boolean);
    saveMut.mutate(data);
  };

  // Add/remove team
  const addTeamMut = useMutation({
    mutationFn: (data: any) => addTeamMembership({ userId: user!.id, ...data }),
    onSuccess: () => { message.success('Team added'); setTeamModal(false); teamForm.resetFields(); qc.invalidateQueries({ queryKey: ['myTeamsProfile'] }); },
  });
  const removeTeamMut = useMutation({
    mutationFn: removeTeamMembership,
    onSuccess: () => { message.success('Removed'); qc.invalidateQueries({ queryKey: ['myTeamsProfile'] }); },
  });
  const addMgrMut = useMutation({
    mutationFn: (data: any) => addManager({ userId: user!.id, ...data }),
    onSuccess: () => { message.success('Manager added'); setMgrModal(false); mgrForm.resetFields(); qc.invalidateQueries({ queryKey: ['myTeamsProfile'] }); },
  });
  const removeMgrMut = useMutation({
    mutationFn: removeManager,
    onSuccess: () => { message.success('Removed'); qc.invalidateQueries({ queryKey: ['myTeamsProfile'] }); },
  });

  // Add education
  const addEdu = (values: any) => {
    const edu = [...(profile?.education || []).map((e: any) => ({ recordType: e.recordType, examination: e.examination, degree: e.degree, board: e.board, passingYear: e.passingYear, percentage: e.percentage })), values];
    saveMut.mutate({ education: edu });
    setEduModal(false);
    eduForm.resetFields();
  };

  // Delete education
  const delEdu = (idx: number) => {
    const edu = (profile?.education || []).filter((_: any, i: number) => i !== idx).map((e: any) => ({ recordType: e.recordType, examination: e.examination, degree: e.degree, board: e.board, passingYear: e.passingYear, percentage: e.percentage }));
    saveMut.mutate({ education: edu });
  };

  // Add experience
  const addExp = (values: any) => {
    const exp = [...(profile?.experience || []).map((e: any) => ({ organization: e.organization, designation: e.designation, jobRole: e.jobRole, workFrom: e.workFrom, workTo: e.workTo })),
      { ...values, workFrom: values.workFrom?.format('YYYY-MM-DD'), workTo: values.workTo?.format('YYYY-MM-DD') }];
    saveMut.mutate({ experience: exp });
    setExpModal(false);
    expForm.resetFields();
  };

  const delExp = (idx: number) => {
    const exp = (profile?.experience || []).filter((_: any, i: number) => i !== idx).map((e: any) => ({ organization: e.organization, designation: e.designation, jobRole: e.jobRole, workFrom: e.workFrom, workTo: e.workTo }));
    saveMut.mutate({ experience: exp });
  };

  // Add visa
  const addVisa = (values: any) => {
    const visas = [...(profile?.visas || []).map((v: any) => ({ visaCountry: v.visaCountry, visaExpiry: v.visaExpiry })),
      { ...values, visaExpiry: values.visaExpiry?.format('YYYY-MM-DD') }];
    saveMut.mutate({ visas });
    setVisaModal(false);
    visaForm.resetFields();
  };

  const delVisa = (idx: number) => {
    const visas = (profile?.visas || []).filter((_: any, i: number) => i !== idx).map((v: any) => ({ visaCountry: v.visaCountry, visaExpiry: v.visaExpiry }));
    saveMut.mutate({ visas });
  };

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const pct = profile?.completionPct || 0;
  const L = (text: string) => <span style={{ fontWeight: 600, color: '#1C2833' }}>{text}</span>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col>
            <Avatar size={80} style={{ background: '#1677ff', fontSize: 36, fontWeight: 700 }}>
              {profile?.firstName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </Col>
          <Col flex="auto">
            <Typography.Title level={3} style={{ margin: 0 }}>{profile?.firstName || user?.displayName?.split(' ')[0]} {profile?.lastName || ''}</Typography.Title>
            <Typography.Text type="secondary">{profile?.jobTitle || user?.username}</Typography.Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(myTeamsData?.teams || []).map((t: any) => (
                <Tag key={t.id} color={t.isPrimary ? 'blue' : 'cyan'}>
                  <TeamOutlined /> {t.teamName} {t.roleInTeam ? `(${t.roleInTeam})` : ''}
                </Tag>
              ))}
              {(myTeamsData?.teams || []).length === 0 && <Tag color="blue"><TeamOutlined /> {teamName || 'No Team'}</Tag>}
              {profile?.bloodGroup && <Tag color="red">{profile.bloodGroup}</Tag>}
              {user?.roles?.map((r: any) => <Tag key={r.id} color="purple">{r.name}</Tag>)}
            </div>
            {(myTeamsData?.managers || []).length > 0 && (
              <div style={{ marginTop: 6, fontSize: 13, color: '#666' }}>
                Reports to: {(myTeamsData?.managers || []).map((m: any) => (
                  <Tag key={m.id} color="geekblue" style={{ fontSize: 12 }}>{m.managerName || m.managerUsername}</Tag>
                ))}
              </div>
            )}
          </Col>
          <Col>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {/* Tenure */}
              {(profile?.tenureYears > 0 || profile?.tenureMonths > 0) && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#154360' }}>
                    {profile.tenureYears > 0 ? `${profile.tenureYears}y ` : ''}{profile.tenureMonths}m
                  </div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Tenure</div>
                </div>
              )}
              {/* Total Experience */}
              {(profile?.totalExpYears > 0 || profile?.totalExpMonths > 0) && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#722ed1' }}>
                    {profile.totalExpYears > 0 ? `${profile.totalExpYears}y ` : ''}{profile.totalExpMonths}m
                  </div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Total Exp</div>
                </div>
              )}
              {/* Completion */}
              <Progress type="circle" percent={pct} size={70}
                strokeColor={pct >= 80 ? '#52c41a' : pct >= 50 ? '#fa8c16' : '#ff4d4f'}
                format={(p) => <span style={{ fontSize: 13, fontWeight: 700 }}>{p}%</span>} />
            </div>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="personal" items={[
        {
          key: 'personal', label: 'Personal Info', icon: <UserOutlined />,
          children: (
            <Card style={{ borderRadius: 12 }}>
              <Form form={personalForm} onFinish={handleSaveProfile} layout="vertical" className="clean-form">
                <div className="form-grid">
                  <Form.Item name="firstName" label={L('First Name')}><Input /></Form.Item>
                  <Form.Item name="lastName" label={L('Last Name')}><Input /></Form.Item>
                  <Form.Item name="cnic" label={L('CNIC')}>
                    <Input placeholder="35202-1234567-1" maxLength={15}
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^0-9]/g, '');
                        if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
                        if (v.length > 13) v = v.slice(0, 13) + '-' + v.slice(13);
                        if (v.length > 15) v = v.slice(0, 15);
                        personalForm.setFieldsValue({ cnic: v });
                      }} />
                  </Form.Item>
                  <Form.Item name="contactNo" label={L('Contact No')}>
                    <Input placeholder="0300-1234567" maxLength={12}
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^0-9]/g, '');
                        if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4);
                        if (v.length > 12) v = v.slice(0, 12);
                        personalForm.setFieldsValue({ contactNo: v });
                      }} />
                  </Form.Item>
                  <Form.Item name="personalEmail" label={L('Personal Email')}><Input type="email" /></Form.Item>
                  <Form.Item name="dob" label={L('Date of Birth')}><DatePicker style={{ width: '100%' }} format="DD MMM, YYYY" /></Form.Item>
                  <Form.Item name="maritalStatus" label={L('Marital Status')}>
                    <Select allowClear options={[{ label: 'Single', value: 'Single' }, { label: 'Married', value: 'Married' }]} />
                  </Form.Item>
                  <Form.Item name="bloodGroup" label={L('Blood Group')}>
                    <Select allowClear options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ label: v, value: v }))} />
                  </Form.Item>
                  <Form.Item name="fatherName" label={L("Father's Name")}><Input /></Form.Item>
                  <Form.Item name="nationality" label={L('Nationality')}><Input /></Form.Item>
                  <Form.Item name="jobTitle" label={L('Job Title')}><Input /></Form.Item>
                  <Form.Item name="dateOfJoining" label={L('Date of Joining')}><DatePicker style={{ width: '100%' }} format="DD MMM, YYYY" /></Form.Item>
                  <div className="full-width"><Form.Item name="currentAddress" label={L('Current Address')}><Input.TextArea rows={2} /></Form.Item></div>
                  <div className="full-width"><Form.Item name="permanentAddress" label={L('Permanent Address')}><Input.TextArea rows={2} /></Form.Item></div>
                  <Form.Item name="languages" label={L('Languages (comma sep)')}><Input /></Form.Item>
                  <Form.Item name="hobbies" label={L('Hobbies (comma sep)')}><Input /></Form.Item>
                </div>
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saveMut.isPending} className="submit-btn">Save</Button>
                </div>
              </Form>
            </Card>
          ),
        },
        {
          key: 'education', label: `Education (${(profile?.education || []).length})`, icon: <BookOutlined />,
          children: (
            <Card style={{ borderRadius: 12 }} extra={<Button icon={<PlusOutlined />} type="primary" size="small" onClick={() => setEduModal(true)}>Add</Button>}>
              <Table size="small" pagination={false} dataSource={(profile?.education || []).map((e: any, i: number) => ({ ...e, _idx: i }))} rowKey="_idx"
                columns={[
                  { title: 'Type', dataIndex: 'recordType', render: (v: string) => <Tag color={v === 'education' ? 'blue' : 'green'}>{v}</Tag> },
                  { title: 'Examination', dataIndex: 'examination' },
                  { title: 'Degree', dataIndex: 'degree' },
                  { title: 'Board', dataIndex: 'board' },
                  { title: 'Year', dataIndex: 'passingYear' },
                  { title: '%', dataIndex: 'percentage' },
                  { title: '', width: 40, render: (_: any, r: any) => <Popconfirm title="Delete?" onConfirm={() => delEdu(r._idx)}><DeleteOutlined className="action-delete" /></Popconfirm> },
                ]} locale={{ emptyText: 'No education records. Click Add to create one.' }} />

              <Modal title="Add Education" open={eduModal} onCancel={() => setEduModal(false)} onOk={() => eduForm.submit()}>
                <Form form={eduForm} onFinish={addEdu} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
                  <Form.Item name="recordType" label="Type" rules={[{ required: true }]} initialValue="education">
                    <Select options={[{ label: 'Education', value: 'education' }, { label: 'Certification', value: 'certification' }]} />
                  </Form.Item>
                  <div className="form-grid">
                    <Form.Item name="examination" label="Examination"><Input /></Form.Item>
                    <Form.Item name="degree" label="Degree"><Input /></Form.Item>
                    <Form.Item name="board" label="Board / University"><Input /></Form.Item>
                    <Form.Item name="passingYear" label="Passing Year"><Input /></Form.Item>
                    <Form.Item name="percentage" label="Percentage / CGPA"><Input /></Form.Item>
                  </div>
                </Form>
              </Modal>
            </Card>
          ),
        },
        {
          key: 'experience', label: `Experience (${(profile?.experience || []).length})`, icon: <BankOutlined />,
          children: (
            <Card style={{ borderRadius: 12 }} extra={<Button icon={<PlusOutlined />} type="primary" size="small" onClick={() => setExpModal(true)}>Add</Button>}>
              <Table size="small" pagination={false} dataSource={(profile?.experience || []).map((e: any, i: number) => ({ ...e, _idx: i }))} rowKey="_idx"
                columns={[
                  { title: 'Organization', dataIndex: 'organization' },
                  { title: 'Designation', dataIndex: 'designation' },
                  { title: 'Role', dataIndex: 'jobRole' },
                  { title: 'From', dataIndex: 'workFrom', render: (v: string) => v ? dayjs(v).format('MMM YYYY') : '-' },
                  { title: 'To', dataIndex: 'workTo', render: (v: string) => v ? dayjs(v).format('MMM YYYY') : '-' },
                  { title: '', width: 40, render: (_: any, r: any) => <Popconfirm title="Delete?" onConfirm={() => delExp(r._idx)}><DeleteOutlined className="action-delete" /></Popconfirm> },
                ]} locale={{ emptyText: 'No experience records. Click Add to create one.' }} />

              <Modal title="Add Experience" open={expModal} onCancel={() => setExpModal(false)} onOk={() => expForm.submit()}>
                <Form form={expForm} onFinish={addExp} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
                  <div className="form-grid">
                    <Form.Item name="organization" label="Organization"><Input /></Form.Item>
                    <Form.Item name="designation" label="Designation"><Input /></Form.Item>
                    <Form.Item name="jobRole" label="Job Role"><Input /></Form.Item>
                    <Form.Item name="workFrom" label="From"><DatePicker picker="month" style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="workTo" label="To"><DatePicker picker="month" style={{ width: '100%' }} /></Form.Item>
                  </div>
                </Form>
              </Modal>
            </Card>
          ),
        },
        {
          key: 'visas', label: `Visas (${(profile?.visas || []).length})`, icon: <GlobalOutlined />,
          children: (
            <Card style={{ borderRadius: 12 }} extra={<Button icon={<PlusOutlined />} type="primary" size="small" onClick={() => setVisaModal(true)}>Add</Button>}>
              <Table size="small" pagination={false} dataSource={(profile?.visas || []).map((v: any, i: number) => ({ ...v, _idx: i }))} rowKey="_idx"
                columns={[
                  { title: 'Country', dataIndex: 'visaCountry' },
                  { title: 'Expiry', dataIndex: 'visaExpiry', render: (v: string) => v ? dayjs(v).format('DD MMM, YYYY') : '-' },
                  { title: '', width: 40, render: (_: any, r: any) => <Popconfirm title="Delete?" onConfirm={() => delVisa(r._idx)}><DeleteOutlined className="action-delete" /></Popconfirm> },
                ]} locale={{ emptyText: 'No visa records. Click Add to create one.' }} />

              <Modal title="Add Visa" open={visaModal} onCancel={() => setVisaModal(false)} onOk={() => visaForm.submit()}>
                <Form form={visaForm} onFinish={addVisa} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
                  <div className="form-grid">
                    <Form.Item name="visaCountry" label="Country" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="visaExpiry" label="Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
                  </div>
                </Form>
              </Modal>
            </Card>
          ),
        },
        {
          key: 'teams', label: 'Teams & Reporting', icon: <ApartmentOutlined />,
          children: (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* My Teams */}
              <Card title="My Teams" style={{ borderRadius: 12 }}
                extra={<Button icon={<PlusOutlined />} type="primary" size="small" onClick={() => setTeamModal(true)}>Add Team</Button>}>
                {(myTeamsData?.teams || []).length === 0 ? <span style={{ color: '#8c8c8c' }}>No teams assigned</span> :
                  (myTeamsData?.teams || []).map((t: any) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div>
                        <Tag color={t.isPrimary ? 'blue' : 'default'}>{t.teamName}</Tag>
                        {t.roleInTeam && <span style={{ fontSize: 12, color: '#666' }}>{t.roleInTeam}</span>}
                        {t.isPrimary && <Tag color="gold" style={{ fontSize: 10, marginLeft: 4 }}>Primary</Tag>}
                      </div>
                      <Popconfirm title="Remove?" onConfirm={() => removeTeamMut.mutate(t.id)}>
                        <DeleteOutlined className="action-delete" />
                      </Popconfirm>
                    </div>
                  ))
                }
                <Modal title="Add Team" open={teamModal} onCancel={() => setTeamModal(false)} onOk={() => teamForm.submit()}>
                  <Form form={teamForm} onFinish={(v: any) => addTeamMut.mutate(v)} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
                    <Form.Item name="teamId" label="Team" rules={[{ required: true }]}>
                      <Select showSearch optionFilterProp="label" placeholder="-- Choose --"
                        options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.id }))} />
                    </Form.Item>
                    <Form.Item name="roleInTeam" label="Your Role in Team">
                      <Input placeholder="e.g. Software Developer, Team Lead" />
                    </Form.Item>
                    <Form.Item name="isPrimary" label="Primary Team?" initialValue={false}>
                      <Select options={[{ label: 'No', value: false }, { label: 'Yes', value: true }]} />
                    </Form.Item>
                  </Form>
                </Modal>
              </Card>

              {/* My Managers */}
              <Card title="I Report To" style={{ borderRadius: 12 }}
                extra={<Button icon={<PlusOutlined />} type="primary" size="small" onClick={() => setMgrModal(true)}>Add Manager</Button>}>
                {(myTeamsData?.managers || []).length === 0 ? <span style={{ color: '#8c8c8c' }}>No manager assigned</span> :
                  (myTeamsData?.managers || []).map((m: any) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                      <div>
                        <strong>{m.managerName || m.managerUsername}</strong>
                        {m.isPrimary && <Tag color="gold" style={{ fontSize: 10, marginLeft: 8 }}>Primary</Tag>}
                      </div>
                      <Popconfirm title="Remove?" onConfirm={() => removeMgrMut.mutate(m.id)}>
                        <DeleteOutlined className="action-delete" />
                      </Popconfirm>
                    </div>
                  ))
                }
                <Modal title="Add Manager" open={mgrModal} onCancel={() => setMgrModal(false)} onOk={() => mgrForm.submit()}>
                  <Form form={mgrForm} onFinish={(v: any) => addMgrMut.mutate(v)} layout="vertical" className="clean-form" style={{ marginTop: 16 }}>
                    <Form.Item name="managerId" label="Manager" rules={[{ required: true }]}>
                      <Select showSearch optionFilterProp="label" placeholder="-- Choose --"
                        options={(allUsers?.items || []).map((u: any) => ({ label: u.displayName || u.username, value: u.id }))} />
                    </Form.Item>
                    <Form.Item name="isPrimary" label="Primary Manager?" initialValue={false}>
                      <Select options={[{ label: 'No', value: false }, { label: 'Yes', value: true }]} />
                    </Form.Item>
                  </Form>
                </Modal>
              </Card>
            </div>
          ),
        },
        {
          key: 'password', label: 'Reset Password', icon: <LockOutlined />,
          children: (
            <Card style={{ borderRadius: 12, maxWidth: 600 }}>
              <Form form={passwordForm} onFinish={(v: any) => pwdMut.mutate(v)} layout="vertical" className="clean-form">
                <div className="form-grid">
                  <Form.Item name="newPassword" label={L('New Password')} rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
                  <Form.Item name="confirmPassword" label={L('Confirm Password')}
                    rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, v) { return !v || getFieldValue('newPassword') === v ? Promise.resolve() : Promise.reject('Mismatch'); } })]}><Input.Password /></Form.Item>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Button type="primary" htmlType="submit" loading={pwdMut.isPending} className="submit-btn">Reset Password</Button>
                </div>
              </Form>
            </Card>
          ),
        },
        {
          key: 'changes', label: 'Request Changes', icon: <SwapOutlined />,
          children: <ProfileChangeTab userId={user?.id} />,
        },
      ]} />
    </div>
  );
}

// ── Profile Change Request Tab ──
function ProfileChangeTab({ userId }: { userId?: number }) {
  const qc = useQueryClient();
  const [field, setField] = useState<string>('designation');
  const [newValue, setNewValue] = useState('');

  const { data: requests } = useQuery({
    queryKey: ['myChangeReqs', userId],
    queryFn: () => import('../../api/client').then(m => m.default.get('/users/my-change-requests', { params: { userId } }).then(r => r.data)),
    enabled: !!userId,
  });

  const { data: designations } = useQuery({
    queryKey: ['allDesignations'],
    queryFn: () => import('../../api/client').then(m => m.default.get('/users/all-designations').then(r => r.data)),
  });

  const { data: allUsers } = useQuery({ queryKey: ['usersAll'], queryFn: () => getUsers(1, 1000) });
  const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => getTeams() });

  const submitMut = useMutation({
    mutationFn: () => import('../../api/client').then(m => m.default.post('/users/profile-change', { userId, fieldName: field, newValue })),
    onSuccess: () => { message.success('Request submitted! Your Team Lead will review it.'); setNewValue(''); qc.invalidateQueries({ queryKey: ['myChangeReqs'] }); },
    onError: () => message.error('Failed to submit'),
  });

  const fieldOptions = [
    { label: 'Designation / Role', value: 'designation' },
    { label: 'Reports To (Manager)', value: 'reportTo' },
    { label: 'Team', value: 'team' },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1C2833', marginBottom: 12 }}>
          Request a Change to Your Profile
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
          Select what you want to change and enter the correct value. Your Team Lead will review and approve.
        </div>
        <div className="form-grid clean-form">
          <div>
            <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>What to change:</div>
            <Select value={field} onChange={(v) => { setField(v); setNewValue(''); }} style={{ width: '100%' }} options={fieldOptions} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#1C2833', marginBottom: 6 }}>
              New {field === 'designation' ? 'Designation' : field === 'reportTo' ? 'Manager' : 'Team'}:
            </div>
            {field === 'designation' ? (
              <Select showSearch allowClear style={{ width: '100%' }} placeholder="Select or type new..."
                value={newValue || undefined} onChange={(v) => setNewValue(v)}
                options={(designations || []).map((d: string) => ({ label: d, value: d }))}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                      <Input placeholder="Type a new designation e.g. AI/ML Developer" size="small"
                        onPressEnter={(e) => { setNewValue((e.target as HTMLInputElement).value); }} />
                    </div>
                  </>
                )}
              />
            ) : field === 'reportTo' ? (
              <Select showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="Select anyone from the company..."
                value={newValue || undefined} onChange={(v) => setNewValue(v)}
                options={(allUsers?.items || []).map((u: any) => ({ label: `${u.displayName || u.username} (${u.username})`, value: u.displayName || u.username }))} />
            ) : (
              <Select showSearch allowClear optionFilterProp="label" style={{ width: '100%' }} placeholder="Select or type new team..."
                value={newValue || undefined} onChange={(v) => setNewValue(v)}
                options={(teams || []).map((t: any) => ({ label: t.teamName, value: t.teamName }))}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                      <Input placeholder="Type a new team name e.g. AI/ML Team" size="small"
                        onPressEnter={(e) => { setNewValue((e.target as HTMLInputElement).value); }} />
                    </div>
                  </>
                )}
              />
            )}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button type="primary" className="submit-btn" disabled={!newValue} loading={submitMut.isPending}
            onClick={() => submitMut.mutate()}>
            Submit Request
          </Button>
        </div>
      </Card>

      {/* Request History */}
      <Card title="My Change Requests" size="small" style={{ borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#154360', color: '#fff' }}>
            <th style={{ padding: '6px 12px', fontSize: 12 }}>Field</th>
            <th style={{ padding: '6px 12px', fontSize: 12 }}>Old Value</th>
            <th style={{ padding: '6px 12px', fontSize: 12 }}>New Value</th>
            <th style={{ padding: '6px 12px', fontSize: 12 }}>Status</th>
            <th style={{ padding: '6px 12px', fontSize: 12 }}>Reviewed By</th>
          </tr></thead>
          <tbody>
            {(requests || []).length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#8c8c8c' }}>No requests yet</td></tr>
            ) : (requests || []).map((r: any) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '5px 12px', fontSize: 12 }}>{r.field_name}</td>
                <td style={{ padding: '5px 12px', fontSize: 12, color: '#999' }}>{r.old_value || '-'}</td>
                <td style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500 }}>{r.new_value}</td>
                <td style={{ padding: '5px 12px', fontSize: 12 }}>
                  <Tag color={r.status === 0 ? 'gold' : r.status === 1 ? 'green' : 'red'}>
                    {r.status === 0 ? 'Pending' : r.status === 1 ? 'Approved' : 'Rejected'}
                  </Tag>
                </td>
                <td style={{ padding: '5px 12px', fontSize: 12 }}>{r.reviewerName || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
