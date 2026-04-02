# GTL & HRMS — Unified Platform

Unified **Global Time Logger (GTL)** and **Human Resource Management System (HRMS)** built with modern tech stack. Replaces two legacy PHP systems with a single, secure, role-based platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript) |
| Frontend | React 18 + Vite + Ant Design |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT + Argon2id password hashing |
| State | Zustand (persisted) + TanStack Query |
| Docs | Swagger (OpenAPI) at `/api/docs` |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd unified_app

# Install backend
cd backend-nest
npm install
cp .env.example .env   # Edit DATABASE_URL, JWT_SECRET

# Install frontend
cd ../frontend
npm install
```

### 2. Setup Database

```bash
cd backend-nest
npx prisma db push      # Creates all 34 tables
npx prisma generate     # Generates Prisma client
```

### 3. Run (Single Command)

```bash
cd frontend
npm run dev
```

This starts **both** backend (port 4000) and frontend (port 3002) using `concurrently`.

Open: **http://localhost:3002**

### 4. API Documentation

Open: **http://localhost:3002/api/docs**

Protected with Basic Auth (see console output for credentials).

## Project Structure

```
unified_app/
├── backend-nest/           # NestJS API
│   ├── src/
│   │   ├── auth/           # JWT login, password reset
│   │   ├── users/          # User CRUD, teams, managers
│   │   ├── attendance/     # Check-in/out, WFH, requests
│   │   ├── gtl/            # Time entries, approvals, reports
│   │   ├── leaves/         # Leave applications, balance
│   │   ├── profiles/       # Employee profiles, education
│   │   ├── teams/          # Team CRUD, sub-teams
│   │   ├── roles/          # Role management
│   │   └── common/         # Guards, helpers
│   └── prisma/
│       └── schema.prisma   # 34 tables
├── frontend/               # React SPA
│   ├── src/
│   │   ├── pages/          # 47 pages
│   │   ├── components/     # Layout, sidebar, header
│   │   ├── api/            # Axios API clients
│   │   ├── store/          # Zustand auth store
│   │   └── theme/          # Company theming
│   └── vite.config.ts      # Dev server + proxy
└── docs/                   # ERD, diagrams, plans
```

## Key Features

- **124 API endpoints** with Swagger documentation
- **Role-based access**: Employee → Team Lead → Admin → Super Admin
- **Multi-team, multi-lead**: Employee can be in multiple teams, report to multiple leads
- **Anti-gaming**: Hours from attendance only, 12h cap, missed checkout detection
- **4 company brands**: Dynamic theming (sidebar, buttons, headers)
- **Org Chart**: Tree, List, Department views
- **CV Generator**: Print/PDF from employee profiles

## Environment Variables

```env
# backend-nest/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/unified_app
JWT_SECRET=your-secret-key-min-64-chars
JWT_EXPIRES_IN=8h
PORT=4000
SWAGGER_USER=admin
SWAGGER_PASS=your-swagger-password
```

## Security

- Backend listens on `127.0.0.1` only (not externally accessible)
- All traffic through frontend proxy on port 3002
- JWT tokens expire after 8 hours
- Swagger docs password protected
- Sensitive data (phone, RFID) visible only to super admin
- Argon2id password hashing (auto-upgraded from legacy MD5)
