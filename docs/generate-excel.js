const ExcelJS = require('exceljs');
const path = require('path');

async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Abdul Mannan Siddiqui';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Sprint Plan', { properties: { tabColor: { argb: '154360' } } });
  sheet.columns = [
    { header: 'Day', width: 16 },
    { header: 'Task', width: 90 },
    { header: 'Status', width: 12 },
  ];

  sheet.getRow(1).eachCell(c => {
    c.font = { size: 11, bold: true, color: { argb: 'FFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '154360' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  sheet.getRow(1).height = 24;

  const tasks = [
    // WEEK 1 — Done
    ['Mon 31 Mar', 'Understand the Architecture of old GTL & HRMS, RnD on how we can merge Tables of GTL & HRMS. Plan strategies how to build things', 'Done'],
    ['Tue 01 Apr', 'Create Unified system, GTL & HRMS, Migrate Data', 'Done'],
    ['Wed 02 Apr', 'Role based dashboards, find loop holes and fix them', 'Done'],
    ['Thu 03 Apr', 'Create Swagger, Org. charts, few minor tweaks', 'Done'],
    ['Fri 04 Apr', 'Review the whole system, every single page and functionality, Consistent theming', 'Done'],

    // WEEK 2 — Done + Plan
    ['Mon 07 Apr', 'Data Seeding, verify roles and fix teams and reportings', 'Done'],
    ['Tue 08 Apr', 'Add visual charts on dashboard — attendance trends, hours by project, team performance graphs', 'Planned'],
    ['Wed 09 Apr', 'Email alerts when leave is approved/rejected, when WFH is assigned, when attendance request is handled', 'Planned'],
    ['Thu 10 Apr', 'Allow employees to upload profile photo or capture from webcam. Show photos in directory, org chart, CV', 'Planned'],
    ['Fri 11 Apr', 'HR can upload Excel file to bulk-fill employee profiles (430 employees have empty profiles)', 'Planned'],

    // WEEK 3 — Plan
    ['Mon 14 Apr', 'Auto-sync ZKTeco biometric devices every 5 minutes instead of manual sync. Auto-close missed checkouts at midnight', 'Planned'],
    ['Tue 15 Apr', 'Test entire system on mobile phones and tablets — make sure everything works on small screens', 'Planned'],
    ['Wed 16 Apr', 'Setup production server — install Nginx, SSL certificate, configure domain, database backups', 'Planned'],
    ['Thu 17 Apr', 'Deploy application on production server alongside old PHP systems (zero downtime, both run together)', 'Planned'],
    ['Fri 18 Apr', 'Full testing with real users — employee login, lead approval, admin management. Get sign-off for go-live', 'Planned'],
  ];

  tasks.forEach((t, i) => {
    const row = sheet.addRow(t);

    row.eachCell((c, col) => {
      c.font = { size: 11 };
      c.alignment = { vertical: 'middle', wrapText: col === 2 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'F0F7FF' : 'FFFFFF' } };
      c.border = { bottom: { style: 'thin', color: { argb: 'E0E0E0' } } };
    });

    row.getCell(1).font = { size: 11, bold: true, color: { argb: '154360' } };
    row.getCell(2).font = { size: 11, color: { argb: '333333' } };

    const s = row.getCell(3);
    if (t[2] === 'Done') {
      s.font = { size: 11, bold: true, color: { argb: '389E0D' } };
      s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F6FFED' } };
    } else {
      s.font = { size: 11, bold: true, color: { argb: 'D48806' } };
      s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7E6' } };
    }

    row.height = 32;
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const outPath = path.join(__dirname, 'Sprint_Plan_Abdul_Mannan.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('Saved:', outPath);
}

generate().catch(console.error);
