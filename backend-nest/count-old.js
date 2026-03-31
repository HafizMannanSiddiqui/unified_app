const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../../time_logger.sql'), 'utf-8');
let total = 0;
let sf = 0;
while (true) {
  const idx = sql.indexOf("INSERT INTO `data`", sf);
  if (idx === -1) break;
  const end = sql.indexOf(';\n', idx);
  const block = sql.substring(idx, end > -1 ? end : sql.length);
  const matches = block.match(/\(\d+,\s*'/g);
  if (matches) total += matches.length;
  sf = (end > -1 ? end : idx) + 1;
}
console.log('Total data rows in old GTL SQL:', total);
