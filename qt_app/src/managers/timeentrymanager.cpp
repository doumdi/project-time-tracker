#include "managers/timeentrymanager.h"
#include "database/database.h"
#include <QSqlQuery>
#include <QSqlError>
#include <QDebug>

TimeEntryManager::TimeEntryManager(QObject *parent)
    : QObject(parent), m_timerRunning(false), m_currentProjectId(-1), m_currentTaskId(-1)
{
}

QVariantList TimeEntryManager::getAllTimeEntries()
{
    QVariantList result;
    QSqlQuery query(Database::instance()->database());
    
    if (!query.exec("SELECT id, project_id, task_id, description, start_time, end_time, duration FROM time_entries ORDER BY start_time DESC")) {
        emit error(query.lastError().text());
        return result;
    }
    
    while (query.next()) {
        QVariantMap entry;
        entry["id"] = query.value(0).toInt();
        entry["projectId"] = query.value(1).toInt();
        entry["taskId"] = query.value(2).toInt();
        entry["description"] = query.value(3).toString();
        entry["startTime"] = query.value(4).toString();
        entry["endTime"] = query.value(5).toString();
        entry["duration"] = query.value(6).toInt();
        result.append(entry);
    }
    
    return result;
}

QVariantList TimeEntryManager::getTimeEntriesByProject(int projectId)
{
    QVariantList result;
    QSqlQuery query(Database::instance()->database());
    query.prepare("SELECT id, project_id, task_id, description, start_time, end_time, duration FROM time_entries WHERE project_id = :projectId ORDER BY start_time DESC");
    query.bindValue(":projectId", projectId);
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return result;
    }
    
    while (query.next()) {
        QVariantMap entry;
        entry["id"] = query.value(0).toInt();
        entry["projectId"] = query.value(1).toInt();
        entry["taskId"] = query.value(2).toInt();
        entry["description"] = query.value(3).toString();
        entry["startTime"] = query.value(4).toString();
        entry["endTime"] = query.value(5).toString();
        entry["duration"] = query.value(6).toInt();
        result.append(entry);
    }
    
    return result;
}

QVariantList TimeEntryManager::getTimeEntriesByDateRange(const QDateTime &start, const QDateTime &end)
{
    QVariantList result;
    QSqlQuery query(Database::instance()->database());
    query.prepare("SELECT id, project_id, task_id, description, start_time, end_time, duration FROM time_entries WHERE start_time >= :start AND end_time <= :end ORDER BY start_time DESC");
    query.bindValue(":start", start.toString(Qt::ISODate));
    query.bindValue(":end", end.toString(Qt::ISODate));
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return result;
    }
    
    while (query.next()) {
        QVariantMap entry;
        entry["id"] = query.value(0).toInt();
        entry["projectId"] = query.value(1).toInt();
        entry["taskId"] = query.value(2).toInt();
        entry["description"] = query.value(3).toString();
        entry["startTime"] = query.value(4).toString();
        entry["endTime"] = query.value(5).toString();
        entry["duration"] = query.value(6).toInt();
        result.append(entry);
    }
    
    return result;
}

QVariantMap TimeEntryManager::getTimeEntry(int id)
{
    QVariantMap result;
    QSqlQuery query(Database::instance()->database());
    query.prepare("SELECT id, project_id, task_id, description, start_time, end_time, duration FROM time_entries WHERE id = :id");
    query.bindValue(":id", id);
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return result;
    }
    
    if (query.next()) {
        result["id"] = query.value(0).toInt();
        result["projectId"] = query.value(1).toInt();
        result["taskId"] = query.value(2).toInt();
        result["description"] = query.value(3).toString();
        result["startTime"] = query.value(4).toString();
        result["endTime"] = query.value(5).toString();
        result["duration"] = query.value(6).toInt();
    }
    
    return result;
}

bool TimeEntryManager::createTimeEntry(const QVariantMap &entryData)
{
    QSqlQuery query(Database::instance()->database());
    query.prepare("INSERT INTO time_entries (project_id, task_id, description, start_time, end_time, duration) VALUES (:projectId, :taskId, :desc, :start, :end, :duration)");
    query.bindValue(":projectId", entryData.value("projectId"));
    query.bindValue(":taskId", entryData.value("taskId"));
    query.bindValue(":desc", entryData.value("description"));
    query.bindValue(":start", entryData.value("startTime"));
    query.bindValue(":end", entryData.value("endTime"));
    query.bindValue(":duration", entryData.value("duration"));
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return false;
    }
    
    emit timeEntryCreated(query.lastInsertId().toInt());
    emit timeEntriesChanged();
    return true;
}

bool TimeEntryManager::updateTimeEntry(int id, const QVariantMap &entryData)
{
    QSqlQuery query(Database::instance()->database());
    query.prepare("UPDATE time_entries SET project_id=:projectId, task_id=:taskId, description=:desc, start_time=:start, end_time=:end, duration=:duration WHERE id=:id");
    query.bindValue(":id", id);
    query.bindValue(":projectId", entryData.value("projectId"));
    query.bindValue(":taskId", entryData.value("taskId"));
    query.bindValue(":desc", entryData.value("description"));
    query.bindValue(":start", entryData.value("startTime"));
    query.bindValue(":end", entryData.value("endTime"));
    query.bindValue(":duration", entryData.value("duration"));
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return false;
    }
    
    emit timeEntryUpdated(id);
    emit timeEntriesChanged();
    return true;
}

bool TimeEntryManager::deleteTimeEntry(int id)
{
    QSqlQuery query(Database::instance()->database());
    query.prepare("DELETE FROM time_entries WHERE id = :id");
    query.bindValue(":id", id);
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return false;
    }
    
    emit timeEntryDeleted(id);
    emit timeEntriesChanged();
    return true;
}

bool TimeEntryManager::startTimer(int projectId, int taskId, const QString &description)
{
    if (m_timerRunning) {
        return false;
    }
    
    m_timerRunning = true;
    m_timerStartTime = QDateTime::currentDateTime();
    m_currentProjectId = projectId;
    m_currentTaskId = taskId;
    m_currentDescription = description;
    
    emit timerRunningChanged();
    emit timerStartTimeChanged();
    return true;
}

bool TimeEntryManager::stopTimer()
{
    if (!m_timerRunning) {
        return false;
    }
    
    QDateTime endTime = QDateTime::currentDateTime();
    int minutes = m_timerStartTime.secsTo(endTime) / 60;
    int roundedMinutes = roundToFiveMinutes(minutes);
    
    QVariantMap entryData;
    entryData["projectId"] = m_currentProjectId;
    entryData["taskId"] = m_currentTaskId;
    entryData["description"] = m_currentDescription;
    entryData["startTime"] = m_timerStartTime.toString(Qt::ISODate);
    entryData["endTime"] = endTime.toString(Qt::ISODate);
    entryData["duration"] = roundedMinutes;
    
    bool success = createTimeEntry(entryData);
    
    m_timerRunning = false;
    m_currentProjectId = -1;
    m_currentTaskId = -1;
    m_currentDescription.clear();
    
    emit timerRunningChanged();
    return success;
}

int TimeEntryManager::getElapsedSeconds()
{
    if (!m_timerRunning) {
        return 0;
    }
    return m_timerStartTime.secsTo(QDateTime::currentDateTime());
}

int TimeEntryManager::roundToFiveMinutes(int minutes)
{
    return ((minutes + 2) / 5) * 5;
}

QVariantMap TimeEntryManager::timeEntryToVariantMap(const TimeEntryModel &entry)
{
    QVariantMap map;
    // TODO: Implement
    return map;
}

