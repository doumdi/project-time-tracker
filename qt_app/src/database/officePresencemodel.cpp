#include "database/officePresencemodel.h"

OfficePresenceModel::OfficePresenceModel(QObject *parent)
    : QObject(parent), m_id(-1), m_duration(0), m_deviceId(-1)
{
}

void OfficePresenceModel::setId(int id) { if (m_id != id) { m_id = id; emit idChanged(); } }
void OfficePresenceModel::setDate(const QDateTime &date) { if (m_date != date) { m_date = date; emit dateChanged(); } }
void OfficePresenceModel::setStartTime(const QDateTime &startTime) { if (m_startTime != startTime) { m_startTime = startTime; emit startTimeChanged(); } }
void OfficePresenceModel::setEndTime(const QDateTime &endTime) { if (m_endTime != endTime) { m_endTime = endTime; emit endTimeChanged(); } }
void OfficePresenceModel::setDuration(int duration) { if (m_duration != duration) { m_duration = duration; emit durationChanged(); } }
void OfficePresenceModel::setDeviceId(int deviceId) { if (m_deviceId != deviceId) { m_deviceId = deviceId; emit deviceIdChanged(); } }
