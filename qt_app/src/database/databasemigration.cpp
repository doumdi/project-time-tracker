#include "database/databasemigration.h"
#include <QSqlQuery>
#include <QSqlError>
#include <QDebug>

DatabaseMigration::DatabaseMigration(QObject *parent) : QObject(parent) {}

int DatabaseMigration::getCurrentVersion(QSqlDatabase &db)
{
    QSqlQuery query(db);
    if (!query.exec("SELECT version FROM db_version LIMIT 1")) {
        return 0;
    }
    
    if (query.next()) {
        return query.value(0).toInt();
    }
    
    return 0;
}

bool DatabaseMigration::setVersion(QSqlDatabase &db, int version)
{
    QSqlQuery query(db);
    query.prepare("DELETE FROM db_version");
    if (!query.exec()) {
        qCritical() << "Failed to clear version:" << query.lastError().text();
        return false;
    }
    
    query.prepare("INSERT INTO db_version (version) VALUES (:version)");
    query.bindValue(":version", version);
    if (!query.exec()) {
        qCritical() << "Failed to set version:" << query.lastError().text();
        return false;
    }
    
    return true;
}

bool DatabaseMigration::migrateToVersion(QSqlDatabase &db, int targetVersion)
{
    int currentVersion = getCurrentVersion(db);
    
    for (int v = currentVersion + 1; v <= targetVersion; ++v) {
        qInfo() << "Migrating to version" << v;
        bool success = false;
        
        switch (v) {
            case 1: success = migrateToV1(db); break;
            case 2: success = migrateToV2(db); break;
            case 3: success = migrateToV3(db); break;
            case 4: success = migrateToV4(db); break;
            case 5: success = migrateToV5(db); break;
            case 6: success = migrateToV6(db); break;
            case 7: success = migrateToV7(db); break;
            default:
                qWarning() << "Unknown migration version:" << v;
                return false;
        }
        
        if (!success) {
            qCritical() << "Failed to migrate to version" << v;
            return false;
        }
        
        if (!setVersion(db, v)) {
            return false;
        }
    }
    
    return true;
}

bool DatabaseMigration::migrateToV1(QSqlDatabase &db)
{
    qInfo() << "Migration v1: Initial database structure";
    // Version 1: Initial version, no migration needed as tables are already created
    // This is just a marker for the initial database version
    qInfo() << "Migration v1 completed successfully";
    return true;
}

bool DatabaseMigration::migrateToV2(QSqlDatabase &db)
{
    qInfo() << "Migration v2: Adding budget column to projects table";
    
    // Check if column already exists
    QSqlQuery checkQuery(db);
    if (!checkQuery.exec("PRAGMA table_info(projects)")) {
        qCritical() << "Failed to check projects table structure:" << checkQuery.lastError().text();
        return false;
    }
    
    bool budgetExists = false;
    while (checkQuery.next()) {
        if (checkQuery.value("name").toString() == "budget") {
            budgetExists = true;
            break;
        }
    }
    
    if (budgetExists) {
        qInfo() << "Budget column already exists, skipping migration";
        return true;
    }
    
    // Add budget column
    QSqlQuery query(db);
    if (!query.exec("ALTER TABLE projects ADD COLUMN budget DECIMAL(10,2) DEFAULT 0")) {
        qCritical() << "Migration v2 failed:" << query.lastError().text();
        return false;
    }
    
    qInfo() << "Migration v2 completed successfully";
    return true;
}
bool DatabaseMigration::migrateToV3(QSqlDatabase &db)
{
    qInfo() << "Migration v3: Adding start_date and end_date columns to projects table";
    
    // Check which columns exist
    QSqlQuery checkQuery(db);
    if (!checkQuery.exec("PRAGMA table_info(projects)")) {
        qCritical() << "Failed to check projects table structure:" << checkQuery.lastError().text();
        return false;
    }
    
    bool startDateExists = false;
    bool endDateExists = false;
    while (checkQuery.next()) {
        QString colName = checkQuery.value("name").toString();
        if (colName == "start_date") startDateExists = true;
        if (colName == "end_date") endDateExists = true;
    }
    
    // Add missing columns
    QSqlQuery query(db);
    if (!startDateExists) {
        if (!query.exec("ALTER TABLE projects ADD COLUMN start_date DATE")) {
            qCritical() << "Migration v3 failed (start_date):" << query.lastError().text();
            return false;
        }
    }
    
    if (!endDateExists) {
        if (!query.exec("ALTER TABLE projects ADD COLUMN end_date DATE")) {
            qCritical() << "Migration v3 failed (end_date):" << query.lastError().text();
            return false;
        }
    }
    
    if (startDateExists && endDateExists) {
        qInfo() << "Start date and end date columns already exist, skipping migration";
    } else {
        qInfo() << "Migration v3 completed successfully";
    }
    
    return true;
}
bool DatabaseMigration::migrateToV4(QSqlDatabase &db)
{
    qInfo() << "Migration v4: Adding office presence and BLE devices tables";
    
    QSqlQuery query(db);
    
    // Create ble_devices table
    QString createBleDevicesTable = R"(
        CREATE TABLE IF NOT EXISTS ble_devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            mac_address TEXT UNIQUE NOT NULL,
            device_type TEXT DEFAULT 'unknown',
            is_enabled BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    )";
    
    if (!query.exec(createBleDevicesTable)) {
        qCritical() << "Migration v4 failed (ble_devices table):" << query.lastError().text();
        return false;
    }
    qInfo() << "BLE devices table created successfully";
    
    // Create office_presence table
    QString createOfficePresenceTable = R"(
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
    )";
    
    if (!query.exec(createOfficePresenceTable)) {
        qCritical() << "Migration v4 failed (office_presence table):" << query.lastError().text();
        return false;
    }
    qInfo() << "Office presence table created successfully";
    
    qInfo() << "Migration v4 completed successfully";
    return true;
}
bool DatabaseMigration::migrateToV5(QSqlDatabase &db)
{
    qInfo() << "Migration v5: Adding tasks table";
    
    QSqlQuery query(db);
    
    // Create tasks table
    QString createTasksTable = R"(
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
    )";
    
    if (!query.exec(createTasksTable)) {
        qCritical() << "Migration v5 failed:" << query.lastError().text();
        return false;
    }
    
    // Create indexes
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)")) {
        qCritical() << "Migration v5 failed (idx_tasks_project_id):" << query.lastError().text();
        return false;
    }
    
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active)")) {
        qCritical() << "Migration v5 failed (idx_tasks_is_active):" << query.lastError().text();
        return false;
    }
    
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)")) {
        qCritical() << "Migration v5 failed (idx_tasks_due_date):" << query.lastError().text();
        return false;
    }
    
    qInfo() << "Migration v5 completed successfully";
    return true;
}
bool DatabaseMigration::migrateToV6(QSqlDatabase &db)
{
    qInfo() << "Migration v6: Adding subtasks table and making project_id mandatory";
    
    QSqlQuery query(db);
    
    // Step 1: Create a default project for orphaned tasks
    query.prepare("INSERT OR IGNORE INTO projects (id, name, description, color) "
                  "VALUES (0, 'Uncategorized', 'Default project for tasks without a project', '#9E9E9E')");
    if (!query.exec()) {
        qCritical() << "Migration v6 failed - could not create default project:" << query.lastError().text();
        return false;
    }
    
    // Step 2: Update all tasks with NULL project_id to use the default project
    if (!query.exec("UPDATE tasks SET project_id = 0 WHERE project_id IS NULL")) {
        qCritical() << "Migration v6 failed - could not update orphaned tasks:" << query.lastError().text();
        return false;
    }
    
    // Step 3: Create new tasks table with NOT NULL constraint
    QString createTasksNewTable = R"(
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
    )";
    
    if (!query.exec(createTasksNewTable)) {
        qCritical() << "Migration v6 failed - could not create tasks_new table:" << query.lastError().text();
        return false;
    }
    
    // Step 4: Copy data from old table to new table
    QString copyData = R"(
        INSERT INTO tasks_new (id, name, due_date, project_id, allocated_time, is_active, created_at, updated_at)
        SELECT id, name, due_date, project_id, allocated_time, is_active, created_at, updated_at
        FROM tasks
    )";
    
    if (!query.exec(copyData)) {
        qCritical() << "Migration v6 failed - could not copy tasks data:" << query.lastError().text();
        return false;
    }
    
    // Step 5: Drop old table
    if (!query.exec("DROP TABLE tasks")) {
        qCritical() << "Migration v6 failed - could not drop old tasks table:" << query.lastError().text();
        return false;
    }
    
    // Step 6: Rename new table to original name
    if (!query.exec("ALTER TABLE tasks_new RENAME TO tasks")) {
        qCritical() << "Migration v6 failed - could not rename tasks_new table:" << query.lastError().text();
        return false;
    }
    
    // Step 7: Recreate indexes
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)")) {
        qCritical() << "Migration v6 failed - could not create task indexes:" << query.lastError().text();
        return false;
    }
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active)")) {
        qCritical() << "Migration v6 failed - could not create task indexes:" << query.lastError().text();
        return false;
    }
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)")) {
        qCritical() << "Migration v6 failed - could not create task indexes:" << query.lastError().text();
        return false;
    }
    
    // Step 8: Create subtasks table
    QString createSubtasksTable = R"(
        CREATE TABLE IF NOT EXISTS subtasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            parent_task_id INTEGER NOT NULL,
            is_completed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_task_id) REFERENCES tasks (id) ON DELETE CASCADE
        )
    )";
    
    if (!query.exec(createSubtasksTable)) {
        qCritical() << "Migration v6 failed - could not create subtasks table:" << query.lastError().text();
        return false;
    }
    
    // Step 9: Create subtask indexes
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_id ON subtasks(parent_task_id)")) {
        qCritical() << "Migration v6 failed - could not create subtask indexes:" << query.lastError().text();
        return false;
    }
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_subtasks_is_completed ON subtasks(is_completed)")) {
        qCritical() << "Migration v6 failed - could not create subtask indexes:" << query.lastError().text();
        return false;
    }
    
    qInfo() << "Migration v6 completed successfully";
    return true;
}
bool DatabaseMigration::migrateToV7(QSqlDatabase &db)
{
    qInfo() << "Migration v7: Adding task and subtask relationships to time entries";
    
    // Check which columns exist
    QSqlQuery checkQuery(db);
    if (!checkQuery.exec("PRAGMA table_info(time_entries)")) {
        qCritical() << "Migration v7 failed - could not check table structure:" << checkQuery.lastError().text();
        return false;
    }
    
    bool taskIdExists = false;
    bool subtaskIdExists = false;
    while (checkQuery.next()) {
        QString colName = checkQuery.value("name").toString();
        if (colName == "task_id") taskIdExists = true;
        if (colName == "subtask_id") subtaskIdExists = true;
    }
    
    if (taskIdExists && subtaskIdExists) {
        qInfo() << "task_id and subtask_id columns already exist, skipping migration";
        return true;
    }
    
    // Add missing columns
    QSqlQuery query(db);
    if (!taskIdExists) {
        if (!query.exec("ALTER TABLE time_entries ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL")) {
            qCritical() << "Migration v7 failed (task_id):" << query.lastError().text();
            return false;
        }
    }
    
    if (!subtaskIdExists) {
        if (!query.exec("ALTER TABLE time_entries ADD COLUMN subtask_id INTEGER REFERENCES subtasks(id) ON DELETE SET NULL")) {
            qCritical() << "Migration v7 failed (subtask_id):" << query.lastError().text();
            return false;
        }
    }
    
    // Create indexes for efficient queries
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id)")) {
        qCritical() << "Migration v7 failed - could not create indexes:" << query.lastError().text();
        return false;
    }
    
    if (!query.exec("CREATE INDEX IF NOT EXISTS idx_time_entries_subtask_id ON time_entries(subtask_id)")) {
        qCritical() << "Migration v7 failed - could not create indexes:" << query.lastError().text();
        return false;
    }
    
    qInfo() << "Migration v7 completed successfully";
    return true;
}
