const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Get user data directory for database storage
const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '../../data');
const dbPath = path.join(userDataPath, 'timetracker.db');

// Ensure data directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

let db;

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
      } else {
        console.log('Connected to SQLite database at:', dbPath);
        createTables().then(resolve).catch(reject);
      }
    });
  });
}

// Create tables if they don't exist
function createTables() {
  return new Promise((resolve, reject) => {
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
    const sql = 'INSERT INTO projects (name, description, color) VALUES (?, ?, ?)';
    const params = [project.name, project.description || '', project.color || '#4CAF50'];
    
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
    const sql = 'UPDATE projects SET name = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [project.name, project.description, project.color, project.id];
    
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
  getTimeSummary
};