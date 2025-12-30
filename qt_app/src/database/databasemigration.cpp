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

bool DatabaseMigration::migrateToV2(QSqlDatabase &db) { return true; }
bool DatabaseMigration::migrateToV3(QSqlDatabase &db) { return true; }
bool DatabaseMigration::migrateToV4(QSqlDatabase &db) { return true; }
bool DatabaseMigration::migrateToV5(QSqlDatabase &db) { return true; }
bool DatabaseMigration::migrateToV6(QSqlDatabase &db) { return true; }
bool DatabaseMigration::migrateToV7(QSqlDatabase &db) { return true; }
