// Migrate profile data from old HRMS SQL into unified_app PostgreSQL
// Fills in empty profiles with data from the old system

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = 'postgresql://postgres:angular123@localhost:5433/unified_app';
const SQL_FILE = path.join(__dirname, '../../../old_system/hrms.sql');

async function run() {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();

  // Read the SQL file
  const sql = fs.readFileSync(SQL_FILE, 'utf8');

  // Extract profile INSERT data
  const profileMatch = sql.match(/INSERT INTO `profiles`.*?VALUES\s*([\s\S]*?);\s*(?:--|CREATE|INSERT|$)/);
  if (!profileMatch) { console.log('No profile data found'); await c.end(); return; }

  const rows = profileMatch[1].split(/\),\s*\(/);
  console.log(`Found ${rows.length} profile rows in old HRMS`);

  let updated = 0, skipped = 0, notFound = 0;

  for (const row of rows) {
    // Clean up the row
    const clean = row.replace(/^\(/, '').replace(/\)$/, '');
    // Parse values - split by comma but respect quotes
    const values = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === "'" && clean[i-1] !== '\\') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        values.push(current.trim().replace(/^'|'$/g, ''));
        current = '';
        continue;
      }
      current += ch;
    }
    values.push(current.trim().replace(/^'|'$/g, ''));

    // Map: Id, unique_id, user_name, first_name, last_name, father_name, father_occupation, mother_occupation,
    // cnic, contact_no, email, dob, marital_status, nationality, blood_group, passport, passport_no, expiry_date,
    // international_tour, visited_countries, current_address, permanent_address, career_objectives,
    // team_id, report_to, job_title, df_job, sitting_location, passion, sibling, dependents,
    // language, hobbies, doj, house, vehicle, picture, active, updated_by, created_at, updated_at
    const username = values[2];
    const firstName = values[3];
    const lastName = values[4];
    const fatherName = values[5];
    const fatherOccupation = values[6];
    const motherOccupation = values[7];
    const cnic = values[8];
    const contactNo = values[9];
    const personalEmail = values[10];
    const dob = values[11] && values[11] !== '0000-00-00' ? values[11] : null;
    const maritalStatus = values[12];
    const nationality = values[13];
    const bloodGroup = values[14];
    const passportStatus = values[15] || 'no';
    const passportNo = values[16];
    const passportExpiry = values[17] && values[17] !== '0000-00-00' ? values[17] : null;
    const internationalTour = values[18] === 'yes';
    const visitedCountries = values[19] ? values[19].split(',').map(s => s.trim()).filter(Boolean) : [];
    const currentAddress = values[20];
    const permanentAddress = values[21];
    const careerObjectives = values[22];
    const jobTitle = values[25];
    const dfJob = values[26];
    const sittingLocation = values[27];
    const passion = values[28];
    const siblings = parseInt(values[29]) || 0;
    const dependents = parseInt(values[30]) || 0;
    const languages = values[31] ? values[31].split(',').map(s => s.trim()).filter(Boolean) : [];
    const hobbies = values[32] ? values[32].split(',').map(s => s.trim()).filter(Boolean) : [];
    const doj = values[33] && values[33] !== 'NULL' && values[33] !== '0000-00-00' ? values[33] : null;
    const house = values[34];
    const vehicle = values[35];

    if (!username || !firstName) { skipped++; continue; }

    // Find the user in our DB
    const userResult = await c.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userResult.rows.length === 0) { notFound++; continue; }
    const userId = userResult.rows[0].id;

    // Check if profile already has data
    const profileResult = await c.query("SELECT id, first_name FROM profiles WHERE user_id = $1", [userId]);
    if (profileResult.rows.length === 0) { skipped++; continue; }
    if (profileResult.rows[0].first_name && profileResult.rows[0].first_name.length > 0) { skipped++; continue; }

    // Update the profile
    await c.query(`
      UPDATE profiles SET
        first_name = $1, last_name = $2, father_name = $3, father_occupation = $4,
        mother_occupation = $5, cnic = $6, contact_no = $7, personal_email = $8,
        dob = $9, marital_status = $10, nationality = $11, blood_group = $12,
        passport_status = $13, passport_no = $14, passport_expiry = $15,
        international_tour = $16, visited_countries = $17,
        current_address = $18, permanent_address = $19, career_objectives = $20,
        job_title = $21, df_job = $22, sitting_location = $23, passion = $24,
        siblings = $25, dependents = $26, languages = $27, hobbies = $28,
        date_of_joining = $29, house = $30, vehicle = $31,
        updated_at = NOW()
      WHERE user_id = $32
    `, [
      firstName, lastName, fatherName, fatherOccupation, motherOccupation,
      cnic || null, contactNo, personalEmail, dob, maritalStatus, nationality, bloodGroup,
      passportStatus, passportNo || null, passportExpiry, internationalTour,
      visitedCountries.length > 0 ? `{${visitedCountries.map(v => `"${v}"`).join(',')}}` : '{}',
      currentAddress, permanentAddress, careerObjectives,
      jobTitle, dfJob, sittingLocation, passion,
      siblings, dependents,
      languages.length > 0 ? `{${languages.map(l => `"${l}"`).join(',')}}` : '{}',
      hobbies.length > 0 ? `{${hobbies.map(h => `"${h}"`).join(',')}}` : '{}',
      doj, house, vehicle, userId,
    ]);
    updated++;
    if (updated % 10 === 0) console.log(`Updated ${updated} profiles...`);
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}, Not found: ${notFound}`);

  // Verify
  const filled = await c.query("SELECT count(*) FROM profiles WHERE first_name IS NOT NULL AND first_name != ''");
  console.log('Total profiles with data now:', filled.rows[0].count);

  await c.end();
}

run().catch(console.error);
