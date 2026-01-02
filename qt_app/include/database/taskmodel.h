#ifndef TASKMODEL_H
#define TASKMODEL_H

#include <QObject>
#include <QString>
#include <QDateTime>

class TaskModel : public QObject
{
    Q_OBJECT
    Q_PROPERTY(int id READ id WRITE setId NOTIFY idChanged)
    Q_PROPERTY(int projectId READ projectId WRITE setProjectId NOTIFY projectIdChanged)
    Q_PROPERTY(QString name READ name WRITE setName NOTIFY nameChanged)
    Q_PROPERTY(QString description READ description WRITE setDescription NOTIFY descriptionChanged)
    Q_PROPERTY(int allocatedMinutes READ allocatedMinutes WRITE setAllocatedMinutes NOTIFY allocatedMinutesChanged)
    Q_PROPERTY(QDateTime dueDate READ dueDate WRITE setDueDate NOTIFY dueDateChanged)
    Q_PROPERTY(QString status READ status WRITE setStatus NOTIFY statusChanged)

public:
    explicit TaskModel(QObject *parent = nullptr);
    
    int id() const { return m_id; }
    int projectId() const { return m_projectId; }
    QString name() const { return m_name; }
    QString description() const { return m_description; }
    int allocatedMinutes() const { return m_allocatedMinutes; }
    QDateTime dueDate() const { return m_dueDate; }
    QString status() const { return m_status; }
    
    void setId(int id);
    void setProjectId(int projectId);
    void setName(const QString &name);
    void setDescription(const QString &description);
    void setAllocatedMinutes(int minutes);
    void setDueDate(const QDateTime &date);
    void setStatus(const QString &status);

signals:
    void idChanged();
    void projectIdChanged();
    void nameChanged();
    void descriptionChanged();
    void allocatedMinutesChanged();
    void dueDateChanged();
    void statusChanged();

private:
    int m_id;
    int m_projectId;
    QString m_name;
    QString m_description;
    int m_allocatedMinutes;
    QDateTime m_dueDate;
    QString m_status;
};

#endif // TASKMODEL_H
