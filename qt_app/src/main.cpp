#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QIcon>
#include <QTranslator>
#include <QLocale>

#include "database/database.h"
#include "managers/projectmanager.h"
#include "managers/timeentrymanager.h"
#include "managers/taskmanager.h"
#include "managers/settingsmanager.h"
#ifdef HAVE_QT_BLUETOOTH
#include "ble/blemanager.h"
#include "ble/presencemonitor.h"
#endif
#include "utils/datetimeutils.h"

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);
    
    // Set application metadata
    QGuiApplication::setOrganizationName("Doumdi");
    QGuiApplication::setOrganizationDomain("doumdi.com");
    QGuiApplication::setApplicationName("Project Time Tracker");
    QGuiApplication::setApplicationVersion("1.0.15");
    
    // Check for demo mode
    bool demoMode = false;
    QStringList args = QGuiApplication::arguments();
    if (args.contains("--demo_mode")) {
        demoMode = true;
        qInfo() << "[DEMO MODE] Running in demo mode with in-memory database";
    }
    
    // Initialize database
    Database *database = Database::instance();
    if (demoMode) {
        database->setDemoMode(true);
    }
    
    if (!database->initialize()) {
        qCritical() << "Failed to initialize database";
        return -1;
    }
    
    // Create managers
    ProjectManager projectManager;
    TimeEntryManager timeEntryManager;
    TaskManager taskManager;
    SettingsManager settingsManager;
#ifdef HAVE_QT_BLUETOOTH
    BleManager bleManager;
    PresenceMonitor presenceMonitor(&bleManager);
#endif
    DateTimeUtils dateTimeUtils;
    
    // Set up translations
    QTranslator translator;
    QString language = settingsManager.language();
    if (language.isEmpty()) {
        language = QLocale::system().name();
    }
    
    if (translator.load(":/translations/app_" + language)) {
        app.installTranslator(&translator);
    }
    
    // Create QML engine
    QQmlApplicationEngine engine;
    
    // Register C++ types with QML
    qmlRegisterSingletonInstance("ProjectTimeTracker", 1, 0, "Database", database);
    qmlRegisterSingletonInstance("ProjectTimeTracker", 1, 0, "ProjectManager", &projectManager);
    qmlRegisterSingletonInstance("ProjectTimeTracker", 1, 0, "TimeEntryManager", &timeEntryManager);
    qmlRegisterSingletonInstance("ProjectTimeTracker", 1, 0, "TaskManager", &taskManager);
    qmlRegisterSingletonInstance("ProjectTimeTracker", 1, 0, "SettingsManager", &settingsManager);
#ifdef HAVE_QT_BLUETOOTH
    qmlRegisterSingletonInstance("ProjectTimeTracker", 1, 0, "BleManager", &bleManager);
    qmlRegisterSingletonInstance("ProjectTimeTracker", 1, 0, "PresenceMonitor", &presenceMonitor);
#endif
    qmlRegisterSingletonInstance("ProjectTimeTracker", 1, 0, "DateTimeUtils", &dateTimeUtils);
    
    // Set demo mode context property
    engine.rootContext()->setContextProperty("isDemoMode", demoMode);
    
    // Load main QML file
    const QUrl url(QStringLiteral("qrc:/qml/main.qml"));
    QObject::connect(&engine, &QQmlApplicationEngine::objectCreated,
                     &app, [url](QObject *obj, const QUrl &objUrl) {
        if (!obj && url == objUrl)
            QCoreApplication::exit(-1);
    }, Qt::QueuedConnection);
    
    engine.load(url);
    
    if (engine.rootObjects().isEmpty()) {
        qCritical() << "Failed to load QML";
        return -1;
    }
    
    return app.exec();
}
