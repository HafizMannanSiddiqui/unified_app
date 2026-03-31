# Learn the Unified Portal — Complete Developer Guide

A practical guide to understand every piece of this application. Read this file and you'll understand the entire architecture, how data flows, and how to modify anything.

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [How a Request Flows (End to End)](#2-how-a-request-flows)
3. [Backend — NestJS (explained like you're 5)](#3-backend-nestjs)
4. [Frontend — React (explained like you're 5)](#4-frontend-react)
5. [Database — PostgreSQL + Prisma](#5-database-prisma)
6. [Authentication — How Login Works](#6-authentication)
7. [File-by-File Guide](#7-file-by-file-guide)
8. [How to Add a New Feature](#8-how-to-add-a-new-feature)
9. [How to Add a New Page](#9-how-to-add-a-new-page)
10. [How to Add a New API Endpoint](#10-how-to-add-a-new-api-endpoint)
11. [How to Add a New Database Table](#11-how-to-add-a-new-database-table)
12. [Common Patterns Used](#12-common-patterns)
13. [Debugging Guide](#13-debugging)

---

## 1. The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                        │
│                                                              │
│  React App (localhost:3002)                                  │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Pages   │→ │ API calls│→ │ Zustand  │  │ React Query  │ │
│  │ (.tsx)  │  │ (axios)  │  │ (auth    │  │ (data cache) │ │
│  │         │  │          │  │  store)  │  │              │ │
│  └─────────┘  └────┬─────┘  └──────────┘  └──────────────┘ │
└─────────────────────┼───────────────────────────────────────┘
                      │ HTTP requests (GET, POST, PUT, DELETE)
                      │ with JWT token in header
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     VITE PROXY                               │
│  localhost:3002/api/*  →  localhost:4000/*                   │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS BACKEND (localhost:4000)            │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Controller│→ │   Service    │→ │   Prisma     │          │
│  │(routes)  │  │ (business    │  │  (database   │          │
│  │          │  │  logic)      │  │   queries)   │          │
│  └──────────┘  └──────────────┘  └──────┬───────┘          │
└─────────────────────────────────────────┼───────────────────┘
                                          │ SQL queries
                                          ▼
┌─────────────────────────────────────────────────────────────┐
│               PostgreSQL DATABASE (localhost:5433)            │
│                                                              │
│  30 tables: users, teams, time_entries, attendance, etc.     │
│  118,145 time entries, 102,657 attendance records            │
└─────────────────────────────────────────────────────────────┘
```

**In simple words:**
1. User opens browser → React app loads
2. User clicks something → React makes an API call
3. API call goes through Vite proxy → reaches NestJS backend
4. NestJS controller receives it → calls service → service uses Prisma to query DB
5. DB returns data → Prisma formats it → service returns it → controller sends HTTP response
6. React receives response → updates the UI

---

## 2. How a Request Flows

Let's trace what happens when a user opens "My Timesheet":

### Step 1: User clicks "Time Sheet" in sidebar
```
File: frontend/src/components/layout/Sidebar.tsx
Line: { key: '/my/timesheet', icon: <FileTextOutlined />, label: 'Time Sheet' }

→ React Router navigates to /my/timesheet
```

### Step 2: Router loads the page component
```
File: frontend/src/App.tsx
Line: <Route path="my/timesheet" element={<TimeEntryList />} />

→ TimeEntryList component mounts
```

### Step 3: Component makes API call
```
File: frontend/src/pages/gtl/TimeEntryList.tsx

const { data, isLoading } = useQuery({
  queryKey: ['timesheetGrouped', userId, year, month],
  queryFn: () => getTimesheetGrouped(userId, year, month),
});

→ useQuery (from TanStack React Query) calls getTimesheetGrouped
→ React Query handles caching, loading states, refetching
```

### Step 4: API function sends HTTP request
```
File: frontend/src/api/gtl.ts

export const getTimesheetGrouped = (userId, year, month) =>
  apiClient.get('/timesheet/grouped', { params: { userId, year, month } })
  .then(r => r.data);

→ axios sends: GET /api/timesheet/grouped?userId=469&year=2026&month=3
→ JWT token automatically added by interceptor (frontend/src/api/client.ts)
```

### Step 5: Vite proxy forwards to backend
```
File: frontend/vite.config.ts

proxy: {
  '/api': {
    target: 'http://localhost:4000',
    rewrite: (path) => path.replace(/^\/api/, ''),
  }
}

→ /api/timesheet/grouped → http://localhost:4000/timesheet/grouped
```

### Step 6: NestJS controller receives request
```
File: backend-nest/src/gtl/gtl.controller.ts

@Get('timesheet/grouped')
getTimesheetGrouped(@Query('userId') userId, @Query('year') year, @Query('month') month) {
  return this.gtl.getTimesheetGrouped(+userId, +year, +month);
}

→ @Get decorator defines the route
→ @Query extracts URL parameters
→ Calls the service method
```

### Step 7: Service queries database via Prisma
```
File: backend-nest/src/gtl/gtl.service.ts

async getTimesheetGrouped(userId, year, month) {
  const entries = await this.prisma.timeEntry.findMany({
    where: { userId, entryDate: { gte: from, lte: to } },
    include: { program: true, project: true, wbs: true },
    orderBy: { entryDate: 'asc' },
  });
  // Group by week, calculate totals...
  return { weeks, grandTotal, totalEntries };
}

→ this.prisma.timeEntry.findMany() generates SQL:
   SELECT * FROM time_entries WHERE user_id = 469 AND entry_date BETWEEN ...
   JOIN programs ON ... JOIN projects ON ...
→ Returns data to controller → sends as JSON response
```

### Step 8: React receives and renders
```
File: frontend/src/pages/gtl/TimeEntryList.tsx

→ useQuery receives the response
→ isLoading becomes false
→ data.weeks contains grouped entries
→ Component renders the weekly accordion UI
```

---

## 3. Backend — NestJS

### What is NestJS?
A framework for building Node.js backend APIs. Think of it as "Express.js but organized."

### Structure: Module → Controller → Service

```
Module (registers everything)
  ├── Controller (handles HTTP routes)
  └── Service (does the actual work)
```

### Example: GTL Module

**Module** — `src/gtl/gtl.module.ts`
```typescript
@Module({
  controllers: [GtlController],  // Register routes
  providers: [GtlService],       // Register business logic
})
export class GtlModule {}
```

**Controller** — `src/gtl/gtl.controller.ts`
```typescript
@Controller()                    // Base path
@UseGuards(JwtAuthGuard)         // Require login for all routes
export class GtlController {
  constructor(private gtl: GtlService) {}  // Inject service

  @Get('time-entries')           // GET /time-entries
  findTimeEntries(@Query() q) {  // Extract query params
    return this.gtl.findTimeEntries(q);
  }

  @Post('time-entries')          // POST /time-entries
  createTimeEntry(@Body() body) {// Extract request body
    return this.gtl.createTimeEntry(body);
  }

  @Put('time-entries/:id')       // PUT /time-entries/123
  updateTimeEntry(@Param('id') id, @Body() body) {
    return this.gtl.updateTimeEntry(+id, body);
  }

  @Delete('time-entries/:id')    // DELETE /time-entries/123
  deleteTimeEntry(@Param('id') id) {
    return this.gtl.deleteTimeEntry(+id);
  }
}
```

**Service** — `src/gtl/gtl.service.ts`
```typescript
@Injectable()
export class GtlService {
  constructor(private prisma: PrismaService) {}  // Inject database

  findTimeEntries(filters) {
    return this.prisma.timeEntry.findMany({
      where: { ... },           // SQL WHERE clause
      include: { user: true },  // SQL JOIN
      orderBy: { date: 'desc' },// SQL ORDER BY
      take: 50,                 // SQL LIMIT
    });
  }
}
```

### Key Decorators:
- `@Controller('path')` — defines base URL path
- `@Get('path')` / `@Post` / `@Put` / `@Delete` — HTTP methods
- `@Query()` — URL query params (?key=value)
- `@Body()` — request body (JSON)
- `@Param('id')` — URL params (/items/:id)
- `@UseGuards(JwtAuthGuard)` — require authentication
- `@Request()` — access the full request (for req.user.id)

---

## 4. Frontend — React

### What is React?
A library for building UIs with components. Each page is a component.

### Key Libraries Used:

| Library | Purpose | Example |
|---|---|---|
| **React Router** | URL routing | `/my/timesheet` → `<TimeEntryList />` |
| **TanStack React Query** | API calls + caching | `useQuery()`, `useMutation()` |
| **Zustand** | Global state (auth) | `useAuthStore()` |
| **Ant Design** | UI components | `<Table>`, `<Select>`, `<Modal>` |
| **Axios** | HTTP client | `apiClient.get('/time-entries')` |
| **dayjs** | Date formatting | `dayjs('2026-03-30').format('DD MMM')` |

### How a Page Component Works:

```typescript
// frontend/src/pages/gtl/DataEntry.tsx

import { useMutation, useQuery } from '@tanstack/react-query';  // Data fetching
import { Form, Select, Button, message } from 'antd';           // UI components
import { createTimeEntry, getPrograms } from '../../api/gtl';    // API functions
import { useAuthStore } from '../../store/authStore';            // Auth state

export default function DataEntry() {
  // 1. Get current user from auth store
  const user = useAuthStore((s) => s.user);

  // 2. State for form
  const [form] = Form.useForm();
  const [programId, setProgramId] = useState();

  // 3. Fetch data from API (auto-cached by React Query)
  const { data: programs } = useQuery({
    queryKey: ['programs'],         // Cache key
    queryFn: getPrograms,           // API function
  });

  // 4. Mutation for saving data
  const mutation = useMutation({
    mutationFn: createTimeEntry,    // API function
    onSuccess: () => {
      message.success('Saved!');     // Show toast
      form.resetFields();            // Clear form
    },
    onError: () => message.error('Failed'),
  });

  // 5. Form submit handler
  const onFinish = (values) => {
    mutation.mutate({
      ...values,
      userId: user.id,
      entryDate: values.entryDate.format('YYYY-MM-DD'),
    });
  };

  // 6. Render UI
  return (
    <div>
      <Form form={form} onFinish={onFinish}>
        <Form.Item name="programId" label="Program">
          <Select options={programs?.map(p => ({ label: p.name, value: p.id }))} />
        </Form.Item>
        <Button htmlType="submit" loading={mutation.isPending}>Submit</Button>
      </Form>
    </div>
  );
}
```

### Key React Query Patterns:

```typescript
// FETCH data (GET request)
const { data, isLoading } = useQuery({
  queryKey: ['items', page],        // Unique key for caching
  queryFn: () => fetchItems(page),  // Function that returns a promise
  enabled: !!userId,                // Only run when userId exists
  refetchInterval: 60000,           // Auto-refresh every 60 seconds
});

// MUTATE data (POST/PUT/DELETE)
const mutation = useMutation({
  mutationFn: createItem,
  onSuccess: () => {
    message.success('Done!');
    queryClient.invalidateQueries({ queryKey: ['items'] }); // Refresh the list
  },
});

// Use it:
mutation.mutate({ name: 'New Item' });
```

---

## 5. Database — Prisma

### What is Prisma?
An ORM (Object Relational Mapper). Instead of writing SQL, you write JavaScript/TypeScript.

### Schema File: `backend-nest/prisma/schema.prisma`

This file defines ALL your tables:

```prisma
model User {
  id          Int      @id @default(autoincrement())  // PRIMARY KEY, auto-increment
  username    String   @unique                         // UNIQUE constraint
  email       String?                                  // ? = nullable
  teamId      Int?     @map("team_id")                 // @map = column name in DB
  isActive    Boolean  @default(true)                  // default value
  createdAt   DateTime @default(now())                 // auto-set on create

  // Relations (not actual columns, just for Prisma joins)
  team        Team?    @relation(fields: [teamId], references: [id])
  timeEntries TimeEntry[]

  @@index([username])                                  // CREATE INDEX
  @@map("users")                                       // actual table name in DB
}
```

### Prisma vs SQL Translation:

```typescript
// Prisma:
const users = await prisma.user.findMany({
  where: { isActive: true, teamId: 5 },
  include: { team: true },
  orderBy: { displayName: 'asc' },
  take: 50,
});

// Equivalent SQL:
SELECT u.*, t.*
FROM users u
LEFT JOIN teams t ON t.id = u.team_id
WHERE u.is_active = true AND u.team_id = 5
ORDER BY u.display_name ASC
LIMIT 50;
```

### Common Prisma Operations:

```typescript
// Find one
const user = await prisma.user.findUnique({ where: { id: 469 } });

// Find many with filter
const entries = await prisma.timeEntry.findMany({
  where: { userId: 469, status: 0 },
});

// Create
const newEntry = await prisma.timeEntry.create({
  data: { userId: 469, hours: 8, description: 'work' },
});

// Update
await prisma.user.update({
  where: { id: 469 },
  data: { displayName: 'Abdul Mannan' },
});

// Delete
await prisma.timeEntry.delete({ where: { id: 123 } });

// Count
const count = await prisma.timeEntry.count({ where: { status: 0 } });

// Raw SQL (when Prisma isn't enough)
const result = await prisma.$queryRaw`
  SELECT COUNT(*) FROM attendance WHERE checkin_date = CURRENT_DATE
`;
```

### Updating the Database Schema:

1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (updates DB without migration files)
3. Run `npx prisma generate` (regenerates TypeScript types)

---

## 6. Authentication

### How Login Works:

```
1. User enters username + password on /login page
2. Frontend sends: POST /api/auth/login { username, password }
3. Backend AuthService:
   a. Finds user by username
   b. Tries Argon2id hash verification
   c. If fails, tries legacy MD5 fallback
   d. If MD5 matches, upgrades to Argon2id silently
   e. Creates JWT token with { sub: userId, username }
   f. Returns: { access_token: "eyJhbG..." }
4. Frontend stores token in Zustand (persisted to localStorage)
5. Every subsequent API call includes: Authorization: Bearer <token>
6. JwtAuthGuard on backend verifies the token
7. If invalid/expired → 401 → frontend redirects to /login
```

### Key Files:
- `backend-nest/src/auth/auth.service.ts` — login logic, password hashing
- `backend-nest/src/auth/auth.controller.ts` — /auth/login, /auth/me routes
- `backend-nest/src/auth/jwt.strategy.ts` — JWT verification strategy
- `backend-nest/src/common/jwt-auth.guard.ts` — guard that protects routes
- `frontend/src/store/authStore.ts` — Zustand store for token + user
- `frontend/src/api/client.ts` — axios interceptor adds JWT to every request
- `frontend/src/components/common/ProtectedRoute.tsx` — redirects to /login if no token

---

## 7. File-by-File Guide

### Backend Structure

```
backend-nest/src/
├── main.ts                          ← App entry point, starts server on PORT
├── app.module.ts                    ← Root module, imports all other modules
├── common/
│   └── jwt-auth.guard.ts           ← Middleware: verify JWT token
├── auth/
│   ├── auth.module.ts              ← Registers auth controller + service
│   ├── auth.controller.ts          ← POST /auth/login, GET /auth/me
│   ├── auth.service.ts             ← Password verification, JWT creation
│   └── jwt.strategy.ts             ← How JWT is decoded
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts         ← /users CRUD + directory + holidays + devices
│   └── users.service.ts            ← User queries, change requests, device management
├── gtl/
│   ├── gtl.module.ts
│   ├── gtl.controller.ts           ← /time-entries, /approvals, /reports, /programs, etc.
│   └── gtl.service.ts              ← Time entry CRUD, grouping, reports, resource allocation
├── attendance/
│   ├── attendance.module.ts
│   ├── attendance.controller.ts    ← /attendance/* + public endpoints
│   ├── attendance.service.ts       ← Checkin/out, requests, insights, ghost employees
│   └── zkteco.service.ts           ← ZKTeco device communication
├── leaves/
│   ├── leaves.controller.ts        ← /leaves CRUD
│   └── leaves.service.ts           ← Leave management
├── profiles/
│   ├── profiles.controller.ts      ← /profiles CRUD + blood groups
│   └── profiles.service.ts         ← Profile upsert with education/experience/visas
├── teams/
│   └── teams.service.ts            ← Team CRUD
├── roles/
│   └── roles.service.ts            ← Role CRUD
└── prisma/
    ├── prisma.module.ts            ← Makes PrismaService available everywhere
    └── prisma.service.ts           ← Database connection
```

### Frontend Structure

```
frontend/src/
├── main.tsx                         ← App entry point, renders <App />
├── App.tsx                          ← All routes defined here
├── index.css                        ← Global CSS (page-heading, tables, forms, etc.)
├── vite-env.d.ts                    ← TypeScript declarations
├── types/index.ts                   ← TypeScript interfaces (User, TimeEntry, etc.)
├── store/
│   └── authStore.ts                ← Zustand: stores JWT token + user object
├── hooks/
│   ├── useAuth.ts                  ← Login/logout functions
│   └── usePermission.ts           ← Check if user has a permission
├── theme/
│   └── companyThemes.ts            ← Ant Design themes per company (colors)
├── api/                            ← All API calls (axios)
│   ├── client.ts                   ← Axios instance with JWT interceptor
│   ├── auth.ts                     ← login(), getMe()
│   ├── gtl.ts                      ← getTimeEntries(), createTimeEntry(), etc.
│   ├── attendance.ts               ← checkin(), getMyAttendance(), etc.
│   ├── leaves.ts                   ← getLeaves(), applyLeave()
│   ├── profiles.ts                 ← getProfile(), updateProfile()
│   ├── users.ts                    ← getUsers(), getDirectory(), etc.
│   └── teams.ts                    ← getTeams()
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx           ← Sidebar + Header + Content wrapper
│   │   ├── Sidebar.tsx             ← Navigation menu (role-based)
│   │   └── Header.tsx              ← Top bar with company tag + user avatar
│   └── common/
│       └── ProtectedRoute.tsx      ← Auth check + auto-refresh roles
└── pages/                          ← One file per page
    ├── auth/Login.tsx
    ├── dashboard/Dashboard.tsx
    ├── gtl/
    │   ├── TimeEntryList.tsx       ← My Timesheet (weekly accordion)
    │   ├── DataEntry.tsx           ← Log Time form
    │   └── Approvals.tsx           ← Time Sheet Approval
    ├── attendance/
    │   ├── MyAttendance.tsx        ← Monthly calendar with duration
    │   ├── CheckInOut.tsx          ← Manual check in/out (kept for direct access)
    │   ├── Kiosk.tsx               ← /ams page (attendance marking portal)
    │   ├── PublicBoard.tsx         ← /board page (who's in office)
    │   ├── AttendanceRequests.tsx  ← Employee requests + admin approval
    │   ├── WeekendAssignments.tsx
    │   ├── Holidays.tsx            ← Holiday calendar + admin CRUD
    │   ├── MyTeam.tsx              ← Team members by role
    │   ├── EmployeesReport.tsx
    │   └── LateArrivals.tsx        ← (removed from sidebar, kept as file)
    ├── reports/
    │   ├── TeamReport.tsx
    │   ├── GeneralReport.tsx
    │   ├── LeadInsights.tsx        ← Culprit detection dashboard
    │   ├── PersonDetail.tsx        ← Drill-down into any employee
    │   └── GhostEmployees.tsx      ← Inactive account detection
    ├── leaves/
    │   ├── MyLeaves.tsx
    │   ├── ApplyLeave.tsx
    │   └── PendingLeaves.tsx
    ├── profiles/
    │   ├── MyProfile.tsx           ← Edit profile + education + teams + password
    │   ├── EmployeeList.tsx
    │   ├── ContactDirectory.tsx
    │   └── BloodGroup.tsx
    ├── resource/
    │   ├── ResourceAllocation.tsx  ← Heatmap by person
    │   └── ProjectAllocation.tsx   ← Heatmap by project
    ├── manage/
    │   ├── Teams.tsx, Programs.tsx, Projects.tsx, SubProjects.tsx, Workstreams.tsx
    │   ├── DeviceManagement.tsx    ← ZKTeco configuration
    │   └── ChangeRequests.tsx      ← Profile change approvals
    ├── users/
    │   └── UserList.tsx
    └── settings/
        └── ResetPassword.tsx
```

---

## 8. How to Add a New Feature

Example: Add a "Bonus Tracker" feature.

### Step 1: Database (if needed)
```prisma
// Add to prisma/schema.prisma:
model Bonus {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  amount    Decimal  @db.Decimal(10, 2)
  reason    String?  @db.Text
  month     Int      @db.SmallInt
  year      Int      @db.SmallInt
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])
  @@map("bonuses")
}

// Then run:
npx prisma db push
npx prisma generate
```

### Step 2: Backend Service
```typescript
// Create: backend-nest/src/bonus/bonus.service.ts
@Injectable()
export class BonusService {
  constructor(private prisma: PrismaService) {}

  findByUser(userId: number) {
    return this.prisma.bonus.findMany({ where: { userId } });
  }

  create(data: { userId: number; amount: number; reason: string; month: number; year: number }) {
    return this.prisma.bonus.create({ data });
  }
}
```

### Step 3: Backend Controller
```typescript
// Create: backend-nest/src/bonus/bonus.controller.ts
@Controller('bonuses')
@UseGuards(JwtAuthGuard)
export class BonusController {
  constructor(private bonusService: BonusService) {}

  @Get()
  findByUser(@Query('userId') userId: string) {
    return this.bonusService.findByUser(+userId);
  }

  @Post()
  create(@Body() body: any) {
    return this.bonusService.create(body);
  }
}
```

### Step 4: Backend Module
```typescript
// Create: backend-nest/src/bonus/bonus.module.ts
@Module({
  controllers: [BonusController],
  providers: [BonusService],
})
export class BonusModule {}

// Add to app.module.ts imports array
```

### Step 5: Frontend API
```typescript
// Add to frontend/src/api/bonus.ts
import apiClient from './client';

export const getBonuses = (userId: number) =>
  apiClient.get('/bonuses', { params: { userId } }).then(r => r.data);

export const createBonus = (data: any) =>
  apiClient.post('/bonuses', data).then(r => r.data);
```

### Step 6: Frontend Page
```typescript
// Create: frontend/src/pages/bonus/BonusList.tsx
export default function BonusList() {
  const user = useAuthStore((s) => s.user);
  const { data } = useQuery({
    queryKey: ['bonuses', user?.id],
    queryFn: () => getBonuses(user!.id),
  });

  return (
    <div>
      <div className="page-heading">My Bonuses</div>
      {/* render data */}
    </div>
  );
}
```

### Step 7: Add Route + Sidebar
```typescript
// App.tsx: Add route
<Route path="my/bonuses" element={<BonusList />} />

// Sidebar.tsx: Add menu item
{ key: '/my/bonuses', icon: <DollarOutlined />, label: 'Bonuses' },
```

---

## 9. Common Patterns

### Pattern: Page with Server-Side Search
```typescript
const [search, setSearch] = useState('');
const { data } = useQuery({
  queryKey: ['items', search],
  queryFn: () => getItems(search),
});
```

### Pattern: Form with Submit
```typescript
const [form] = Form.useForm();
const mutation = useMutation({ mutationFn: createItem, onSuccess: () => message.success('Done!') });
<Form form={form} onFinish={(values) => mutation.mutate(values)}>
  <Form.Item name="field"><Input /></Form.Item>
  <Button htmlType="submit">Save</Button>
</Form>
```

### Pattern: Table with Filters
```typescript
<div className="page-header">
  <div className="page-title">Items ({data?.length})</div>
  <div className="page-filters">
    <Input prefix={<SearchOutlined />} onChange={e => setSearch(e.target.value)} />
    <Select onChange={setFilter} options={...} />
  </div>
</div>
<table>...</table>
```

### Pattern: Role-Based Sidebar
```typescript
const isLead = user?.roles?.some(r => ['Team Lead', 'Admin'].includes(r.name));
const items = [
  { key: '/my/timesheet', label: 'Timesheet' }, // Everyone
  ...(isLead ? [{ key: '/admin/approvals', label: 'Approvals' }] : []), // Leads only
];
```

---

## 10. Debugging

### Backend not responding:
```bash
cd backend-nest
npm run dev    # Check for errors in terminal
```

### Frontend not showing data:
1. Open browser → F12 → Console tab → check for red errors
2. F12 → Network tab → check if API calls return 200 or error
3. If 401 → token expired, clear localStorage

### Prisma errors:
```bash
cd backend-nest
npx prisma studio    # Opens visual DB browser at localhost:5555
```

### Check database directly:
```bash
cd backend-nest
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const count = await p.user.count();
  console.log('Users:', count);
  await p.\$disconnect();
})();
"
```

---

## Quick Reference

| Task | Command |
|---|---|
| Start everything | `cd frontend && npm run dev` |
| Backend only | `cd backend-nest && npm run dev` |
| Frontend only | `cd frontend && npx vite` |
| Build frontend | `cd frontend && npx vite build` |
| Check TypeScript | `npx tsc --noEmit` |
| Open DB browser | `cd backend-nest && npx prisma studio` |
| Update DB schema | `cd backend-nest && npx prisma db push` |
| Regenerate types | `cd backend-nest && npx prisma generate` |

---

*This guide covers the architecture as of March 31, 2026. The app has 30 database tables, 60+ API endpoints, and 35+ frontend pages.*
