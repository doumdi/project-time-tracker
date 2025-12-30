#ifndef DATABASEMIGRATION_H
#define DATABASEMIGRATION_H

#include <QObject>
#include <QSqlDatabase>

class DatabaseMigration : public QObject
{
    Q_OBJECT
    
public:
    explicit DatabaseMigration(QObject *parent = nullptr);
    
    static bool migrateToVersion(QSqlDatabase &db, int targetVersion);
    static int getCurrentVersion(QSqlDatabase &db);
    static bool setVersion(QSqlDatabase &db, int version);

private:
    static bool migrateToV2(QSqlDatabase &db);
    static bool migrateToV3(QSqlDatabase &db);
    static bool migrateToV4(QSqlDatabase &db);
    static bool migrateToV5(QSqlDatabase &db);
    static bool migrateToV6(QSqlDatabase &db);
    static bool migrateToV7(QSqlDatabase &db);
};

#endif // DATABASEMIGRATION_H
