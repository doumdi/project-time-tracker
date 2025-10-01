/**
 * Database Migration v7: Add task and subtask relationships to time entries
 * 
 * This migration enhances time tracking by allowing time entries to be
 * associated with specific tasks and subtasks, enabling more detailed
 * time tracking and reporting.
 * 
 * Changes:
 * - Add 'task_id' column to time_entries table (optional reference to tasks)
 * - Add 'subtask_id' column to time_entries table (optional reference to subtasks)
 * - Add indexes for efficient task and subtask queries
 * 
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise} - Resolves when migration is complete
 */
function applyV7Migration(db) {
  return new Promise((resolve, reject) => {
    console.log('Migration v7: Adding task and subtask relationships to time entries');
    
    db.serialize(() => {
      // Check if task_id column already exists (it shouldn't in production, but might in demo mode)
      db.all("PRAGMA table_info(time_entries)", (err, columns) => {
        if (err) {
          console.error('Migration v7 failed - could not check table structure:', err);
          reject(err);
          return;
        }
        
        const taskIdExists = columns.some(col => col.name === 'task_id');
        const subtaskIdExists = columns.some(col => col.name === 'subtask_id');
        
        let migrations = [];
        
        if (!taskIdExists) {
          migrations.push('ALTER TABLE time_entries ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;');
        }
        
        if (!subtaskIdExists) {
          migrations.push('ALTER TABLE time_entries ADD COLUMN subtask_id INTEGER REFERENCES subtasks(id) ON DELETE SET NULL;');
        }
        
        if (migrations.length === 0) {
          console.log('task_id and subtask_id columns already exist, skipping migration');
          resolve();
          return;
        }
        
        // Execute all migrations
        const migrationSql = migrations.join('\n');
        db.exec(migrationSql, (err) => {
          if (err) {
            console.error('Migration v7 failed:', err);
            reject(err);
            return;
          }
          
          // Create indexes for efficient queries
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
            CREATE INDEX IF NOT EXISTS idx_time_entries_subtask_id ON time_entries(subtask_id);
          `, (err) => {
            if (err) {
              console.error('Migration v7 failed - could not create indexes:', err);
              reject(err);
            } else {
              console.log('Migration v7 completed successfully');
              resolve();
            }
          });
        });
      });
    });
  });
}

module.exports = applyV7Migration;
