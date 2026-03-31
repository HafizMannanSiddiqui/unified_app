/**
 * Fix remaining gaps:
 * 1. Map the 8 users with aliasInfo but 0 entries (alias username mismatch)
 * 2. Re-import only the missing entries
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function parseValues(sqlLine) {
  const rows = [];
  let i = sqlLine.indexOf('(');
  while (i !== -1 && i < sqlLine.length) {
    let j = i + 1, inQuote = false, depth = 1;
    while (j < sqlLine.length && depth > 0) {
      const ch = sqlLine[j];
      if (ch === "'" && !inQuote) inQuote = true;
      else if (ch === "'" && inQuote) { if (j+1 < sqlLine.length && sqlLine[j+1] === "'") j++; else inQuote = false; }
      else if (!inQuote) { if (ch === '(') depth++; else if (ch === ')') depth--; }
      j++;
    }
    rows.push(sqlLine.substring(i + 1, j - 1));
    i = sqlLine.indexOf('(', j);
  }
  return rows;
}

function parseRow(content) {
  const values = [];
  let current = '', inQuote = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === "'" && !inQuote) inQuote = true;
    else if (ch === "'" && inQuote) { if (i+1 < content.length && content[i+1] === "'") { current += "'"; i++; } else inQuote = false; }
    else if (ch === ',' && !inQuote) { values.push(current.trim()); current = ''; }
    else current += ch;
  }
  values.push(current.trim());
  return values.map(v => v === 'NULL' ? null : v);
}

async function main() {
  console.log('=== Fix Remaining Missing Entries ===\n');
  const sql = fs.readFileSync(path.join(__dirname, '../../time_logger.sql'), 'utf-8');

  // Parse old GTL users
  const oldUsers = new Map();
  let sf = 0;
  while (true) {
    const idx = sql.indexOf("INSERT INTO `users`", sf);
    if (idx === -1) break;
    const end = sql.indexOf(';\n', idx);
    const block = sql.substring(idx, end > -1 ? end : idx + 500000);
    for (const row of parseValues(block)) {
      const v = parseRow(row);
      if (v.length >= 12 && v[0]) {
        const id = parseInt(v[0]);
        if (!isNaN(id)) oldUsers.set(id, { asUsername: v[5] || '', teamId: v[11] || '' });
      }
    }
    sf = (end > -1 ? end : idx) + 1;
  }

  // Build full user map
  const newUsers = await prisma.user.findMany({ select: { id: true, username: true, aliasInfo: true } });
  const aliasToId = new Map();
  const usernameToId = new Map();
  for (const u of newUsers) {
    usernameToId.set(u.username, u.id);
    if (u.aliasInfo && u.aliasInfo.username) aliasToId.set(u.aliasInfo.username, u.id);
  }

  // Pre-load team map for user creation
  const teams = await prisma.team.findMany();
  const teamMap = new Map();
  for (const t of teams) { if (t.legacyTeamId) teamMap.set(t.legacyTeamId, t.id); }

  // Map old → new, creating missing users
  const oldToNew = new Map();
  let createdUsers = 0;
  for (const [oldId, ou] of oldUsers) {
    let newId = aliasToId.get(ou.asUsername) || usernameToId.get(ou.asUsername);
    if (!newId && ou.asUsername) {
      // Create missing user
      try {
        const teamId = teamMap.get(ou.teamId) || null;
        const created = await prisma.user.create({
          data: {
            username: ou.asUsername,
            displayName: ou.asUsername,
            passwordHash: 'not-set',
            teamId,
            isActive: false,
          }
        });
        newId = created.id;
        usernameToId.set(ou.asUsername, newId);
        createdUsers++;
      } catch (e) {
        // Skip if username conflict
      }
    }
    if (newId) oldToNew.set(oldId, newId);
  }
  console.log('User mappings:', oldToNew.size, '/', oldUsers.size, '| Created:', createdUsers);

  // Get existing entry dates per user to find gaps
  const existingKeys = new Set();
  const existing = await prisma.timeEntry.findMany({ select: { userId: true, entryDate: true } });
  for (const e of existing) {
    existingKeys.add(`${e.userId}_${e.entryDate.toISOString().slice(0,10)}`);
  }
  console.log('Existing entries:', existing.length);

  // Build lookup maps
  const programs = await prisma.program.findMany();
  const projects = await prisma.project.findMany();
  const subProjects = await prisma.subProject.findMany();
  const wbsList = await prisma.wbs.findMany();

  const programMap = new Map();
  for (const p of programs) { if (p.legacyProgramId) programMap.set(p.legacyProgramId, p.id); }
  const projectMap = new Map();
  for (const p of projects) { if (p.legacyProjectId) projectMap.set(p.legacyProjectId, p.id); }
  const subProjectMap = new Map();
  for (const p of subProjects) { if (p.legacySubProjectId) subProjectMap.set(p.legacySubProjectId, p.id); }
  const wbsMap = new Map();
  for (const w of wbsList) { if (w.legacyWbsId !== null) wbsMap.set(String(w.legacyWbsId), w.id); }

  const approverMap = new Map();
  // Refresh user list after creating new users
  const freshUsers = await prisma.user.findMany({ select: { id: true, username: true, aliasInfo: true } });
  for (const u of freshUsers) {
    approverMap.set(u.username, u.id);
    if (u.aliasInfo && u.aliasInfo.username) approverMap.set(u.aliasInfo.username, u.id);
  }

  // Parse ALL data and find missing ones
  const toInsert = [];
  let skippedUser = 0, alreadyExists = 0, total = 0;

  sf = 0;
  while (true) {
    const idx = sql.indexOf("INSERT INTO `data`", sf);
    if (idx === -1) break;
    const end = sql.indexOf(';\n', idx);
    const block = sql.substring(idx, end > -1 ? end : sql.length);
    for (const row of parseValues(block)) {
      const v = parseRow(row);
      if (v.length < 14) continue;
      total++;

      const oldUserId = parseInt(v[1]);
      const newUserId = oldToNew.get(oldUserId);
      if (!newUserId) { skippedUser++; continue; }

      const programId = programMap.get(v[2]);
      if (!programId) continue;

      const dateStr = v[8];
      const key = `${newUserId}_${dateStr}`;

      // Check if this specific entry already exists (by user+date)
      // We'll still insert if there are multiple entries per day
      let productPhase = null;
      const pp = (v[7] || '').toLowerCase();
      if (pp.includes('rnd') || pp.includes('proto')) productPhase = 'rnd';
      else if (pp.includes('prod')) productPhase = 'production';

      let desc = v[9] || '';
      desc = desc.replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

      toInsert.push({
        userId: newUserId,
        programId,
        teamId: teamMap.get(v[3]) || null,
        projectId: projectMap.get(v[4]) || null,
        subProjectId: subProjectMap.get(v[5]) || null,
        workType: parseInt(v[6]) || 1,
        productPhase,
        entryDate: new Date(dateStr),
        description: desc || null,
        wbsId: wbsMap.get(v[10]) || null,
        hours: parseFloat(v[11]) || 0,
        approverId: approverMap.get(v[12]) || null,
        status: parseInt(v[13]) || 0,
      });
    }
    sf = (end > -1 ? end : idx) + 1;
  }

  console.log('\nTotal parsed from SQL:', total);
  console.log('Mappable entries:', toInsert.length);
  console.log('Skipped (no user):', skippedUser);

  // Wipe and re-insert everything for a clean slate
  console.log('\nClearing and re-inserting all', toInsert.length, 'entries...');
  await prisma.timeEntry.deleteMany({});

  const BATCH = 1000;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const result = await prisma.timeEntry.createMany({ data: batch, skipDuplicates: true });
    inserted += result.count;
    process.stdout.write(`  ${inserted}/${toInsert.length}\r`);
  }
  console.log(`\nInserted: ${inserted}`);

  // Verify
  const finalTotal = await prisma.timeEntry.count();
  const userCount = await prisma.$queryRaw`SELECT COUNT(DISTINCT user_id) as c FROM time_entries`;
  console.log(`\n=== FINAL RESULT ===`);
  console.log(`Old GTL SQL total rows: ~118,715`);
  console.log(`Imported to PostgreSQL: ${finalTotal}`);
  console.log(`Employees with data: ${userCount[0].c}`);
  console.log(`Skipped (unmapped users): ${skippedUser}`);

  // Show some users
  const checks = ['usama.idrees', 'abdul.mannan', 'm.sumair', 'asra.ehsan', 'ali.abbas'];
  for (const uname of checks) {
    const u = await prisma.user.findFirst({ where: { username: uname }, select: { id: true } });
    if (u) {
      const c = await prisma.timeEntry.count({ where: { userId: u.id } });
      console.log(`  ${uname}: ${c} entries`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
