const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();

(async () => {
  const sql = fs.readFileSync('../../time_logger.sql', 'utf-8');

  // Parse OLD GTL: who belongs to which team
  const usersStart = sql.indexOf("INSERT INTO `users`");
  const usersEnd = sql.indexOf(';\n', usersStart);
  const usersBlock = sql.substring(usersStart, usersEnd);

  const gtlTeamMembers = {}; // team_id → [usernames]
  const re = /\(\d+,\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'(TM_\d+)'/g;
  let m;
  while ((m = re.exec(usersBlock)) !== null) {
    const username = m[1];
    const teamId = m[2];
    if (!gtlTeamMembers[teamId]) gtlTeamMembers[teamId] = [];
    gtlTeamMembers[teamId].push(username);
  }

  // GTL team names
  const teamsStart = sql.indexOf("INSERT INTO `teams`");
  const teamsEnd = sql.indexOf(';\n', teamsStart);
  const teamsBlock = sql.substring(teamsStart, teamsEnd);
  const gtlTeamNames = {};
  const tre = /\(\d+,\s*'(TM_\d+)',\s*'([^']+)'/g;
  while ((m = tre.exec(teamsBlock)) !== null) {
    gtlTeamNames[m[1]] = m[2];
  }

  console.log('=== OLD GTL Teams & Members ===');
  for (const [tid, members] of Object.entries(gtlTeamMembers)) {
    console.log(`${gtlTeamNames[tid] || tid} (${tid}): ${members.length} members`);
  }

  // Now check NEW DB
  console.log('\n=== NEW DB Teams & Members ===');
  const newTeams = await p.$queryRaw`
    SELECT t.id, t.team_name, t.legacy_team_id, COUNT(u.id)::int as members
    FROM teams t LEFT JOIN users u ON u.team_id = t.id AND u.is_active = true
    GROUP BY t.id ORDER BY t.team_name`;

  for (const t of newTeams) {
    const gtlName = gtlTeamNames[t.legacy_team_id] || '';
    const gtlCount = gtlTeamMembers[t.legacy_team_id]?.length || 0;
    const mismatch = Math.abs(t.members - gtlCount) > 5 ? ' *** MISMATCH ***' : '';
    console.log(`${t.team_name.padEnd(45)} new=${String(t.members).padEnd(4)} gtl=${String(gtlCount).padEnd(4)} ${mismatch}`);
  }

  // Check: old GTL Software (TM_0010) members - where are they in new DB?
  console.log('\n=== Old GTL Software (TM_0010) members in new DB ===');
  const swMembers = gtlTeamMembers['TM_0010'] || [];
  for (const alias of swMembers.slice(0, 15)) {
    // Find by aliasInfo or direct username
    const user = await p.user.findFirst({
      where: { OR: [{ aliasInfo: { path: ['username'], equals: alias } }, { username: alias }] },
      select: { username: true, displayName: true, teamId: true, team: { select: { teamName: true } } },
    });
    if (user) {
      console.log(`  ${alias.padEnd(25)} → ${user.username.padEnd(20)} team: ${user.team?.teamName || 'NONE'}`);
    } else {
      console.log(`  ${alias.padEnd(25)} → NOT FOUND`);
    }
  }

  await p.$disconnect();
})();
