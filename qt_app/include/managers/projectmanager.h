#ifndef PROJECTMANAGER_H
#define PROJECTMANAGER_H

#include <QObject>
#include <QList>
#include <QVariantList>
#include "database/projectmodel.h"

class ProjectManager : public QObject
{
    Q_OBJECT
    
public:
    explicit ProjectManager(QObject *parent = nullptr);
    
    Q_INVOKABLE QVariantList getAllProjects();
    Q_INVOKABLE QVariantMap getProject(int id);
    Q_INVOKABLE bool createProject(const QVariantMap &projectData);
    Q_INVOKABLE bool updateProject(int id, const QVariantMap &projectData);
    Q_INVOKABLE bool deleteProject(int id);
    Q_INVOKABLE QVariantMap getProjectStats(int id);

signals:
    void projectsChanged();
    void projectCreated(int id);
    void projectUpdated(int id);
    void projectDeleted(int id);
    void error(const QString &message);

private:
    QVariantMap projectToVariantMap(const ProjectModel &project);
    ProjectModel variantMapToProject(const QVariantMap &data);
};

#endif // PROJECTMANAGER_H
