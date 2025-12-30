#ifndef PRESENCEMONITOR_H
#define PRESENCEMONITOR_H

#include <QObject>
#include <QTimer>
#include <QDateTime>
#include <QVariantList>

class BleManager;

class PresenceMonitor : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool active READ isActive NOTIFY activeChanged)
    Q_PROPERTY(bool inOffice READ isInOffice NOTIFY inOfficeChanged)
    Q_PROPERTY(int sessionDuration READ sessionDuration NOTIFY sessionDurationChanged)
    
public:
    explicit PresenceMonitor(BleManager *bleManager, QObject *parent = nullptr);
    ~PresenceMonitor();
    
    bool isActive() const { return m_active; }
    bool isInOffice() const { return m_inOffice; }
    int sessionDuration() const;
    
    Q_INVOKABLE void start();
    Q_INVOKABLE void stop();
    Q_INVOKABLE QVariantList getTodayPresence();
    Q_INVOKABLE QVariantList getPresenceByDate(const QDateTime &date);
    Q_INVOKABLE int getTotalMinutesToday();

signals:
    void activeChanged();
    void inOfficeChanged();
    void sessionDurationChanged();
    void sessionStarted();
    void sessionEnded(int duration);
    void error(const QString &message);

private slots:
    void onPeriodicScan();
    void onDeviceDetected(const QString &address);
    void onDeviceLost(const QString &address);
    void checkSessionTimeout();
    void saveCurrentSession();

private:
    BleManager *m_bleManager;
    QTimer *m_scanTimer;
    QTimer *m_timeoutTimer;
    QTimer *m_saveTimer;
    
    bool m_active;
    bool m_inOffice;
    QDateTime m_sessionStartTime;
    QDateTime m_lastDeviceDetection;
    
    static const int SCAN_INTERVAL_MS;
    static const int SCAN_DURATION_MS;
    static const int TIMEOUT_MS;
    static const int DEFAULT_SAVE_INTERVAL_MS;
};

#endif // PRESENCEMONITOR_H
