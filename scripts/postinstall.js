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
  
  // If sqlite3 is used in this project, rebuild native bindings for the current
  // Electron runtime to avoid napi/native ABI mismatches that cause crashes.
  try {
    const pkg = require('../package.json');
    const hasSqlite3 = (pkg.dependencies && pkg.dependencies.sqlite3) || (pkg.devDependencies && pkg.devDependencies.sqlite3);
    if (hasSqlite3) {
      console.log('Detected sqlite3 dependency — running electron-rebuild for sqlite3');
      // Use npx so this works without a global install. Do not fail the whole install on error.
      execSync('npx electron-rebuild -f -w sqlite3', { stdio: 'inherit' });
      console.log('electron-rebuild completed for sqlite3');
    }
  } catch (rebuildErr) {
    console.error('postinstall: electron-rebuild failed (non-fatal):', rebuildErr && rebuildErr.message ? rebuildErr.message : rebuildErr);
    // continue without failing the install
  }
} catch (err) {
  console.error('postinstall: error installing dmg-license', err);
  // do not fail the whole install
}
