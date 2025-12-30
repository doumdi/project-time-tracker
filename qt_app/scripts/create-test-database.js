#!/usr/bin/env node

/**
 * Create Test Database for Qt App
 * 
 * This script creates a populated SQLite database using the Electron app's
 * demo data infrastructure, which can then be used for testing the Qt app.
 * 
 * The database will be created at: qt_app/tests/test_database.db
 * 
 * Usage:
 *   npm run create-qt-test-db
 *   or: node qt_app/scripts/create-test-database.js
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const testDbPath = path.join(__dirname, '../tests/test_database.db');
const electronDbPath = path.join(__dirname, '../../data/timetracker.db');

console.log('Creating test database for Qt app...\n');

async function createTestDatabase() {
  try {
    // Remove existing test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('✓ Removed existing test database');
    }

    // Clean up Electron database directory
    const dataDir = path.join(__dirname, '../../data');
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
      console.log('✓ Cleaned up data directory');
    }

    // Run the Electron populate script
    console.log('✓ Running Electron populate script...\n');
    const { stdout } = await execPromise('node scripts/populate-dev-data.js', {
      cwd: path.join(__dirname, '../..')
    });
    
    // Show relevant output
    const lines = stdout.split('\n');
    const summaryStart = lines.findIndex(l => l.includes('📊 Summary'));
    if (summaryStart >= 0) {
      console.log(lines.slice(summaryStart).join('\n'));
    }
    
    // Copy the populated database to test location
    if (!fs.existsSync(electronDbPath)) {
      throw new Error('Electron database was not created');
    }
    
    fs.copyFileSync(electronDbPath, testDbPath);
    console.log(`\n✅ Test database created successfully!`);
    console.log(`   Location: ${testDbPath}`);
    
    // Show database stats
    const stats = fs.statSync(testDbPath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    console.log('\n💡 This database can now be used for Qt app testing');
    console.log('   It contains the same schema and demo data as the Electron app\n');
    
  } catch (error) {
    console.error('\n❌ Error creating test database:', error.message);
    process.exit(1);
  }
}

createTestDatabase();
