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
const CURRENT_DB_VERSION = 7;

// Demo mode flag - set by setDemoMode() function
let isDemoMode = false;

// Get user data directory for database storage
const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '../../data');
const dbPath = path.join(userDataPath, 'timetracker.db');

// Ensure data directory exists (skip in demo mode)
if (!isDemoMode && !fs.existsSync(userDataPath)) {
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
      reject(err);
    }
  });
}

// Set demo mode - must be called before initDatabase
function setDemoMode(enabled) {
  isDemoMode = enabled;
  if (enabled) {
    console.log('[DEMO MODE] Database will use in-memory storage');
  }
}

// Initialize database
function initDatabase() {
  if (isInitialized) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    // Use in-memory database for demo mode, file-based for normal mode
    const databasePath = isDemoMode ? ':memory:' : dbPath;
    const modeLabel = isDemoMode ? 'in-memory (DEMO MODE)' : `file at ${dbPath}`;
    
    db = new sqlite3.Database(databasePath, async (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        console.log(`Connected to SQLite database ${modeLabel}`);
        try {
          await createTables();
          // Skip migrations in demo mode (in-memory database starts fresh)
          if (!isDemoMode) {
            const upgradeOccurred = await runMigrations();
            if (upgradeOccurred) {
              console.log('Database has been upgraded to the latest version.');
            }
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

    // In demo mode, include all columns that migrations would add
    const createProjectsTable = isDemoMode ? `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#4CAF50',
        budget DECIMAL(10,2) DEFAULT 0,
        start_date DATE,
        end_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    ` : `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#4CAF50',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createTimeEntriesTable = isDemoMode ? `
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        task_id INTEGER,
        subtask_id INTEGER,
        description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL,
        FOREIGN KEY (subtask_id) REFERENCES subtasks (id) ON DELETE SET NULL
      )
    ` : `
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `;
    
    // BLE devices table (from v4 migration)
    const createBleDevicesTable = `
      CREATE TABLE IF NOT EXISTS ble_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mac_address TEXT UNIQUE NOT NULL,
        device_type TEXT DEFAULT 'unknown',
        is_enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Office presence table (from v4 migration)
    const createOfficePresenceTable = `
      CREATE TABLE IF NOT EXISTS office_presence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER NOT NULL,
        device_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES ble_devices (id) ON DELETE SET NULL
      )
    `;
    
    // Tasks table (from v5 migration, updated in v6)
    const createTasksTable = isDemoMode ? `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        due_date DATE,
        project_id INTEGER NOT NULL,
        allocated_time INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    ` : `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        due_date DATE,
        project_id INTEGER,
        allocated_time INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
      )
    `;
    
    // Subtasks table (from v6 migration)
    const createSubtasksTable = `
      CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_task_id INTEGER NOT NULL,
        is_completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_task_id) REFERENCES tasks (id) ON DELETE CASCADE
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
      });
      
      // Create BLE and task tables (needed for demo mode and v4/v5 migrations)
      db.run(createBleDevicesTable, (err) => {
        if (err) {
          console.error('Error creating ble_devices table:', err);
          reject(err);
          return;
        }
      });
      
      db.run(createOfficePresenceTable, (err) => {
        if (err) {
          console.error('Error creating office_presence table:', err);
          reject(err);
          return;
        }
      });
      
      db.run(createTasksTable, (err) => {
        if (err) {
          console.error('Error creating tasks table:', err);
          reject(err);
          return;
        }
      });
      
      db.run(createSubtasksTable, (err) => {
        if (err) {
          console.error('Error creating subtasks table:', err);
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
    const sql = 'INSERT INTO time_entries (project_id, task_id, subtask_id, description, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const params = [
      entry.project_id,
      entry.task_id || null,
      entry.subtask_id || null,
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
    const sql = 'UPDATE time_entries SET project_id = ?, task_id = ?, subtask_id = ?, description = ?, start_time = ?, end_time = ?, duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [
      entry.project_id,
      entry.task_id || null,
      entry.subtask_id || null,
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

function getOfficePresenceWeeklySummary(referenceDate = null) {
  return new Promise((resolve, reject) => {
    const baseDate = referenceDate || new Date().toISOString().split('T')[0];
    
    let sql = `
      WITH week_dates AS (
        SELECT 
          date(?, '-' || (strftime('%w', ?) - 1) || ' days') as week_start,
          date(?, '-' || (strftime('%w', ?) - 1) || ' days', '+6 days') as week_end
      ),
      all_week_days AS (
        SELECT 
          date(week_start, '+0 days') as date, 1 as day_order FROM week_dates
        UNION ALL SELECT date(week_start, '+1 days') as date, 2 as day_order FROM week_dates
        UNION ALL SELECT date(week_start, '+2 days') as date, 3 as day_order FROM week_dates
        UNION ALL SELECT date(week_start, '+3 days') as date, 4 as day_order FROM week_dates
        UNION ALL SELECT date(week_start, '+4 days') as date, 5 as day_order FROM week_dates
        UNION ALL SELECT date(week_start, '+5 days') as date, 6 as day_order FROM week_dates
        UNION ALL SELECT date(week_start, '+6 days') as date, 7 as day_order FROM week_dates
      )
      SELECT 
        awd.date,
        awd.day_order,
        strftime('%w', awd.date) as day_of_week,
        CASE strftime('%w', awd.date)
          WHEN '0' THEN 'Sunday'
          WHEN '1' THEN 'Monday'
          WHEN '2' THEN 'Tuesday'
          WHEN '3' THEN 'Wednesday'
          WHEN '4' THEN 'Thursday'
          WHEN '5' THEN 'Friday'
          WHEN '6' THEN 'Saturday'
        END as day_name,
        COALESCE(SUM(op.duration), 0) as total_minutes,
        COALESCE(COUNT(op.id), 0) as session_count,
        awd.date = date('now') as is_today
      FROM all_week_days awd
      LEFT JOIN office_presence op ON date(op.date) = awd.date
      GROUP BY awd.date, awd.day_order
      ORDER BY awd.day_order
    `;
    
    db.all(sql, [baseDate, baseDate, baseDate, baseDate], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Task operations
function getTasks(filters = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT t.*, 
             p.name as project_name, 
             p.color as project_color,
             COALESCE(SUM(CASE 
               WHEN te.description LIKE '%' || t.name || '%' 
               THEN te.duration 
               ELSE 0 
             END), 0) as cumulated_time
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN time_entries te ON t.project_id = te.project_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (filters.projectId) {
      conditions.push('t.project_id = ?');
      params.push(filters.projectId);
    }
    
    if (filters.isActive !== undefined) {
      conditions.push('t.is_active = ?');
      params.push(filters.isActive ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' GROUP BY t.id, p.name, p.color';
    sql += ' ORDER BY t.is_active DESC, t.due_date ASC, t.created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          ...row,
          is_active: Boolean(row.is_active)
        })));
      }
    });
  });
}

function addTask(task) {
  return new Promise((resolve, reject) => {
    // Validate that project_id is provided (mandatory as of v6)
    if (!task.project_id) {
      reject(new Error('project_id is required for creating a task'));
      return;
    }
    
    const sql = 'INSERT INTO tasks (name, due_date, project_id, allocated_time) VALUES (?, ?, ?, ?)';
    const params = [
      task.name,
      task.due_date || null,
      task.project_id,
      task.allocated_time || 0
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, ...task });
      }
    });
  });
}

function updateTask(task) {
  return new Promise((resolve, reject) => {
    // Validate that project_id is provided (mandatory as of v6)
    if (!task.project_id) {
      reject(new Error('project_id is required for updating a task'));
      return;
    }
    
    const sql = 'UPDATE tasks SET name = ?, due_date = ?, project_id = ?, allocated_time = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [
      task.name,
      task.due_date || null,
      task.project_id,
      task.allocated_time || 0,
      task.is_active ? 1 : 0,
      task.id
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(task);
      }
    });
  });
}

function deleteTask(id) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM tasks WHERE id = ?';
    
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ deleted: this.changes > 0 });
      }
    });
  });
}

// Subtask operations
function getSubTasks(parentTaskId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM subtasks 
      WHERE parent_task_id = ?
      ORDER BY created_at ASC
    `;
    
    db.all(sql, [parentTaskId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          ...row,
          is_completed: Boolean(row.is_completed)
        })));
      }
    });
  });
}

function addSubTask(subTask) {
  return new Promise((resolve, reject) => {
    // Validate that parent_task_id is provided
    if (!subTask.parent_task_id) {
      reject(new Error('parent_task_id is required for creating a subtask'));
      return;
    }
    
    const sql = 'INSERT INTO subtasks (name, parent_task_id, is_completed) VALUES (?, ?, ?)';
    const params = [
      subTask.name,
      subTask.parent_task_id,
      subTask.is_completed ? 1 : 0
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ 
          id: this.lastID, 
          name: subTask.name,
          parent_task_id: subTask.parent_task_id,
          is_completed: Boolean(subTask.is_completed)
        });
      }
    });
  });
}

function updateSubTask(subTask) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE subtasks SET name = ?, is_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [
      subTask.name,
      subTask.is_completed ? 1 : 0,
      subTask.id
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(subTask);
      }
    });
  });
}

function deleteSubTask(id) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM subtasks WHERE id = ?';
    
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ deleted: this.changes > 0 });
      }
    });
  });
}

function setActiveTask(taskId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // First, deactivate all tasks
      db.run('UPDATE tasks SET is_active = 0, updated_at = CURRENT_TIMESTAMP', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Then activate the specified task if provided
        if (taskId) {
          db.run('UPDATE tasks SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [taskId], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ taskId, activated: this.changes > 0 });
            }
          });
        } else {
          resolve({ taskId: null, activated: false });
        }
      });
    });
  });
}

function getActiveTask() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.is_active = 1
      LIMIT 1
    `;
    
    db.get(sql, [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? { ...row, is_active: Boolean(row.is_active) } : null);
      }
    });
  });
}

// Initialize database when module is loaded (skip in demo mode, will be initialized manually)
if (!isDemoMode && app && app.isReady()) {
  initDatabase();
} else if (!isDemoMode && app) {
  app.whenReady().then(initDatabase);
} else if (!isDemoMode) {
  // For testing or non-electron environments
  initDatabase();
}

module.exports = {
  initDatabase,
  setDemoMode,
  closeDatabase,
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
  getOfficePresenceSummary,
  getOfficePresenceWeeklySummary,
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  setActiveTask,
  getActiveTask,
  getSubTasks,
  addSubTask,
  updateSubTask,
  deleteSubTask
};