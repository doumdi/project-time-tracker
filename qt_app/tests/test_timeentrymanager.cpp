#include <QtTest/QtTest>
#include "../include/managers/timeentrymanager.h"

class TestTimeEntryManager : public QObject
{
    Q_OBJECT

private slots:
    void testTimerStartStop()
    {
        TimeEntryManager manager;
        QVERIFY(!manager.timerRunning());
        
        QVERIFY(manager.startTimer(1, -1, "Test"));
        QVERIFY(manager.timerRunning());
        
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
