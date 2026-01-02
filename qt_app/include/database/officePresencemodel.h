#ifndef OFFICEPRESENCEMODEL_H
#define OFFICEPRESENCEMODEL_H

#include <QObject>
#include <QDateTime>

class OfficePresenceModel : public QObject
{
    Q_OBJECT
    Q_PROPERTY(int id READ id WRITE setId NOTIFY idChanged)
    Q_PROPERTY(QDateTime date READ date WRITE setDate NOTIFY dateChanged)
    Q_PROPERTY(QDateTime startTime READ startTime WRITE setStartTime NOTIFY startTimeChanged)
    Q_PROPERTY(QDateTime endTime READ endTime WRITE setEndTime NOTIFY endTimeChanged)
    Q_PROPERTY(int duration READ duration WRITE setDuration NOTIFY durationChanged)
    Q_PROPERTY(int deviceId READ deviceId WRITE setDeviceId NOTIFY deviceIdChanged)

public:
    explicit OfficePresenceModel(QObject *parent = nullptr);
    
    int id() const { return m_id; }
    QDateTime date() const { return m_date; }
    QDateTime startTime() const { return m_startTime; }
    QDateTime endTime() const { return m_endTime; }
    int duration() const { return m_duration; }
    int deviceId() const { return m_deviceId; }
    
    void setId(int id);
    void setDate(const QDateTime &date);
    void setStartTime(const QDateTime &startTime);
    void setEndTime(const QDateTime &endTime);
    void setDuration(int duration);
    void setDeviceId(int deviceId);

signals:
    void idChanged();
    void dateChanged();
    void startTimeChanged();
    void endTimeChanged();
    void durationChanged();
    void deviceIdChanged();

private:
    int m_id;
    QDateTime m_date;
    QDateTime m_startTime;
    QDateTime m_endTime;
    int m_duration;
    int m_deviceId;
};

#endif // OFFICEPRESENCEMODEL_H
