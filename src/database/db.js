const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Read version from version.json
const versionFilePath = path.join(__dirname, '../../version.json');
let appVersion = '1.0.0'; // fallback
try {
  const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
  appVersion = `${versionData.major}.${versionData.minor}.${versionData.micro}`;
} catch (err) {
  console.warn('Could not read version.json, using fallback version:', appVersion);
}

// Current database version - increment this when schema changes
const CURRENT_DB_VERSION = 4;

// Get user data directory for database storage
const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '../../data');
const dbPath = path.join(userDataPath, 'timetracker.db');

// Ensure data directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

let db;
let isInitialized = false;

// Close database and cleanup
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      isInitialized = false;
      resolve();
      return;
    }

    try {
      // Attempt to close the database. This will wait for pending statements to finish.
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('Closed SQLite database');
          isInitialized = false;
          db = null;
          resolve();
        }
      });
    } catch (err) {
      console.error('Unexpected error while closing database:', err);
      // Ensure state is cleaned up even on unexpected errors
      } catch (e) {
        console.error('Error during database cleanup:', e);
      }
      reject(err);
    }
  });
}

// Initialize database
function initDatabase() {
  if (isInitialized) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        console.log('Connected to SQLite database at:', dbPath);
        try {
          await createTables();
          const upgradeOccurred = await runMigrations();
          if (upgradeOccurred) {
            console.log('Database has been upgraded to the latest version.');
          }
          isInitialized = true;
          resolve();
        } catch (migrationErr) {
          console.error('Database initialization failed:', migrationErr);
          reject(migrationErr);
        }
      }
    });
  });
}

// Create tables if they don't exist
function createTables() {
  return new Promise((resolve, reject) => {
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createTimeEntriesTable = `
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER, -- Duration in minutes
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `;

    db.serialize(() => {
      // Create metadata table first
      db.run(createMetadataTable, (err) => {
        if (err) {
          console.error('Error creating app_metadata table:', err);
          reject(err);
          return;
        }
      });

      db.run(createProjectsTable, (err) => {
        if (err) {
          console.error('Error creating projects table:', err);
          reject(err);
          return;
        }
      });

      db.run(createTimeEntriesTable, (err) => {
        if (err) {
          console.error('Error creating time_entries table:', err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
}

// Version management functions
function getDatabaseVersion() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT value FROM app_metadata WHERE key = ?';
    db.get(sql, ['database_version'], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? parseInt(row.value) : 0);
      }
    });
  });
}

function setDatabaseVersion(version) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO app_metadata (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;
    db.run(sql, ['database_version', version.toString()], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getAppVersion() {
  return appVersion;
}

function setAppVersionInDb(version) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO app_metadata (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;
    db.run(sql, ['app_version', version], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Database migration system
function runMigrations() {
  return new Promise(async (resolve, reject) => {
    try {
      const currentDbVersion = await getDatabaseVersion();
      console.log(`Current database version: ${currentDbVersion}, Target version: ${CURRENT_DB_VERSION}`);
      
      if (currentDbVersion < CURRENT_DB_VERSION) {
        console.log('Database upgrade needed. Running migrations...');
        
        // Run migrations from current version to target version
        for (let version = currentDbVersion + 1; version <= CURRENT_DB_VERSION; version++) {
          console.log(`Applying migration to version ${version}`);
          await applyMigration(version);
        }
        
        // Update database version
        await setDatabaseVersion(CURRENT_DB_VERSION);
        await setAppVersionInDb(appVersion);
        
        console.log(`Database upgraded successfully to version ${CURRENT_DB_VERSION}`);
        
        // Notify about upgrade (in a real app, this would be shown in UI)
        console.log('DATABASE UPGRADE COMPLETE: Your database has been upgraded to the latest version.');
        
        resolve(true); // Return true to indicate upgrade occurred
      } else {
        // Update app version in case it changed
        await setAppVersionInDb(appVersion);
        resolve(false); // Return false to indicate no upgrade needed
      }
    } catch (err) {
      console.error('Migration failed:', err);
      reject(err);
    }
  });
}

function applyMigration(version) {
  return new Promise((resolve, reject) => {
    try {
      // Load migration file for the specific version
      const migrationPath = path.join(__dirname, 'upgrades', `v${version}.js`);
      
      // Check if migration file exists
      if (!fs.existsSync(migrationPath)) {
        console.log(`No migration defined for version ${version}`);
        resolve();
        return;
      }
      
      // Require and execute the migration
      const migrationFunction = require(migrationPath);
      migrationFunction(db)
        .then(() => resolve())
        .catch((err) => reject(err));
        
    } catch (err) {
      console.error(`Failed to load migration for version ${version}:`, err);
      reject(err);
    }
  });
}

// Project operations
function getProjects() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT p.*, 
             COUNT(te.id) as entry_count,
             COALESCE(SUM(te.duration), 0) as total_minutes
      FROM projects p
      LEFT JOIN time_entries te ON p.id = te.project_id
      GROUP BY p.id
      ORDER BY p.name
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function addProject(project) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO projects (name, description, color, budget, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [
      project.name, 
      project.description || '', 
      project.color || '#4CAF50',
      project.budget || 0,
      project.start_date || null,
      project.end_date || null
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, ...project });
      }
    });
  });
}

function updateProject(project) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE projects SET name = ?, description = ?, color = ?, budget = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [
      project.name, 
      project.description, 
      project.color, 
      project.budget || 0,
      project.start_date || null,
      project.end_date || null,
      project.id
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(project);
      }
    });
  });
}

function deleteProject(id) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM projects WHERE id = ?';
    
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ deleted: this.changes > 0 });
      }
    });
  });
}

// Time entry operations
function getTimeEntries(filters = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT te.*, p.name as project_name, p.color as project_color
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (filters.projectId) {
      conditions.push('te.project_id = ?');
      params.push(filters.projectId);
    }
    
    if (filters.startDate) {
      conditions.push('date(te.start_time) >= date(?)');
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      conditions.push('date(te.start_time) <= date(?)');
      params.push(filters.endDate);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY te.start_time DESC';
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function addTimeEntry(entry) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO time_entries (project_id, description, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?)';
    const params = [
      entry.project_id,
      entry.description || '',
      entry.start_time,
      entry.end_time,
      entry.duration
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, ...entry });
      }
    });
  });
}

function updateTimeEntry(entry) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE time_entries SET project_id = ?, description = ?, start_time = ?, end_time = ?, duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [
      entry.project_id,
      entry.description,
      entry.start_time,
      entry.end_time,
      entry.duration,
      entry.id
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(entry);
      }
    });
  });
}

function deleteTimeEntry(id) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM time_entries WHERE id = ?';
    
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ deleted: this.changes > 0 });
      }
    });
  });
}

function getTimeSummary(filters = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT 
        p.id,
        p.name,
        p.color,
        COUNT(te.id) as entry_count,
        COALESCE(SUM(te.duration), 0) as total_minutes,
        date(te.start_time) as date
      FROM projects p
      LEFT JOIN time_entries te ON p.id = te.project_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (filters.startDate) {
      conditions.push('date(te.start_time) >= date(?)');
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      conditions.push('date(te.start_time) <= date(?)');
      params.push(filters.endDate);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' GROUP BY p.id, date(te.start_time) ORDER BY date DESC, p.name';
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// BLE device operations
function getBleDevices() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM ble_devices ORDER BY name';
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function addBleDevice(device) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO ble_devices (name, mac_address, device_type, is_enabled) VALUES (?, ?, ?, ?)';
    const params = [
      device.name,
      device.mac_address,
      device.device_type || 'unknown',
      device.is_enabled !== undefined ? device.is_enabled : true
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, ...device });
      }
    });
  });
}

function updateBleDevice(device) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE ble_devices SET name = ?, mac_address = ?, device_type = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [
      device.name,
      device.mac_address,
      device.device_type,
      device.is_enabled,
      device.id
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(device);
      }
    });
  });
}

function deleteBleDevice(id) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM ble_devices WHERE id = ?';
    
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ deleted: this.changes > 0 });
      }
    });
  });
}

// Office presence operations
function getOfficePresence(filters = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT op.*, bd.name as device_name
      FROM office_presence op
      LEFT JOIN ble_devices bd ON op.device_id = bd.id
    `;
    
    const conditions = [];
    const params = [];
    
    if (filters.date) {
      conditions.push('date(op.date) = date(?)');
      params.push(filters.date);
    }
    
    if (filters.startDate) {
      conditions.push('date(op.date) >= date(?)');
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      conditions.push('date(op.date) <= date(?)');
      params.push(filters.endDate);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY op.date DESC, op.start_time DESC';
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function addOfficePresence(presence) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO office_presence (date, start_time, end_time, duration, device_id) VALUES (?, ?, ?, ?, ?)';
    const params = [
      presence.date,
      presence.start_time,
      presence.end_time,
      presence.duration,
      presence.device_id || null
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, ...presence });
      }
    });
  });
}

function updateOfficePresence(presence) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE office_presence SET date = ?, start_time = ?, end_time = ?, duration = ?, device_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [
      presence.date,
      presence.start_time,
      presence.end_time,
      presence.duration,
      presence.device_id,
      presence.id
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(presence);
      }
    });
  });
}

function deleteOfficePresence(id) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM office_presence WHERE id = ?';
    
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ deleted: this.changes > 0 });
      }
    });
  });
}

function getOfficePresenceSummary(filters = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT 
        date,
        COUNT(*) as session_count,
        SUM(duration) as total_minutes
      FROM office_presence
    `;
    
    const conditions = [];
    const params = [];
    
    if (filters.startDate) {
      conditions.push('date >= date(?)');
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      conditions.push('date <= date(?)');
      params.push(filters.endDate);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' GROUP BY date ORDER BY date DESC';
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Initialize database when module is loaded
if (app && app.isReady()) {
  initDatabase();
} else if (app) {
  app.whenReady().then(initDatabase);
} else {
  // For testing or non-electron environments
  initDatabase();
}

module.exports = {
  initDatabase,
  getProjects,
  addProject,
  updateProject,
  deleteProject,
  getTimeEntries,
  addTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeSummary,
  getDatabaseVersion,
  getAppVersion,
  getBleDevices,
  addBleDevice,
  updateBleDevice,
  deleteBleDevice,
  getOfficePresence,
  addOfficePresence,
  updateOfficePresence,
  deleteOfficePresence,
  getOfficePresenceSummary
};