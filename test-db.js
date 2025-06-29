// Simple test to verify database operations
const path = require('path');
const fs = require('fs');

// Mock app for testing
const mockApp = {
  getPath: () => path.join(__dirname, '../data'),
  whenReady: () => Promise.resolve(),
  isReady: () => true
};

// Set up test environment
global.app = mockApp;

const database = require('./src/database/db');

async function testDatabase() {
  console.log('Testing database operations...');
  
  try {
    // Initialize database
    await database.initDatabase();
    console.log('✅ Database initialized successfully');

    // Test adding a project
    const project = await database.addProject({
      name: 'Test Project',
      description: 'A test project',
      color: '#4CAF50'
    });
    console.log('✅ Project added:', project);

    // Test getting projects
    const projects = await database.getProjects();
    console.log('✅ Projects retrieved:', projects.length);

    // Test adding time entry
    const timeEntry = await database.addTimeEntry({
      project_id: project.id,
      description: 'Test work',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration: 30
    });
    console.log('✅ Time entry added:', timeEntry);

    // Test getting time entries
    const entries = await database.getTimeEntries();
    console.log('✅ Time entries retrieved:', entries.length);

    // Test time summary
    const summary = await database.getTimeSummary();
    console.log('✅ Time summary:', summary.length);

    console.log('\n🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();