/**
 * Database Migration v1: Initial database structure
 * 
 * This is the initial database version where all core tables are created.
 * No actual migration is needed as tables are already created during
 * database initialization.
 * 
 * Tables created in initial setup:
 * - projects: Core project management table
 * - time_entries: Time tracking entries linked to projects
 * - app_metadata: Application and database version tracking
 * 
 * @param {sqlite3.Database} db - SQLite database instance
 * @returns {Promise} - Resolves when migration is complete
 */
function applyV1Migration(db) {
  return new Promise((resolve, reject) => {
    console.log('Migration v1: Initial database structure');
    // Version 1: Initial version, no migration needed as tables are already created
    resolve();
  });
}

module.exports = applyV1Migration;