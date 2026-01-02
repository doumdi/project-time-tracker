#include <QtTest/QtTest>
#include "../include/database/database.h"

class TestDatabase : public QObject
{
    Q_OBJECT

private slots:
    void initTestCase()
    {
        // Setup runs before all tests
    }

    void cleanupTestCase()
    {
        // Cleanup runs after all tests
    }

    void testInitialization()
    {
        Database* db = Database::instance();
        db->setDemoMode(true);
        QVERIFY(db->initialize());
        QVERIFY(db->isInitialized());
        QVERIFY(db->isDemoMode());
    }

    void testDemoMode()
    {
        Database* db = Database::instance();
        QVERIFY(db->isDemoMode());
    }
};

QTEST_MAIN(TestDatabase)
#include "test_database.moc"
