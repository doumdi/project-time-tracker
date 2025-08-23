#!/usr/bin/env node

/**
 * Developer Database Population Script
 * 
 * This script populates the Project Time Tracker database with realistic
 * development data for a developer working ~40 hours per week across
 * 10 different projects. It also creates fake BLE devices and office
 * presence data for demonstration purposes.
 * 
 * Features:
 * - Creates 10 diverse software development projects
 * - Generates realistic time entries for the last 3 months (~40h/week)
 * - Includes natural work patterns (no weekends, lunch breaks, etc.)
 * - Creates BLE devices with realistic MAC addresses
 * - Generates office presence data that correlates with work hours
 * - Adds project budgets and realistic descriptions
 * 
 * Usage:
 *   node scripts/populate-dev-data.js [--clear]
 * 
 * Options:
 *   --clear    Clear existing data before populating (optional)
 * 
 * Author: Generated for Project Time Tracker
 * License: MIT
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Set up database path
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'timetracker.db');

// Project templates with realistic development projects
const PROJECT_TEMPLATES = [
  {
    name: 'E-commerce Platform',
    description: 'Next.js e-commerce platform with Stripe integration',
    color: '#FF6B6B',
    budget: 15000,
    start_date: '2024-09-01',
    end_date: '2024-12-31'
  },
  {
    name: 'Mobile Banking App',
    description: 'React Native banking application with biometric authentication',
    color: '#4ECDC4',
    budget: 25000,
    start_date: '2024-08-15',
    end_date: '2025-02-28'
  },
  {
    name: 'AI Chat Assistant',
    description: 'Python/FastAPI backend for AI-powered customer support',
    color: '#45B7D1',
    budget: 8000,
    start_date: '2024-10-01',
    end_date: '2024-11-30'
  },
  {
    name: 'CRM Dashboard',
    description: 'Vue.js dashboard for customer relationship management',
    color: '#96CEB4',
    budget: 12000,
    start_date: '2024-07-01',
    end_date: '2024-12-15'
  },
  {
    name: 'Inventory System',
    description: 'Full-stack inventory management with barcode scanning',
    color: '#FECA57',
    budget: 18000,
    start_date: '2024-09-15',
    end_date: '2025-01-31'
  },
  {
    name: 'DevOps Pipeline',
    description: 'CI/CD infrastructure setup with Docker and Kubernetes',
    color: '#FF9FF3',
    budget: 6000,
    start_date: '2024-10-15',
    end_date: '2024-11-15'
  },
  {
    name: 'Analytics Platform',
    description: 'Real-time data analytics with D3.js visualizations',
    color: '#54A0FF',
    budget: 20000,
    start_date: '2024-08-01',
    end_date: '2024-12-31'
  },
  {
    name: 'Content Management',
    description: 'Headless CMS with GraphQL API and React admin panel',
    color: '#5F27CD',
    budget: 10000,
    start_date: '2024-09-01',
    end_date: '2024-11-30'
  },
  {
    name: 'IoT Monitoring',
    description: 'IoT device monitoring dashboard with real-time alerts',
    color: '#00D2D3',
    budget: 14000,
    start_date: '2024-10-01',
    end_date: '2025-01-15'
  },
  {
    name: 'Learning Platform',
    description: 'Online learning platform with video streaming and quizzes',
    color: '#FF6348',
    budget: 22000,
    start_date: '2024-07-15',
    end_date: '2025-03-31'
  }
];

// BLE device templates
const BLE_DEVICE_TEMPLATES = [
  {
    name: 'Developer iPhone',
    mac_address: 'A4:83:E7:12:34:56',
    device_type: 'smartphone',
    is_enabled: true
  },
  {
    name: 'Apple Watch Series 9',
    mac_address: 'B8:27:EB:78:90:AB',
    device_type: 'smartwatch',
    is_enabled: true
  },
  {
    name: 'MacBook Pro Bluetooth',
    mac_address: 'DC:A6:32:CD:EF:12',
    device_type: 'laptop',
    is_enabled: true
  },
  {
    name: 'AirPods Pro',
    mac_address: 'F0:18:98:34:56:78',
    device_type: 'headphones',
    is_enabled: true
  },
  {
    name: 'Backup Android Phone',
    mac_address: '2C:F0:EE:9A:BC:DE',
    device_type: 'smartphone',
    is_enabled: false
  }
];

// Common development task descriptions
const TASK_DESCRIPTIONS = [
  'Frontend component development',
  'API endpoint implementation',
  'Database schema design',
  'Code review and debugging',
  'Unit test implementation',
  'Documentation writing',
  'Performance optimization',
  'UI/UX improvements',
  'Integration testing',
  'Bug fixing and patches',
  'Feature planning meeting',
  'Sprint planning session',
  'Architecture discussion',
  'Database migration',
  'Security audit and fixes',
  'Deployment and monitoring',
  'Client requirements gathering',
  'Technical research',
  'Refactoring legacy code',
  'Third-party integration'
];

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random element from an array
 */
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate realistic work hours for a given date
 * Returns array of work sessions for the day
 */
function generateWorkDay(date, projects) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  // Skip weekends mostly (10% chance of weekend work)
  if (isWeekend && Math.random() > 0.1) {
    return [];
  }
  
  const sessions = [];
  const workStartHour = randomInt(8, 10); // Start between 8-10 AM
  const workEndHour = randomInt(17, 19); // End between 5-7 PM
  
  // Generate 2-4 work sessions throughout the day
  const sessionCount = randomInt(2, 4);
  let currentTime = new Date(date);
  currentTime.setHours(workStartHour, randomInt(0, 59), 0, 0);
  
  for (let i = 0; i < sessionCount; i++) {
    const project = randomChoice(projects);
    const sessionLength = randomInt(30, 180); // 30 minutes to 3 hours
    const description = randomChoice(TASK_DESCRIPTIONS);
    
    const startTime = new Date(currentTime);
    const endTime = new Date(currentTime.getTime() + sessionLength * 60000);
    
    // Don't go past work end time
    if (endTime.getHours() > workEndHour) {
      break;
    }
    
    sessions.push({
      project_id: project.id,
      description,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration: sessionLength
    });
    
    // Add break between sessions (15-60 minutes)
    currentTime = new Date(endTime.getTime() + randomInt(15, 60) * 60000);
  }
  
  return sessions;
}

/**
 * Generate office presence data correlated with work sessions
 */
function generateOfficePresence(date, workSessions, devices) {
  if (workSessions.length === 0) return [];
  
  const enabledDevices = devices.filter(d => d.is_enabled);
  if (enabledDevices.length === 0) return [];
  
  const device = randomChoice(enabledDevices);
  
  // Office presence spans the entire work day with some buffer
  const firstSession = workSessions[0];
  const lastSession = workSessions[workSessions.length - 1];
  
  const arrivalTime = new Date(new Date(firstSession.start_time).getTime() - randomInt(5, 30) * 60000);
  const departureTime = new Date(new Date(lastSession.end_time).getTime() + randomInt(5, 30) * 60000);
  
  const duration = Math.round((departureTime - arrivalTime) / 60000);
  
  return [{
    date: date.toISOString().split('T')[0],
    start_time: arrivalTime.toISOString(),
    end_time: departureTime.toISOString(),
    duration,
    device_id: device.id
  }];
}

/**
 * Execute a SQL statement and return a promise
 */
function runSQL(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Clear existing data if requested
 */
async function clearData(db) {
  console.log('🧹 Clearing existing data...');
  
  const tables = ['time_entries', 'office_presence', 'ble_devices', 'projects'];
  
  for (const table of tables) {
    try {
      await runSQL(db, `DELETE FROM ${table}`);
      console.log(`✅ Cleared ${table} table`);
    } catch (err) {
      console.error(`❌ Error clearing ${table}:`, err.message);
    }
  }
}

/**
 * Initialize database with required tables
 */
async function initializeTables(db) {
  const createQueries = [
    `CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#4CAF50',
      budget DECIMAL(10,2) DEFAULT 0,
      start_date DATE,
      end_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ble_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mac_address TEXT UNIQUE NOT NULL,
      device_type TEXT DEFAULT 'unknown',
      is_enabled BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS office_presence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration INTEGER NOT NULL,
      device_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES ble_devices (id) ON DELETE SET NULL
    )`
  ];

  for (const query of createQueries) {
    await runSQL(db, query);
  }
}

/**
 * Main population function
 */
async function populateDatabase() {
  return new Promise(async (resolve, reject) => {
    console.log('🚀 Starting database population...');
    
    // Check command line arguments
    const shouldClear = process.argv.includes('--clear');
    
    // Connect to database
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err);
        reject(err);
        return;
      }
      
      try {
        console.log('✅ Database connection established');
        
        // Initialize tables
        await initializeTables(db);
        
        if (shouldClear) {
          await clearData(db);
        }
        
        // 1. Create projects
        console.log('\n📁 Creating projects...');
        const projects = [];
        for (const template of PROJECT_TEMPLATES) {
          try {
            const result = await runSQL(db, 
              'INSERT INTO projects (name, description, color, budget, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
              [template.name, template.description, template.color, template.budget, template.start_date, template.end_date]
            );
            projects.push({ id: result.lastID, ...template });
            console.log(`  ✅ Created project: ${template.name}`);
          } catch (err) {
            console.error(`  ❌ Failed to create project ${template.name}:`, err.message);
          }
        }
        
        // 2. Create BLE devices
        console.log('\n📱 Creating BLE devices...');
        const devices = [];
        for (const template of BLE_DEVICE_TEMPLATES) {
          try {
            const result = await runSQL(db,
              'INSERT INTO ble_devices (name, mac_address, device_type, is_enabled) VALUES (?, ?, ?, ?)',
              [template.name, template.mac_address, template.device_type, template.is_enabled]
            );
            devices.push({ id: result.lastID, ...template });
            console.log(`  ✅ Created BLE device: ${template.name} (${template.mac_address})`);
          } catch (err) {
            console.error(`  ❌ Failed to create BLE device ${template.name}:`, err.message);
          }
        }
        
        // 3. Generate time entries for the last 3 months
        console.log('\n⏰ Generating time entries for last 3 months...');
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        
        let totalEntries = 0;
        let totalMinutes = 0;
        
        // Iterate through each day
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const workSessions = generateWorkDay(new Date(d), projects);
          
          // Add time entries
          for (const session of workSessions) {
            try {
              await runSQL(db,
                'INSERT INTO time_entries (project_id, description, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?)',
                [session.project_id, session.description, session.start_time, session.end_time, session.duration]
              );
              totalEntries++;
              totalMinutes += session.duration;
            } catch (err) {
              console.error(`  ❌ Failed to create time entry:`, err.message);
            }
          }
          
          // Add office presence
          const presenceSessions = generateOfficePresence(new Date(d), workSessions, devices);
          for (const presence of presenceSessions) {
            try {
              await runSQL(db,
                'INSERT INTO office_presence (date, start_time, end_time, duration, device_id) VALUES (?, ?, ?, ?, ?)',
                [presence.date, presence.start_time, presence.end_time, presence.duration, presence.device_id]
              );
            } catch (err) {
              console.error(`  ❌ Failed to create office presence:`, err.message);
            }
          }
        }
        
        console.log(`  ✅ Created ${totalEntries} time entries`);
        console.log(`  ✅ Total time tracked: ${Math.round(totalMinutes / 60)} hours`);
        console.log(`  ✅ Average per week: ${Math.round((totalMinutes / 60) / 12)} hours`);
        
        console.log('\n🎉 Database population completed successfully!');
        console.log('\nGenerated data summary:');
        console.log(`  • ${projects.length} software development projects`);
        console.log(`  • ${devices.length} BLE devices for presence tracking`);
        console.log(`  • ${totalEntries} time entries over 3 months`);
        console.log(`  • ${Math.round(totalMinutes / 60)} total hours logged`);
        console.log(`  • Realistic work patterns (no weekends, breaks, etc.)`);
        
        console.log('\n💡 You can now:');
        console.log('  • Take screenshots with populated data');
        console.log('  • Test all application features');
        console.log('  • Run analytics and reports');
        console.log('  • Demonstrate BLE presence tracking');
        
        console.log('\n🔄 To repopulate with fresh data, run:');
        console.log('  node scripts/populate-dev-data.js --clear');
        
        // Close database
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err);
            reject(err);
          } else {
            console.log('✅ Database connection closed');
            resolve();
          }
        });
        
      } catch (error) {
        console.error('❌ Database population failed:', error);
        db.close();
        reject(error);
      }
    });
  });
}

// Run the script
if (require.main === module) {
  populateDatabase()
    .then(() => {
      console.log('\n✨ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  populateDatabase
};