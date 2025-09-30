/**
 * Database Migration v6: Add subtasks and make project_id mandatory for tasks
 * 
 * This migration enhances task management by:
 * 1. Making project association mandatory for tasks (project_id becomes NOT NULL)
 * 2. Adding subtasks table for hierarchical task organization
 * 
 * Changes:
 * - Modify tasks table to make project_id NOT NULL (with data migration)
 * - Add 'subtasks' table with parent_task_id foreign key
 * - Add indexes for efficient subtask queries
 * 
 * Safety features:
 * - Migrates existing tasks without project to a default project
 * - Uses ALTER TABLE to maintain existing data
 * - Handles foreign key constraints properly
 * 
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise} - Resolves when migration is complete
 */
function applyV6Migration(db) {
  return new Promise((resolve, reject) => {
    console.log('Migration v6: Adding subtasks table and making project_id mandatory');
    
    db.serialize(() => {
      // Step 1: Create a default project for orphaned tasks
      db.run(`
        INSERT OR IGNORE INTO projects (id, name, description, color)
        VALUES (0, 'Uncategorized', 'Default project for tasks without a project', '#9E9E9E')
      `, (err) => {
        if (err) {
          console.error('Migration v6 failed - could not create default project:', err);
          reject(err);
          return;
        }
        
        // Step 2: Update all tasks with NULL project_id to use the default project
        db.run(`
          UPDATE tasks 
          SET project_id = 0 
          WHERE project_id IS NULL
        `, (err) => {
          if (err) {
            console.error('Migration v6 failed - could not update orphaned tasks:', err);
            reject(err);
            return;
          }
          
          // Step 3: Create new tasks table with NOT NULL constraint
          // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
          db.run(`
            CREATE TABLE tasks_new (
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
          `, (err) => {
            if (err) {
              console.error('Migration v6 failed - could not create tasks_new table:', err);
              reject(err);
              return;
            }
            
            // Step 4: Copy data from old table to new table
            db.run(`
              INSERT INTO tasks_new (id, name, due_date, project_id, allocated_time, is_active, created_at, updated_at)
              SELECT id, name, due_date, project_id, allocated_time, is_active, created_at, updated_at
              FROM tasks
            `, (err) => {
              if (err) {
                console.error('Migration v6 failed - could not copy tasks data:', err);
                reject(err);
                return;
              }
              
              // Step 5: Drop old table
              db.run(`DROP TABLE tasks`, (err) => {
                if (err) {
                  console.error('Migration v6 failed - could not drop old tasks table:', err);
                  reject(err);
                  return;
                }
                
                // Step 6: Rename new table to original name
                db.run(`ALTER TABLE tasks_new RENAME TO tasks`, (err) => {
                  if (err) {
                    console.error('Migration v6 failed - could not rename tasks_new table:', err);
                    reject(err);
                    return;
                  }
                  
                  // Step 7: Recreate indexes
                  db.run(`
                    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
                    CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
                    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
                  `, (err) => {
                    if (err) {
                      console.error('Migration v6 failed - could not create task indexes:', err);
                      reject(err);
                      return;
                    }
                    
                    // Step 8: Create subtasks table
                    db.run(`
                      CREATE TABLE IF NOT EXISTS subtasks (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        parent_task_id INTEGER NOT NULL,
                        is_completed BOOLEAN DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (parent_task_id) REFERENCES tasks (id) ON DELETE CASCADE
                      )
                    `, (err) => {
                      if (err) {
                        console.error('Migration v6 failed - could not create subtasks table:', err);
                        reject(err);
                        return;
                      }
                      
                      // Step 9: Create subtask indexes
                      db.run(`
                        CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_id ON subtasks(parent_task_id);
                        CREATE INDEX IF NOT EXISTS idx_subtasks_is_completed ON subtasks(is_completed);
                      `, (err) => {
                        if (err) {
                          console.error('Migration v6 failed - could not create subtask indexes:', err);
                          reject(err);
                        } else {
                          console.log('Migration v6 completed successfully');
                          resolve();
                        }
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

module.exports = applyV6Migration;
