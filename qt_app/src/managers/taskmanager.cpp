#include "managers/taskmanager.h"
#include "database/database.h"
#include <QSqlQuery>
#include <QSqlError>

TaskManager::TaskManager(QObject *parent) : QObject(parent) {}

QVariantList TaskManager::getAllTasks()
{
    QVariantList result;
    QSqlQuery query(Database::instance()->database());
    
    if (!query.exec("SELECT id, project_id, name, description, allocated_minutes, due_date, status FROM tasks ORDER BY due_date")) {
        emit error(query.lastError().text());
        return result;
    }
    
    while (query.next()) {
        QVariantMap task;
        task["id"] = query.value(0).toInt();
        task["projectId"] = query.value(1).toInt();
        task["name"] = query.value(2).toString();
        task["description"] = query.value(3).toString();
        task["allocatedMinutes"] = query.value(4).toInt();
        task["dueDate"] = query.value(5).toString();
        task["status"] = query.value(6).toString();
        result.append(task);
    }
    
    return result;
}

QVariantList TaskManager::getTasksByProject(int projectId)
{
    QVariantList result;
    QSqlQuery query(Database::instance()->database());
    query.prepare("SELECT id, project_id, name, description, allocated_minutes, due_date, status FROM tasks WHERE project_id = :projectId ORDER BY due_date");
    query.bindValue(":projectId", projectId);
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return result;
    }
    
    while (query.next()) {
        QVariantMap task;
        task["id"] = query.value(0).toInt();
        task["projectId"] = query.value(1).toInt();
        task["name"] = query.value(2).toString();
        task["description"] = query.value(3).toString();
        task["allocatedMinutes"] = query.value(4).toInt();
        task["dueDate"] = query.value(5).toString();
        task["status"] = query.value(6).toString();
        result.append(task);
    }
    
    return result;
}

QVariantMap TaskManager::getTask(int id)
{
    QVariantMap result;
    QSqlQuery query(Database::instance()->database());
    query.prepare("SELECT id, project_id, name, description, allocated_minutes, due_date, status FROM tasks WHERE id = :id");
    query.bindValue(":id", id);
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return result;
    }
    
    if (query.next()) {
        result["id"] = query.value(0).toInt();
        result["projectId"] = query.value(1).toInt();
        result["name"] = query.value(2).toString();
        result["description"] = query.value(3).toString();
        result["allocatedMinutes"] = query.value(4).toInt();
        result["dueDate"] = query.value(5).toString();
        result["status"] = query.value(6).toString();
    }
    
    return result;
}

bool TaskManager::createTask(const QVariantMap &taskData)
{
    QSqlQuery query(Database::instance()->database());
    query.prepare("INSERT INTO tasks (project_id, name, description, allocated_minutes, due_date, status) VALUES (:projectId, :name, :desc, :allocated, :dueDate, :status)");
    query.bindValue(":projectId", taskData.value("projectId"));
    query.bindValue(":name", taskData.value("name"));
    query.bindValue(":desc", taskData.value("description"));
    query.bindValue(":allocated", taskData.value("allocatedMinutes", 0));
    query.bindValue(":dueDate", taskData.value("dueDate"));
    query.bindValue(":status", taskData.value("status", "pending"));
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return false;
    }
    
    emit taskCreated(query.lastInsertId().toInt());
    emit tasksChanged();
    return true;
}

bool TaskManager::updateTask(int id, const QVariantMap &taskData)
{
    QSqlQuery query(Database::instance()->database());
    query.prepare("UPDATE tasks SET project_id=:projectId, name=:name, description=:desc, allocated_minutes=:allocated, due_date=:dueDate, status=:status WHERE id=:id");
    query.bindValue(":id", id);
    query.bindValue(":projectId", taskData.value("projectId"));
    query.bindValue(":name", taskData.value("name"));
    query.bindValue(":desc", taskData.value("description"));
    query.bindValue(":allocated", taskData.value("allocatedMinutes"));
    query.bindValue(":dueDate", taskData.value("dueDate"));
    query.bindValue(":status", taskData.value("status"));
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return false;
    }
    
    emit taskUpdated(id);
    emit tasksChanged();
    return true;
}

bool TaskManager::deleteTask(int id)
{
    QSqlQuery query(Database::instance()->database());
    query.prepare("DELETE FROM tasks WHERE id = :id");
    query.bindValue(":id", id);
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return false;
    }
    
    emit taskDeleted(id);
    emit tasksChanged();
    return true;
}

QVariantMap TaskManager::getTaskStats(int id)
{
    QVariantMap stats;
    // TODO: Implement
    return stats;
}

QVariantMap TaskManager::taskToVariantMap(const TaskModel &task)
{
    QVariantMap map;
    // TODO: Implement
    return map;
}

