/**
 * Database Migration v3: Add project date columns
 * 
 * This migration adds start and end date tracking to projects.
 * These columns allow users to set project timelines and track
 * project duration and scheduling.
 * 
 * Changes:
 * - Add 'start_date' column to projects table (DATE)
 * - Add 'end_date' column to projects table (DATE)
 * 
 * Safety features:
 * - Checks if columns already exist before adding
 * - Uses ALTER TABLE to maintain existing data
 * - Handles both columns independently (adds only missing ones)
 * 
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise} - Resolves when migration is complete
 */
function applyV3Migration(db) {
  return new Promise((resolve, reject) => {
    console.log('Migration v3: Adding start_date and end_date columns to projects table');
    
    db.all("PRAGMA table_info(projects)", (err, columns) => {
      if (err) {
        reject(err);
        return;
      }
      
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
        console.log('Start date and end date columns already exist, skipping migration');
        resolve();
      } else {
        const migrationSql = migrations.join('\n');
        db.exec(migrationSql, (err) => {
          if (err) {
            console.error(`Migration v3 failed:`, err);
            reject(err);
          } else {
            console.log(`Migration v3 completed successfully`);
            resolve();
          }
        });
      }
    });
  });
}

module.exports = applyV3Migration;