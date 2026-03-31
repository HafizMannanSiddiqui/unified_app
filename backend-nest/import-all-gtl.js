/**
 * FULL RE-IMPORT of all GTL time entries from time_logger.sql
 *
 * 1. Wipes all existing time_entries
 * 2. Parses every row from old `data` table
 * 3. Maps old user_id → real username via old users table + aliasInfo
 * 4. Maps legacy program/project/subproject/wbs/team IDs
 * 5. Inserts everything fresh
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function parseValues(sqlLine) {
  // Parse a VALUES line containing multiple (...)  tuples
  const rows = [];
  let i = sqlLine.indexOf('(');

  while (i !== -1 && i < sqlLine.length) {
    // Find matching closing paren, handling quoted strings
    let j = i + 1;
    let inQuote = false;
    let depth = 1;

    while (j < sqlLine.length && depth > 0) {
      const ch = sqlLine[j];
      if (ch === "'" && !inQuote) {
        inQuote = true;
      } else if (ch === "'" && inQuote) {
        // Check for escaped quote ''
        if (j + 1 < sqlLine.length && sqlLine[j + 1] === "'") {
          j++; // skip escaped quote
        } else {
          inQuote = false;
        }
      } else if (!inQuote) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
      j++;
    }

    // Extract the content between ( and )
    const content = sqlLine.substring(i + 1, j - 1);
    rows.push(content);

    // Find next (
    i = sqlLine.indexOf('(', j);
  }

  return rows;
}

function parseRow(content) {
  // Parse comma-separated values, respecting quotes
  const values = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === "'" && !inQuote) {
      inQuote = true;
    } else if (ch === "'" && inQuote) {
      if (i + 1 < content.length && content[i + 1] === "'") {
        current += "'";
        i++;
      } else {
        inQuote = false;
      }
    } else if (ch === ',' && !inQuote) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());

  return values.map(v => {
    if (v === 'NULL') return null;
    if (v.startsWith("'") && v.endsWith("'")) return v;
    return v;
  });
}

async function main() {
  console.log('=== FULL GTL Data Import ===\n');

  const sql = fs.readFileSync(path.join(__dirname, '../../time_logger.sql'), 'utf-8');

  // ── Step 1: Parse old GTL users ──
  console.log('Parsing old GTL users...');
  const oldIdToUsername = new Map();

  // Find all user INSERT blocks
  let searchFrom = 0;
  while (true) {
    const idx = sql.indexOf("INSERT INTO `users`", searchFrom);
    if (idx === -1) break;
    const endIdx = sql.indexOf(';\n', idx);
    const block = sql.substring(idx, endIdx > -1 ? endIdx : idx + 50000);

    const rows = parseValues(block);
    for (const row of rows) {
      const vals = parseRow(row);
      // (Id, firstname, lastname, username, email, as_username, ...)
      if (vals.length >= 6) {
        const oldId = parseInt(vals[0]);
        const asUsername = vals[5]; // as_username
        if (asUsername && !isNaN(oldId)) {
          oldIdToUsername.set(oldId, asUsername);
        }
      }
    }
    searchFrom = (endIdx > -1 ? endIdx : idx) + 1;
  }
  console.log(`  Found ${oldIdToUsername.size} old GTL users`);

  // ── Step 2: Build mapping tables ──
  console.log('Building lookup maps...');

  // New DB users with aliasInfo
  const newUsers = await prisma.user.findMany({ select: { id: true, username: true, aliasInfo: true, teamId: true } });

  // alias_username → new_user
  const aliasToNew = new Map();
  const usernameToNew = new Map();
  for (const u of newUsers) {
    usernameToNew.set(u.username, u);
    if (u.aliasInfo && u.aliasInfo.username) {
      aliasToNew.set(u.aliasInfo.username, u);
    }
  }

  // old_gtl_id → new_user
  const oldIdToNewUser = new Map();
  let matched = 0, unmatched = 0;
  for (const [oldId, alias] of oldIdToUsername) {
    const newUser = aliasToNew.get(alias) || usernameToNew.get(alias);
    if (newUser) {
      oldIdToNewUser.set(oldId, newUser);
      matched++;
    } else {
      unmatched++;
    }
  }
  console.log(`  User mapping: ${matched} matched, ${unmatched} unmatched`);

  // Legacy ID maps
  const programs = await prisma.program.findMany();
  const projects = await prisma.project.findMany();
  const subProjects = await prisma.subProject.findMany();
  const wbsList = await prisma.wbs.findMany();
  const teams = await prisma.team.findMany();

  const programMap = new Map();
  for (const p of programs) { if (p.legacyProgramId) programMap.set(p.legacyProgramId, p.id); }
  const projectMap = new Map();
  for (const p of projects) { if (p.legacyProjectId) projectMap.set(p.legacyProjectId, p.id); }
  const subProjectMap = new Map();
  for (const p of subProjects) { if (p.legacySubProjectId) subProjectMap.set(p.legacySubProjectId, p.id); }
  const wbsMap = new Map();
  for (const w of wbsList) { if (w.legacyWbsId !== null) wbsMap.set(String(w.legacyWbsId), w.id); }
  const teamMap = new Map();
  for (const t of teams) { if (t.legacyTeamId) teamMap.set(t.legacyTeamId, t.id); }

  console.log(`  ${programMap.size} programs, ${projectMap.size} projects, ${subProjectMap.size} subProjects, ${wbsMap.size} wbs, ${teamMap.size} teams`);

  // Approver mapping: old GTL stores approver as username string
  const approverMap = new Map(); // alias_username → new_user_id
  for (const [alias, newUser] of aliasToNew) { approverMap.set(alias, newUser.id); }
  for (const [uname, newUser] of usernameToNew) { approverMap.set(uname, newUser.id); }

  // ── Step 3: Parse ALL data entries ──
  console.log('\nParsing data entries...');
  const entries = [];
  let skippedUser = 0, skippedProgram = 0;

  searchFrom = 0;
  while (true) {
    const idx = sql.indexOf("INSERT INTO `data`", searchFrom);
    if (idx === -1) break;
    const endIdx = sql.indexOf(';\n', idx);
    const block = sql.substring(idx, endIdx > -1 ? endIdx : sql.length);

    const rows = parseValues(block);
    for (const row of rows) {
      const v = parseRow(row);
      // (Id, user_id, program_id, team_id, project_id, sub_project_id, work_type, product_phase, date, description, wbs_id, hours, approver, status, created_at, updated_at)
      if (v.length < 14) continue;

      const oldUserId = parseInt(v[1]);
      const newUser = oldIdToNewUser.get(oldUserId);
      if (!newUser) { skippedUser++; continue; }

      const programId = programMap.get(v[2]);
      if (!programId) { skippedProgram++; continue; }

      const projectId = projectMap.get(v[4]) || null;
      const subProjectId = subProjectMap.get(v[5]) || null;
      const wbsId = wbsMap.get(v[10]) || null;
      const teamId = teamMap.get(v[3]) || newUser.teamId || null;

      let productPhase = null;
      const pp = (v[7] || '').toLowerCase();
      if (pp.includes('rnd') || pp.includes('r&d') || pp.includes('proto')) productPhase = 'rnd';
      else if (pp.includes('prod')) productPhase = 'production';

      let desc = v[9] || '';
      desc = desc.replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      const approverUsername = v[12] || '';
      const approverId = approverMap.get(approverUsername) || null;

      entries.push({
        userId: newUser.id,
        programId,
        teamId,
        projectId,
        subProjectId,
        workType: parseInt(v[6]) || 1,
        productPhase,
        entryDate: new Date(v[8]),
        description: desc || null,
        wbsId,
        hours: parseFloat(v[11]) || 0,
        approverId,
        status: parseInt(v[13]) || 0,
      });
    }
    searchFrom = (endIdx > -1 ? endIdx : idx) + 1;
  }

  console.log(`  Parsed: ${entries.length} entries ready to insert`);
  console.log(`  Skipped (no user match): ${skippedUser}`);
  console.log(`  Skipped (no program match): ${skippedProgram}`);

  // ── Step 4: Wipe and insert ──
  if (entries.length > 0) {
    console.log('\nClearing existing time entries...');
    await prisma.timeEntry.deleteMany({});

    console.log(`Inserting ${entries.length} entries...`);
    const BATCH = 1000;
    let inserted = 0;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const result = await prisma.timeEntry.createMany({ data: batch, skipDuplicates: true });
      inserted += result.count;
      process.stdout.write(`  ${inserted}/${entries.length}\r`);
    }
    console.log(`\nInserted: ${inserted} entries`);
  }

  // ── Step 5: Verify ──
  console.log('\n=== Verification ===');
  const testUsers = ['abdul.mannan', 'm.sumair', 'junaid.khalil'];
  for (const uname of testUsers) {
    const u = await prisma.user.findFirst({ where: { username: uname }, select: { id: true } });
    if (u) {
      const count = await prisma.timeEntry.count({ where: { userId: u.id } });
      console.log(`${uname}: ${count} entries`);
    }
  }

  const total = await prisma.timeEntry.count();
  const users = await prisma.$queryRaw`SELECT COUNT(DISTINCT user_id) as c FROM time_entries`;
  console.log(`\nTotal: ${total} entries across ${users[0].c} users`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
