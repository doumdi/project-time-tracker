#include <QtTest/QtTest>
#include "../include/managers/projectmanager.h"
#include "../include/database/database.h"

class TestProjectManager : public QObject
{
    Q_OBJECT

private slots:
    void initTestCase()
    {
        Database* db = Database::instance();
        db->setDemoMode(true);
        db->initialize();
    }

    void testCreateProject()
    {
        ProjectManager manager;
        QVariantMap projectData;
        projectData["name"] = "Test Project";
        projectData["description"] = "Test Description";
        projectData["color"] = "#FF0000";
        
        QVERIFY(manager.createProject(projectData));
    }

    void testGetAllProjects()
    {
        ProjectManager manager;
        QVariantList projects = manager.getAllProjects();
        QVERIFY(projects.size() > 0);
    }
};

QTEST_MAIN(TestProjectManager)
#include "test_projectmanager.moc"
