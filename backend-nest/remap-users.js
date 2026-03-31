/**
 * Remap ALL time_entries.user_id from old GTL IDs to correct new PostgreSQL IDs.
 *
 * The old GTL used alias/pseudonym usernames. The real mapping is in users.alias_info JSON:
 *   { "username": "old_gtl_alias", "email": "old_alias@...", ... }
 *
 * Strategy:
 *   1. Build old_gtl_username → old_id from time_logger.sql
 *   2. Build old_gtl_alias_username → new_real_user_id from users.aliasInfo
 *   3. Also try direct username match and email match for users without aliasInfo
 *   4. Remap all time_entries.user_id
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('=== Remap Time Entries (via aliasInfo) ===\n');

  // 1. Parse old GTL users: old_id → as_username
  const sql = fs.readFileSync(path.join(__dirname, '../../time_logger.sql'), 'utf-8');
  const usersStart = sql.indexOf('INSERT INTO `users`');
  const usersEnd = sql.indexOf(';\n', usersStart);
  const usersBlock = sql.substring(usersStart, usersEnd);

  const oldIdToAlias = new Map(); // old_gtl_id → alias_username (pseudonym)
  const re = /\((\d+),\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(usersBlock)) !== null) {
    if (m[2]) oldIdToAlias.set(parseInt(m[1]), m[2]);
  }
  console.log('Old GTL users:', oldIdToAlias.size);

  // 2. Build alias_username → new_real_user_id from aliasInfo
  const newUsers = await prisma.user.findMany({
    select: { id: true, username: true, email: true, aliasInfo: true, teamId: true },
  });

  const aliasToNewUser = new Map(); // old alias username → new user
  const usernameToNewUser = new Map(); // real username → new user

  for (const u of newUsers) {
    usernameToNewUser.set(u.username, u);

    if (u.aliasInfo && typeof u.aliasInfo === 'object') {
      const alias = u.aliasInfo;
      if (alias.username) {
        aliasToNewUser.set(alias.username, u);
      }
    }
  }
  console.log('Alias mappings from aliasInfo:', aliasToNewUser.size);
  console.log('Direct username mappings:', usernameToNewUser.size);

  // 3. Build old_gtl_id → new_user_id
  const oldToNewId = new Map();
  const unmatched = [];

  for (const [oldId, aliasUsername] of oldIdToAlias) {
    // Try alias mapping first (most common)
    let newUser = aliasToNewUser.get(aliasUsername);
    // Then try direct username match
    if (!newUser) newUser = usernameToNewUser.get(aliasUsername);

    if (newUser) {
      oldToNewId.set(oldId, newUser.id);
    } else {
      unmatched.push({ oldId, aliasUsername });
    }
  }
  console.log('\nMapped:', oldToNewId.size, '| Unmatched:', unmatched.length);
  if (unmatched.length > 0) {
    console.log('Unmatched:', unmatched.map(u => `${u.aliasUsername}(${u.oldId})`).join(', '));
  }

  // Show sample mappings
  console.log('\nSample mappings:');
  let shown = 0;
  for (const [oldId, newId] of oldToNewId) {
    if (shown < 8) {
      const alias = oldIdToAlias.get(oldId);
      const newUser = newUsers.find(u => u.id === newId);
      console.log(`  GTL#${oldId} "${alias}" → DB#${newId} "${newUser?.username}"`);
      shown++;
    }
  }

  // 4. Get all current time entries
  const entries = await prisma.timeEntry.findMany({ select: { id: true, userId: true, approverId: true } });
  console.log('\nTotal entries:', entries.length);

  // 5. Remap userId
  const userUpdates = [];
  let alreadyCorrect = 0, noMapping = 0;

  for (const entry of entries) {
    const newUserId = oldToNewId.get(entry.userId);
    if (newUserId && newUserId !== entry.userId) {
      userUpdates.push({ id: entry.id, newUserId });
    } else if (newUserId) {
      alreadyCorrect++;
    } else {
      noMapping++;
    }
  }

  console.log('Need userId remap:', userUpdates.length);
  console.log('Already correct:', alreadyCorrect);
  console.log('No mapping found:', noMapping);

  // 6. Apply userId updates
  if (userUpdates.length > 0) {
    console.log('\nApplying userId remaps...');
    const BATCH = 200;
    let done = 0;
    for (let i = 0; i < userUpdates.length; i += BATCH) {
      const batch = userUpdates.slice(i, i + BATCH);
      await prisma.$transaction(
        batch.map(u => prisma.timeEntry.update({
          where: { id: u.id },
          data: { userId: u.newUserId },
        }))
      );
      done += batch.length;
      process.stdout.write(`  ${done}/${userUpdates.length}\r`);
    }
    console.log(`\nRemapped ${done} userId entries.`);
  }

  // 7. Remap approverId
  console.log('\nRemapping approverIds...');
  // Build alias → new_id for approvers too (approver field in old GTL is the alias username string)
  // But in the migrated data, approverId is already numeric. Let's just remap using same map.
  const approverUpdates = [];
  for (const entry of entries) {
    if (entry.approverId) {
      const newApproverId = oldToNewId.get(entry.approverId);
      if (newApproverId && newApproverId !== entry.approverId) {
        approverUpdates.push({ id: entry.id, newApproverId });
      }
    }
  }
  if (approverUpdates.length > 0) {
    const BATCH = 200;
    let done = 0;
    for (let i = 0; i < approverUpdates.length; i += BATCH) {
      const batch = approverUpdates.slice(i, i + BATCH);
      await prisma.$transaction(
        batch.map(u => prisma.timeEntry.update({
          where: { id: u.id },
          data: { approverId: u.newApproverId },
        }))
      );
      done += batch.length;
    }
    console.log(`Remapped ${done} approverIds.`);
  } else {
    console.log('No approver remaps needed.');
  }

  // 8. Verify
  console.log('\n=== Verification ===');
  const testUsers = ['abdul.mannan', 'm.sumair', 'junaid.khalil', 'abdul.qadeer'];
  for (const uname of testUsers) {
    const u = await prisma.user.findFirst({ where: { username: uname }, select: { id: true, username: true, aliasInfo: true } });
    if (u) {
      const count = await prisma.timeEntry.count({ where: { userId: u.id } });
      const alias = u.aliasInfo ? u.aliasInfo.username : 'none';
      console.log(`${u.username} (id=${u.id}, alias=${alias}): ${count} entries`);
    }
  }

  const finalTotal = await prisma.timeEntry.count();
  const distinctUsers = await prisma.$queryRaw`SELECT COUNT(DISTINCT user_id) as c FROM time_entries`;
  console.log(`\nFinal: ${finalTotal} entries across ${distinctUsers[0].c} users`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
