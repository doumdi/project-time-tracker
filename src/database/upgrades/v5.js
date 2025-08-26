/**
 * Database Migration v5: Add tasks table
 * 
 * This migration adds task management functionality to the application.
 * Users can now create tasks with optional due dates, project associations,
 * and allocated time. Tasks can be started/stopped for easy time tracking.
 * 
 * Changes:
 * - Add 'tasks' table with name, due_date, project_id, allocated_time, is_active, created_at, updated_at
 * - Add index for efficient project-based task queries
 * - Add index for active task queries
 * 
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise} - Resolves when migration is complete
 */
function applyV5Migration(db) {
  return new Promise((resolve, reject) => {
    console.log('Migration v5: Adding tasks table');
    
    const migrationSql = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        due_date DATE,
        project_id INTEGER,
        allocated_time INTEGER DEFAULT 0, -- Allocated time in minutes
        is_active BOOLEAN DEFAULT 0, -- Whether task is currently being tracked
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    `;
    
    db.exec(migrationSql, (err) => {
      if (err) {
        console.error('Migration v5 failed:', err);
        reject(err);
      } else {
        console.log('Migration v5 completed successfully');
        resolve();
      }
    });
  });
}

module.exports = applyV5Migration;