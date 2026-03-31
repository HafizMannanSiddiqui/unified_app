/**
 * AUTO-FIX ALL USERS v2
 *
 * Logic: Active HRMS users with 0 entries = REAL accounts.
 * Find duplicate/old accounts with entries that match by name.
 * Move entries FROM the old account TO the real HRMS account.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

async function main() {
  console.log('=== AUTO-FIX v2: Move entries to correct HRMS accounts ===\n');

  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, firstName: true, lastName: true, email: true, isActive: true },
  });

  const entryCounts = await prisma.$queryRaw`
    SELECT user_id as "userId", COUNT(*)::int as count FROM time_entries GROUP BY user_id`;
  const countMap = new Map();
  for (const r of entryCounts) countMap.set(r.userId, r.count);

  // Active users with 0 entries = REAL HRMS accounts that need entries
  const needEntries = allUsers.filter(u => u.isActive && (countMap.get(u.id) || 0) === 0);

  // All accounts that HAVE entries = potential sources to move FROM
  const havEntries = allUsers.filter(u => (countMap.get(u.id) || 0) > 0);

  console.log('Active users needing entries:', needEntries.length);
  console.log('Accounts with entries:', havEntries.length);

  // Build lookup from accounts WITH entries by normalized name
  const sourceByName = new Map();
  const sourceByNormFL = new Map();

  for (const u of havEntries) {
    const normD = normalize(u.displayName);
    const normFL = normalize((u.firstName || '') + (u.lastName || ''));

    if (normD.length > 5) {
      if (!sourceByName.has(normD)) sourceByName.set(normD, []);
      sourceByName.get(normD).push(u);
    }
    if (normFL.length > 5 && normFL !== normD) {
      if (!sourceByNormFL.has(normFL)) sourceByNormFL.set(normFL, []);
      sourceByNormFL.get(normFL).push(u);
    }
  }

  // Match each real HRMS account to a source account
  const moves = [];

  for (const target of needEntries) {
    const normD = normalize(target.displayName);
    const normFL = normalize((target.firstName || '') + (target.lastName || ''));

    let sources = sourceByName.get(normD) || [];
    if (sources.length === 0) sources = sourceByNormFL.get(normFL) || [];

    // Filter: don't match to self, and only match if exactly 1 candidate (avoid ambiguity)
    sources = sources.filter(s => s.id !== target.id);

    if (sources.length === 1) {
      const source = sources[0];
      moves.push({
        from: source,
        to: target,
        entries: countMap.get(source.id) || 0,
      });
    }
  }

  console.log('\nMatches found:', moves.length);
  console.log('\n--- MOVES (FROM old → TO real HRMS) ---');
  for (const m of moves) {
    console.log(`  "${m.from.displayName}" ${m.from.username}(${m.from.id}) → ${m.to.username}(${m.to.id}) | ${m.entries} entries`);
  }

  // Execute
  console.log('\nExecuting...');
  let totalMoved = 0;
  for (const m of moves) {
    const result = await prisma.timeEntry.updateMany({
      where: { userId: m.from.id },
      data: { userId: m.to.id },
    });
    totalMoved += result.count;
  }
  console.log('Total entries moved:', totalMoved);

  // Final
  const finalCounts = await prisma.$queryRaw`SELECT COUNT(DISTINCT user_id) as c FROM time_entries`;
  const finalTotal = await prisma.timeEntry.count();

  // Verify specific users
  console.log('\n=== VERIFICATION ===');
  const checks = ['m.zeeshan', 'zkhan', 'm.usman', 'usama.idrees', 'abdul.mannan', 'm.sumair', 'asra.ehsan'];
  for (const uname of checks) {
    const u = await prisma.user.findFirst({ where: { username: uname }, select: { id: true } });
    if (u) {
      const c = await prisma.timeEntry.count({ where: { userId: u.id } });
      console.log(`  ${uname}: ${c} entries`);
    }
  }

  console.log(`\nTotal entries: ${finalTotal}`);
  console.log(`Users with data: ${finalCounts[0].c}`);

  // Count remaining active with 0
  let stillEmpty = 0;
  for (const u of needEntries) {
    const c = await prisma.timeEntry.count({ where: { userId: u.id } });
    if (c === 0) stillEmpty++;
  }
  console.log(`Active users still with 0 entries: ${stillEmpty} (these genuinely have no old GTL data)`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
