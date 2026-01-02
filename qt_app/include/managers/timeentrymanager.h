#ifndef TIMEENTRYMANAGER_H
#define TIMEENTRYMANAGER_H

#include <QObject>
#include <QList>
#include <QVariantList>
#include <QDateTime>
#include "database/timeentrymodel.h"

class TimeEntryManager : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool timerRunning READ timerRunning NOTIFY timerRunningChanged)
    Q_PROPERTY(QDateTime timerStartTime READ timerStartTime NOTIFY timerStartTimeChanged)
    
public:
    explicit TimeEntryManager(QObject *parent = nullptr);
    
    Q_INVOKABLE QVariantList getAllTimeEntries();
    Q_INVOKABLE QVariantList getTimeEntriesByProject(int projectId);
    Q_INVOKABLE QVariantList getTimeEntriesByDateRange(const QDateTime &start, const QDateTime &end);
    Q_INVOKABLE QVariantMap getTimeEntry(int id);
    Q_INVOKABLE bool createTimeEntry(const QVariantMap &entryData);
    Q_INVOKABLE bool updateTimeEntry(int id, const QVariantMap &entryData);
    Q_INVOKABLE bool deleteTimeEntry(int id);
    
    // Timer functions
    Q_INVOKABLE bool startTimer(int projectId, int taskId = -1, const QString &description = QString());
    Q_INVOKABLE bool stopTimer();
    Q_INVOKABLE int getElapsedSeconds();
    
    bool timerRunning() const { return m_timerRunning; }
    QDateTime timerStartTime() const { return m_timerStartTime; }

signals:
    void timeEntriesChanged();
    void timeEntryCreated(int id);
    void timeEntryUpdated(int id);
    void timeEntryDeleted(int id);
    void timerRunningChanged();
    void timerStartTimeChanged();
    void error(const QString &message);

private:
    bool m_timerRunning;
    QDateTime m_timerStartTime;
    int m_currentProjectId;
    int m_currentTaskId;
    QString m_currentDescription;
    
    int roundToFiveMinutes(int minutes);
    QVariantMap timeEntryToVariantMap(const TimeEntryModel &entry);

};

#endif // TIMEENTRYMANAGER_H
