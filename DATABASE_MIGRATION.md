# Database Versioning and Migration System

## Overview

This project now includes a robust database versioning and migration system that automatically handles database schema changes and tracks both application and database versions.

## Features

- **Automatic Database Upgrades**: Database schema is automatically upgraded when the application starts
- **Version Tracking**: Both app and database versions are stored and tracked
- **Migration Framework**: Reusable system for applying incremental database changes
- **User Notification**: Users are notified when database upgrades occur
- **Settings Integration**: Current versions are displayed in the Settings page

## How It Works

### Version Management

1. **App Version**: Read from `version.json` file in the root directory
   ```json
   {
     "major": 1,
     "minor": 0,
     "micro": 0
   }
   ```

2. **Database Version**: Tracked in the `app_metadata` table and defined by `CURRENT_DB_VERSION` constant in `db.js`

3. **Metadata Storage**: The `app_metadata` table stores version information:
   ```sql
   CREATE TABLE app_metadata (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

### Migration Process

1. On application start, the system:
   - Connects to the database
   - Creates tables if they don't exist
   - Checks current database version vs target version
   - Runs migrations if needed
   - Updates version metadata

2. Migration execution:
   - Applies migrations incrementally from current to target version
   - Each migration is atomic and logged
   - Updates database version after successful completion

## Adding New Migrations

When you need to modify the database schema:

1. **Increment Database Version**:
   ```javascript
   // In src/database/db.js
   const CURRENT_DB_VERSION = 2; // Increment this
   ```

2. **Add Migration Logic**:
   ```javascript
   function applyMigration(version) {
     return new Promise((resolve, reject) => {
       let migrationSql = '';
       
       switch (version) {
         case 1:
           // Initial version
           resolve();
           return;
         case 2:
           // Your new migration
           migrationSql = `
             ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active';
             CREATE INDEX idx_projects_status ON projects(status);
           `;
           break;
         default:
           resolve();
           return;
       }
       
       if (migrationSql) {
         db.exec(migrationSql, (err) => {
           if (err) {
             reject(err);
           } else {
             console.log(`Migration v${version} completed successfully`);
             resolve();
           }
         });
       }
     });
   }
   ```

3. **Test the Migration**:
   - Start the application
   - The migration will run automatically
   - Check console logs for migration status
   - Verify database changes took effect

## Best Practices

1. **Always increment versions**: Never skip version numbers
2. **Test migrations**: Test with existing data before deploying
3. **Backup data**: Users should backup their database before major updates
4. **Document changes**: Add comments explaining what each migration does
5. **Atomic operations**: Keep migrations atomic - they should either fully succeed or fully fail

## API Reference

### Version Functions

- `getDatabaseVersion()`: Returns current database version
- `getAppVersion()`: Returns current application version from version.json
- `setDatabaseVersion(version)`: Updates database version (internal use)
- `runMigrations()`: Runs pending migrations (internal use)

### IPC Functions (Frontend)

- `window.electronAPI.getDatabaseVersion()`: Get database version
- `window.electronAPI.getAppVersion()`: Get app version

## Example Usage

```javascript
// In a React component
useEffect(() => {
  const loadVersions = async () => {
    const appVersion = await window.electronAPI.getAppVersion();
    const dbVersion = await window.electronAPI.getDatabaseVersion();
    console.log(`App: ${appVersion}, DB: ${dbVersion}`);
  };
  loadVersions();
}, []);
```

## Troubleshooting

- **Migration fails**: Check console logs for specific error messages
- **Version mismatch**: Ensure CURRENT_DB_VERSION matches latest migration
- **Database locked**: Close all application instances before running migrations
- **Backup issues**: Keep regular backups of the SQLite database file

## Files Modified

- `version.json`: App version configuration
- `src/database/db.js`: Database versioning and migration logic
- `src/main.js`: IPC handlers for version functions
- `src/preload.js`: Frontend API exposure
- `src/components/Settings.js`: Version display in UI