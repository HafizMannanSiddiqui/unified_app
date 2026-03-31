/**
 * Migrate ALL old GTL time entries (data table) to new PostgreSQL time_entries.
 *
 * Maps: old GTL user_id → old GTL as_username → new PostgreSQL user_id
 * Maps: legacy program/project/subproject/wbs IDs → new PostgreSQL IDs
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('=== GTL Data Migration ===\n');

  // 1. Read old GTL SQL dump
  const sqlPath = path.join(__dirname, '../../time_logger.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // 2. Extract old GTL users: map old_id → as_username
  //    Format: (Id, firstname, lastname, username, email, as_username, ...)
  const oldUserMap = new Map(); // old_id → as_username
  const userRegex = /\((\d+),\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)'/g;

  // Find the users INSERT block
  const usersInsertStart = sql.indexOf("INSERT INTO `users`");
  if (usersInsertStart === -1) { console.log('No users INSERT found'); return; }
  const usersBlock = sql.substring(usersInsertStart, sql.indexOf(';', usersInsertStart) + 1);

  let match;
  while ((match = userRegex.exec(usersBlock)) !== null) {
    const oldId = match[1];
    const asUsername = match[2];
    if (asUsername) {
      oldUserMap.set(oldId, asUsername);
    }
  }
  console.log(`Found ${oldUserMap.size} old GTL users`);

  // 3. Get new PostgreSQL users: username → new_id
  const newUsers = await prisma.user.findMany({ select: { id: true, username: true, teamId: true } });
  const newUserMap = new Map(); // username → { id, teamId }
  for (const u of newUsers) {
    newUserMap.set(u.username, { id: u.id, teamId: u.teamId });
  }
  console.log(`Found ${newUserMap.size} new PostgreSQL users`);

  // 4. Build lookup maps for programs, projects, sub_projects, wbs
  const programs = await prisma.program.findMany();
  const projects = await prisma.project.findMany();
  const subProjects = await prisma.subProject.findMany();
  const wbsList = await prisma.wbs.findMany();

  const programMap = new Map(); // legacy_id → new_id
  for (const p of programs) { if (p.legacyProgramId) programMap.set(p.legacyProgramId, p.id); }

  const projectMap = new Map();
  for (const p of projects) { if (p.legacyProjectId) projectMap.set(p.legacyProjectId, p.id); }

  const subProjectMap = new Map();
  for (const p of subProjects) { if (p.legacySubProjectId) subProjectMap.set(p.legacySubProjectId, p.id); }

  const wbsMap = new Map();
  for (const w of wbsList) { if (w.legacyWbsId !== null) wbsMap.set(String(w.legacyWbsId), w.id); }

  // Also map team legacy IDs
  const teams = await prisma.team.findMany();
  const teamMap = new Map();
  for (const t of teams) { if (t.legacyTeamId) teamMap.set(t.legacyTeamId, t.id); }

  console.log(`Maps: ${programMap.size} programs, ${projectMap.size} projects, ${subProjectMap.size} subProjects, ${wbsMap.size} wbs, ${teamMap.size} teams`);

  // 5. Extract old data entries
  //    Format: (Id, user_id, program_id, team_id, project_id, sub_project_id, work_type, product_phase, date, description, wbs_id, hours, approver, status, created_at, updated_at)
  const dataInsertStart = sql.indexOf("INSERT INTO `data`");
  if (dataInsertStart === -1) { console.log('No data INSERT found'); return; }
  const dataBlock = sql.substring(dataInsertStart, sql.indexOf(';\n', dataInsertStart) + 1);

  // Parse entries using a more robust approach
  const entries = [];
  const entryRegex = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(?:'([^']*)'|NULL),\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*([\d.]+),\s*'([^']*)',\s*(\d+)/g;

  while ((match = entryRegex.exec(dataBlock)) !== null) {
    entries.push({
      oldId: parseInt(match[1]),
      oldUserId: match[2],
      oldProgramId: match[3],
      oldTeamId: match[4],
      oldProjectId: match[5],
      oldSubProjectId: match[6],
      workType: parseInt(match[7]),
      productPhase: match[8] || null,
      entryDate: match[9],
      description: match[10],
      wbsId: match[11],
      hours: parseFloat(match[12]),
      approver: match[13],
      status: parseInt(match[14]),
    });
  }
  console.log(`Parsed ${entries.length} old data entries`);

  // 6. Check existing time entries to avoid duplicates
  const existingCount = await prisma.timeEntry.count();
  console.log(`Existing time entries in DB: ${existingCount}`);

  // 7. Map and prepare entries for insert
  let mapped = 0, skipped = 0, unmatchedUsers = new Set();
  const toInsert = [];

  for (const e of entries) {
    // Map old user_id → as_username → new user_id
    const asUsername = oldUserMap.get(e.oldUserId);
    if (!asUsername) { skipped++; continue; }

    // Try exact match first, then common variations
    let newUser = newUserMap.get(asUsername);
    if (!newUser) {
      // Try without dots, with different formats
      for (const [uname, udata] of newUserMap) {
        if (uname.replace(/[._-]/g, '').toLowerCase() === asUsername.replace(/[._-]/g, '').toLowerCase()) {
          newUser = udata;
          break;
        }
      }
    }
    if (!newUser) {
      unmatchedUsers.add(asUsername);
      skipped++;
      continue;
    }

    const programId = programMap.get(e.oldProgramId);
    if (!programId) { skipped++; continue; }

    const projectId = projectMap.get(e.oldProjectId) || null;
    const subProjectId = subProjectMap.get(e.oldSubProjectId) || null;
    const wbsId = wbsMap.get(e.wbsId) || null;
    const teamId = teamMap.get(e.oldTeamId) || newUser.teamId || null;

    // Map product phase
    let productPhase = null;
    if (e.productPhase) {
      const pp = e.productPhase.toLowerCase();
      if (pp.includes('rnd') || pp.includes('r&d') || pp.includes('proto')) productPhase = 'rnd';
      else if (pp.includes('prod')) productPhase = 'production';
    }

    // Map approver
    let approverId = null;
    if (e.approver && e.status === 1) {
      const approverUser = newUserMap.get(e.approver);
      if (approverUser) approverId = approverUser.id;
    }

    // Unescape HTML entities in description
    let desc = e.description || '';
    desc = desc.replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    toInsert.push({
      userId: newUser.id,
      programId,
      teamId,
      projectId,
      subProjectId,
      workType: e.workType,
      productPhase,
      entryDate: new Date(e.entryDate),
      description: desc || null,
      wbsId,
      hours: e.hours,
      approverId,
      status: e.status,
    });
    mapped++;
  }

  console.log(`\nMapping results:`);
  console.log(`  Mapped: ${mapped}`);
  console.log(`  Skipped: ${skipped}`);
  if (unmatchedUsers.size > 0) {
    console.log(`  Unmatched usernames (${unmatchedUsers.size}): ${[...unmatchedUsers].slice(0, 20).join(', ')}`);
  }

  // 8. Delete existing entries and insert fresh (to avoid duplicates from partial runs)
  if (toInsert.length > 0) {
    console.log(`\nClearing existing time entries...`);
    await prisma.timeEntry.deleteMany({});

    console.log(`Inserting ${toInsert.length} entries in batches...`);
    const BATCH = 1000;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const result = await prisma.timeEntry.createMany({ data: batch, skipDuplicates: true });
      inserted += result.count;
      process.stdout.write(`  ${inserted}/${toInsert.length}\r`);
    }
    console.log(`\nDone! Inserted ${inserted} time entries.`);
  }

  // 9. Verify
  const finalCount = await prisma.timeEntry.count();
  const userCounts = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT user_id) as users FROM time_entries`;
  console.log(`\nFinal: ${finalCount} entries across ${userCounts[0].users} users`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
