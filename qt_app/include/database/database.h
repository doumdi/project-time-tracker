#ifndef DATABASE_H
#define DATABASE_H

#include <QObject>
#include <QSqlDatabase>
#include <QString>
#include <QVariantMap>

class Database : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool isInitialized READ isInitialized NOTIFY initializedChanged)
    Q_PROPERTY(int currentVersion READ currentVersion NOTIFY versionChanged)

public:
    explicit Database(QObject *parent = nullptr);
    ~Database();

    static Database* instance();

    bool initialize(const QString &dbPath = QString());
    bool isInitialized() const { return m_initialized; }
    int currentVersion() const { return m_currentVersion; }
    
    QSqlDatabase database() const { return m_db; }
    
    // Database operations
    Q_INVOKABLE bool backupToJson(const QString &filePath);
    Q_INVOKABLE bool restoreFromJson(const QString &filePath);
    
    // Demo mode support
    void setDemoMode(bool enabled);
    bool isDemoMode() const { return m_demoMode; }

signals:
    void initializedChanged();
    void versionChanged();
    void databaseError(const QString &error);

private:
    bool createTables();
    bool runMigrations();
    bool executeSql(const QString &sql);
    
    static Database* s_instance;
    QSqlDatabase m_db;
    bool m_initialized;
    bool m_demoMode;
    int m_currentVersion;
    
    static const int CURRENT_DB_VERSION;
};

#endif // DATABASE_H
