/**
 * Fix team_id collision: HRMS team IDs ≠ new PostgreSQL team IDs.
 *
 * The HRMS users.team_id is a VARCHAR referencing HRMS teams table by numeric Id.
 * But the new DB teams table has different IDs (from GTL migration).
 * So HRMS user with team_id=17 (freight) got assigned to new DB team 17 (RnD) — WRONG.
 *
 * Fix: Map HRMS team_id → HRMS team legacy_team_id → new DB team by legacy_team_id.
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const p = new PrismaClient();

async function main() {
  console.log('=== Fix HRMS Team ID Collision ===\n');

  // 1. Parse HRMS teams: hrms_id → hrms_legacy_team_id (TM_xxxx)
  const hrmsSql = fs.readFileSync(path.join(__dirname, '../../hrms.sql'), 'utf-8');
  const hrmsTeams = new Map(); // hrms numeric Id → { legacyId, name }

  const teamsStart = hrmsSql.indexOf("INSERT INTO `teams`");
  const teamsEnd = hrmsSql.indexOf(';\n', teamsStart);
  const teamsBlock = hrmsSql.substring(teamsStart, teamsEnd);

  const re = /\((\d+),\s*'(TM_\d+)',\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(teamsBlock)) !== null) {
    hrmsTeams.set(parseInt(m[1]), { legacyId: m[2], name: m[3] });
  }

  console.log('HRMS teams parsed:', hrmsTeams.size);
  for (const [id, t] of hrmsTeams) {
    console.log(`  HRMS #${id} → ${t.legacyId} → "${t.name}"`);
  }

  // 2. New DB teams: legacy_team_id → new DB id
  const newTeams = await p.team.findMany();
  const legacyToNewId = new Map(); // TM_xxxx → new DB id
  for (const t of newTeams) {
    if (t.legacyTeamId) legacyToNewId.set(t.legacyTeamId, t.id);
  }

  console.log('\nNew DB teams:', newTeams.length);

  // 3. Build mapping: HRMS numeric id → correct new DB id
  const hrmsIdToNewId = new Map();
  const missingTeams = [];

  for (const [hrmsId, hrmsTeam] of hrmsTeams) {
    const newId = legacyToNewId.get(hrmsTeam.legacyId);
    if (newId) {
      hrmsIdToNewId.set(hrmsId, newId);
      if (hrmsId !== newId) {
        const newTeam = newTeams.find(t => t.id === newId);
        console.log(`  REMAP: HRMS #${hrmsId} "${hrmsTeam.name}" → New DB #${newId} "${newTeam?.teamName}"`);
      }
    } else {
      missingTeams.push(hrmsTeam);
      console.log(`  MISSING: HRMS "${hrmsTeam.name}" (${hrmsTeam.legacyId}) not in new DB`);
    }
  }

  // 4. Create any missing teams
  for (const mt of missingTeams) {
    const created = await p.team.create({
      data: { teamName: mt.name, legacyTeamId: mt.legacyId, isActive: true },
    });
    hrmsIdToNewId.set([...hrmsTeams].find(([_, v]) => v.legacyId === mt.legacyId)[0], created.id);
    console.log(`  CREATED: "${mt.name}" (${mt.legacyId}) → id ${created.id}`);
  }

  // 5. Parse HRMS users to get their team_id assignments
  // HRMS users.team_id is a VARCHAR like "17" or "TM_0008"
  const usersStart = hrmsSql.indexOf("INSERT INTO `users`");
  const usersEnd = hrmsSql.indexOf(';\n', usersStart);
  const usersBlock = hrmsSql.substring(usersStart, usersEnd);

  // Parse HRMS users: username → hrms_team_id
  const hrmsUserTeam = new Map(); // username → hrms numeric team_id
  // HRMS users format: (Id, display_name, pseudo_name, user_name, email, password, user_role, report_to, active, zk_id, team_id, ...)
  const ure = /\(\d+,\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*\d+,\s*\d+,\s*'?(\d+)'?/g;
  while ((m = ure.exec(usersBlock)) !== null) {
    const username = m[1];
    const teamId = parseInt(m[2]);
    if (username && !isNaN(teamId)) {
      hrmsUserTeam.set(username, teamId);
    }
  }
  console.log('\nHRMS user-team assignments parsed:', hrmsUserTeam.size);

  // 6. Fix all users in new DB
  const allUsers = await p.user.findMany({ select: { id: true, username: true, teamId: true } });
  let fixed = 0, alreadyCorrect = 0, noMapping = 0;

  for (const user of allUsers) {
    const hrmsTeamId = hrmsUserTeam.get(user.username);
    if (hrmsTeamId === undefined) { noMapping++; continue; }

    const correctNewTeamId = hrmsIdToNewId.get(hrmsTeamId);
    if (!correctNewTeamId) { noMapping++; continue; }

    if (user.teamId !== correctNewTeamId) {
      await p.user.update({ where: { id: user.id }, data: { teamId: correctNewTeamId } });
      fixed++;
    } else {
      alreadyCorrect++;
    }
  }

  console.log('\nResults:');
  console.log('  Fixed:', fixed);
  console.log('  Already correct:', alreadyCorrect);
  console.log('  No mapping:', noMapping);

  // 7. Also fix user_team_memberships table
  console.log('\nUpdating user_team_memberships...');
  await p.$executeRaw`DELETE FROM user_team_memberships`;
  const updatedUsers = await p.user.findMany({
    where: { teamId: { not: null }, isActive: true },
    select: { id: true, teamId: true },
  });
  let membershipsCreated = 0;
  for (const u of updatedUsers) {
    try {
      await p.$executeRaw`
        INSERT INTO user_team_memberships (user_id, team_id, is_primary, created_at)
        VALUES (${u.id}, ${u.teamId}, true, NOW())
        ON CONFLICT (user_id, team_id) DO NOTHING`;
      membershipsCreated++;
    } catch (e) {}
  }

  // Repopulate roles from designations
  await p.$executeRaw`
    UPDATE user_team_memberships utm
    SET role_in_team = d.name
    FROM users u
    JOIN designations d ON d.id = u.designation_id
    WHERE utm.user_id = u.id`;

  console.log('  Memberships recreated:', membershipsCreated);

  // 8. Verify
  console.log('\n=== VERIFICATION ===');
  const verify = await p.$queryRaw`
    SELECT t.team_name, COUNT(u.id)::int as members
    FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
    GROUP BY t.team_name HAVING COUNT(u.id) > 0
    ORDER BY COUNT(u.id) DESC`;

  for (const v of verify) {
    console.log(`  ${v.team_name.padEnd(45)} ${v.members} members`);
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
