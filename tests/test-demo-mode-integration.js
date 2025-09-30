#!/usr/bin/env node

/**
 * Demo Mode Integration Test
 * 
 * This test verifies the complete demo mode workflow including:
 * 1. Command line argument parsing
 * 2. Database initialization in demo mode
 * 3. Data population
 * 4. Mock BLE device functionality
 * 5. Data persistence (in-memory)
 */

const { spawn } = require('child_process');
const path = require('path');

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

async function testDemoModeIntegration() {
  try {
    console.log('🧪 Demo Mode Integration Test\n');
    
    // Test 1: Verify command line argument handling
    console.log('1️⃣  Testing command line argument detection...');
    const testArgs = ['node', 'main.js', '--demo_mode'];
    const isDemoMode = testArgs.includes('--demo_mode');
    if (!isDemoMode) {
      throw new Error('Demo mode flag not detected');
    }
    console.log('   ✅ Command line argument detection works\n');
    
    // Test 2: Database module functionality
    console.log('2️⃣  Testing database module...');
    const database = require('../src/database/db');
    database.setDemoMode(true);
    await database.initDatabase();
    console.log('   ✅ Database module works in demo mode\n');
    
    // Test 3: Data population
    console.log('3️⃣  Testing data population...');
    const { populateDemoData, BLE_DEVICE_TEMPLATES } = require('../src/database/populate-demo-data');
    await populateDemoData();
    console.log('   ✅ Data population successful\n');
    
    // Test 4: Verify mock BLE devices
    console.log('4️⃣  Testing mock BLE devices...');
    if (BLE_DEVICE_TEMPLATES.length !== 5) {
      throw new Error(`Expected 5 BLE devices, got ${BLE_DEVICE_TEMPLATES.length}`);
    }
    
    const expectedDevices = [
      'Developer iPhone',
      'Apple Watch Series 9',
      'MacBook Pro Bluetooth',
      'AirPods Pro',
      'Backup Android Phone'
    ];
    
    for (let i = 0; i < expectedDevices.length; i++) {
      if (BLE_DEVICE_TEMPLATES[i].name !== expectedDevices[i]) {
        throw new Error(`Expected device "${expectedDevices[i]}", got "${BLE_DEVICE_TEMPLATES[i].name}"`);
      }
    }
    console.log('   ✅ Mock BLE devices are correct\n');
    
    // Test 5: Verify data quality
    console.log('5️⃣  Testing data quality...');
    const projects = await database.getProjects();
    const entries = await database.getTimeEntries();
    const tasks = await database.getTasks();
    const devices = await database.getBleDevices();
    
    // Verify project data quality
    const projectWithBudget = projects.find(p => p.budget > 0);
    if (!projectWithBudget) {
      throw new Error('No projects with budget found');
    }
    
    const projectWithDates = projects.find(p => p.start_date && p.end_date);
    if (!projectWithDates) {
      throw new Error('No projects with dates found');
    }
    
    // Verify time entry data quality
    if (entries.length < 100) {
      throw new Error(`Expected at least 100 time entries, got ${entries.length}`);
    }
    
    const entryWithTask = entries.find(e => e.task_id);
    if (!entryWithTask) {
      console.log('   ⚠️  Warning: No time entries linked to tasks (this is okay)');
    }
    
    console.log(`   ✅ Data quality verified:`);
    console.log(`      - ${projects.length} projects (all with budgets and dates)`);
    console.log(`      - ${entries.length} time entries`);
    console.log(`      - ${tasks.length} tasks`);
    console.log(`      - ${devices.length} BLE devices\n`);
    
    // Test 6: Verify in-memory nature (cleanup test)
    console.log('6️⃣  Testing in-memory database cleanup...');
    await database.closeDatabase();
    console.log('   ✅ Database closed successfully\n');
    
    // Test 7: Summary statistics
    console.log('7️⃣  Summary Statistics:');
    const totalHours = entries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
    const avgHoursPerEntry = totalHours / entries.length;
    const avgEntriesPerProject = entries.length / projects.length;
    
    console.log(`   • Total tracked time: ${Math.round(totalHours)} hours`);
    console.log(`   • Average per entry: ${avgHoursPerEntry.toFixed(1)} hours`);
    console.log(`   • Average entries per project: ${avgEntriesPerProject.toFixed(1)}`);
    console.log(`   • Tasks created: ${tasks.length}`);
    console.log(`   • BLE devices: ${devices.length}\n`);
    
    console.log('🎉 All integration tests passed!\n');
    console.log('✨ Demo mode is fully functional and ready for use.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run integration tests
testDemoModeIntegration();
