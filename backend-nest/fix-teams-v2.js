/**
 * Fix team_id collision v2.
 *
 * Problem: users.team_id in PostgreSQL contains HRMS numeric team IDs.
 * But new teams table IDs are from GTL, so they don't match.
 *
 * HRMS #17 = freight (TM_0008), but new DB #17 = RnD (TM_0017)
 * HRMS #19 = software (TM_0017), but new DB #19 = Freight & Logistics (TM_0019)
 *
 * Solution: Build HRMS_id → legacy_team_id → new_DB_id mapping.
 * Then update all users.team_id with the correct new DB ID.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== Fix Team ID Collision v2 ===\n');

  // HRMS teams mapping (from the SQL dump we just read)
  // HRMS numeric Id → legacy TM_ id
  const hrmsIdToLegacy = new Map([
    [1, 'TM_0001'], [2, 'TM_0002'], [3, 'TM_0003'], [4, 'TM_0005'], [5, 'TM_0004'],
    [6, 'TM_0007'], [7, 'TM_0009'], [8, 'TM_0010'], [9, 'TM_0011'], [10, 'TM_0012'],
    [11, 'TM_0013'], [12, 'TM_0014'], [13, 'TM_0015'], [14, 'TM_0016'], [15, 'TM_0018'],
    [16, 'TM_0019'], [17, 'TM_0008'], [18, 'TM_0006'], [19, 'TM_0017'], [20, 'TM_0020'],
    [22, 'TM_0021'], [23, 'TM_0022'], [24, 'TM_0023'], [25, 'TM_0024'], [26, 'TM_0025'],
    [27, 'TM_0026'], [28, 'TM_0027'], [29, 'TM_0028'], [30, 'TM_0029'],
  ]);

  // HRMS team names for logging
  const hrmsNames = new Map([
    [1,'accounts'],[2,'assembly line'],[3,'facility management'],[4,'electronics lab'],[5,'electrical'],
    [6,'firmware'],[7,'HCTS'],[8,'HSE/PPE'],[9,'IT'],[10,'machine shop'],[11,'mechanical'],
    [12,'finance & operation'],[13,'power infrastructure'],[14,'quality & product integrity'],
    [15,'SWIFT'],[16,'systems testing'],[17,'freight'],[18,'finance'],[19,'software'],
    [20,'operations'],[22,'marketing & training material'],[23,'IMS'],[24,'supply chain'],
    [25,'Controls / Firmware & SWIFT'],[26,'Executive Management'],[27,'Inventory Management'],
    [28,'PMO'],[29,'ERP'],[30,'MARCOM'],
  ]);

  // New DB: legacy_team_id → new DB id
  const newTeams = await p.team.findMany();
  const legacyToNewId = new Map();
  for (const t of newTeams) {
    if (t.legacyTeamId) legacyToNewId.set(t.legacyTeamId, t.id);
  }

  // Build: HRMS numeric id → correct new DB id
  const hrmsToNew = new Map();
  console.log('Mapping:');
  for (const [hrmsId, legacyId] of hrmsIdToLegacy) {
    const newId = legacyToNewId.get(legacyId);
    if (newId) {
      hrmsToNew.set(hrmsId, newId);
      if (hrmsId !== newId) {
        const newTeam = newTeams.find(t => t.id === newId);
        console.log(`  HRMS #${hrmsId} "${hrmsNames.get(hrmsId)}" (${legacyId}) → New DB #${newId} "${newTeam?.teamName}"`);
      }
    } else {
      console.log(`  MISSING: HRMS #${hrmsId} "${hrmsNames.get(hrmsId)}" (${legacyId})`);
    }
  }

  // Now update ALL users whose team_id is an HRMS numeric id
  const allUsers = await p.user.findMany({ select: { id: true, username: true, teamId: true } });
  let fixed = 0, alreadyCorrect = 0, noMapping = 0;

  for (const user of allUsers) {
    if (!user.teamId) { noMapping++; continue; }

    const correctId = hrmsToNew.get(user.teamId);
    if (correctId === undefined) {
      // team_id might already be correct (GTL users set correctly, or no HRMS mapping)
      noMapping++;
      continue;
    }

    if (user.teamId !== correctId) {
      await p.user.update({ where: { id: user.id }, data: { teamId: correctId } });
      fixed++;
    } else {
      alreadyCorrect++;
    }
  }

  console.log('\nResults:');
  console.log('  Fixed:', fixed);
  console.log('  Already correct:', alreadyCorrect);
  console.log('  No mapping needed:', noMapping);

  // Rebuild user_team_memberships
  console.log('\nRebuilding team memberships...');
  await p.$executeRaw`DELETE FROM user_team_memberships`;
  const activeUsers = await p.user.findMany({
    where: { teamId: { not: null }, isActive: true },
    select: { id: true, teamId: true },
  });
  for (const u of activeUsers) {
    try {
      await p.$executeRaw`
        INSERT INTO user_team_memberships (user_id, team_id, is_primary, created_at)
        VALUES (${u.id}, ${u.teamId}, true, NOW())
        ON CONFLICT (user_id, team_id) DO NOTHING`;
    } catch {}
  }
  await p.$executeRaw`
    UPDATE user_team_memberships utm SET role_in_team = d.name
    FROM users u JOIN designations d ON d.id = u.designation_id
    WHERE utm.user_id = u.id`;

  // Verify
  console.log('\n=== VERIFICATION ===');
  const verify = await p.$queryRaw`
    SELECT t.team_name, t.legacy_team_id as legacy, COUNT(u.id)::int as members
    FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
    GROUP BY t.team_name, t.legacy_team_id HAVING COUNT(u.id) > 0
    ORDER BY COUNT(u.id) DESC`;

  for (const v of verify) {
    console.log(`  ${v.team_name.padEnd(45)} ${v.legacy.padEnd(10)} ${v.members} members`);
  }

  // Specific checks
  console.log('\n--- Key Checks ---');
  for (const name of ['Software', 'RnD', 'software', 'freight']) {
    const team = await p.team.findFirst({ where: { teamName: { contains: name, mode: 'insensitive' } } });
    if (team) {
      const count = await p.user.count({ where: { teamId: team.id, isActive: true } });
      console.log(`  "${team.teamName}" (id=${team.id}, ${team.legacyTeamId}): ${count} members`);
    }
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
