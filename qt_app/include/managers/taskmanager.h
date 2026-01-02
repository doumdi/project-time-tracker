#ifndef TASKMANAGER_H
#define TASKMANAGER_H

#include <QObject>
#include <QVariantList>
#include "database/taskmodel.h"

class TaskManager : public QObject
{
    Q_OBJECT
    
public:
    explicit TaskManager(QObject *parent = nullptr);
    
    Q_INVOKABLE QVariantList getAllTasks();
    Q_INVOKABLE QVariantList getTasksByProject(int projectId);
    Q_INVOKABLE QVariantMap getTask(int id);
    Q_INVOKABLE bool createTask(const QVariantMap &taskData);
    Q_INVOKABLE bool updateTask(int id, const QVariantMap &taskData);
    Q_INVOKABLE bool deleteTask(int id);
    Q_INVOKABLE QVariantMap getTaskStats(int id);

signals:
    void tasksChanged();
    void taskCreated(int id);
    void taskUpdated(int id);
    void taskDeleted(int id);
    void error(const QString &message);

private:
    QVariantMap taskToVariantMap(const TaskModel &task);

};

#endif // TASKMANAGER_H
