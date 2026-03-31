/**
 * FULL RE-IMPORT v2 — matches ALL possible users via:
 *   1. aliasInfo.username (exact)
 *   2. Direct username match
 *   3. Email prefix match
 *   4. Display name match (asFirstName + asLastName)
 *   5. asUsername exists directly in new DB
 *   6. Creates missing users for any remaining
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

function normalize(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim(); }

async function main() {
  console.log('=== FULL GTL Import v2 (match ALL users) ===\n');
  const sql = fs.readFileSync(path.join(__dirname, '../../time_logger.sql'), 'utf-8');

  // ── Parse old GTL users ──
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
        if (!isNaN(id)) {
          oldUsers.set(id, {
            oldId: id, asUsername: v[5] || '', asFirstName: v[6] || '', asLastName: v[7] || '',
            asEmail: v[8] || '', teamId: v[11] || ''
          });
        }
      }
    }
    sf = (end > -1 ? end : idx) + 1;
  }
  console.log('Old GTL users:', oldUsers.size);

  // ── Load new DB users ──
  const newUsers = await prisma.user.findMany({
    select: { id: true, username: true, email: true, displayName: true, firstName: true, lastName: true, aliasInfo: true, teamId: true }
  });

  // Build multiple lookup maps
  const byAlias = new Map();    // alias username → new user
  const byUsername = new Map();  // username → new user
  const byEmail = new Map();     // email prefix → new user
  const byName = new Map();      // normalized "firstname lastname" → new user
  const byNormUser = new Map();  // normalized username → new user

  for (const u of newUsers) {
    byUsername.set(u.username, u);
    byNormUser.set(normalize(u.username), u);
    if (u.aliasInfo && u.aliasInfo.username) byAlias.set(u.aliasInfo.username, u);
    if (u.email) byEmail.set(u.email.split('@')[0].toLowerCase(), u);
    if (u.displayName) byName.set(normalize(u.displayName), u);
    if (u.firstName && u.lastName) byName.set(normalize(u.firstName + u.lastName), u);
  }

  // ── Map old → new with multiple strategies ──
  const oldToNew = new Map();
  const toCreate = [];
  let stats = { alias: 0, direct: 0, email: 0, name: 0, normUser: 0, created: 0 };

  // Load team map for creating users
  const teams = await prisma.team.findMany();
  const teamMap = new Map();
  for (const t of teams) { if (t.legacyTeamId) teamMap.set(t.legacyTeamId, t.id); }

  for (const [oldId, ou] of oldUsers) {
    let newUser = null;
    let method = '';

    // 1. aliasInfo match
    newUser = byAlias.get(ou.asUsername);
    if (newUser) { method = 'alias'; stats.alias++; }

    // 2. Direct username match
    if (!newUser) { newUser = byUsername.get(ou.asUsername); if (newUser) { method = 'direct'; stats.direct++; } }

    // 3. Email prefix match
    if (!newUser && ou.asEmail) {
      const prefix = ou.asEmail.split('@')[0].toLowerCase();
      newUser = byEmail.get(prefix);
      if (newUser) { method = 'email'; stats.email++; }
    }

    // 4. Name match
    if (!newUser) {
      const name = normalize(ou.asFirstName + ou.asLastName);
      if (name.length > 3) {
        newUser = byName.get(name);
        if (newUser) { method = 'name'; stats.name++; }
      }
    }

    // 5. Normalized username match (remove dots, dashes)
    if (!newUser) {
      newUser = byNormUser.get(normalize(ou.asUsername));
      if (newUser) { method = 'normUser'; stats.normUser++; }
    }

    if (newUser) {
      oldToNew.set(oldId, newUser.id);
    } else if (ou.asUsername) {
      // 6. Create missing user
      toCreate.push(ou);
    }
  }

  console.log('\nMatching results:');
  console.log('  By aliasInfo:', stats.alias);
  console.log('  By direct username:', stats.direct);
  console.log('  By email prefix:', stats.email);
  console.log('  By display name:', stats.name);
  console.log('  By normalized username:', stats.normUser);
  console.log('  Total matched:', oldToNew.size);
  console.log('  Need to create:', toCreate.length);

  // Create missing users
  if (toCreate.length > 0) {
    console.log('\nCreating missing users...');
    for (const ou of toCreate) {
      const teamId = teamMap.get(ou.teamId) || null;
      const displayName = (ou.asFirstName + ' ' + ou.asLastName).trim() || ou.asUsername;
      try {
        const created = await prisma.user.create({
          data: {
            username: ou.asUsername,
            email: ou.asEmail || null,
            displayName,
            firstName: ou.asFirstName || null,
            lastName: ou.asLastName || null,
            passwordHash: 'not-set',
            teamId,
            isActive: false,
          }
        });
        oldToNew.set(ou.oldId, created.id);
        stats.created++;
      } catch (e) {
        // Username conflict — try with suffix
        try {
          const created = await prisma.user.create({
            data: {
              username: ou.asUsername + '.gtl',
              email: null,
              displayName,
              passwordHash: 'not-set',
              teamId,
              isActive: false,
            }
          });
          oldToNew.set(ou.oldId, created.id);
          stats.created++;
        } catch (e2) {
          console.log('  SKIP: Could not create', ou.asUsername, e2.message?.slice(0, 60));
        }
      }
    }
    console.log('  Created:', stats.created, 'users');
  }

  console.log('\nFinal mapped:', oldToNew.size, '/', oldUsers.size);

  // ── Build legacy ID maps ──
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

  // Approver map
  const approverMap = new Map();
  const freshUsers = await prisma.user.findMany({ select: { id: true, username: true, aliasInfo: true } });
  for (const u of freshUsers) {
    approverMap.set(u.username, u.id);
    if (u.aliasInfo && u.aliasInfo.username) approverMap.set(u.aliasInfo.username, u.id);
  }

  // ── Parse ALL data entries ──
  console.log('\nParsing data entries...');
  const entries = [];
  let skippedUser = 0, skippedProgram = 0;

  sf = 0;
  while (true) {
    const idx = sql.indexOf("INSERT INTO `data`", sf);
    if (idx === -1) break;
    const end = sql.indexOf(';\n', idx);
    const block = sql.substring(idx, end > -1 ? end : sql.length);
    for (const row of parseValues(block)) {
      const v = parseRow(row);
      if (v.length < 14) continue;
      const oldUserId = parseInt(v[1]);
      const newUserId = oldToNew.get(oldUserId);
      if (!newUserId) { skippedUser++; continue; }
      const programId = programMap.get(v[2]);
      if (!programId) { skippedProgram++; continue; }

      let productPhase = null;
      const pp = (v[7] || '').toLowerCase();
      if (pp.includes('rnd') || pp.includes('proto')) productPhase = 'rnd';
      else if (pp.includes('prod')) productPhase = 'production';

      let desc = v[9] || '';
      desc = desc.replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      entries.push({
        userId: newUserId,
        programId,
        teamId: teamMap.get(v[3]) || null,
        projectId: projectMap.get(v[4]) || null,
        subProjectId: subProjectMap.get(v[5]) || null,
        workType: parseInt(v[6]) || 1,
        productPhase,
        entryDate: new Date(v[8]),
        description: desc || null,
        wbsId: wbsMap.get(v[10]) || null,
        hours: parseFloat(v[11]) || 0,
        approverId: approverMap.get(v[12]) || null,
        status: parseInt(v[13]) || 0,
      });
    }
    sf = (end > -1 ? end : idx) + 1;
  }

  console.log('Ready to insert:', entries.length);
  console.log('Skipped (no user):', skippedUser);
  console.log('Skipped (no program):', skippedProgram);

  // ── Wipe and insert ──
  console.log('\nClearing old data...');
  await prisma.timeEntry.deleteMany({});

  console.log('Inserting', entries.length, 'entries...');
  const BATCH = 1000;
  let inserted = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const result = await prisma.timeEntry.createMany({ data: batch, skipDuplicates: true });
    inserted += result.count;
    process.stdout.write(`  ${inserted}/${entries.length}\r`);
  }
  console.log(`\nInserted: ${inserted}`);

  // ── Verify ──
  console.log('\n=== RESULTS ===');
  const total = await prisma.timeEntry.count();
  const userCount = await prisma.$queryRaw`SELECT COUNT(DISTINCT user_id) as c FROM time_entries`;
  console.log(`Total entries: ${total}`);
  console.log(`Total employees with data: ${userCount[0].c}`);

  const checks = ['abdul.mannan', 'm.sumair', 'junaid.khalil'];
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
