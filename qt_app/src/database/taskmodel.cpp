#include "database/taskmodel.h"

TaskModel::TaskModel(QObject *parent)
    : QObject(parent), m_id(-1), m_projectId(-1), m_allocatedMinutes(0), m_status("pending")
{
}

void TaskModel::setId(int id) { if (m_id != id) { m_id = id; emit idChanged(); } }
void TaskModel::setProjectId(int projectId) { if (m_projectId != projectId) { m_projectId = projectId; emit projectIdChanged(); } }
void TaskModel::setName(const QString &name) { if (m_name != name) { m_name = name; emit nameChanged(); } }
void TaskModel::setDescription(const QString &description) { if (m_description != description) { m_description = description; emit descriptionChanged(); } }
void TaskModel::setAllocatedMinutes(int minutes) { if (m_allocatedMinutes != minutes) { m_allocatedMinutes = minutes; emit allocatedMinutesChanged(); } }
void TaskModel::setDueDate(const QDateTime &date) { if (m_dueDate != date) { m_dueDate = date; emit dueDateChanged(); } }
void TaskModel::setStatus(const QString &status) { if (m_status != status) { m_status = status; emit statusChanged(); } }
