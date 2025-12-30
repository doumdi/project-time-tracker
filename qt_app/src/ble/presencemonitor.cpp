#include "ble/presencemonitor.h"
#include "ble/blemanager.h"
#include <QDebug>

const int PresenceMonitor::SCAN_INTERVAL_MS = 60000;  // 60 seconds
const int PresenceMonitor::SCAN_DURATION_MS = 30000;   // 30 seconds
const int PresenceMonitor::TIMEOUT_MS = 120000;        // 2 minutes
const int PresenceMonitor::DEFAULT_SAVE_INTERVAL_MS = 900000;  // 15 minutes

PresenceMonitor::PresenceMonitor(BleManager *bleManager, QObject *parent)
    : QObject(parent)
    , m_bleManager(bleManager)
    , m_scanTimer(new QTimer(this))
    , m_timeoutTimer(new QTimer(this))
    , m_saveTimer(new QTimer(this))
    , m_active(false)
    , m_inOffice(false)
{
    connect(m_scanTimer, &QTimer::timeout, this, &PresenceMonitor::onPeriodicScan);
    connect(m_timeoutTimer, &QTimer::timeout, this, &PresenceMonitor::checkSessionTimeout);
    connect(m_saveTimer, &QTimer::timeout, this, &PresenceMonitor::saveCurrentSession);
    connect(m_bleManager, &BleManager::deviceDetected, this, &PresenceMonitor::onDeviceDetected);
    
    m_scanTimer->setInterval(SCAN_INTERVAL_MS);
    m_timeoutTimer->setInterval(TIMEOUT_MS);
    m_saveTimer->setInterval(DEFAULT_SAVE_INTERVAL_MS);
}

PresenceMonitor::~PresenceMonitor()
{
    stop();
}

void PresenceMonitor::start()
{
    if (m_active) {
        return;
    }
    
    m_active = true;
    emit activeChanged();
    
    m_scanTimer->start();
    m_timeoutTimer->start();
    
    qInfo() << "[PRESENCE MONITOR] Started";
}

void PresenceMonitor::stop()
{
    if (!m_active) {
        return;
    }
    
    m_scanTimer->stop();
    m_timeoutTimer->stop();
    m_saveTimer->stop();
    
    if (m_inOffice) {
        saveCurrentSession();
        m_inOffice = false;
        emit inOfficeChanged();
    }
    
    m_active = false;
    emit activeChanged();
    
    qInfo() << "[PRESENCE MONITOR] Stopped";
}

int PresenceMonitor::sessionDuration() const
{
    if (!m_inOffice || !m_sessionStartTime.isValid()) {
        return 0;
    }
    return m_sessionStartTime.secsTo(QDateTime::currentDateTime()) / 60;
}

void PresenceMonitor::onPeriodicScan()
{
    if (!m_active) {
        return;
    }
    
    qInfo() << "[PRESENCE MONITOR] Starting periodic scan";
    m_bleManager->startScan();
    
    // Stop scan after SCAN_DURATION_MS
    QTimer::singleShot(SCAN_DURATION_MS, m_bleManager, &BleManager::stopScan);
}

void PresenceMonitor::onDeviceDetected(const QString &address)
{
    if (!m_active) {
        return;
    }
    
    m_lastDeviceDetection = QDateTime::currentDateTime();
    
    if (!m_inOffice) {
        m_inOffice = true;
        m_sessionStartTime = m_lastDeviceDetection;
        emit inOfficeChanged();
        emit sessionStarted();
        m_saveTimer->start();
        qInfo() << "[PRESENCE MONITOR] Session started";
    }
    
    emit sessionDurationChanged();
}

void PresenceMonitor::onDeviceLost(const QString &address)
{
    // Handled by timeout mechanism
}

void PresenceMonitor::checkSessionTimeout()
{
    if (!m_active || !m_inOffice) {
        return;
    }
    
    if (!m_lastDeviceDetection.isValid()) {
        return;
    }
    
    int secondsSinceLastDetection = m_lastDeviceDetection.secsTo(QDateTime::currentDateTime());
    if (secondsSinceLastDetection * 1000 > TIMEOUT_MS) {
        saveCurrentSession();
        m_inOffice = false;
        m_saveTimer->stop();
        emit inOfficeChanged();
        emit sessionEnded(sessionDuration());
        qInfo() << "[PRESENCE MONITOR] Session ended due to timeout";
    }
}

void PresenceMonitor::saveCurrentSession()
{
    if (!m_inOffice || !m_sessionStartTime.isValid()) {
        return;
    }
    
    int duration = sessionDuration();
    if (duration < 1) {
        return;
    }
    
    // TODO: Save session to database
    qInfo() << "[PRESENCE MONITOR] Saving session, duration:" << duration << "minutes";
}

QVariantList PresenceMonitor::getTodayPresence()
{
    QVariantList result;
    // TODO: Load from database
    return result;
}

QVariantList PresenceMonitor::getPresenceByDate(const QDateTime &date)
{
    QVariantList result;
    // TODO: Load from database
    return result;
}

int PresenceMonitor::getTotalMinutesToday()
{
    // TODO: Calculate from database
    return 0;
}
