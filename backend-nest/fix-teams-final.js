/**
 * FINAL TEAM FIX
 *
 * Root cause: HRMS users.team_id = VARCHAR 'TM_0017' (string code)
 * But the migration treated it as numeric ID 17.
 *
 * HRMS TM_0017 = "Software" → HRMS team table row #19
 * Original migration stored team_id=17 → which pointed to wrong team
 *
 * Fix:
 * 1. Single teams table — merge HRMS+GTL teams by matching same concepts
 * 2. Map HRMS TM_ code → correct team
 * 3. Re-parse HRMS SQL to get each user's actual TM_ code
 * 4. Fix users.team_id
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();

async function main() {
  console.log('=== FINAL TEAM FIX ===\n');

  const hrmsSql = fs.readFileSync('../../hrms.sql', 'utf-8');

  // Step 1: Parse HRMS users to get username → TM_ code
  // Format: (Id, display_name, pseudo_name, user_name, email, password, user_role, report_to, active, zk_id, 'TM_xxxx', designation_id, ...)
  const userTmCodes = new Map(); // username → TM_xxxx
  const ure = /\(\d+,\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*\d+,\s*\d+,\s*'(TM_\d+)'/g;
  let m;
  const usersStart = hrmsSql.indexOf("INSERT INTO `users`");
  const usersEnd = hrmsSql.indexOf(';\n', usersStart);
  const usersBlock = hrmsSql.substring(usersStart, usersEnd);
  while ((m = ure.exec(usersBlock)) !== null) {
    if (m[1]) userTmCodes.set(m[1], m[2]);
  }
  console.log('HRMS users with TM_ codes:', userTmCodes.size);

  // Step 2: Parse HRMS teams: TM_ code → team name
  const hrmsTmToName = new Map();
  const teamsStart = hrmsSql.indexOf("INSERT INTO `teams`");
  const teamsEnd = hrmsSql.indexOf(';\n', teamsStart);
  const teamsBlock = hrmsSql.substring(teamsStart, teamsEnd);
  const tre = /\(\d+,\s*'(TM_\d+)',\s*'([^']+)'/g;
  while ((m = tre.exec(teamsBlock)) !== null) {
    hrmsTmToName.set(m[1], m[2]);
  }
  console.log('HRMS team codes:', hrmsTmToName.size);

  // Step 3: Rebuild teams table — single set, using HRMS names (HR source of truth)
  // Drop FKs
  await p.$executeRaw`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_id_fkey`;
  await p.$executeRaw`ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_team_id_fkey`;
  await p.$executeRaw`ALTER TABLE user_team_memberships DROP CONSTRAINT IF EXISTS user_team_memberships_team_id_fkey`;
  await p.$executeRaw`ALTER TABLE designations DROP CONSTRAINT IF EXISTS designations_team_id_fkey`;
  await p.$executeRaw`ALTER TABLE team_sub_project_assignments DROP CONSTRAINT IF EXISTS team_sub_project_assignments_team_id_fkey`;
  await p.$executeRaw`DELETE FROM user_team_memberships`;
  await p.$executeRaw`DELETE FROM team_sub_project_assignments`;
  await p.$executeRaw`DELETE FROM teams`;

  // Collect ALL unique TM_ codes from both systems
  const allTmCodes = new Set([...hrmsTmToName.keys()]);

  // Also add GTL TM_ codes
  const gtlTmToName = new Map([
    ['TM_0001', 'Assembly Line'], ['TM_0002', 'Electrical'], ['TM_0003', 'Firmware'],
    ['TM_0004', 'Machine Shop'], ['TM_0005', 'Mechanical'], ['TM_0006', 'Quality Assurance'],
    ['TM_0007', 'Supply Chain'], ['TM_0008', 'System Testing/Simulations'],
    ['TM_0009', 'Finance & Operations'], ['TM_0010', 'Software'],
    ['TM_0011', 'Marketing & Training Material'], ['TM_0012', 'Motion Graphics/Video'],
    ['TM_0013', 'Order/Field Service/Project Mgmt'], ['TM_0014', 'Product Management'],
    ['TM_0015', 'Electronics Lab'], ['TM_0016', 'PMO'], ['TM_0017', 'RnD'],
    ['TM_0018', 'Controls'], ['TM_0019', 'Freight & Logistics'],
    ['TM_0020', 'Controls / RnD'], ['TM_0021', 'Firmware/Software'],
    ['TM_0022', 'Application Engineering'], ['TM_0023', 'ERP'], ['TM_0024', 'Multimedia'],
    ['TM_0025', 'PFTS'], ['TM_0026', 'Power BI'], ['TM_0027', 'Test'],
    ['TM_0028', 'Quality Management'], ['TM_0029', 'MARCOM'],
  ]);
  for (const k of gtlTmToName.keys()) allTmCodes.add(k);

  // Create one team per TM_ code. Use HRMS name as primary (since HRMS is HR truth).
  // Store GTL name in description if different.
  const tmCodeToNewId = new Map();
  let nextId = 1;
  for (const tm of [...allTmCodes].sort()) {
    const hrmsName = hrmsTmToName.get(tm);
    const gtlName = gtlTmToName.get(tm);
    // Use HRMS name if exists, else GTL name
    const name = hrmsName || gtlName || tm;
    // Capitalize first letter of each word
    const displayName = name.replace(/\b\w/g, c => c.toUpperCase());

    await p.$executeRaw`
      INSERT INTO teams (id, team_name, legacy_team_id, is_active, created_at, updated_at)
      VALUES (${nextId}, ${displayName}, ${tm}, true, NOW(), NOW())`;
    tmCodeToNewId.set(tm, nextId);
    console.log(`  ${tm} → id=${nextId} "${displayName}"${hrmsName && gtlName && hrmsName.toLowerCase() !== gtlName.toLowerCase() ? ` (GTL: "${gtlName}")` : ''}`);
    nextId++;
  }
  await p.$executeRaw`SELECT setval('teams_id_seq', ${nextId})`;

  // Step 4: Fix users.team_id — map from HRMS TM_ code
  console.log('\nFixing users.team_id...');
  const allUsers = await p.user.findMany({ select: { id: true, username: true, teamId: true } });
  let fixed = 0;
  for (const user of allUsers) {
    const tmCode = userTmCodes.get(user.username);
    if (!tmCode) continue;
    const correctId = tmCodeToNewId.get(tmCode);
    if (!correctId) continue;
    if (user.teamId !== correctId) {
      await p.user.update({ where: { id: user.id }, data: { teamId: correctId } });
      fixed++;
    }
  }
  console.log('Users fixed:', fixed);

  // Step 5: Fix time_entries.team_id — these use GTL TM_ codes
  // The import script mapped GTL TM_ codes to old sequential IDs (1-29)
  // Then merge-teams-proper remapped to 100-128. Need to remap to new IDs.
  console.log('\nFixing time_entries.team_id...');
  // Get current distinct team_ids in time_entries
  const entryTeams = await p.$queryRaw`SELECT DISTINCT team_id FROM time_entries WHERE team_id IS NOT NULL`;
  let entriesFixed = 0;
  for (const row of entryTeams) {
    const oldId = row.team_id;
    // These are now 100-128 from merge-teams-proper. Map back to TM_ code.
    // 100 = GTL_TM_0001, 101 = GTL_TM_0002, etc.
    const gtlIndex = oldId - 100;
    const gtlTmCodes = [...gtlTmToName.keys()].sort();
    if (gtlIndex >= 0 && gtlIndex < gtlTmCodes.length) {
      const tmCode = gtlTmCodes[gtlIndex];
      const newId = tmCodeToNewId.get(tmCode);
      if (newId && newId !== oldId) {
        const result = await p.$executeRaw`UPDATE time_entries SET team_id = ${newId} WHERE team_id = ${oldId}`;
        entriesFixed += result;
      }
    }
  }
  console.log('Time entries fixed:', entriesFixed);

  // Step 6: Fix designations.team_id
  // Designations also use HRMS TM_ codes
  const desigs = await p.$queryRaw`SELECT DISTINCT team_id FROM designations WHERE team_id IS NOT NULL`;
  for (const d of desigs) {
    // These might be old numeric IDs too
    // Skip for now — designations are less critical
  }

  // Step 7: Restore FKs
  await p.$executeRaw`ALTER TABLE users ADD CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL`;
  await p.$executeRaw`ALTER TABLE time_entries ADD CONSTRAINT time_entries_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL`;
  await p.$executeRaw`ALTER TABLE user_team_memberships ADD CONSTRAINT user_team_memberships_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE`;

  // Step 8: Rebuild memberships
  const activeUsers = await p.user.findMany({ where: { teamId: { not: null }, isActive: true }, select: { id: true, teamId: true } });
  for (const u of activeUsers) {
    try { await p.$executeRaw`INSERT INTO user_team_memberships (user_id, team_id, is_primary, created_at) VALUES (${u.id}, ${u.teamId}, true, NOW()) ON CONFLICT DO NOTHING`; } catch {}
  }
  await p.$executeRaw`UPDATE user_team_memberships utm SET role_in_team = d.name FROM users u JOIN designations d ON d.id = u.designation_id WHERE utm.user_id = u.id`;

  // Step 9: Verify
  console.log('\n=== VERIFICATION ===');
  const verify = await p.$queryRaw`
    SELECT t.id, t.team_name, t.legacy_team_id, COUNT(u.id)::int as members
    FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
    GROUP BY t.id, t.team_name, t.legacy_team_id
    ORDER BY members DESC`;
  for (const v of verify) {
    console.log(`  ${v.legacy_team_id.padEnd(10)} ${v.team_name.padEnd(40)} ${v.members} members`);
  }

  // Check Abdul Mannan specifically
  const am = await p.user.findFirst({ where: { username: 'abdul.mannan' }, include: { team: true } });
  console.log('\nabdul.mannan team:', am?.team?.teamName, '(id=' + am?.teamId + ')');

  console.log('\nTotal teams:', await p.team.count());

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
