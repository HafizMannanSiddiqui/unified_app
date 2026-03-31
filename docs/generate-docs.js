const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel, ImageRun } = require('docx');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../docs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// ── Color helpers ──
const TEAL = '154360';
const WHITE = 'FFFFFF';
const LIGHT_BLUE = 'EBF5FB';

function headerCell(text) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, size: 20, font: 'Segoe UI' })], alignment: AlignmentType.CENTER })],
    shading: { fill: TEAL },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  });
}
function cell(text, bold = false, color = '1C2833') {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: text || '-', bold, color, size: 19, font: 'Segoe UI' })] })],
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  });
}
function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ children: [new TextRun({ text, bold: true, color: TEAL, size: level === HeadingLevel.HEADING_1 ? 32 : 26, font: 'Segoe UI' })], heading: level, spacing: { before: 300, after: 150 } });
}
function para(text, bold = false) {
  return new Paragraph({ children: [new TextRun({ text, bold, size: 20, font: 'Segoe UI' })], spacing: { after: 100 } });
}

// ═══════════════════════════════════════════
// 1. PROJECT ARCHITECTURE (Word)
// ═══════════════════════════════════════════
async function generateArchitectureDoc() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Unified Portal — Project Architecture', bold: true, size: 40, color: TEAL, font: 'Segoe UI' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: 'GTL + HRMS Merged Application', size: 24, color: '666666', font: 'Segoe UI' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),

        heading('1. Tech Stack'),
        new Table({ rows: [
          new TableRow({ children: [headerCell('Layer'), headerCell('Technology'), headerCell('Port')] }),
          new TableRow({ children: [cell('Frontend'), cell('React 18 + TypeScript + Vite + Ant Design 5'), cell('3002')] }),
          new TableRow({ children: [cell('Backend'), cell('NestJS + TypeScript + SWC + Prisma ORM'), cell('4000')] }),
          new TableRow({ children: [cell('Database'), cell('PostgreSQL 15 (29 tables, 43 FK constraints)'), cell('5433')] }),
          new TableRow({ children: [cell('Auth'), cell('JWT + Passport + Argon2id (auto-upgrade from MD5)'), cell('-')] }),
          new TableRow({ children: [cell('State'), cell('Zustand (persisted) + TanStack Query'), cell('-')] }),
        ], width: { size: 100, type: WidthType.PERCENTAGE } }),

        heading('2. Backend Modules'),
        new Table({ rows: [
          new TableRow({ children: [headerCell('Module'), headerCell('Files'), headerCell('Responsibility')] }),
          new TableRow({ children: [cell('auth/'), cell('4'), cell('Login, JWT, password hashing, getMe')] }),
          new TableRow({ children: [cell('users/'), cell('3'), cell('CRUD, directory, teams, holidays, notifications')] }),
          new TableRow({ children: [cell('gtl/'), cell('3'), cell('Time entries, approvals, reports, programs, projects')] }),
          new TableRow({ children: [cell('attendance/'), cell('3'), cell('Check-in/out, requests, weekend, reports, dashboard')] }),
          new TableRow({ children: [cell('leaves/'), cell('3'), cell('Leave CRUD, balance, approvals')] }),
          new TableRow({ children: [cell('profiles/'), cell('3'), cell('Profile CRUD, blood groups, completion %')] }),
          new TableRow({ children: [cell('teams/'), cell('3'), cell('Team CRUD')] }),
          new TableRow({ children: [cell('roles/'), cell('3'), cell('Role CRUD')] }),
          new TableRow({ children: [cell('prisma/'), cell('2'), cell('Database service (shared)')] }),
        ], width: { size: 100, type: WidthType.PERCENTAGE } }),

        heading('3. Frontend Pages (33 total)'),
        new Table({ rows: [
          new TableRow({ children: [headerCell('Section'), headerCell('Pages'), headerCell('Route')] }),
          new TableRow({ children: [cell('Dashboard'), cell('Home + Public Board'), cell('/ , /board')] }),
          new TableRow({ children: [cell('GTL'), cell('Time Sheet, Data Entry, Approvals'), cell('/my/timesheet, /my/data-entry, /admin/approvals')] }),
          new TableRow({ children: [cell('Reports'), cell('Team, General, Employees, Late Arrivals'), cell('/admin/reports/*')] }),
          new TableRow({ children: [cell('Attendance'), cell('Check In/Out, My Attendance, Requests, Weekend, Holidays, My Team'), cell('/my/attendance, /my/*')] }),
          new TableRow({ children: [cell('Leaves'), cell('My Leaves, Apply Leave, Pending'), cell('/my/leaves, /admin/leaves/*')] }),
          new TableRow({ children: [cell('Profiles'), cell('My Profile, Employee List, Blood Group, Directory'), cell('/my/profile, /admin/*')] }),
          new TableRow({ children: [cell('Admin'), cell('Users, Teams, Programs, Projects, SubProjects, Workstreams, Resource Allocation'), cell('/admin/*')] }),
        ], width: { size: 100, type: WidthType.PERCENTAGE } }),

        heading('4. Authentication Flow'),
        para('1. User submits username + password to POST /auth/login'),
        para('2. Backend tries Argon2id verification first'),
        para('3. If no Argon2 hash, falls back to legacy MD5 check'),
        para('4. If MD5 matches → auto-upgrades password to Argon2id silently'),
        para('5. Returns JWT token (8-hour expiry)'),
        para('6. Frontend stores token in Zustand (localStorage)'),
        para('7. Every API call includes Authorization: Bearer <token>'),
        para('8. On every page load, ProtectedRoute calls GET /auth/me to refresh roles'),

        heading('5. Role-Based Access'),
        new Table({ rows: [
          new TableRow({ children: [headerCell('Role'), headerCell('GTL Access'), headerCell('HRMS Access'), headerCell('Admin Access')] }),
          new TableRow({ children: [cell('super admin'), cell('All'), cell('All'), cell('All')] }),
          new TableRow({ children: [cell('Admin'), cell('All'), cell('All'), cell('All')] }),
          new TableRow({ children: [cell('Application Manager'), cell('All'), cell('All'), cell('All')] }),
          new TableRow({ children: [cell('Team Lead'), cell('+ Approval, Reports'), cell('All'), cell('Emp Report, Late Arrivals')] }),
          new TableRow({ children: [cell('Default'), cell('Time Sheet, Data Entry'), cell('All'), cell('None')] }),
        ], width: { size: 100, type: WidthType.PERCENTAGE } }),

        heading('6. Key Numbers'),
        new Table({ rows: [
          new TableRow({ children: [headerCell('Metric'), headerCell('Value')] }),
          new TableRow({ children: [cell('Database tables'), cell('29')] }),
          new TableRow({ children: [cell('API endpoints'), cell('60+')] }),
          new TableRow({ children: [cell('Frontend pages'), cell('33')] }),
          new TableRow({ children: [cell('Total users'), cell('783')] }),
          new TableRow({ children: [cell('Active employees'), cell('568')] }),
          new TableRow({ children: [cell('Time entries'), cell('118,145')] }),
          new TableRow({ children: [cell('Attendance records'), cell('102,657')] }),
          new TableRow({ children: [cell('Teams'), cell('29')] }),
        ], width: { size: 100, type: WidthType.PERCENTAGE } }),
      ],
    }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outDir, 'Project_Architecture.docx'), buf);
  console.log('✓ Project_Architecture.docx');
}

// ═══════════════════════════════════════════
// 2. BUGS & SOLUTIONS (Word)
// ═══════════════════════════════════════════
async function generateBugsDoc() {
  const bugs = [
    ['Data', '1', 'abdul.mannan had 0 time entries', 'Old GTL user_id 451 ≠ new user_id 469', 'Imported 16 entries with correct ID mapping'],
    ['Data', '2', 'ALL 88,687 entries had wrong user IDs', 'Migration used old GTL IDs directly as PostgreSQL IDs', 'aliasInfo-based remapping of 28,847+ entries'],
    ['Data', '3', '65,876 approver IDs wrong', 'Same ID mapping issue', 'Remapped via alias username lookup'],
    ['Data', '4', 'Only 241/118,715 entries parsed', 'Regex didn\'t handle multi-INSERT SQL blocks', 'Rewrote SQL parser for multi-block support'],
    ['Data', '5', '122 old GTL users had no match', 'Users not in HRMS aliasInfo table', 'Created 102 placeholder accounts + fuzzy matching'],
    ['Data', '6', 'm.zeeshan ≠ muhammad.zeeshan', 'Different username in HRMS vs GTL for same person', 'Confirmed by email, moved 564 entries'],
    ['Data', '7', 'm.sumair couldn\'t login', 'HRMS had different MD5 than GTL', 'Reset password to Argon2id'],
    ['Data', '8', 'abdul.mannan had Default role', 'Old GTL "lead" role not mapped', 'Added Team Lead role'],
    ['Attendance', '9', 'Negative durations (-9:-57:00)', 'Duration calculated same-day only, ignored checkout_date', 'PostgreSQL: (checkout_date+time) - (checkin_date+time)'],
    ['Attendance', '10', 'Seconds stripped from duration', 'Pipeline used minutes not seconds', 'Changed entire system to seconds-based'],
    ['Attendance', '11', 'Cross-midnight checkout wrong', 'checkout_date column ignored', 'Used actual checkout_date in calculation'],
    ['Attendance', '12', 'Duplicate rows per day', 'Multiple check-ins created separate rows', 'GROUP BY checkin_date with MIN/MAX'],
    ['Attendance', '13', 'Double check-in allowed', 'No duplicate prevention', 'Backend blocks if open session exists'],
    ['Security', '14', 'Missed checkout → 22h inflated', 'Skip checkout Day 1, exploit next day', 'Auto-close at checkin + 12 hours'],
    ['Security', '15', 'Averages inflated by 20h sessions', 'No cap on duration for averages', 'Duration capped at 12h for calculations'],
    ['Security', '16', 'No suspicious entry detection', 'No way to spot gaming', 'suspicious flag, warning banner, yellow rows'],
    ['Security', '17', 'Next-day checkout allowed', 'Could checkout for yesterday', 'Blocked after 12h, only today\'s sessions'],
    ['UI/UX', '18', 'TypeScript types snake_case mismatch', 'Types used display_name, API returned displayName', 'Fixed all interfaces in types/index.ts'],
    ['UI/UX', '19', 'Approval/Reports hidden from leads', 'Sidebar showed only to Admin role', 'Added Team Lead to visible roles'],
    ['UI/UX', '20', 'Reset Password separate page', 'Not in profile section', 'Moved to Profile tab'],
    ['UI/UX', '21', 'Profile read-only', 'Users couldn\'t edit info', 'Made all fields editable with Save'],
    ['UI/UX', '22', 'No public attendance board', 'Old AMS feature missing', 'Built /board route (no auth)'],
    ['UI/UX', '23', 'Stale roles in localStorage', 'Role changes needed re-login', 'Auto getMe() refresh on page load'],
    ['UI/UX', '24', 'Dashboard capped at 50 employees', 'Only showed first 50', 'Removed limit, shows all 568'],
  ];

  const rows = [
    new TableRow({ children: [headerCell('Category'), headerCell('#'), headerCell('Bug'), headerCell('Root Cause'), headerCell('Solution')] }),
    ...bugs.map(b => new TableRow({ children: [
      cell(b[0], false, b[0] === 'Security' ? 'E74C3C' : b[0] === 'Data' ? '2980B9' : b[0] === 'Attendance' ? 'F39C12' : '8E44AD'),
      cell(b[1]), cell(b[2]), cell(b[3]), cell(b[4]),
    ] })),
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Bug Fixes & Solutions Report', bold: true, size: 40, color: TEAL, font: 'Segoe UI' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: 'Unified Portal Migration — 24 Bugs Fixed', size: 24, color: '666666', font: 'Segoe UI' })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: '8 Data/Migration | 5 Attendance | 4 Security Exploits | 7 UI/UX', size: 20, color: '999999', font: 'Segoe UI' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
      ],
    }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(outDir, 'Bugs_and_Solutions.docx'), buf);
  console.log('✓ Bugs_and_Solutions.docx');
}

// ═══════════════════════════════════════════
// 3. DB ARCHITECTURE (HTML → open in browser → screenshot)
// ═══════════════════════════════════════════
function generateDbDiagramHtml() {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Database Architecture</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #f5f7fa; padding: 40px; }
  h1 { color: #154360; text-align: center; font-size: 28px; margin-bottom: 30px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 40px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; max-width: 1200px; margin: 0 auto; }
  .table-card { background: #fff; border-radius: 8px; border: 2px solid #154360; overflow: hidden; }
  .table-card .name { background: #154360; color: #fff; padding: 8px 12px; font-weight: 700; font-size: 14px; display: flex; justify-content: space-between; }
  .table-card .name .count { opacity: 0.7; font-weight: 400; }
  .table-card .cols { padding: 8px 12px; font-size: 12px; }
  .table-card .cols div { padding: 2px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; }
  .table-card .cols .pk { color: #e74c3c; font-weight: 600; }
  .table-card .cols .fk { color: #2980b9; }
  .section { grid-column: 1 / -1; background: #154360; color: #fff; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 16px; margin-top: 10px; }
  .relations { max-width: 1200px; margin: 30px auto; background: #fff; border-radius: 8px; padding: 20px; }
  .relations h2 { color: #154360; margin-bottom: 12px; }
  .rel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 13px; }
  .rel-item { padding: 6px 10px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #154360; }
</style></head><body>
<h1>Unified Portal — Database Architecture</h1>
<p class="subtitle">PostgreSQL 15 | 29 Tables | 43 Foreign Key Constraints</p>

<div class="grid">
  <div class="section">CORE TABLES</div>

  <div class="table-card"><div class="name">users <span class="count">783 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div>username <span>varchar(100) UNIQUE</span></div>
    <div>display_name <span>varchar(200)</span></div>
    <div>email <span>varchar(255)</span></div>
    <div>password_hash <span>varchar(255)</span></div>
    <div><span class="fk">team_id FK</span> <span>→ teams</span></div>
    <div><span class="fk">designation_id FK</span> <span>→ designations</span></div>
    <div><span class="fk">report_to FK</span> <span>→ users</span></div>
    <div>payroll_company <span>varchar(100)</span></div>
    <div>alias_info <span>JSON</span></div>
    <div>is_active <span>boolean</span></div>
  </div></div>

  <div class="table-card"><div class="name">teams <span class="count">29 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div>team_name <span>varchar(255)</span></div>
    <div>legacy_team_id <span>varchar(100)</span></div>
    <div>display_order <span>int</span></div>
  </div></div>

  <div class="table-card"><div class="name">roles <span class="count">8 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div>name <span>varchar(100) UNIQUE</span></div>
    <div>description <span>text</span></div>
  </div></div>

  <div class="table-card"><div class="name">designations <span class="count">212 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div>name <span>varchar(200)</span></div>
    <div><span class="fk">team_id FK</span> <span>→ teams</span></div>
  </div></div>

  <div class="section">GTL — TIME LOGGING</div>

  <div class="table-card"><div class="name">time_entries <span class="count">118,145 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div><span class="fk">user_id FK</span> <span>→ users</span></div>
    <div><span class="fk">program_id FK</span> <span>→ programs</span></div>
    <div><span class="fk">project_id FK</span> <span>→ projects</span></div>
    <div><span class="fk">sub_project_id FK</span> <span>→ sub_projects</span></div>
    <div><span class="fk">wbs_id FK</span> <span>→ wbs</span></div>
    <div>entry_date <span>date</span></div>
    <div>hours <span>decimal(5,2)</span></div>
    <div>status <span>smallint (0/1/2)</span></div>
    <div><span class="fk">approver_id FK</span> <span>→ users</span></div>
  </div></div>

  <div class="table-card"><div class="name">programs <span class="count">2 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div>program_name <span>varchar(500)</span></div>
    <div>legacy_program_id <span>varchar(20)</span></div>
  </div></div>

  <div class="table-card"><div class="name">projects <span class="count">11 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div><span class="fk">program_id FK</span> <span>→ programs</span></div>
    <div>project_name <span>varchar(255)</span></div>
  </div></div>

  <div class="table-card"><div class="name">sub_projects <span class="count">18 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div><span class="fk">program_id FK</span> <span>→ programs</span></div>
    <div><span class="fk">project_id FK</span> <span>→ projects</span></div>
    <div>sub_project_name <span>varchar(255)</span></div>
  </div></div>

  <div class="section">HRMS — ATTENDANCE & LEAVES</div>

  <div class="table-card"><div class="name">attendance <span class="count">102,657 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div><span class="fk">user_id FK</span> <span>→ users</span></div>
    <div>checkin_date <span>date</span></div>
    <div>checkin_time <span>time</span></div>
    <div>checkout_date <span>date</span></div>
    <div>checkout_time <span>time</span></div>
    <div>checkin_state <span>enum (manual/rfid/auto)</span></div>
    <div>status <span>smallint</span></div>
  </div></div>

  <div class="table-card"><div class="name">leaves <span class="count">1,071 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div><span class="fk">user_id FK</span> <span>→ users</span></div>
    <div>from_date / to_date <span>date</span></div>
    <div>leave_type <span>enum</span></div>
    <div>status <span>enum (pending/approved/rejected)</span></div>
  </div></div>

  <div class="table-card"><div class="name">attendance_requests <span class="count">6,315 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div><span class="fk">requester_id FK</span> <span>→ users</span></div>
    <div><span class="fk">approver_id FK</span> <span>→ users</span></div>
    <div>checkin_date/time <span>date/time</span></div>
    <div>checkout_date/time <span>date/time</span></div>
    <div>status <span>smallint</span></div>
  </div></div>

  <div class="table-card"><div class="name">holidays <span class="count">22 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div>year <span>smallint</span></div>
    <div>from_date / to_date <span>date</span></div>
    <div>description <span>text</span></div>
  </div></div>

  <div class="section">PROFILES & JUNCTION TABLES</div>

  <div class="table-card"><div class="name">profiles <span class="count">151 rows</span></div><div class="cols">
    <div><span class="pk">id PK</span> <span>int</span></div>
    <div><span class="fk">user_id FK</span> <span>→ users (1:1)</span></div>
    <div>cnic, contact_no, dob <span>various</span></div>
    <div>blood_group <span>varchar(10)</span></div>
    <div>date_of_joining <span>date</span></div>
  </div></div>

  <div class="table-card"><div class="name">profile_education <span class="count">709 rows</span></div><div class="cols">
    <div><span class="fk">profile_id FK</span> <span>→ profiles</span></div>
    <div>examination, degree <span>varchar</span></div>
    <div>board, passing_year <span>varchar</span></div>
  </div></div>

  <div class="table-card"><div class="name">user_team_memberships <span class="count">567 rows</span></div><div class="cols">
    <div><span class="fk">user_id FK</span> <span>→ users</span></div>
    <div><span class="fk">team_id FK</span> <span>→ teams</span></div>
    <div>role_in_team <span>varchar(100)</span></div>
    <div>is_primary <span>boolean</span></div>
  </div></div>

  <div class="table-card"><div class="name">user_managers <span class="count">531 rows</span></div><div class="cols">
    <div><span class="fk">user_id FK</span> <span>→ users</span></div>
    <div><span class="fk">manager_id FK</span> <span>→ users</span></div>
    <div>is_primary <span>boolean</span></div>
  </div></div>
</div>

<div class="relations">
  <h2>Key Relationships</h2>
  <div class="rel-grid">
    <div class="rel-item">users ↔ teams (M:N via user_team_memberships)</div>
    <div class="rel-item">users ↔ managers (M:N via user_managers)</div>
    <div class="rel-item">users ↔ roles (M:N via user_has_role)</div>
    <div class="rel-item">users → time_entries (1:N)</div>
    <div class="rel-item">users → attendance (1:N)</div>
    <div class="rel-item">users → leaves (1:N)</div>
    <div class="rel-item">users → profiles (1:1)</div>
    <div class="rel-item">programs → projects → sub_projects (hierarchy)</div>
    <div class="rel-item">time_entries → program, project, sub_project, wbs (FK)</div>
  </div>
</div>
</body></html>`;

  fs.writeFileSync(path.join(outDir, 'DB_Architecture.html'), html);
  console.log('✓ DB_Architecture.html (open in browser → Ctrl+P → Save as PDF/PNG)');
}

// ═══════════════════════════════════════════
// 4. FEATURE COMPARISON (HTML)
// ═══════════════════════════════════════════
function generateFeatureComparisonHtml() {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Feature Comparison</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #fff; padding: 40px; max-width: 1100px; margin: 0 auto; }
  h1 { color: #154360; text-align: center; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background: #154360; color: #fff; padding: 10px 14px; text-align: left; font-size: 14px; }
  td { padding: 8px 14px; font-size: 13px; border-bottom: 1px solid #e8e8e8; }
  tr:nth-child(even) td { background: #f8f9fa; }
  .yes { color: #27ae60; font-weight: 700; }
  .no { color: #e74c3c; font-weight: 700; }
  .new { color: #2980b9; font-weight: 700; }
  .section-row td { background: #EBF5FB !important; font-weight: 700; color: #154360; font-size: 14px; }
</style></head><body>
<h1>Feature Comparison — Old vs New</h1>
<p class="subtitle">Old GTL (PHP) + Old HRMS (PHP) → Unified Portal (React + NestJS)</p>

<table>
  <tr><th>Feature</th><th>Old GTL</th><th>Old HRMS</th><th>New Unified App</th><th>Enhancement</th></tr>
  <tr class="section-row"><td colspan="5">GTL — Time Logging</td></tr>
  <tr><td>Time Sheet (weekly groups)</td><td class="yes">✓</td><td class="no">✗</td><td class="yes">✓</td><td>Edit/delete inline, CSV download</td></tr>
  <tr><td>Data Entry (two-column form)</td><td class="yes">✓</td><td class="no">✗</td><td class="yes">✓</td><td>Searchable dropdowns, cascading</td></tr>
  <tr><td>Time Sheet Approval</td><td class="yes">✓</td><td class="no">✗</td><td class="yes">✓</td><td>Per-entry + batch approve/reject</td></tr>
  <tr><td>Team Report</td><td class="yes">✓</td><td class="no">✗</td><td class="yes">✓</td><td>Server-side filtering</td></tr>
  <tr><td>General Report</td><td class="yes">✓</td><td class="no">✗</td><td class="yes">✓</td><td>Download Approved/Unapproved/Both CSV</td></tr>
  <tr><td>Resource Allocation</td><td class="yes">✓</td><td class="no">✗</td><td class="yes">✓</td><td>Resource + Project heatmaps</td></tr>

  <tr class="section-row"><td colspan="5">HRMS — Attendance</td></tr>
  <tr><td>AMS Dashboard (who's in office)</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Search, auto-refresh, stats cards</td></tr>
  <tr><td>Public Board (no login)</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>/board route</td></tr>
  <tr><td>Check In / Out</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Live timer, duplicate prevention</td></tr>
  <tr><td>My Attendance (monthly)</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Seconds, cross-midnight, OT tags</td></tr>
  <tr><td>Attendance Requests</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Admin approve/reject view</td></tr>
  <tr><td>Weekend Assignments</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Lead can assign/delete</td></tr>
  <tr><td>Holidays Calendar</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Pakistani calendar 2025-2026</td></tr>

  <tr class="section-row"><td colspan="5">HRMS — People</td></tr>
  <tr><td>Personal Profile (editable)</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Profile completion %, tabs</td></tr>
  <tr><td>Education / Experience / Visa</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Add/Delete CRUD from profile</td></tr>
  <tr><td>My Leaves + Apply</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Balance tracking</td></tr>
  <tr><td>Employees Report</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Missed checkout column, CSV</td></tr>
  <tr><td>Blood Group Report</td><td class="no">✗</td><td class="yes">✓</td><td class="yes">✓</td><td>Card-based grouped layout</td></tr>
  <tr><td>Reset Password</td><td class="yes">✓</td><td class="yes">✓</td><td class="yes">✓</td><td>Inside profile tab</td></tr>

  <tr class="section-row"><td colspan="5">NEW FEATURES (not in old systems)</td></tr>
  <tr><td>Profile Completion %</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>Circular progress, 16 fields tracked</td></tr>
  <tr><td>Live Attendance Timer</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>Real-time ticking clock when checked in</td></tr>
  <tr><td>Anti-Gaming (12h cap)</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>Suspicious flags, auto-close, capped averages</td></tr>
  <tr><td>Overtime Detection</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>OT tag for 9-12h, color-coded</td></tr>
  <tr><td>Multi-Team Support</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>Users in multiple teams with roles</td></tr>
  <tr><td>Multi-Manager Reporting</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>Report to multiple leads</td></tr>
  <tr><td>My Team Page</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>See team, managers, subordinates with live attendance</td></tr>
  <tr><td>Contact Directory</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>Searchable employee directory</td></tr>
  <tr><td>Late Arrival Report</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>Admin report, team filter</td></tr>
  <tr><td>Auto Auth Refresh</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>No re-login for permission changes</td></tr>
  <tr><td>Argon2id Password Hashing</td><td class="no">✗</td><td class="no">✗</td><td class="new">NEW</td><td>Auto-upgrade from MD5</td></tr>
</table>
</body></html>`;

  fs.writeFileSync(path.join(outDir, 'Feature_Comparison.html'), html);
  console.log('✓ Feature_Comparison.html (open in browser → Ctrl+P → Save as PDF/PNG)');
}

// ═══════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════
(async () => {
  console.log('Generating documents in', outDir, '\n');
  await generateArchitectureDoc();
  await generateBugsDoc();
  generateDbDiagramHtml();
  generateFeatureComparisonHtml();
  console.log('\nDone! Files saved to:', outDir);
})();
