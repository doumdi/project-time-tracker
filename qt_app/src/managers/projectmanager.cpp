#include "managers/projectmanager.h"
#include "database/database.h"
#include <QSqlQuery>
#include <QSqlError>
#include <QDebug>

ProjectManager::ProjectManager(QObject *parent) : QObject(parent) {}

QVariantList ProjectManager::getAllProjects()
{
    QVariantList result;
    QSqlQuery query(Database::instance()->database());
    
    if (!query.exec("SELECT id, name, description, color, budget, hourly_rate, currency, start_date, end_date FROM projects ORDER BY name")) {
        emit error(query.lastError().text());
        return result;
    }
    
    while (query.next()) {
        QVariantMap project;
        project["id"] = query.value(0).toInt();
        project["name"] = query.value(1).toString();
        project["description"] = query.value(2).toString();
        project["color"] = query.value(3).toString();
        project["budget"] = query.value(4).toDouble();
        project["hourlyRate"] = query.value(5).toDouble();
        project["currency"] = query.value(6).toString();
        project["startDate"] = query.value(7).toString();
        project["endDate"] = query.value(8).toString();
        result.append(project);
    }
    
    return result;
}

QVariantMap ProjectManager::getProject(int id)
{
    QVariantMap result;
    QSqlQuery query(Database::instance()->database());
    query.prepare("SELECT id, name, description, color, budget, hourly_rate, currency, start_date, end_date FROM projects WHERE id = :id");
    query.bindValue(":id", id);
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return result;
    }
    
    if (query.next()) {
        result["id"] = query.value(0).toInt();
        result["name"] = query.value(1).toString();
        result["description"] = query.value(2).toString();
        result["color"] = query.value(3).toString();
        result["budget"] = query.value(4).toDouble();
        result["hourlyRate"] = query.value(5).toDouble();
        result["currency"] = query.value(6).toString();
        result["startDate"] = query.value(7).toString();
        result["endDate"] = query.value(8).toString();
    }
    
    return result;
}

bool ProjectManager::createProject(const QVariantMap &projectData)
{
    QSqlQuery query(Database::instance()->database());
    query.prepare("INSERT INTO projects (name, description, color, budget, hourly_rate, currency, start_date, end_date) VALUES (:name, :desc, :color, :budget, :rate, :currency, :start, :end)");
    query.bindValue(":name", projectData.value("name"));
    query.bindValue(":desc", projectData.value("description"));
    query.bindValue(":color", projectData.value("color", "#3498db"));
    query.bindValue(":budget", projectData.value("budget", 0));
    query.bindValue(":rate", projectData.value("hourlyRate", 0));
    query.bindValue(":currency", projectData.value("currency", "USD"));
    query.bindValue(":start", projectData.value("startDate"));
    query.bindValue(":end", projectData.value("endDate"));
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return false;
    }
    
    int id = query.lastInsertId().toInt();
    emit projectCreated(id);
    emit projectsChanged();
    return true;
}

bool ProjectManager::updateProject(int id, const QVariantMap &projectData)
{
    QSqlQuery query(Database::instance()->database());
    query.prepare("UPDATE projects SET name=:name, description=:desc, color=:color, budget=:budget, hourly_rate=:rate, currency=:currency, start_date=:start, end_date=:end WHERE id=:id");
    query.bindValue(":id", id);
    query.bindValue(":name", projectData.value("name"));
    query.bindValue(":desc", projectData.value("description"));
    query.bindValue(":color", projectData.value("color"));
    query.bindValue(":budget", projectData.value("budget"));
    query.bindValue(":rate", projectData.value("hourlyRate"));
    query.bindValue(":currency", projectData.value("currency"));
    query.bindValue(":start", projectData.value("startDate"));
    query.bindValue(":end", projectData.value("endDate"));
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return false;
    }
    
    emit projectUpdated(id);
    emit projectsChanged();
    return true;
}

bool ProjectManager::deleteProject(int id)
{
    QSqlQuery query(Database::instance()->database());
    query.prepare("DELETE FROM projects WHERE id = :id");
    query.bindValue(":id", id);
    
    if (!query.exec()) {
        emit error(query.lastError().text());
        return false;
    }
    
    emit projectDeleted(id);
    emit projectsChanged();
    return true;
}

QVariantMap ProjectManager::getProjectStats(int id)
{
    QVariantMap stats;
    stats["totalMinutes"] = 0;
    stats["totalEarnings"] = 0.0;
    // TODO: Calculate actual stats from time_entries
    return stats;
}
