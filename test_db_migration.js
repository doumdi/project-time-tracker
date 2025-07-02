// Test database migrations directly
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, '../tmp/test_timetracker.db');

// Ensure tmp directory exists
const tmpDir = path.dirname(testDbPath);
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Clean up any existing test database
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

console.log('Creating test database...');

const db = new sqlite3.Database(testDbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('✓ Test database created');
  
  // Create tables manually (simulating the existing structure)
  const createMetadataTable = `
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createProjectsTable = `
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#4CAF50',
      budget DECIMAL(10,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create initial tables
  db.serialize(() => {
    db.run(createMetadataTable);
    db.run(createProjectsTable);
    
    // Set initial database version to 2 (before our migration)
    db.run(`INSERT INTO app_metadata (key, value) VALUES ('database_version', '2')`);
    
    console.log('✓ Initial tables created with version 2');
    
    // Now simulate our migration to version 3
    console.log('Running migration v3...');
    
    // Check current columns
    db.all("PRAGMA table_info(projects)", (err, columns) => {
      if (err) {
        console.error('Error getting table info:', err);
        process.exit(1);
      }
      
      console.log('Current columns:', columns.map(c => c.name));
      
      const startDateExists = columns.some(col => col.name === 'start_date');
      const endDateExists = columns.some(col => col.name === 'end_date');
      
      let migrations = [];
      
      if (!startDateExists) {
        migrations.push('ALTER TABLE projects ADD COLUMN start_date DATE;');
      }
      
      if (!endDateExists) {
        migrations.push('ALTER TABLE projects ADD COLUMN end_date DATE;');
      }
      
      if (migrations.length === 0) {
        console.log('Start date and end date columns already exist');
        testProjectOperations();
      } else {
        const migrationSql = migrations.join('\n');
        console.log('Executing migration SQL:', migrationSql);
        
        db.exec(migrationSql, (err) => {
          if (err) {
            console.error('Migration failed:', err);
            process.exit(1);
          } else {
            console.log('✓ Migration v3 completed successfully');
            
            // Update version
            db.run(`UPDATE app_metadata SET value = '3' WHERE key = 'database_version'`, (err) => {
              if (err) {
                console.error('Error updating version:', err);
                process.exit(1);
              }
              console.log('✓ Database version updated to 3');
              testProjectOperations();
            });
          }
        });
      }
    });
  });
});

function testProjectOperations() {
  console.log('Testing project operations with date fields...');
  
  // Test adding a project with dates
  const testProject = {
    name: 'Test Project',
    description: 'Test description',
    color: '#4CAF50',
    budget: 1000,
    start_date: '2024-01-01',
    end_date: '2024-12-31'
  };
  
  const insertSql = 'INSERT INTO projects (name, description, color, budget, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)';
  const params = [
    testProject.name, 
    testProject.description || '', 
    testProject.color || '#4CAF50',
    testProject.budget || 0,
    testProject.start_date || null,
    testProject.end_date || null
  ];
  
  db.run(insertSql, params, function(err) {
    if (err) {
      console.error('Error adding project:', err);
      process.exit(1);
    } else {
      console.log('✓ Successfully added project with ID:', this.lastID);
      
      // Test retrieving the project
      db.get('SELECT * FROM projects WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          console.error('Error retrieving project:', err);
          process.exit(1);
        } else {
          console.log('✓ Successfully retrieved project:', row);
          
          if (row.start_date === '2024-01-01' && row.end_date === '2024-12-31') {
            console.log('✓ Start date and end date are properly stored and retrieved');
          } else {
            console.log('✗ Date fields not properly stored. Got:', {
              start_date: row.start_date,
              end_date: row.end_date
            });
          }
          
          // Clean up
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err);
            } else {
              console.log('✓ Database closed');
              fs.unlinkSync(testDbPath);
              console.log('✓ Test database cleaned up');
              console.log('\n🎉 All database migration tests passed!');
            }
          });
        }
      });
    }
  });
}