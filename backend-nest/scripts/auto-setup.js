/**
 * Auto-Setup Script
 *
 * This script runs automatically before the backend starts.
 * It does everything needed so the developer just runs "npm run dev".
 *
 * 1. Creates .env file if missing (with defaults)
 * 2. Creates the PostgreSQL database if it doesn't exist
 * 3. Runs prisma db push to create/sync all tables
 * 4. Runs prisma generate to create the Prisma client
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const ENV_EXAMPLE = `DATABASE_URL=postgresql://postgres:angular123@localhost:5433/unified_app
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=8h
PORT=4000
SWAGGER_USER=admin
SWAGGER_PASS=gtl@2026
`;

// ── Step 1: Create .env if missing ──
if (!fs.existsSync(ENV_PATH)) {
  console.log('[setup] No .env file found — creating with defaults...');
  fs.writeFileSync(ENV_PATH, ENV_EXAMPLE);
  console.log('[setup] Created .env with default config.');
  console.log('[setup] If your PostgreSQL has a different password or port, edit: backend-nest/.env');
}

// ── Step 2: Parse DATABASE_URL from .env (no dotenv dependency) ──
const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
});
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('[setup] ERROR: DATABASE_URL not set in .env');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(dbUrl);
} catch {
  console.error('[setup] ERROR: Invalid DATABASE_URL format:', dbUrl);
  process.exit(1);
}

const dbName = parsed.pathname.slice(1); // remove leading /
const user = parsed.username;
const password = parsed.password;
const host = parsed.hostname;
const port = parsed.port || '5432';

// ── Step 3: Create database if it doesn't exist ──
async function createDatabase() {
  let pg;
  try {
    pg = require('pg');
  } catch {
    console.log('[setup] Installing pg driver...');
    execSync('npm install pg --no-save --silent', { cwd: ROOT, stdio: 'pipe' });
    pg = require('pg');
  }

  // Connect to the default 'postgres' database to create our app database
  const adminUrl = `postgresql://${user}:${password}@${host}:${port}/postgres`;
  const client = new pg.Client({ connectionString: adminUrl });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rows.length === 0) {
      console.log(`[setup] Database '${dbName}' does not exist — creating...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[setup] Database '${dbName}' created successfully.`);
    } else {
      console.log(`[setup] Database '${dbName}' already exists.`);
    }
  } catch (err) {
    console.error(`[setup] WARNING: Could not auto-create database.`);
    console.error(`[setup] ${err.message}`);
    console.error(`[setup] Please create the database manually: CREATE DATABASE ${dbName};`);
    console.error(`[setup] Connection details: host=${host} port=${port} user=${user}`);
    // Don't exit — prisma db push will give a clearer error if the DB truly doesn't exist
  } finally {
    try { await client.end(); } catch {}
  }
}

// ── Step 4: Run Prisma setup ──
function runPrisma() {
  try {
    console.log('[setup] Syncing database tables (prisma db push)...');
    execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: dbUrl },
    });
    console.log('[setup] Database tables are in sync.');
  } catch (err) {
    const output = err.stdout?.toString() || err.stderr?.toString() || '';
    if (output.includes('already in sync') || output.includes('Your database is now in sync')) {
      console.log('[setup] Database tables are in sync.');
    } else {
      console.error('[setup] WARNING: prisma db push had issues:', output.slice(0, 500));
      console.error('[setup] Tables may not be created. Check your database connection.');
    }
  }

  try {
    console.log('[setup] Generating Prisma client...');
    execSync('npx prisma generate 2>&1', { cwd: ROOT, stdio: 'pipe' });
    console.log('[setup] Prisma client ready.');
  } catch (err) {
    const msg = err.stdout?.toString() || err.stderr?.toString() || err.message;
    if (msg.includes('EPERM') || msg.includes('operation not permitted')) {
      console.log('[setup] Prisma client already exists (file locked by running process — OK).');
    } else {
      console.error('[setup] WARNING: prisma generate issue:', msg.slice(0, 300));
    }
  }
}

// ── Run ──
async function main() {
  console.log('\n=== GTL & HRMS Auto-Setup ===\n');
  await createDatabase();
  runPrisma();
  console.log('\n=== Setup complete ===\n');
}

main().catch(err => {
  console.error('[setup] Unexpected error:', err.message);
  process.exit(1);
});
