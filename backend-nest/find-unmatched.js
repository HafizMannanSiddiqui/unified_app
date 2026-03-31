const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const p = new PrismaClient();

// Reuse parser from import-all-gtl.js
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

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '../../time_logger.sql'), 'utf-8');

  // Parse old GTL users
  const oldUsers = new Map();
  let sf = 0;
  while (true) {
    const idx = sql.indexOf("INSERT INTO `users`", sf);
    if (idx === -1) break;
    const end = sql.indexOf(';\n', idx);
    const block = sql.substring(idx, end > -1 ? end : idx + 200000);
    for (const row of parseValues(block)) {
      const v = parseRow(row);
      if (v.length >= 12) {
        oldUsers.set(parseInt(v[0]), {
          oldId: parseInt(v[0]), asUsername: v[5], asFirstName: v[6], asLastName: v[7], asEmail: v[8], teamId: v[11]
        });
      }
    }
    sf = (end > -1 ? end : idx) + 1;
  }
  console.log('Old GTL users:', oldUsers.size);

  // Count entries per old user_id
  const entryCounts = new Map();
  sf = 0;
  while (true) {
    const idx = sql.indexOf("INSERT INTO `data`", sf);
    if (idx === -1) break;
    const end = sql.indexOf(';\n', idx);
    const block = sql.substring(idx, end > -1 ? end : sql.length);
    for (const row of parseValues(block)) {
      const v = parseRow(row);
      if (v.length >= 2) {
        const uid = parseInt(v[1]);
        entryCounts.set(uid, (entryCounts.get(uid) || 0) + 1);
      }
    }
    sf = (end > -1 ? end : idx) + 1;
  }
  console.log('Old users with entries:', entryCounts.size);

  // Check which are matched
  const newUsers = await p.user.findMany({ select: { id: true, username: true, email: true, displayName: true, aliasInfo: true } });
  const aliasSet = new Set();
  const usernameSet = new Set();
  for (const nu of newUsers) {
    usernameSet.add(nu.username);
    if (nu.aliasInfo && nu.aliasInfo.username) aliasSet.add(nu.aliasInfo.username);
  }

  // Unmatched with entries
  let totalSkippedEntries = 0;
  const unmatched = [];
  for (const [oldId, count] of entryCounts) {
    const ou = oldUsers.get(oldId);
    if (!ou) continue;
    const isMatched = aliasSet.has(ou.asUsername) || usernameSet.has(ou.asUsername);
    if (!isMatched) {
      unmatched.push({ ...ou, entries: count });
      totalSkippedEntries += count;
    }
  }

  console.log('\nUnmatched users WITH entries:', unmatched.length);
  console.log('Total skipped entries:', totalSkippedEntries);

  // Try to match by email prefix or name
  console.log('\nTrying fuzzy matching...');
  const newByEmail = new Map();
  const newByName = new Map();
  for (const nu of newUsers) {
    if (nu.email) newByEmail.set(nu.email.split('@')[0].toLowerCase(), nu);
    if (nu.displayName) newByName.set(nu.displayName.toLowerCase().trim(), nu);
  }

  let fuzzyMatched = 0;
  const stillUnmatched = [];
  for (const u of unmatched) {
    // Try email prefix match
    const emailPrefix = u.asEmail ? u.asEmail.split('@')[0].toLowerCase() : '';
    let match = newByEmail.get(emailPrefix);

    // Try name match
    if (!match) {
      const name = (u.asFirstName + ' ' + u.asLastName).toLowerCase().trim();
      match = newByName.get(name);
    }

    if (match) {
      console.log('  FUZZY: ' + u.asUsername + ' → ' + match.username + ' (' + match.displayName + ')');
      fuzzyMatched++;
    } else {
      stillUnmatched.push(u);
    }
  }

  console.log('\nFuzzy matched:', fuzzyMatched);
  console.log('Still unmatched:', stillUnmatched.length);

  for (const u of stillUnmatched.sort((a,b) => b.entries - a.entries)) {
    console.log('  #' + u.oldId + ' ' + u.asUsername + ' (' + u.asFirstName + ' ' + u.asLastName + ') - ' + u.entries + ' entries');
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
