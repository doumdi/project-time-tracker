#ifndef TIMEENTRYMODEL_H
#define TIMEENTRYMODEL_H

#include <QObject>
#include <QString>
#include <QDateTime>

class TimeEntryModel : public QObject
{
    Q_OBJECT
    Q_PROPERTY(int id READ id WRITE setId NOTIFY idChanged)
    Q_PROPERTY(int projectId READ projectId WRITE setProjectId NOTIFY projectIdChanged)
    Q_PROPERTY(int taskId READ taskId WRITE setTaskId NOTIFY taskIdChanged)
    Q_PROPERTY(QString description READ description WRITE setDescription NOTIFY descriptionChanged)
    Q_PROPERTY(QDateTime startTime READ startTime WRITE setStartTime NOTIFY startTimeChanged)
    Q_PROPERTY(QDateTime endTime READ endTime WRITE setEndTime NOTIFY endTimeChanged)
    Q_PROPERTY(int duration READ duration WRITE setDuration NOTIFY durationChanged)

public:
    explicit TimeEntryModel(QObject *parent = nullptr);

    
    int id() const { return m_id; }
    int projectId() const { return m_projectId; }
    int taskId() const { return m_taskId; }
    QString description() const { return m_description; }
    QDateTime startTime() const { return m_startTime; }
    QDateTime endTime() const { return m_endTime; }
    int duration() const { return m_duration; }
    
    void setId(int id);
    void setProjectId(int projectId);
    void setTaskId(int taskId);
    void setDescription(const QString &description);
    void setStartTime(const QDateTime &startTime);
    void setEndTime(const QDateTime &endTime);
    void setDuration(int duration);

signals:
    void idChanged();
    void projectIdChanged();
    void taskIdChanged();
    void descriptionChanged();
    void startTimeChanged();
    void endTimeChanged();
    void durationChanged();

private:
    int m_id;
    int m_projectId;
    int m_taskId;
    QString m_description;
    QDateTime m_startTime;
    QDateTime m_endTime;
    int m_duration;
};

#endif // TIMEENTRYMODEL_H
