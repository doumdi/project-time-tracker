// Web-compatible shim for Electron APIs
// This provides browser-compatible implementations when running in web mode

import initSqlJs from 'sql.js';
import { populateDemoData } from './database/populate-demo-data-web';

let db = null;
let SQL = null;

// Initialize SQL.js
async function initDatabase() {
  if (db) return;
  
  console.log('[WEB MODE] Initializing in-memory database with sql.js');
  SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`
  });
  
  db = new SQL.Database();
  
  // Create tables
  createTables();
  
  // Populate with demo data
  await populateDemoData(db);
  
  console.log('[WEB MODE] Database initialized with demo data');
}

function createTables() {
  // Metadata table
  db.run(`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Projects table with all columns
  db.run(`
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
  `);
  
  // Time entries table
  db.run(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      task_id INTEGER,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  
  // BLE devices table
  db.run(`
    CREATE TABLE IF NOT EXISTS ble_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL UNIQUE,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Office presence table
  db.run(`
    CREATE TABLE IF NOT EXISTS office_presence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      devices_detected INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Tasks table
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      due_date DATE,
      estimated_hours DECIMAL(10,2) DEFAULT 0,
      actual_hours DECIMAL(10,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  
  // Subtasks table
  db.run(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);
}

// Helper to execute SQL and return results
function execSQL(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('SQL Error:', error, 'Query:', sql, 'Params:', params);
    throw error;
  }
}

// Helper to run SQL without returning results
function runSQL(sql, params = []) {
  try {
    db.run(sql, params);
  } catch (error) {
    console.error('SQL Error:', error, 'Query:', sql, 'Params:', params);
    throw error;
  }
}

// Web-compatible API implementation
window.electronAPI = {
  // Project operations
  getProjects: async () => {
    await initDatabase();
    return execSQL('SELECT * FROM projects ORDER BY name');
  },
  
  addProject: async (project) => {
    await initDatabase();
    runSQL(
      'INSERT INTO projects (name, description, color, budget, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      [project.name, project.description, project.color || '#4CAF50', project.budget || 0, project.start_date, project.end_date]
    );
    const result = execSQL('SELECT * FROM projects WHERE id = last_insert_rowid()');
    return result[0];
  },
  
  updateProject: async (project) => {
    await initDatabase();
    runSQL(
      'UPDATE projects SET name = ?, description = ?, color = ?, budget = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [project.name, project.description, project.color, project.budget, project.start_date, project.end_date, project.id]
    );
    const result = execSQL('SELECT * FROM projects WHERE id = ?', [project.id]);
    return result[0];
  },
  
  deleteProject: async (id) => {
    await initDatabase();
    runSQL('DELETE FROM projects WHERE id = ?', [id]);
    return { success: true };
  },
  
  // Time entry operations
  getTimeEntries: async (filters = {}) => {
    await initDatabase();
    let query = 'SELECT te.*, p.name as project_name, p.color as project_color FROM time_entries te LEFT JOIN projects p ON te.project_id = p.id';
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
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY te.start_time DESC';
    
    return execSQL(query, params);
  },
  
  addTimeEntry: async (entry) => {
    await initDatabase();
    runSQL(
      'INSERT INTO time_entries (project_id, task_id, description, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?, ?)',
      [entry.project_id, entry.task_id, entry.description, entry.start_time, entry.end_time, entry.duration]
    );
    const result = execSQL('SELECT * FROM time_entries WHERE id = last_insert_rowid()');
    return result[0];
  },
  
  updateTimeEntry: async (entry) => {
    await initDatabase();
    runSQL(
      'UPDATE time_entries SET project_id = ?, task_id = ?, description = ?, start_time = ?, end_time = ?, duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [entry.project_id, entry.task_id, entry.description, entry.start_time, entry.end_time, entry.duration, entry.id]
    );
    const result = execSQL('SELECT * FROM time_entries WHERE id = ?', [entry.id]);
    return result[0];
  },
  
  deleteTimeEntry: async (id) => {
    await initDatabase();
    runSQL('DELETE FROM time_entries WHERE id = ?', [id]);
    return { success: true };
  },
  
  // Summary operations
  getTimeSummary: async (filters = {}) => {
    await initDatabase();
    let query = `
      SELECT 
        p.id as project_id,
        p.name as project_name,
        p.color as project_color,
        COUNT(te.id) as entry_count,
        COALESCE(SUM(te.duration), 0) as total_duration
      FROM projects p
      LEFT JOIN time_entries te ON p.id = te.project_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (filters.startDate) {
      conditions.push('(te.start_time IS NULL OR date(te.start_time) >= date(?))');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('(te.start_time IS NULL OR date(te.start_time) <= date(?))');
      params.push(filters.endDate);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY p.id, p.name, p.color ORDER BY total_duration DESC';
    
    return execSQL(query, params);
  },
  
  // Version operations
  getDatabaseVersion: async () => {
    await initDatabase();
    const result = execSQL("SELECT value FROM app_metadata WHERE key = 'db_version'");
    return result.length > 0 ? parseInt(result[0].value) : 7;
  },
  
  getAppVersion: async () => {
    await initDatabase();
    const result = execSQL("SELECT value FROM app_metadata WHERE key = 'app_version'");
    return result.length > 0 ? result[0].value : '1.0.14';
  },
  
  // Backup and restore operations (not supported in web mode)
  exportDatabase: async () => {
    console.warn('[WEB MODE] Database export not supported');
    return null;
  },
  
  importDatabase: async () => {
    console.warn('[WEB MODE] Database import not supported');
    return { success: false };
  },
  
  showSaveDialogBackup: async () => {
    console.warn('[WEB MODE] File dialogs not supported');
    return null;
  },
  
  showOpenDialogRestore: async () => {
    console.warn('[WEB MODE] File dialogs not supported');
    return null;
  },
  
  // BLE device operations
  getBleDevices: async () => {
    await initDatabase();
    return execSQL('SELECT * FROM ble_devices ORDER BY name');
  },
  
  addBleDevice: async (device) => {
    await initDatabase();
    runSQL(
      'INSERT INTO ble_devices (name, address, enabled) VALUES (?, ?, ?)',
      [device.name, device.address, device.enabled ? 1 : 0]
    );
    const result = execSQL('SELECT * FROM ble_devices WHERE id = last_insert_rowid()');
    return result[0];
  },
  
  updateBleDevice: async (device) => {
    await initDatabase();
    runSQL(
      'UPDATE ble_devices SET name = ?, address = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [device.name, device.address, device.enabled ? 1 : 0, device.id]
    );
    const result = execSQL('SELECT * FROM ble_devices WHERE id = ?', [device.id]);
    return result[0];
  },
  
  deleteBleDevice: async (id) => {
    await initDatabase();
    runSQL('DELETE FROM ble_devices WHERE id = ?', [id]);
    return { success: true };
  },
  
  // Office presence operations
  getOfficePresence: async (filters = {}) => {
    await initDatabase();
    let query = 'SELECT * FROM office_presence';
    const conditions = [];
    const params = [];
    
    if (filters.startDate) {
      conditions.push('date(start_time) >= date(?)');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('date(start_time) <= date(?)');
      params.push(filters.endDate);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY start_time DESC';
    
    return execSQL(query, params);
  },
  
  addOfficePresence: async (presence) => {
    await initDatabase();
    runSQL(
      'INSERT INTO office_presence (start_time, end_time, devices_detected) VALUES (?, ?, ?)',
      [presence.start_time, presence.end_time, presence.devices_detected]
    );
    const result = execSQL('SELECT * FROM office_presence WHERE id = last_insert_rowid()');
    return result[0];
  },
  
  updateOfficePresence: async (presence) => {
    await initDatabase();
    runSQL(
      'UPDATE office_presence SET start_time = ?, end_time = ?, devices_detected = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [presence.start_time, presence.end_time, presence.devices_detected, presence.id]
    );
    const result = execSQL('SELECT * FROM office_presence WHERE id = ?', [presence.id]);
    return result[0];
  },
  
  deleteOfficePresence: async (id) => {
    await initDatabase();
    runSQL('DELETE FROM office_presence WHERE id = ?', [id]);
    return { success: true };
  },
  
  getOfficePresenceSummary: async (filters = {}) => {
    await initDatabase();
    let query = `
      SELECT 
        date(start_time) as date,
        COUNT(*) as presence_count,
        SUM(devices_detected) as total_devices
      FROM office_presence
    `;
    
    const conditions = [];
    const params = [];
    
    if (filters.startDate) {
      conditions.push('date(start_time) >= date(?)');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('date(start_time) <= date(?)');
      params.push(filters.endDate);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY date(start_time) ORDER BY date DESC';
    
    return execSQL(query, params);
  },
  
  getOfficePresenceWeeklySummary: async (referenceDate) => {
    await initDatabase();
    // Simplified version for web
    return [];
  },
  
  // Task operations
  getTasks: async (filters = {}) => {
    await initDatabase();
    let query = 'SELECT t.*, p.name as project_name, p.color as project_color FROM tasks t LEFT JOIN projects p ON t.project_id = p.id';
    const conditions = [];
    const params = [];
    
    if (filters.projectId) {
      conditions.push('t.project_id = ?');
      params.push(filters.projectId);
    }
    if (filters.status) {
      conditions.push('t.status = ?');
      params.push(filters.status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY t.due_date, t.priority DESC';
    
    return execSQL(query, params);
  },
  
  addTask: async (task) => {
    await initDatabase();
    runSQL(
      'INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [task.project_id, task.title, task.description, task.status || 'pending', task.priority || 'medium', task.due_date, task.estimated_hours || 0]
    );
    const result = execSQL('SELECT * FROM tasks WHERE id = last_insert_rowid()');
    return result[0];
  },
  
  updateTask: async (task) => {
    await initDatabase();
    runSQL(
      'UPDATE tasks SET project_id = ?, title = ?, description = ?, status = ?, priority = ?, due_date = ?, estimated_hours = ?, actual_hours = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [task.project_id, task.title, task.description, task.status, task.priority, task.due_date, task.estimated_hours, task.actual_hours, task.id]
    );
    const result = execSQL('SELECT * FROM tasks WHERE id = ?', [task.id]);
    return result[0];
  },
  
  deleteTask: async (id) => {
    await initDatabase();
    runSQL('DELETE FROM tasks WHERE id = ?', [id]);
    return { success: true };
  },
  
  setActiveTask: async (taskId) => {
    await initDatabase();
    console.log('[WEB MODE] Active task set to:', taskId);
    return { success: true };
  },
  
  getActiveTask: async () => {
    await initDatabase();
    return null;
  },
  
  // Subtask operations
  getSubTasks: async (parentTaskId) => {
    await initDatabase();
    return execSQL('SELECT * FROM subtasks WHERE parent_task_id = ? ORDER BY created_at', [parentTaskId]);
  },
  
  addSubTask: async (subtask) => {
    await initDatabase();
    runSQL(
      'INSERT INTO subtasks (parent_task_id, title, description, status) VALUES (?, ?, ?, ?)',
      [subtask.parent_task_id, subtask.title, subtask.description, subtask.status || 'pending']
    );
    const result = execSQL('SELECT * FROM subtasks WHERE id = last_insert_rowid()');
    return result[0];
  },
  
  updateSubTask: async (subtask) => {
    await initDatabase();
    runSQL(
      'UPDATE subtasks SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [subtask.title, subtask.description, subtask.status, subtask.id]
    );
    const result = execSQL('SELECT * FROM subtasks WHERE id = ?', [subtask.id]);
    return result[0];
  },
  
  deleteSubTask: async (id) => {
    await initDatabase();
    runSQL('DELETE FROM subtasks WHERE id = ?', [id]);
    return { success: true };
  },
  
  // BLE scanning operations (mock in web mode)
  startBleScan: async () => {
    console.log('[WEB MODE] BLE scanning not available in web mode');
    return { success: false, message: 'BLE not available in web mode' };
  },
  
  stopBleScan: async () => {
    console.log('[WEB MODE] BLE scanning not available in web mode');
    return { success: true };
  },
  
  triggerImmediateScan: async () => {
    console.log('[WEB MODE] BLE scanning not available in web mode');
    return { success: false };
  },
  
  getDiscoveredDevices: async () => {
    await initDatabase();
    // Return demo devices
    return [];
  },
  
  getCurrentPresenceStatus: async () => {
    await initDatabase();
    return { inOffice: false, devicesDetected: 0 };
  },
  
  enablePresenceMonitoring: async (enabled) => {
    console.log('[WEB MODE] Presence monitoring:', enabled);
    return { success: true };
  },
  
  setPresenceSaveInterval: async (intervalMinutes) => {
    console.log('[WEB MODE] Presence save interval:', intervalMinutes);
    return { success: true };
  },
  
  getPresenceSaveInterval: async () => {
    return 5;
  },
  
  // BLE debug logs operations
  getBleLogsEnabled: async () => {
    return false;
  },
  
  setBleLogsEnabled: async (enabled) => {
    console.log('[WEB MODE] BLE logs:', enabled);
    return { success: true };
  },
  
  // Presence monitor debug logs operations
  getPresenceLogsEnabled: async () => {
    return false;
  },
  
  setPresenceLogsEnabled: async (enabled) => {
    console.log('[WEB MODE] Presence logs:', enabled);
    return { success: true };
  },
  
  // Event listeners (no-op in web mode)
  onBleDeviceDiscovered: (callback) => {},
  onBleDevicesCleared: (callback) => {},
  onBleScanStopped: (callback) => {},
  onPresenceStatusUpdated: (callback) => {},
  onPresenceDataUpdated: (callback) => {},
  removeAllListeners: (channel) => {},
  onDatabaseChanged: (callback) => {},
  
  // MCP server operations (not supported in web mode)
  enableMcpServer: async (enabled, port) => {
    console.warn('[WEB MODE] MCP server not supported');
    return { success: false };
  },
  
  getMcpServerStatus: async () => {
    return { enabled: false, port: 0 };
  }
};

console.log('[WEB MODE] Browser-compatible API initialized');
