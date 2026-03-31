/**
 * Complete analysis of BOTH old databases (GTL + HRMS)
 * Compare all tables, columns, and data to plan proper merge.
 */
const fs = require('fs');
const path = require('path');

function extractTables(sql) {
  const tables = {};
  const re = /CREATE TABLE `(\w+)`\s*\(([\s\S]*?)\)\s*ENGINE/g;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const name = m[1];
    const body = m[2];
    const columns = [];
    for (const line of body.split('\n')) {
      const col = line.trim().match(/^`(\w+)`\s+(.+?)(?:,\s*$|$)/);
      if (col && !line.trim().startsWith('PRIMARY') && !line.trim().startsWith('KEY') && !line.trim().startsWith('UNIQUE')) {
        columns.push({ name: col[1], type: col[2].replace(/,\s*$/, '') });
      }
    }
    tables[name] = columns;
  }
  return tables;
}

function countRows(sql, tableName) {
  let count = 0;
  const re = new RegExp(`INSERT INTO \`${tableName}\``, 'g');
  let sf = 0;
  while (true) {
    const idx = sql.indexOf(`INSERT INTO \`${tableName}\``, sf);
    if (idx === -1) break;
    const end = sql.indexOf(';\n', idx);
    const block = sql.substring(idx, end > -1 ? end : idx + 100000);
    const matches = block.match(/\(\d+/g);
    if (matches) count += matches.length;
    sf = (end > -1 ? end : idx) + 1;
  }
  return count;
}

// Read both SQL files
const gtlSql = fs.readFileSync(path.join(__dirname, '../../time_logger.sql'), 'utf-8');
const hrmsSql = fs.readFileSync(path.join(__dirname, '../../hrms.sql'), 'utf-8');

const gtlTables = extractTables(gtlSql);
const hrmsTables = extractTables(hrmsSql);

const allTableNames = new Set([...Object.keys(gtlTables), ...Object.keys(hrmsTables)]);

console.log('='.repeat(100));
console.log('COMPLETE DATABASE COMPARISON: GTL vs HRMS');
console.log('='.repeat(100));

console.log('\n== TABLE OVERVIEW ==\n');
console.log('Table'.padEnd(30), 'In GTL?'.padEnd(10), 'In HRMS?'.padEnd(10), 'GTL Rows'.padEnd(12), 'HRMS Rows'.padEnd(12), 'Status');
console.log('-'.repeat(100));

const sameNameTables = [];
const gtlOnly = [];
const hrmsOnly = [];

for (const name of [...allTableNames].sort()) {
  const inGtl = !!gtlTables[name];
  const inHrms = !!hrmsTables[name];
  const gtlRows = inGtl ? countRows(gtlSql, name) : 0;
  const hrmsRows = inHrms ? countRows(hrmsSql, name) : 0;

  let status = '';
  if (inGtl && inHrms) { status = '*** BOTH ***'; sameNameTables.push(name); }
  else if (inGtl) { status = 'GTL only'; gtlOnly.push(name); }
  else { status = 'HRMS only'; hrmsOnly.push(name); }

  console.log(name.padEnd(30), (inGtl ? 'YES' : '-').padEnd(10), (inHrms ? 'YES' : '-').padEnd(10),
    String(gtlRows || '-').padEnd(12), String(hrmsRows || '-').padEnd(12), status);
}

console.log('\n\n== SAME-NAME TABLES — COLUMN COMPARISON ==\n');

for (const name of sameNameTables) {
  const gtlCols = gtlTables[name];
  const hrmsCols = hrmsTables[name];

  console.log(`\n--- ${name.toUpperCase()} ---`);
  console.log(`  GTL columns (${gtlCols.length}):`, gtlCols.map(c => c.name).join(', '));
  console.log(`  HRMS columns (${hrmsCols.length}):`, hrmsCols.map(c => c.name).join(', '));

  const gtlColNames = new Set(gtlCols.map(c => c.name));
  const hrmsColNames = new Set(hrmsCols.map(c => c.name));

  const onlyInGtl = [...gtlColNames].filter(c => !hrmsColNames.has(c));
  const onlyInHrms = [...hrmsColNames].filter(c => !gtlColNames.has(c));
  const inBoth = [...gtlColNames].filter(c => hrmsColNames.has(c));

  if (onlyInGtl.length) console.log(`  ONLY in GTL: ${onlyInGtl.join(', ')}`);
  if (onlyInHrms.length) console.log(`  ONLY in HRMS: ${onlyInHrms.join(', ')}`);
  console.log(`  In BOTH: ${inBoth.join(', ')}`);
}

console.log('\n\n== GTL-ONLY TABLES ==');
for (const name of gtlOnly) {
  console.log(`  ${name}: ${gtlTables[name].map(c => c.name).join(', ')}`);
}

console.log('\n== HRMS-ONLY TABLES ==');
for (const name of hrmsOnly) {
  console.log(`  ${name}: ${hrmsTables[name].map(c => c.name).join(', ')}`);
}

console.log('\n\n== SUMMARY ==');
console.log(`Tables in GTL: ${Object.keys(gtlTables).length}`);
console.log(`Tables in HRMS: ${Object.keys(hrmsTables).length}`);
console.log(`Same-name tables: ${sameNameTables.length} (${sameNameTables.join(', ')})`);
console.log(`GTL-only tables: ${gtlOnly.length} (${gtlOnly.join(', ')})`);
console.log(`HRMS-only tables: ${hrmsOnly.length} (${hrmsOnly.join(', ')})`);
