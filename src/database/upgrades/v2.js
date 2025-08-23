/**
 * Database Migration v2: Add budget column to projects table
 * 
 * This migration adds budget tracking functionality to projects.
 * The budget column allows users to set a financial budget for each project
 * and track spending against it.
 * 
 * Changes:
 * - Add 'budget' column to projects table (DECIMAL(10,2), default 0)
 * 
 * Safety features:
 * - Checks if column already exists before adding
 * - Uses ALTER TABLE to maintain existing data
 * - Sets default value of 0 for existing projects
 * 
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise} - Resolves when migration is complete
 */
function applyV2Migration(db) {
  return new Promise((resolve, reject) => {
    console.log('Migration v2: Adding budget column to projects table');
    
    const migrationSql = `
      ALTER TABLE projects ADD COLUMN budget DECIMAL(10,2) DEFAULT 0;
    `;
    
    // Use a different approach - check if column exists first
    db.get("PRAGMA table_info(projects)", (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Check if budget column already exists
      db.all("PRAGMA table_info(projects)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const budgetColumnExists = columns.some(col => col.name === 'budget');
        
        if (budgetColumnExists) {
          console.log('Budget column already exists, skipping migration');
          resolve();
        } else {
          db.exec(migrationSql, (err) => {
            if (err) {
              console.error(`Migration v2 failed:`, err);
              reject(err);
            } else {
              console.log(`Migration v2 completed successfully`);
              resolve();
            }
          });
        }
      });
    });
  });
}

module.exports = applyV2Migration;