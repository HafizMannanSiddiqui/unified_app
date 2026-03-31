# Unified Portal — Complete Project Documentation
## GTL + HRMS Merged into One Application

---

## 1. Project Overview

### What is this?
A unified web application that merges two legacy PHP systems:
- **GTL (Global Time Logger)** — Employee time tracking, project hour logging, approvals, reports
- **HRMS (Human Resource Management System)** — Attendance, leaves, profiles, employee management

### Why?
- Two separate systems with separate databases, separate logins, separate UIs
- Data inconsistency between systems (different user IDs, different usernames)
- Old PHP + MySQL with security vulnerabilities (MD5 passwords, SQL injection)
- No mobile responsiveness, no real-time features

### Result
One modern application with:
- Single login, single database, single UI
- All GTL + HRMS features preserved and enhanced
- 24 bugs fixed, 6 new features added
- Modern tech stack with proper security

---

## 2. Architecture

### Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  React 18 + TypeScript + Vite (port 3002)           │
│  Ant Design 5 | TanStack Query | Zustand | dayjs    │
├─────────────────────────────────────────────────────┤
│                   BACKEND API                        │
│  NestJS + TypeScript + SWC (port 4000)              │
│  Prisma ORM | JWT + Passport | Argon2id             │
├─────────────────────────────────────────────────────┤
│                   DATABASE                           │
│  PostgreSQL 15 (port 5433)                          │
│  29 tables | 43 FK constraints | Full indexes       │
└─────────────────────────────────────────────────────┘
```

### Project Structure

```
unified_app/
├── backend-nest/
│   ├── prisma/
│   │   └── schema.prisma          # 29 models, all relations
│   ├── src/
│   │   ├── app.module.ts          # Root module
│   │   ├── main.ts                # Entry point (port 4000)
│   │   ├── common/
│   │   │   └── jwt-auth.guard.ts  # JWT authentication guard
│   │   ├── auth/                  # Login, JWT, password hashing
│   │   ├── users/                 # User CRUD, directory, teams, holidays
│   │   ├── teams/                 # Team CRUD
│   │   ├── roles/                 # Role CRUD
│   │   ├── gtl/                   # Time entries, approvals, reports, programs, projects
│   │   ├── attendance/            # Check-in/out, requests, weekend, reports
│   │   ├── leaves/                # Leave management
│   │   ├── profiles/              # Employee profiles, blood groups
│   │   └── prisma/                # Prisma service (shared)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                   # API client layer (axios)
│   │   │   ├── client.ts          # Axios instance + JWT interceptor
│   │   │   ├── auth.ts
│   │   │   ├── gtl.ts
│   │   │   ├── attendance.ts
│   │   │   ├── leaves.ts
│   │   │   ├── profiles.ts
│   │   │   ├── users.ts
│   │   │   └── teams.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx   # Main layout wrapper
│   │   │   │   ├── Sidebar.tsx     # Role-based navigation
│   │   │   │   └── Header.tsx      # Top bar with user info
│   │   │   └── common/
│   │   │       └── ProtectedRoute.tsx  # Auth + auto-refresh
│   │   ├── pages/                 # 33 page components
│   │   │   ├── auth/Login.tsx
│   │   │   ├── dashboard/Dashboard.tsx
│   │   │   ├── gtl/               # TimeEntryList, DataEntry, Approvals
│   │   │   ├── attendance/        # CheckInOut, MyAttendance, Requests, Weekend, Holidays, MyTeam, LateArrivals, EmployeesReport, PublicBoard
│   │   │   ├── leaves/            # MyLeaves, ApplyLeave, PendingLeaves
│   │   │   ├── profiles/          # MyProfile, EmployeeList, BloodGroup, ContactDirectory
│   │   │   ├── reports/           # TeamReport, GeneralReport
│   │   │   ├── resource/          # ResourceAllocation, ProjectAllocation
│   │   │   ├── manage/            # Teams, Programs, Projects, SubProjects, Workstreams
│   │   │   ├── users/UserList.tsx
│   │   │   └── settings/ResetPassword.tsx
│   │   ├── store/authStore.ts     # Zustand auth state (persisted)
│   │   ├── hooks/useAuth.ts       # Login/logout logic
│   │   ├── types/index.ts         # TypeScript interfaces
│   │   ├── theme/companyThemes.ts # Per-company theming
│   │   ├── index.css              # Global GTL-style CSS
│   │   ├── App.tsx                # Routes + providers
│   │   └── main.tsx               # Entry point
│   ├── vite.config.ts             # Dev server + API proxy
│   └── package.json
└── PROJECT_DOCUMENTATION.md       # This file
```

---

## 3. Database Schema (29 Tables)

### Entity Relationship Diagram

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  teams   │────<│    users     │>────│  roles   │
│  (29)    │     │   (783)      │     │  (8)     │
└──────────┘     └──────┬───────┘     └──────────┘
      │                 │
      │    ┌────────────┼────────────┬──────────────┐
      │    │            │            │              │
      ▼    ▼            ▼            ▼              ▼
┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐
│time_entry│  │  attendance  │  │  leaves  │  │ profiles │
│(118,145) │  │  (102,657)   │  │ (1,071)  │  │  (151)   │
└──────────┘  └──────────────┘  └──────────┘  └──────┬───┘
      │                                              │
  ┌───┴───┐                                ┌─────────┼─────────┐
  │       │                                │         │         │
  ▼       ▼                                ▼         ▼         ▼
┌─────┐┌─────────┐                  ┌──────────┐┌────────┐┌──────┐
│prog-││projects │                  │education ││experien││visas │
│rams ││  (11)   │                  │  (709)   ││ (253)  ││ (16) │
│ (2) │└────┬────┘                  └──────────┘└────────┘└──────┘
└─────┘     │
            ▼
      ┌───────────┐
      │sub_projects│
      │   (18)     │
      └───────────┘
```

### New Tables Added (this migration)

| Table | Purpose |
|---|---|
| `user_team_memberships` | Many-to-many: user ↔ team (with role_in_team, is_primary) |
| `user_managers` | Many-to-many: user ↔ manager (with is_primary) |

### Key Relations

| Relation | Type | Description |
|---|---|---|
| User → Team | Many-to-Many | Via `user_team_memberships` (new), plus legacy `team_id` |
| User → Manager | Many-to-Many | Via `user_managers` (new), plus legacy `report_to` |
| User → Role | Many-to-Many | Via `user_has_role` |
| User → TimeEntry | One-to-Many | Time logging |
| User → Attendance | One-to-Many | Check-in/out records |
| User → Leave | One-to-Many | Leave applications |
| User → Profile | One-to-One | Personal info, education, experience, visas |
| Program → Project → SubProject | Hierarchy | GTL project structure |
| TimeEntry → Program/Project/SubProject/WBS | Foreign Keys | Entry classification |

---

## 4. Data Migration Summary

### Source Systems

| Source | Database | Tables | Key Data |
|---|---|---|---|
| GTL (`time_logger.sql`) | MySQL | 10 tables | 118,715 time entries, 444 users |
| HRMS (`hrms.sql`) | MySQL | 22 tables | 102,657 attendance, 1,071 leaves, 6,315 requests |

### Migration Challenges & Solutions

| Challenge | Problem | Solution |
|---|---|---|
| **User ID mismatch** | Old GTL user_id 374 ≠ New PostgreSQL user_id 374 | Mapped via `alias_info` JSON field (185 users) + direct username match (136) + created missing accounts (102) |
| **Alias/pseudonym usernames** | Old GTL used fake names (e.g., `andy.cash` → real: `junaid.khalil`) | Used HRMS `alias_info` field to map old → real usernames |
| **Same name ≠ same person** | "Muhammad Ali" could be 10 different people | Only mapped via `alias_info` (definitive link), never by name |
| **Legacy program/project IDs** | Old used string IDs like `'PXP06'`, new uses integers | Mapped via `legacy_*_id` columns |
| **Missing entries** | Some users' entries weren't imported | Full re-import script: 118,145 / 118,715 rows (99.5%) |

### Final Migration Numbers

| Metric | Count |
|---|---|
| Total time entries imported | **118,145** |
| Employees with time data | **377** |
| Users mapped (old → new) | **444 / 444 (100%)** |
| Attendance records | **102,657** |
| Leave records | **1,071** |
| Profiles | **151** |
| Education records | **709** |
| Experience records | **253** |

---

## 5. Feature Comparison: Old vs New

### GTL Features

| Feature | Old GTL (PHP) | New Unified App | Enhancement |
|---|---|---|---|
| Time Sheet | Weekly accordion groups | ✅ Same + month/year/program filter | Edit/delete inline, CSV download |
| Data Entry | Two-column form | ✅ Exact same layout | Searchable dropdowns, cascading |
| Time Sheet Approval | Employee dropdown + approve all | ✅ Same + per-entry approve/reject | Individual + batch approve |
| Team Report | Date + team filter → table | ✅ Same layout | Server-side filtering |
| General Report | Multi-filter form → table | ✅ Same + Report Type dropdown | Download Approved/Unapproved/Both CSV |
| Reset Password | Side-by-side fields | ✅ Moved to Profile tab | Integrated with profile |

### HRMS Features

| Feature | Old HRMS (PHP) | New Unified App | Enhancement |
|---|---|---|---|
| Home/AMS Dashboard | Available/Not Available/Pending | ✅ Same 3-column layout | Search, auto-refresh, stats cards |
| Public Board | `/` without login | ✅ `/board` route | Same, no auth required |
| Personal/Profile | View + edit | ✅ Tabs: Personal, Education, Experience, Visas | **Profile completion %**, Add/Delete CRUD for education/experience/visa |
| Check In/Out | Manual + RFID | ✅ Manual | Live timer, duplicate prevention |
| My Attendance | Monthly calendar | ✅ Same with seconds | Cross-midnight fix, suspicious flags, OT tags |
| My Leaves | Balance + history | ✅ Same | Apply leave form |
| Attendance Requests | Table + New Request | ✅ Same | Admin approve/reject view |
| Weekend Assignments | Table + assign | ✅ Same | Lead can assign/delete |
| Employees Report | Date + team → table | ✅ Same | Missed checkout column, CSV download |
| Blood Group | Grouped by type | ✅ Card-based layout | Search, contact info |
| Holidays | Calendar | ✅ Year filter + table | - |

### NEW Features (not in old systems)

| Feature | Description |
|---|---|
| **Profile Completion %** | Circular progress showing how complete a user's profile is (16 fields tracked) |
| **Live Attendance Timer** | When checked in, shows real-time ticking clock on attendance page |
| **Anti-Gaming System** | 12h cap, suspicious detection, auto-close missed checkouts, blocked next-day checkout |
| **Overtime Detection** | 9-12h entries tagged with "OT" badge, color-coded duration |
| **Multi-Team Support** | Users can belong to multiple teams with different roles |
| **Multi-Manager Support** | Users can report to multiple managers |
| **My Team Page** | See your teams, managers, subordinates with live attendance |
| **Contact Directory** | Searchable employee directory with email, phone, team, blood group |
| **Late Arrival Report** | Admin report showing who arrived late, filterable by date/team |
| **Public Attendance Board** | `/board` — no login, shows who's in office (like old AMS) |
| **Auto Auth Refresh** | Profile/roles refresh silently on page load — no re-login needed for permission changes |

---

## 6. Security Improvements

### Password Hashing

```
OLD SYSTEM                          NEW SYSTEM
┌─────────────┐                     ┌──────────────────────────┐
│    MD5      │                     │      Argon2id            │
│  (broken)   │                     │  (gold standard)         │
│             │                     │                          │
│ No salt     │    ──────────►      │ Auto-generated salt      │
│ 0 memory    │                     │ 64 MB memory cost        │
│ Instant     │                     │ 3 iterations             │
│ Crackable   │                     │ 4 threads parallelism    │
│ in seconds  │                     │ GPU/ASIC resistant       │
└─────────────┘                     └──────────────────────────┘

Auto-upgrade: When a user logs in with old MD5 password,
the system silently upgrades to Argon2id and clears the MD5.
```

### Other Security Fixes

| Vulnerability | Old System | New System |
|---|---|---|
| SQL Injection | Raw string concatenation (`WHERE id = '$id'`) | Prisma parameterized queries |
| Password Storage | MD5, no salt | Argon2id, per-user salt |
| Authentication | PHP sessions | JWT tokens with expiry |
| API Security | No auth on many endpoints | JWT guard on all endpoints |
| XSS | Unescaped output | React auto-escaping |
| CORS | Open | Proxy-based (same-origin) |

---

## 7. Bug Fixes (24 Total)

### Critical — Data Integrity (8 bugs)

| # | Bug | Impact | Root Cause | Fix |
|---|---|---|---|---|
| 1 | `abdul.mannan` had 0 time entries | User's timesheet empty | Old GTL user_id 451 ≠ new user_id 469 | Imported 16 entries with correct ID |
| 2 | ALL 88,687 entries had wrong user IDs | Every user saw wrong data | Migration used old IDs as new IDs | aliasInfo-based remapping |
| 3 | 65,876 approver IDs wrong | Wrong approver names | Same ID mapping issue | Remapped via alias |
| 4 | Only 241 entries parsed initially | 99.8% data missing | Regex didn't handle multi-INSERT SQL | Rewrote parser |
| 5 | 122 old GTL users had no aliasInfo match | 17,503 entries orphaned | Users not in HRMS aliasInfo | Created accounts + fuzzy matching |
| 6 | `m.zeeshan` ≠ `muhammad.zeeshan` mapping | 564 entries under wrong account | Different username in HRMS vs GTL | Manual merge (only after confirming same person by email) |
| 7 | `m.sumair` wrong password | Couldn't login | HRMS had different MD5 than GTL | Reset to Argon2id |
| 8 | `abdul.mannan` had "Default" role, not "Team Lead" | Couldn't see Approval/Reports | Old GTL "lead" role not mapped | Added Team Lead role |

### Critical — Attendance System (5 bugs)

| # | Bug | Impact | Fix |
|---|---|---|---|
| 9 | Negative durations (-9:-57:00) | Completely wrong calculation | Used `(checkout_date + checkout_time) - (checkin_date + checkin_time)` |
| 10 | Seconds stripped | Duration showed 09:05:00 not 09:05:23 | Changed pipeline from minutes to seconds |
| 11 | Checkout date ignored | Cross-midnight = wrong duration | Used actual `checkout_date` column |
| 12 | Duplicate rows per day | Multiple entries confusing | `GROUP BY checkin_date` with MIN/MAX |
| 13 | Double check-in allowed | Duplicate records | Backend blocks if open session exists |

### Critical — Security Exploits (4 bugs)

| # | Bug | Exploit | Fix |
|---|---|---|---|
| 14 | Missed checkout → 22h duration | Skip checkout, inflate hours | Auto-close at checkin + 12 hours |
| 15 | Inflated averages | Gaming via 20+ hour sessions | Duration capped at 12h for averages |
| 16 | No suspicious detection | No accountability | `suspicious` flag, warning banner, yellow rows |
| 17 | Next-day checkout allowed | Manual checkout for yesterday | Blocked — only today's sessions, older auto-close |

### UI/UX (7 bugs)

| # | Bug | Fix |
|---|---|---|
| 18 | TypeScript types snake_case vs camelCase | Fixed all types in index.ts |
| 19 | Approval/Reports hidden from Team Leads | Restructured sidebar to match old GTL permissions |
| 20 | Reset Password on separate page | Moved to Profile tab |
| 21 | Profile was read-only | Made all fields editable |
| 22 | No public attendance board | Built `/board` (no auth) |
| 23 | Stale roles in localStorage | Auto-refresh via `getMe()` on page load |
| 24 | Dashboard capped at 50 employees | Removed limit, shows all 568 |

---

## 8. Authentication & Authorization

### Role Hierarchy

```
super admin ──► Admin ──► Application Manager ──► Team Lead ──► Default
    │              │              │                    │            │
    │              │              │                    │            ├── Time Sheet
    │              │              │                    │            ├── Data Entry
    │              │              │                    │            ├── All HRMS features
    │              │              │                    │            └── Profile
    │              │              │                    │
    │              │              │                    ├── + Time Sheet Approval
    │              │              │                    ├── + Reports (Team/General)
    │              │              │                    ├── + Employees Report
    │              │              │                    ├── + Late Arrivals Report
    │              │              │                    └── + Att. Requests (Admin)
    │              │              │
    │              │              └── + All admin features
    │              └── + All admin features
    └── + All admin features
```

### JWT Flow

```
Login → POST /auth/login
  │         │
  │    ┌────▼─────┐     ┌──────────┐
  │    │ Verify   │────►│ Try      │
  │    │ Password │     │ Argon2id │──► Match? ──► Issue JWT
  │    └──────────┘     └──────────┘
  │         │                │
  │         │           No match
  │         │                │
  │         │           ┌────▼─────┐
  │         │           │ Try MD5  │──► Match? ──► Upgrade to Argon2id ──► Issue JWT
  │         │           └──────────┘
  │         │
  │    Every protected request:
  │    Authorization: Bearer <jwt>
  │         │
  │    ┌────▼──────┐
  │    │ JwtGuard  │──► Verify token ──► Extract user.id ──► Proceed
  │    └───────────┘
  │
  │    On page load:
  │    ProtectedRoute calls GET /auth/me
  │         │
  │    ┌────▼──────────┐
  │    │ Refresh roles, │──► Update Zustand store ──► Sidebar re-renders
  │    │ permissions    │
  │    └───────────────┘
```

---

## 9. API Endpoints (Complete List)

### Auth (no guard on login)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login with username/password |
| GET | `/auth/me` | Get current user profile + roles |
| POST | `/auth/reset-password` | Change own password |

### GTL — Time Entries
| Method | Endpoint | Description |
|---|---|---|
| GET | `/time-entries` | List entries (filters: userId, from, to, status, teamId, page) |
| POST | `/time-entries` | Create new entry |
| PUT | `/time-entries/:id` | Update entry |
| DELETE | `/time-entries/:id` | Delete entry |
| GET | `/timesheet/grouped` | Entries grouped by week (userId, year, month, programId) |
| GET | `/timesheet/download` | CSV download |

### GTL — Approvals
| Method | Endpoint | Description |
|---|---|---|
| POST | `/approvals/:id/approve` | Approve single entry |
| POST | `/approvals/:id/reject` | Reject single entry |
| POST | `/approvals/batch-approve` | Approve ALL pending for a user |
| GET | `/approvals/pending-users` | Users with pending entries |
| GET | `/approvals/pending-grouped` | Pending entries grouped by week |

### GTL — Programs/Projects/SubProjects/WBS
| Method | Endpoint | Description |
|---|---|---|
| GET/POST/PUT | `/programs`, `/projects`, `/sub-projects` | CRUD |
| GET | `/wbs` | List WBS entries |
| GET | `/workstreams` | Team-subproject assignments |

### GTL — Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports/team` | Team hours report |
| GET | `/reports/general` | General multi-filter report |
| GET | `/resource-allocation` | Resource heatmap |
| GET | `/project-allocation` | Project heatmap |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| POST | `/attendance/checkin` | Check in (blocks duplicates) |
| POST | `/attendance/checkout` | Check out (blocks after 12h) |
| GET | `/attendance/my` | My attendance (grouped by day, seconds, cross-midnight) |
| GET | `/attendance/today-dashboard` | Team member list (available/not/pending) |
| GET | `/attendance/daily-report` | Daily attendance report |
| GET | `/attendance/monthly-report` | Monthly report for a user |
| GET | `/attendance/employees-report` | All employees attendance summary |
| GET | `/attendance/late-arrivals` | Late arrival report |
| GET | `/attendance/my-team` | Subordinates with today's attendance |
| GET/POST | `/attendance/requests` | Attendance requests CRUD |
| GET | `/attendance/requests/all` | All requests (admin) |
| POST | `/attendance/requests/:id/approve` | Approve request |
| POST | `/attendance/requests/:id/reject` | Reject request |
| GET/POST | `/attendance/weekend-assignments` | Weekend assignments CRUD |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | List users (search, filter, paginate) |
| GET | `/users/:id` | Get single user |
| POST | `/users` | Create user |
| PUT | `/users/:id` | Update user |
| GET | `/users/directory` | Searchable employee directory |
| GET | `/users/holidays` | Holidays list |
| GET | `/users/notifications` | Pending counts |
| GET | `/users/my-teams` | User's teams + managers |
| POST | `/users/team-membership` | Add team membership |
| POST | `/users/manager` | Add manager relationship |
| GET | `/users/my-team-members` | Get subordinates |

### Profiles
| Method | Endpoint | Description |
|---|---|---|
| GET | `/profiles` | All profiles (search) |
| GET | `/profiles/blood-groups` | Blood group report |
| GET | `/profiles/:userId` | Get profile (auto-create + completion %) |
| PUT | `/profiles/:userId` | Update profile + education/experience/visas |

### Leaves
| Method | Endpoint | Description |
|---|---|---|
| GET | `/leaves` | My leaves |
| POST | `/leaves` | Apply for leave |
| GET | `/leaves/balance/:userId` | Leave balance |
| GET | `/leaves/pending` | Pending leave requests |
| POST | `/leaves/:id/approve` | Approve leave |
| POST | `/leaves/:id/reject` | Reject leave |

### Public (no auth)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/public/attendance/today` | Public attendance board |

---

## 10. Running the Application

### Prerequisites
- Node.js 18+
- PostgreSQL 15 (port 5433, password: angular123, database: unified_app)

### Start Development
```bash
cd unified_app/frontend
npm run dev
```
This single command:
1. Auto-installs dependencies
2. Starts backend (NestJS + SWC hot-reload on port 4000)
3. Starts frontend (Vite HMR on port 3002)
4. Proxies `/api/*` → backend

### Access
- **App**: http://localhost:3002
- **Public Board**: http://localhost:3002/board
- **Login**: username / `welcome` (most users)

### Admin Accounts
| Username | Role | Password |
|---|---|---|
| `ykhan` | super admin | `welcome` |
| `ali.abbas` | super admin | `welcome` |
| `adeeb.rehman` | Application Manager | `welcome` |
| `fmasood` | Admin | `welcome` |
| `abdul.mannan` | Team Lead | `welcome` |

---

## 11. Key Numbers

| Metric | Value |
|---|---|
| Total database tables | 29 |
| Backend TypeScript files | 30 |
| Frontend TypeScript/React files | 53 |
| Frontend pages | 33 |
| API endpoints | 60+ |
| Total users in DB | 783 |
| Active employees | 568 |
| Teams | 29 |
| Time entries imported | 118,145 |
| Attendance records | 102,657 |
| Leave records | 1,071 |
| Bugs fixed | 24 |
| New features added | 11 |
| Security vulnerabilities eliminated | 6 |

---

*Document generated: March 30, 2026*
*Stack: NestJS + Prisma + React + PostgreSQL*
