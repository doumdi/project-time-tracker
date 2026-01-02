#include <QtTest/QtTest>
#include "../include/managers/timeentrymanager.h"
#include "../include/database/database.h"
#include <QSqlQuery>

class TestTimeEntryManager : public QObject
{
    Q_OBJECT

private slots:
    void initTestCase()
    {
        Database* db = Database::instance();
        db->setDemoMode(true);
        QVERIFY(db->initialize());
        
        // Create a test project
        QSqlQuery query(db->database());
        QVERIFY(query.exec("INSERT INTO projects (id, name, description, color) VALUES (1, 'Test Project', 'Test Description', '#FF0000')"));
    }

    void testTimerStartStop()
    {
        TimeEntryManager manager;
        QVERIFY(!manager.timerRunning());
        
        QVERIFY(manager.startTimer(1, -1, "Test"));
        QVERIFY(manager.timerRunning());
        
        // Wait a bit so we have some elapsed time
        QTest::qWait(100);
        
        QVERIFY(manager.stopTimer());
        QVERIFY(!manager.timerRunning());
    }

    void testElapsedTime()
    {
        TimeEntryManager manager;
        manager.startTimer(1, -1, "Test");
        
        QTest::qWait(1000); // Wait 1 second
        
        int elapsed = manager.getElapsedSeconds();
        QVERIFY(elapsed >= 1);
        
        manager.stopTimer();
    }
};

QTEST_MAIN(TestTimeEntryManager)
#include "test_timeentrymanager.moc"
