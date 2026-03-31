/**
 * Migrate existing single team_id/report_to into the new junction tables.
 * Uses raw SQL since Prisma client may not have the new models yet.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== Migrate teams & managers to junction tables ===\n');

  // 1. Migrate team_id → user_team_memberships
  const usersWithTeam = await p.$queryRaw`
    SELECT id, team_id FROM users WHERE team_id IS NOT NULL AND is_active = true`;

  console.log('Users with team_id:', usersWithTeam.length);

  let teamInserted = 0;
  for (const u of usersWithTeam) {
    try {
      await p.$executeRaw`
        INSERT INTO user_team_memberships (user_id, team_id, is_primary, created_at)
        VALUES (${u.id}, ${u.team_id}, true, NOW())
        ON CONFLICT (user_id, team_id) DO NOTHING`;
      teamInserted++;
    } catch (e) {}
  }
  console.log('Team memberships created:', teamInserted);

  // 2. Migrate report_to → user_managers
  const usersWithManager = await p.$queryRaw`
    SELECT id, report_to FROM users WHERE report_to IS NOT NULL AND is_active = true`;

  console.log('Users with report_to:', usersWithManager.length);

  let mgrInserted = 0;
  for (const u of usersWithManager) {
    try {
      await p.$executeRaw`
        INSERT INTO user_managers (user_id, manager_id, is_primary, created_at)
        VALUES (${u.id}, ${u.report_to}, true, NOW())
        ON CONFLICT (user_id, manager_id) DO NOTHING`;
      mgrInserted++;
    } catch (e) {}
  }
  console.log('Manager relationships created:', mgrInserted);

  // 3. Add designation as role_in_team
  await p.$executeRaw`
    UPDATE user_team_memberships utm
    SET role_in_team = d.name
    FROM users u
    JOIN designations d ON d.id = u.designation_id
    WHERE utm.user_id = u.id`;
  console.log('Roles populated from designations');

  // Verify
  const teamCount = await p.$queryRaw`SELECT COUNT(*)::int as c FROM user_team_memberships`;
  const mgrCount = await p.$queryRaw`SELECT COUNT(*)::int as c FROM user_managers`;
  console.log('\nFinal: team_memberships:', teamCount[0].c, '| manager_relations:', mgrCount[0].c);

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
