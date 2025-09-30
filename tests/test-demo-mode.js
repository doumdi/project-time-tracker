#!/usr/bin/env node

/**
 * Demo Mode Test Script
 * 
 * This script tests the demo mode database functionality without launching Electron.
 * It verifies that:
 * 1. Demo mode can be enabled
 * 2. In-memory database is created
 * 3. Demo data is populated correctly
 * 4. All data is accessible through the database API
 */

// Mock Electron app for testing
const mockApp = {
  isReady: () => true,
  getPath: () => '/tmp/test-data',
  whenReady: () => Promise.resolve()
};

// Inject mock app
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'electron') {
    return { app: mockApp };
  }
  return originalRequire.apply(this, arguments);
};

const database = require('../src/database/db');
const { populateDemoData } = require('../src/database/populate-demo-data');

async function testDemoMode() {
  try {
    console.log('🧪 Testing Demo Mode Functionality\n');
    
    // Step 1: Enable demo mode
    console.log('1️⃣  Enabling demo mode...');
    database.setDemoMode(true);
    console.log('   ✅ Demo mode enabled\n');
    
    // Step 2: Initialize in-memory database
    console.log('2️⃣  Initializing in-memory database...');
    await database.initDatabase();
    console.log('   ✅ In-memory database initialized\n');
    
    // Step 3: Populate with demo data
    console.log('3️⃣  Populating demo data...');
    await populateDemoData();
    console.log('   ✅ Demo data populated\n');
    
    // Step 4: Verify data
    console.log('4️⃣  Verifying data...');
    
    const projects = await database.getProjects();
    console.log(`   📁 Projects: ${projects.length}`);
    
    const devices = await database.getBleDevices();
    console.log(`   📱 BLE Devices: ${devices.length}`);
    
    const entries = await database.getTimeEntries();
    console.log(`   ⏱️  Time Entries: ${entries.length}`);
    
    const tasks = await database.getTasks();
    console.log(`   ✔️  Tasks: ${tasks.length}`);
    
    if (projects.length > 0) {
      console.log(`\n   Sample Project: "${projects[0].name}"`);
    }
    
    if (devices.length > 0) {
      console.log(`   Sample Device: "${devices[0].name}" (${devices[0].mac_address})`);
    }
    
    // Step 5: Verify data integrity
    console.log('\n5️⃣  Checking data integrity...');
    
    if (projects.length !== 10) {
      throw new Error(`Expected 10 projects, got ${projects.length}`);
    }
    
    if (devices.length !== 5) {
      throw new Error(`Expected 5 devices, got ${devices.length}`);
    }
    
    if (entries.length === 0) {
      throw new Error('Expected time entries, got 0');
    }
    
    console.log('   ✅ All data integrity checks passed\n');
    
    // Step 6: Close database
    console.log('6️⃣  Closing database...');
    await database.closeDatabase();
    console.log('   ✅ Database closed\n');
    
    console.log('🎉 All tests passed! Demo mode is working correctly.\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testDemoMode();
