#include "database/database.h"
#include "database/databasemigration.h"
#include <QSqlQuery>
#include <QSqlError>
#include <QStandardPaths>
#include <QDir>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QDebug>

const int Database::CURRENT_DB_VERSION = 7;
Database* Database::s_instance = nullptr;

Database::Database(QObject *parent)
    : QObject(parent)
    , m_initialized(false)
    , m_demoMode(false)
    , m_currentVersion(0)
{
    s_instance = this;
}

Database::~Database()
{
    if (m_db.isOpen()) {
        m_db.close();
    }
    s_instance = nullptr;
}

Database* Database::instance()
{
    if (!s_instance) {
        s_instance = new Database();
    }
    return s_instance;
}

void Database::setDemoMode(bool enabled)
{
    if (m_initialized) {
        qWarning() << "Cannot set demo mode after database is initialized";
        return;
    }
    m_demoMode = enabled;
}

bool Database::initialize(const QString &dbPath)
{
    if (m_initialized) {
        return true;
    }
    
    QString path;
    if (m_demoMode) {
        path = ":memory:";
        qInfo() << "Initializing in-memory database (DEMO MODE)";
    } else if (!dbPath.isEmpty()) {
        path = dbPath;
    } else {
        // Default path: use application data directory
        QString dataPath = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
        QDir dir(dataPath);
        if (!dir.exists()) {
            dir.mkpath(".");
        }
        path = dataPath + "/timetracker.db";
    }
    
    m_db = QSqlDatabase::addDatabase("QSQLITE");
    m_db.setDatabaseName(path);
    
    if (!m_db.open()) {
        qCritical() << "Failed to open database:" << m_db.lastError().text();
        emit databaseError(m_db.lastError().text());
        return false;
    }
    
    qInfo() << "Connected to SQLite database at" << path;
    
    // Create tables if they don't exist
    if (!createTables()) {
        qCritical() << "Failed to create tables";
        return false;
    }
    
    // Run migrations if not in demo mode
    if (!m_demoMode) {
        if (!runMigrations()) {
            qCritical() << "Failed to run migrations";
            return false;
        }
    }
    
    m_initialized = true;
    emit initializedChanged();
    
    return true;
}

bool Database::createTables()
{
    QStringList createStatements;
    
    // Create version table
    createStatements << R"(
        CREATE TABLE IF NOT EXISTS db_version (
            version INTEGER PRIMARY KEY
        )
    )";
    
    // Create projects table
    createStatements << R"(
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            color TEXT DEFAULT '#3498db',
            budget REAL DEFAULT 0,
            hourly_rate REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            start_date TEXT,
            end_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    )";
    
    // Create time_entries table
    createStatements << R"(
        CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            description TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            duration INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    )";
    
    // BLE devices and tasks tables will be created by migrations (v4, v5, v6, v7)
    
    // Execute all create statements
    for (const QString &sql : createStatements) {
        if (!executeSql(sql)) {
            return false;
        }
    }
    
    // Set initial version to 1 if this is a new database
    int currentVersion = DatabaseMigration::getCurrentVersion(m_db);
    if (currentVersion == 0) {
        qInfo() << "New database detected, setting initial version to 1";
        if (!DatabaseMigration::setVersion(m_db, 1)) {
            qCritical() << "Failed to set initial database version";
            return false;
        }
    }
    
    return true;
}

bool Database::executeSql(const QString &sql)
{
    QSqlQuery query(m_db);
    if (!query.exec(sql)) {
        qCritical() << "SQL Error:" << query.lastError().text();
        qCritical() << "SQL:" << sql;
        emit databaseError(query.lastError().text());
        return false;
    }
    return true;
}

bool Database::runMigrations()
{
    int currentVersion = DatabaseMigration::getCurrentVersion(m_db);
    m_currentVersion = currentVersion;
    
    if (currentVersion < CURRENT_DB_VERSION) {
        qInfo() << "Migrating database from version" << currentVersion << "to" << CURRENT_DB_VERSION;
        if (DatabaseMigration::migrateToVersion(m_db, CURRENT_DB_VERSION)) {
            m_currentVersion = CURRENT_DB_VERSION;
            emit versionChanged();
            return true;
        }
        return false;
    }
    
    return true;
}

bool Database::backupToJson(const QString &filePath)
{
    // TODO: Implement backup functionality
    qWarning() << "Backup functionality not yet implemented";
    return false;
}

bool Database::restoreFromJson(const QString &filePath)
{
    // TODO: Implement restore functionality
    qWarning() << "Restore functionality not yet implemented";
    return false;
}
