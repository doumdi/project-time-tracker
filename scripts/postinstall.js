// scripts/postinstall.js
// Install dmg-license only on macOS to avoid pulling it on Linux/Windows runners
const { execSync } = require('child_process');

try {
  if (process.platform === 'darwin') {
    console.log('macOS detected — installing dmg-license for dmg generation');
    // install locally without saving to package.json
    execSync('npm install --no-save dmg-license@^1.0.11', { stdio: 'inherit' });
    console.log('dmg-license installed');
  } else {
    console.log('Non-macOS platform detected — skipping dmg-license install');
  }
} catch (err) {
  console.error('postinstall: error installing dmg-license', err);
  // do not fail the whole install
}
