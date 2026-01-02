#include "database/timeentrymodel.h"

TimeEntryModel::TimeEntryModel(QObject *parent)
    : QObject(parent), m_id(-1), m_projectId(-1), m_taskId(-1), m_duration(0)
{
}

void TimeEntryModel::setId(int id) { if (m_id != id) { m_id = id; emit idChanged(); } }
void TimeEntryModel::setProjectId(int projectId) { if (m_projectId != projectId) { m_projectId = projectId; emit projectIdChanged(); } }
void TimeEntryModel::setTaskId(int taskId) { if (m_taskId != taskId) { m_taskId = taskId; emit taskIdChanged(); } }
void TimeEntryModel::setDescription(const QString &description) { if (m_description != description) { m_description = description; emit descriptionChanged(); } }
void TimeEntryModel::setStartTime(const QDateTime &startTime) { if (m_startTime != startTime) { m_startTime = startTime; emit startTimeChanged(); } }
void TimeEntryModel::setEndTime(const QDateTime &endTime) { if (m_endTime != endTime) { m_endTime = endTime; emit endTimeChanged(); } }
void TimeEntryModel::setDuration(int duration) { if (m_duration != duration) { m_duration = duration; emit durationChanged(); } }
