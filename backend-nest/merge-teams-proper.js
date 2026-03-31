/**
 * PROPER TEAM MERGE — Keep both GTL and HRMS team names.
 *
 * Problem: GTL TM_0010 = "Software", HRMS TM_0010 = "HSE/PPE"
 * They're different systems with different team codes.
 *
 * Solution:
 * 1. HRMS teams are the SOURCE OF TRUTH for user assignments (HR system)
 * 2. GTL teams are the SOURCE OF TRUTH for time entry assignments
 * 3. Create a unified teams table with ALL unique teams from both
 * 4. Keep separate legacy IDs: gtl_legacy_team_id + hrms_legacy_team_id
 * 5. Map users.team_id → HRMS team (since users came from HRMS)
 * 6. Map time_entries.team_id → GTL team (since entries came from GTL)
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();

async function main() {
  console.log('=== PROPER TEAM MERGE ===\n');

  // GTL teams (from SQL)
  const gtlTeams = [
    { legacy: 'GTL_TM_0001', name: 'Assembly Line' },
    { legacy: 'GTL_TM_0002', name: 'Electrical' },
    { legacy: 'GTL_TM_0003', name: 'Firmware' },
    { legacy: 'GTL_TM_0004', name: 'Machine Shop' },
    { legacy: 'GTL_TM_0005', name: 'Mechanical' },
    { legacy: 'GTL_TM_0006', name: 'Quality Assurance' },
    { legacy: 'GTL_TM_0007', name: 'Supply Chain' },
    { legacy: 'GTL_TM_0008', name: 'System Testing/Simulations' },
    { legacy: 'GTL_TM_0009', name: 'Finance & Operations' },
    { legacy: 'GTL_TM_0010', name: 'Software' },
    { legacy: 'GTL_TM_0011', name: 'Marketing & Training Material' },
    { legacy: 'GTL_TM_0012', name: 'Motion Graphics/Video' },
    { legacy: 'GTL_TM_0013', name: 'Order/Field Service/Project Mgmt' },
    { legacy: 'GTL_TM_0014', name: 'Product Management' },
    { legacy: 'GTL_TM_0015', name: 'Electronics Lab' },
    { legacy: 'GTL_TM_0016', name: 'PMO' },
    { legacy: 'GTL_TM_0017', name: 'RnD' },
    { legacy: 'GTL_TM_0018', name: 'Controls' },
    { legacy: 'GTL_TM_0019', name: 'Freight & Logistics' },
    { legacy: 'GTL_TM_0020', name: 'Controls / RnD' },
    { legacy: 'GTL_TM_0021', name: 'Firmware/Software' },
    { legacy: 'GTL_TM_0022', name: 'Application Engineering' },
    { legacy: 'GTL_TM_0023', name: 'ERP' },
    { legacy: 'GTL_TM_0024', name: 'Multimedia' },
    { legacy: 'GTL_TM_0025', name: 'PFTS' },
    { legacy: 'GTL_TM_0026', name: 'Power BI' },
    { legacy: 'GTL_TM_0027', name: 'Test' },
    { legacy: 'GTL_TM_0028', name: 'Quality Management' },
    { legacy: 'GTL_TM_0029', name: 'MARCOM' },
  ];

  // HRMS teams (from SQL)
  const hrmsTeams = [
    { hrmsId: 1, legacy: 'HRMS_TM_0001', name: 'Accounts' },
    { hrmsId: 2, legacy: 'HRMS_TM_0002', name: 'Assembly Line' },
    { hrmsId: 3, legacy: 'HRMS_TM_0003', name: 'Facility Management' },
    { hrmsId: 4, legacy: 'HRMS_TM_0005', name: 'Electronics Lab' },
    { hrmsId: 5, legacy: 'HRMS_TM_0004', name: 'Electrical' },
    { hrmsId: 6, legacy: 'HRMS_TM_0007', name: 'Firmware' },
    { hrmsId: 7, legacy: 'HRMS_TM_0009', name: 'HCTS' },
    { hrmsId: 8, legacy: 'HRMS_TM_0010', name: 'HSE/PPE' },
    { hrmsId: 9, legacy: 'HRMS_TM_0011', name: 'IT' },
    { hrmsId: 10, legacy: 'HRMS_TM_0012', name: 'Machine Shop' },
    { hrmsId: 11, legacy: 'HRMS_TM_0013', name: 'Mechanical' },
    { hrmsId: 12, legacy: 'HRMS_TM_0014', name: 'Finance & Operations' },
    { hrmsId: 13, legacy: 'HRMS_TM_0015', name: 'Power Infrastructure' },
    { hrmsId: 14, legacy: 'HRMS_TM_0016', name: 'Quality & Product Integrity' },
    { hrmsId: 15, legacy: 'HRMS_TM_0018', name: 'SWIFT' },
    { hrmsId: 16, legacy: 'HRMS_TM_0019', name: 'Systems Testing' },
    { hrmsId: 17, legacy: 'HRMS_TM_0008', name: 'Freight' },
    { hrmsId: 18, legacy: 'HRMS_TM_0006', name: 'Finance' },
    { hrmsId: 19, legacy: 'HRMS_TM_0017', name: 'Software' },
    { hrmsId: 20, legacy: 'HRMS_TM_0020', name: 'Operations' },
    { hrmsId: 22, legacy: 'HRMS_TM_0021', name: 'Marketing & Training Material' },
    { hrmsId: 23, legacy: 'HRMS_TM_0022', name: 'IMS' },
    { hrmsId: 24, legacy: 'HRMS_TM_0023', name: 'Supply Chain' },
    { hrmsId: 25, legacy: 'HRMS_TM_0024', name: 'Controls / Firmware & SWIFT' },
    { hrmsId: 26, legacy: 'HRMS_TM_0025', name: 'Executive Management' },
    { hrmsId: 27, legacy: 'HRMS_TM_0026', name: 'Inventory Management' },
    { hrmsId: 28, legacy: 'HRMS_TM_0027', name: 'PMO' },
    { hrmsId: 29, legacy: 'HRMS_TM_0028', name: 'ERP' },
    { hrmsId: 30, legacy: 'HRMS_TM_0029', name: 'MARCOM' },
  ];

  // Step 1: Clear and recreate teams table with ALL unique teams
  console.log('Step 1: Clearing FK constraints temporarily...');
  // Remove team_id constraints temporarily
  await p.$executeRaw`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_id_fkey`;
  await p.$executeRaw`ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_team_id_fkey`;
  await p.$executeRaw`ALTER TABLE user_team_memberships DROP CONSTRAINT IF EXISTS user_team_memberships_team_id_fkey`;
  await p.$executeRaw`ALTER TABLE designations DROP CONSTRAINT IF EXISTS designations_team_id_fkey`;
  await p.$executeRaw`ALTER TABLE team_sub_project_assignments DROP CONSTRAINT IF EXISTS team_sub_project_assignments_team_id_fkey`;

  // Clear memberships
  await p.$executeRaw`DELETE FROM user_team_memberships`;
  await p.$executeRaw`DELETE FROM team_sub_project_assignments`;

  // Delete all teams
  await p.$executeRaw`DELETE FROM teams`;

  // Reset sequence
  await p.$executeRaw`SELECT setval('teams_id_seq', 1, false)`;

  console.log('Step 2: Creating unified teams...');

  // HRMS teams get IDs 1-30 (matching HRMS numeric IDs so users.team_id stays valid)
  const hrmsIdMap = new Map(); // hrmsId → new DB id
  for (const ht of hrmsTeams) {
    const created = await p.$executeRaw`
      INSERT INTO teams (id, team_name, legacy_team_id, source_system, is_active, created_at, updated_at)
      VALUES (${ht.hrmsId}, ${ht.name}, ${ht.legacy}, 'hrms', true, NOW(), NOW())`;
    hrmsIdMap.set(ht.hrmsId, ht.hrmsId);
    // Update sequence
    await p.$executeRaw`SELECT setval('teams_id_seq', GREATEST(nextval('teams_id_seq'), ${ht.hrmsId + 1}))`;
  }
  console.log('  HRMS teams created:', hrmsTeams.length);

  // GTL teams get IDs starting from 100 (to avoid collision)
  const gtlIdMap = new Map(); // GTL TM_code → new DB id
  let gtlStartId = 100;
  for (const gt of gtlTeams) {
    const id = gtlStartId++;
    await p.$executeRaw`
      INSERT INTO teams (id, team_name, legacy_team_id, source_system, is_active, created_at, updated_at)
      VALUES (${id}, ${gt.name}, ${gt.legacy}, 'gtl', true, NOW(), NOW())`;
    const tmCode = gt.legacy.replace('GTL_', ''); // e.g. TM_0010
    gtlIdMap.set(tmCode, id);
  }
  await p.$executeRaw`SELECT setval('teams_id_seq', ${gtlStartId})`;
  console.log('  GTL teams created:', gtlTeams.length, '(IDs 100-128)');

  // Step 3: Users.team_id already has HRMS numeric IDs → they now point to correct HRMS teams
  // (IDs 1-30 match HRMS team IDs)
  console.log('\nStep 3: Verifying user team assignments...');
  const userTeamCheck = await p.$queryRaw`
    SELECT t.team_name, COUNT(u.id)::int as members
    FROM users u JOIN teams t ON t.id = u.team_id
    WHERE u.is_active = true
    GROUP BY t.team_name ORDER BY members DESC LIMIT 10`;
  console.log('  Top HRMS teams by user count:');
  for (const r of userTeamCheck) console.log('    ', r.team_name.padEnd(35), r.members);

  // Step 4: Remap time_entries.team_id from old GTL numeric ID → new GTL team ID (100+)
  // The time_entries.team_id currently has the GTL team mapping from import-all-gtl.js
  // That script mapped TM_xxxx → old teams table id. Need to update to new GTL ids.
  console.log('\nStep 4: Remapping time_entries.team_id to GTL teams...');
  // The import script used legacyToNewId from the OLD teams table. The old team IDs were:
  // TM_0001→1, TM_0002→2, ..., TM_0010→10, etc. (sequential in old DB)
  // Now GTL teams are at IDs 100-128. Need to map old_id → TM_code → new_gtl_id

  // Old GTL teams table had: (18, TM_0001), (19, TM_0002), ..., (27, TM_0010)
  // But our import script mapped TM_xxxx → whatever ID was in the old teams table
  // Let me just map by the legacy_team_id that was stored

  // Actually, the time_entries were imported with team_id from the teamMap in fix-remaining.js
  // That teamMap was: legacy_team_id → old DB id. The old DB ids were 1-29 (from initial migration)
  // Those old IDs matched GTL's sequential team ids.

  // Simpler: just check what team_ids exist in time_entries and map them
  const entryTeamIds = await p.$queryRaw`SELECT DISTINCT team_id as tid FROM time_entries WHERE team_id IS NOT NULL ORDER BY team_id`;
  console.log('  Distinct team_ids in time_entries:', entryTeamIds.map(r => r.tid).join(', '));

  // These are the OLD DB team ids (1-29). The old DB had: id=1 → TM_0001, id=2 → TM_0002, etc.
  // Map: old_sequential_id → TM_code → new GTL id
  const oldIdToTmCode = new Map([
    [1, 'TM_0001'], [2, 'TM_0002'], [3, 'TM_0003'], [4, 'TM_0004'], [5, 'TM_0005'],
    [6, 'TM_0006'], [7, 'TM_0007'], [8, 'TM_0008'], [9, 'TM_0009'], [10, 'TM_0010'],
    [11, 'TM_0011'], [12, 'TM_0012'], [13, 'TM_0013'], [14, 'TM_0014'], [15, 'TM_0015'],
    [16, 'TM_0016'], [17, 'TM_0017'], [18, 'TM_0018'], [19, 'TM_0019'], [20, 'TM_0020'],
    [21, 'TM_0021'], [22, 'TM_0022'], [23, 'TM_0023'], [24, 'TM_0024'], [25, 'TM_0025'],
    [26, 'TM_0026'], [27, 'TM_0027'], [28, 'TM_0028'], [29, 'TM_0029'],
  ]);

  let entriesRemapped = 0;
  for (const [oldId, tmCode] of oldIdToTmCode) {
    const newGtlId = gtlIdMap.get(tmCode);
    if (newGtlId && oldId !== newGtlId) {
      const result = await p.$executeRaw`UPDATE time_entries SET team_id = ${newGtlId} WHERE team_id = ${oldId}`;
      if (result > 0) {
        entriesRemapped += result;
      }
    }
  }
  console.log('  Time entries remapped:', entriesRemapped);

  // Step 5: Restore FK constraints
  console.log('\nStep 5: Restoring FK constraints...');
  await p.$executeRaw`ALTER TABLE users ADD CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL`;
  await p.$executeRaw`ALTER TABLE time_entries ADD CONSTRAINT time_entries_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL`;
  await p.$executeRaw`ALTER TABLE user_team_memberships ADD CONSTRAINT user_team_memberships_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE`;
  await p.$executeRaw`ALTER TABLE designations ADD CONSTRAINT designations_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL`;
  await p.$executeRaw`ALTER TABLE team_sub_project_assignments ADD CONSTRAINT team_sub_project_assignments_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE`;

  // Step 6: Rebuild user_team_memberships
  console.log('\nStep 6: Rebuilding memberships...');
  const activeUsers = await p.user.findMany({ where: { teamId: { not: null }, isActive: true }, select: { id: true, teamId: true } });
  for (const u of activeUsers) {
    try { await p.$executeRaw`INSERT INTO user_team_memberships (user_id, team_id, is_primary, created_at) VALUES (${u.id}, ${u.teamId}, true, NOW()) ON CONFLICT DO NOTHING`; } catch {}
  }
  await p.$executeRaw`UPDATE user_team_memberships utm SET role_in_team = d.name FROM users u JOIN designations d ON d.id = u.designation_id WHERE utm.user_id = u.id`;

  // Step 7: Verify
  console.log('\n=== FINAL VERIFICATION ===\n');

  console.log('HRMS Teams (users assigned to):');
  const hrmsVerify = await p.$queryRaw`
    SELECT t.id, t.team_name, t.source_system, COUNT(u.id)::int as members
    FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
    WHERE t.source_system = 'hrms'
    GROUP BY t.id, t.team_name, t.source_system HAVING COUNT(u.id) > 0
    ORDER BY members DESC`;
  for (const t of hrmsVerify) console.log(`  id=${String(t.id).padEnd(4)} ${t.team_name.padEnd(40)} ${t.members} members`);

  console.log('\nGTL Teams (time entries assigned to):');
  const gtlVerify = await p.$queryRaw`
    SELECT t.id, t.team_name, COUNT(te.id)::int as entries
    FROM teams t LEFT JOIN time_entries te ON te.team_id = t.id
    WHERE t.source_system = 'gtl'
    GROUP BY t.id, t.team_name HAVING COUNT(te.id) > 0
    ORDER BY entries DESC`;
  for (const t of gtlVerify) console.log(`  id=${String(t.id).padEnd(4)} ${t.team_name.padEnd(40)} ${t.entries} entries`);

  console.log('\nTotal teams:', await p.team.count());

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
