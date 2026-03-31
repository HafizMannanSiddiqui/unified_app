const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const htmlFile = path.join(__dirname, 'NestJS_Carousel.html');
const pdfFile = path.join(__dirname, 'NestJS_What_Is_NestJS.pdf');
const htmlUrl = 'file:///' + htmlFile.replace(/\\/g, '/');

// Find Edge or Chrome
const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

let browserPath = null;
for (const b of browsers) {
  if (fs.existsSync(b)) { browserPath = b; break; }
}

if (!browserPath) {
  console.log('No browser found. Open this file manually in your browser:');
  console.log(htmlFile);
  console.log('Then press Ctrl+P → Save as PDF');
  process.exit(1);
}

console.log('Using:', browserPath);
console.log('Generating PDF...');

try {
  execSync(`"${browserPath}" --headless --disable-gpu --print-to-pdf="${pdfFile}" --no-margins --print-to-pdf-no-header "${htmlUrl}"`, {
    timeout: 30000,
  });
  console.log('PDF saved:', pdfFile);
} catch (e) {
  console.log('Headless print failed. Trying alternative...');
  // Open in browser for manual print
  execSync(`start "" "${htmlUrl}"`);
  console.log('Browser opened. Press Ctrl+P → Save as PDF → save to:');
  console.log(path.dirname(pdfFile));
}
